import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../../services/DatabaseService';
import type { Company, Perimeter } from '../../services/DatabaseService';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface FenceFormProps {
  companies: Company[];
  fenceId?: number;
  perimeters?: Perimeter[];
  initialData?: {
    name?: string;
    description?: string;
    companyId?: number;
    color?: string;
    status?: 'active' | 'inactive';
    ruleTemplate?: string;
    perimeterSize?: string;
    areaSize?: string;
    address?: string;
    layerType?: 'polygon' | 'circle';
    coordinates?: any[];
    center?: [number, number];
    radius?: number;
  } | null;
  onSubmit: (data: {
    name: string;
    companyId: number | null;
    ruleTemplate: string;
    color: string;
    description: string;
    status: 'active' | 'inactive';
  }) => void;
  onCancel: () => void;
  onDeletePerimeter?: (id: number) => void;
  onUpdatePerimeter?: (perimeterId: number, coordinates: number[][]) => void;
  onAddPerimeter?: (fenceId: number, perimeter: Omit<Perimeter, 'id' | 'fenceId' | 'createdAt'>) => void;
  onEditPerimeterRequest?: (perimeterId: number) => void;
  onAddPerimeterRequest?: () => void;
  onUpdatePerimeterName?: (id: number, name: string) => void;
}

// Componente de visualização do mapa
const MapVisualization: React.FC<{ perimeters: Perimeter[]; color: string; className?: string }> = ({ perimeters, color, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const [token, setToken] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/satellite-v9');

  useEffect(() => {
    const loadSettings = async () => {
      const tokenSetting = await dbService.getSettings('mapbox_token');
      const styleSetting = await dbService.getSettings('mapbox_style');
      if (tokenSetting?.value) setToken(tokenSetting.value);
      if (styleSetting?.value) setMapStyle(styleSetting.value.startsWith('mapbox://') ? styleSetting.value : `mapbox://styles/mapbox/${styleSetting.value}-v12`);
    };
    loadSettings();
  }, []);

  // Resize Observer para garantir que o mapa se ajuste corretamente
  useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
              mapRef.current.resize();
          }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
          resizeObserver.disconnect();
      };
  }, []);

  const { maskGeoJSON, perimeterGeoJSON, pointsGeoJSON, bounds, hasValidBounds } = useMemo(() => {
    const validPerimeters = perimeters.filter(p => p.type === 'polygon' && p.coordinates && p.coordinates.length > 0);
    
    if (validPerimeters.length === 0) {
      return { maskGeoJSON: null, perimeterGeoJSON: null, pointsGeoJSON: null, bounds: null, hasValidBounds: false };
    }

    const mapboxBounds = new mapboxgl.LngLatBounds();
    const holes: number[][][] = [];
    const perimeterFeatures: any[] = [];
    const pointFeatures: any[] = [];
    let hasCoordinates = false;

    validPerimeters.forEach(p => {
      if (!p.coordinates) return;

      // Validação e conversão de coordenadas
      // DB stores [lat, lng], Mapbox needs [lng, lat]
      const coordinates = p.coordinates
        .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
        .map(c => [c[1], c[0]]);
      
      if (coordinates.length < 3) return; // Polígono precisa de pelo menos 3 pontos

      // Extend bounds
      coordinates.forEach(c => {
          mapboxBounds.extend([c[0], c[1]]);
          hasCoordinates = true;
      });

      // Ensure closed polygon
      if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
        coordinates.push(coordinates[0]);
      }

      // Add to holes (for mask)
      holes.push(coordinates);

      // Add to perimeter features (for outline)
      perimeterFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        },
        properties: {
            name: p.name || `Perímetro ${perimeters.indexOf(p) + 1}`
        }
      });

      // Add points (vertices) - excluding the last duplicate point
      const uniquePoints = coordinates.slice(0, -1);
      uniquePoints.forEach(coord => {
        pointFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coord
          },
          properties: {}
        });
      });
    });

    // Create Mask (World minus Perimeters)
    const maskGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          // World Outer Ring
          [[-180, 90], [180, 90], [180, -90], [-180, -90], [-180, 90]],
          // Holes (Perimeters)
          ...holes
        ]
      },
      properties: {}
    };

    const perimeterGeoJSON = {
      type: 'FeatureCollection',
      features: perimeterFeatures
    };

    const pointsGeoJSON = {
      type: 'FeatureCollection',
      features: pointFeatures
    };

    return { 
        maskGeoJSON, 
        perimeterGeoJSON, 
        pointsGeoJSON, 
        bounds: hasCoordinates ? mapboxBounds : null,
        hasValidBounds: hasCoordinates
    };
  }, [perimeters]);

  const fitMapToBounds = React.useCallback(() => {
    if (mapRef.current && bounds && hasValidBounds) {
        try {
            mapRef.current.fitBounds(bounds, { 
                padding: { top: 80, bottom: 80, left: 80, right: 80 }, // Mais espaçamento para garantir visibilidade
                duration: 1500, // Animação mais suave
                maxZoom: 17
            });
        } catch (error) {
            console.error('Erro ao ajustar bounds do mapa:', error);
        }
    }
  }, [bounds, hasValidBounds]);

  useEffect(() => {
    if (!token) return;
    
    // Pequeno delay para garantir que o container tenha tamanho definido
    const timer = setTimeout(fitMapToBounds, 200);

    return () => {
        clearTimeout(timer);
    };
  }, [fitMapToBounds, token]);

  if (!token) {
    return (
      <div className={`w-full bg-gray-200 rounded-lg flex items-center justify-center ${className || 'h-64'}`}>
        <div className="text-gray-500 text-sm animate-pulse">Carregando mapa...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full bg-gray-200 rounded-lg overflow-hidden relative shadow-inner ring-1 ring-gray-200 ${className || 'h-64 lg:h-80'}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: -46.6333,
          latitude: -23.5505,
          zoom: 13
        }}
        // Removido maxBounds restritivo para evitar problemas de visualização
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        reuseMaps
        onLoad={fitMapToBounds}
      >
        {/* Mask Layer - Outside Perimeters */}
        {maskGeoJSON && (
            <Source id="mask-source" type="geojson" data={maskGeoJSON as any}>
                <Layer
                    id="mask-fill"
                    type="fill"
                    paint={{
                        'fill-color': '#000000',
                        'fill-opacity': 0.7 // Aumentado para maior contraste do perímetro
                    }}
                />
            </Source>
        )}

        {/* Perimeter Lines */}
        {perimeterGeoJSON && (
            <Source id="perimeter-source" type="geojson" data={perimeterGeoJSON as any}>
                {/* White Casing for visibility (Glow Effect) */}
                <Layer
                    id="perimeter-casing"
                    type="line"
                    paint={{
                        'line-color': '#ffffff',
                        'line-width': 8, // Mais espesso para destaque
                        'line-opacity': 0.8,
                        'line-blur': 1
                    }}
                />
                {/* Inner Colored Line */}
                <Layer
                    id="perimeter-line"
                    type="line"
                    paint={{
                        'line-color': color || '#EF4444',
                        'line-width': 4 // Mais visível
                    }}
                />
            </Source>
        )}

        {/* Vertices */}
        {pointsGeoJSON && (
            <Source id="points-source" type="geojson" data={pointsGeoJSON as any}>
                <Layer
                    id="points-circle"
                    type="circle"
                    paint={{
                        'circle-radius': 6,
                        'circle-color': color || '#EF4444',
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#ffffff'
                    }}
                />
            </Source>
        )}
      </Map>
    </div>
  );
};

const FenceForm: React.FC<FenceFormProps> = ({ 
  companies, 
  fenceId,
  perimeters = [],
  initialData, 
  onSubmit, 
  onCancel,
  onDeletePerimeter,
  onUpdatePerimeter,
  onAddPerimeter,
  onEditPerimeterRequest,
  onAddPerimeterRequest,
  onUpdatePerimeterName
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initialData?.name || '');
  const [companyId, setCompanyId] = useState<number | ''>(initialData?.companyId || '');
  const [ruleTemplate, setRuleTemplate] = useState(initialData?.ruleTemplate || 'monitor_entry');
  const [color, setColor] = useState(initialData?.color || '#f97316');
  const [status, setStatus] = useState<'active' | 'inactive'>(initialData?.status || 'active');
  const [description, setDescription] = useState(initialData?.description || '');

  // Se não tiver companyId e houver companies, usar o primeiro como padrão
  React.useEffect(() => {
    if (!companyId && companies.length > 0 && !fenceId) {
      setCompanyId(companies[0].id);
    }
  }, [companyId, companies, fenceId]);
  const [editingPerimeterId, setEditingPerimeterId] = useState<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const ruleOptions = [
    { value: 'monitor_entry', label: 'Monitorar Entrada' },
    { value: 'monitor_exit', label: 'Monitorar Saída' },
    { value: 'block_entry', label: 'Bloquear Entrada' },
    { value: 'block_exit', label: 'Bloquear Saída' },
  ];

  const fencePerimeters = useMemo(() => {
    // 1. Tenta pegar os perímetros já salvos vinculados a esta cerca
    const saved = perimeters.filter(p => p.fenceId === fenceId);
    if (saved.length > 0) return saved;

    // 2. Se não houver, verifica se estamos criando uma cerca nova com dados vindos do desenho (initialData)
    if (initialData?.coordinates && initialData.coordinates.length > 0) {
        // Converte {lat, lng}[] ou [lat, lng][] para o formato [lat, lng][] esperado pelo Perimeter
        const coords = initialData.coordinates.map((c: any) => {
            if (Array.isArray(c)) return c;
            if (typeof c === 'object' && c !== null && 'lat' in c && 'lng' in c) return [c.lat, c.lng];
            return null;
        }).filter((c): c is number[] => c !== null && c.length >= 2);

        if (coords.length > 0) {
            // Retorna um perímetro temporário para visualização
            return [{
                id: 0, // ID 0 indica temporário
                fenceId: fenceId || 0,
                type: 'polygon',
                coordinates: coords,
                createdAt: new Date().toISOString()
            }] as Perimeter[];
        }
    }
    
    return [];
  }, [perimeters, fenceId, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Preencha o nome da cerca');
      return;
    }

    // Se não tiver companyId, enviar null
    const finalCompanyId = companyId || null;

    onSubmit({
      name,
      companyId: finalCompanyId,
      ruleTemplate,
      color,
      description,
      status
    });
  };

  const handleDeletePerimeter = (id: number) => {
    if (onDeletePerimeter) {
      onDeletePerimeter(id);
    }
  };

  const handleEditPerimeter = (perimeterId: number) => {
    if (onEditPerimeterRequest) {
      onEditPerimeterRequest(perimeterId);
    } else {
      // Fallback: Navegar para o mapa com modo de edição
      navigate('/', { state: { editPerimeterId: perimeterId, fenceId } });
      onCancel(); // Fechar o modal
    }
  };

  const handleAddPerimeter = () => {
    if (onAddPerimeterRequest) {
      onAddPerimeterRequest();
    } else {
      // Fallback: Navegar para o mapa com modo de adicionar perímetro
      if (fenceId) {
        navigate('/', { state: { addPerimeterToFenceId: fenceId } });
        onCancel(); // Fechar o modal
      }
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white transition-all duration-300 ease-in-out ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Voltar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {fenceId ? 'Editar Cerca Virtual' : 'Nova Cerca Virtual'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure os detalhes e regras da sua cerca
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {fencePerimeters.length} {fencePerimeters.length === 1 ? 'Perímetro' : 'Perímetros'}
            </div>
            <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                    </svg>
                )}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          
          {/* Coluna Esquerda: Mapa e Lista de Perímetros */}
          <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200 lg:w-7/12 xl:w-8/12 h-[50vh] lg:h-auto overflow-hidden">
             {/* Mapa */}
             <div className="flex-1 relative p-4 min-h-[200px]">
                <div className="absolute inset-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <MapVisualization perimeters={fencePerimeters} color={color} className="w-full h-full" />
                    
                    {/* Botão flutuante para adicionar perímetro sobre o mapa */}
                    <div className="absolute bottom-4 right-4">
                        <button
                            onClick={handleAddPerimeter}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 hover:text-orange-600 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Novo Perímetro
                        </button>
                    </div>
                </div>
             </div>

             {/* Lista de Perímetros */}
             <div className="h-1/3 min-h-[180px] max-h-[300px] bg-white border-t border-gray-200 flex flex-col">
                <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Perímetros ({fencePerimeters.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {fencePerimeters.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
                            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <p>Nenhum perímetro definido</p>
                            <button onClick={handleAddPerimeter} className="mt-2 text-orange-600 hover:underline font-medium">Adicionar agora</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {fencePerimeters.map((perimeter, idx) => (
                                <div key={perimeter.id} className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {onUpdatePerimeterName ? (
                                                <input
                                                    type="text"
                                                    value={perimeter.name || ''}
                                                    placeholder={`Perímetro ${idx + 1}`}
                                                    onChange={(e) => onUpdatePerimeterName(perimeter.id, e.target.value)}
                                                    className="block w-full text-sm font-medium text-gray-700 border-0 border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:ring-0 px-0 py-0.5 bg-transparent transition-colors truncate"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="block text-sm font-medium text-gray-700 truncate">{perimeter.name || `Perímetro ${idx + 1}`}</span>
                                            )}
                                            <span className="text-xs text-gray-400 block mt-0.5">Polígono • {perimeter.coordinates?.length || 0} pontos</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditPerimeter(perimeter.id)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Editar no mapa"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeletePerimeter(perimeter.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                                            title="Remover"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
          </div>

          {/* Coluna Direita: Formulário */}
          <div className="w-full lg:w-5/12 xl:w-4/12 h-full overflow-y-auto bg-white flex flex-col shadow-xl z-10">
             <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-8">
                {/* Informações Básicas */}
                <div className="space-y-5">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">1</span>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Informações Básicas</h4>
                   </div>
                   
                   <div className="space-y-4">
                       <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Cerca <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            className="w-full h-10 px-3 rounded-lg border-gray-300 border shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Área Industrial Sul"
                          />
                       </div>

                       <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Empresa</label>
                          <div className="relative">
                              <select
                                value={companyId || ''}
                                onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full h-10 pl-3 pr-8 rounded-lg border-gray-300 border shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none text-sm bg-white"
                              >
                                <option value="">Selecione uma empresa...</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                          </div>
                       </div>

                       <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                          <textarea
                            className="w-full rounded-lg border-gray-300 border shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors p-3 text-sm resize-none"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o propósito desta cerca..."
                          />
                       </div>
                   </div>
                </div>

                {/* Configuração Visual e Status */}
                <div className="space-y-5">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">2</span>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Configuração</h4>
                   </div>

                   <div className="grid grid-cols-2 gap-5">
                       <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                          <div className="relative">
                              <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                                className="w-full h-10 pl-3 pr-8 rounded-lg border-gray-300 border shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none text-sm bg-white"
                              >
                                <option value="active">Ativa</option>
                                <option value="inactive">Inativa</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                          </div>
                       </div>

                       <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cor</label>
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 overflow-hidden rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:border-gray-400 transition-colors">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                                />
                            </div>
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="flex-1 h-10 px-3 rounded-lg border-gray-300 border shadow-sm text-sm font-mono uppercase focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                maxLength={7}
                            />
                          </div>
                       </div>
                   </div>
                </div>

                {/* Regras */}
                <div className="space-y-5">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">3</span>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Regras</h4>
                   </div>
                   
                   <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Modelo de Regra Inicial</label>
                      <div className="relative">
                          <select
                            value={ruleTemplate}
                            onChange={(e) => setRuleTemplate(e.target.value)}
                            className="w-full h-10 pl-3 pr-8 rounded-lg border-orange-200 border shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none text-sm bg-white"
                          >
                            {ruleOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                      </div>
                      <div className="mt-3 flex items-start gap-2 text-xs text-orange-700">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p>Esta regra será criada automaticamente. Você poderá adicionar mais regras ou personalizá-las posteriormente.</p>
                      </div>
                   </div>
                </div>
             </form>

             {/* Footer Actions */}
             <div className="p-5 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {fenceId ? 'Salvar Alterações' : 'Criar Cerca Virtual'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FenceForm;
