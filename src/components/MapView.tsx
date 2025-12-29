import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, FullscreenControl, GeolocateControl, Popup } from 'react-map-gl/mapbox';
import type { MapMouseEvent, MapRef } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import DrawControl, { type DrawControlRef } from './map/DrawControl';
import GeocoderControl from './map/GeocoderControl';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { dbService } from '../services/DatabaseService';
import type { Geofence, Perimeter, GeofencePin, Company, Rule } from '../services/DatabaseService';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import Modal from './ui/Modal';
import PinForm from './forms/PinForm';
import FenceForm from './forms/FenceForm';
import { calculatePolygonArea, calculatePolygonPerimeter, formatArea, formatDistance } from '../utils/geoUtils';
import { wsService } from '../services/WebSocketService';

interface MapViewProps {
  fences: Geofence[];
  perimeters: Perimeter[];
  pins: GeofencePin[];
  companies: Company[];
  rules: Rule[];
  onCreatePin?: (pin: Omit<GeofencePin, 'id' | 'createdAt'>) => void;
  onDeleteFence?: (id: number) => void;
  onDeletePerimeter?: (id: number) => Promise<void>;
  onUpdatePerimeter?: (perimeterId: number, coordinates: number[][]) => void;
  onRefresh?: () => void;
}

export default function MapView({ fences, perimeters, pins, companies, onCreatePin, onDeleteFence, onDeletePerimeter, onUpdatePerimeter, onRefresh }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<DrawControlRef>(null);
  const previewMapRef = useRef<MapRef>(null);

  // Settings State
  const [token, setToken] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/satellite-v9');
  const [viewState, setViewState] = useState({
    longitude: -46.6333,
    latitude: -23.5505,
    zoom: 13
  });

  // UI State
  const [drawMode, setDrawMode] = useState<'polygon' | 'pin' | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  // const [hoveredFenceId, setHoveredFenceId] = useState<number | null>(null);
  const [selectedFenceId, setSelectedFenceId] = useState<number | null>(null); // For popup
  const [selectedPerimeterId, setSelectedPerimeterId] = useState<number | null>(null); // For popup context
  const [editingPerimeterId, setEditingPerimeterId] = useState<number | null>(null); // For editing perimeter

  // Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPinCoordinates, setNewPinCoordinates] = useState<[number, number] | null>(null);
  
  const [isFenceModalOpen, setIsFenceModalOpen] = useState(false);
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [perimeterToDelete, setPerimeterToDelete] = useState<Perimeter | null>(null);
  const [tempFenceData, setTempFenceData] = useState<{
    id?: number;
    layerType: 'polygon' | 'circle';
    coordinates?: { lat: number; lng: number }[];
    center?: [number, number];
    radius?: number;
    perimeterSize: string;
    areaSize: string;
    address: string;
    name?: string;
    color?: string;
    companyId?: number;
    description?: string;
    ruleTemplate?: string;
  } | null>(null);

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      const tokenSetting = await dbService.getSettings('mapbox_token');
      const styleSetting = await dbService.getSettings('mapbox_style');
      
      const getTokenValue = (setting: any) => {
        if (!setting?.value) return '';
        if (typeof setting.value === 'object' && setting.value !== null && 'value' in setting.value) {
            return setting.value.value;
        }
        return setting.value;
      };

      const tokenVal = getTokenValue(tokenSetting) || import.meta.env.VITE_MAPBOX_API;
      if (tokenVal) setToken(tokenVal);
      
      const styleVal = getTokenValue(styleSetting);
      if (styleVal) {
        setMapStyle(styleVal.startsWith('mapbox://') ? styleVal : `mapbox://styles/mapbox/${styleVal}-v12`);
      }
    };
    loadSettings();
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (!token) return; // Wait for token to be loaded

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setViewState({
            longitude,
            latitude,
            zoom: 13
          });
        },
        (error) => {
          console.log('Erro ao obter localização:', error.message);
          // Mantém a localização padrão (São Paulo) se houver erro
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [token]);

  // Prepare GeoJSON for Fences
  const fencesGeoJSON = useMemo(() => {
    const features = perimeters
      .filter(p => p.type === 'polygon' && p.coordinates && p.coordinates.length > 0)
      .filter(p => p.id !== editingPerimeterId) // Hide the perimeter being edited
      .map(p => {
        const fence = fences.find(f => f.id === p.fenceId);
        // DB stores [lat, lng], Mapbox needs [lng, lat]
        const coordinates = p.coordinates!.map(c => [c[1], c[0]]);
        // Close the polygon if not closed
        if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
          coordinates.push(coordinates[0]);
        }
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          },
          properties: {
            id: p.fenceId,
            perimeterId: p.id,
            color: fence?.color || '#3b82f6',
            name: fence?.name || 'Cerca',
            description: fence?.description || ''
          }
        };
    });

    return {
      type: 'FeatureCollection',
      features
    };
  }, [fences, perimeters, editingPerimeterId]);

  // Handle Draw Update (for editing existing perimeters)
  const onUpdate = useCallback((e: any) => {
      // Just track updates, don't save automatically
      // User will click "Salvar" button to save
  }, []);

  const handleSaveEditedPerimeter = () => {
      if (!editingPerimeterId || !drawRef.current) return;
      
      const allFeatures = drawRef.current.getAll();
      if (allFeatures.features.length === 0) return;
      
      const feature = allFeatures.features[0];
      if (feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0]; // [lng, lat]
          // Remove duplicate closing point if present
          let cleanCoords = coords;
          if (coords.length > 1 && 
              coords[0][0] === coords[coords.length - 1][0] && 
              coords[0][1] === coords[coords.length - 1][1]) {
              cleanCoords = coords.slice(0, -1);
          }
          
          // Convert to [lat, lng] for DB
          const dbCoordinates = cleanCoords.map((c: any) => [c[1], c[0]]);
          
          // Save the updated perimeter
          if (onUpdatePerimeter) {
              onUpdatePerimeter(editingPerimeterId, dbCoordinates);
          }
          
          // Exit edit mode
          setEditingPerimeterId(null);
          if (drawRef.current) {
              drawRef.current.delete(feature.id);
              drawRef.current.changeMode('simple_select');
          }
      }
  };

  const onCreate = useCallback(async (e: any) => {
    const { features } = e;
    if (features.length === 0) return;
    
    const feature = features[0];
    if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0]; // [lng, lat]
        // Convert to [{lat, lng}] for utils
        const coordinates = coords.map((c: any) => ({ lat: c[1], lng: c[0] }));
        
        // Calculate stats
        const pSize = calculatePolygonPerimeter(coordinates);
        const aSize = calculatePolygonArea(coordinates);
        
        // Centroid for address
        let center: [number, number] = [-23.5505, -46.6333];
        if (coordinates.length > 0) {
            const lats = coordinates.map((c: { lat: number }) => c.lat);
            const lngs = coordinates.map((c: { lng: number }) => c.lng);
            center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
        }

        // Fetch Address
        let address = 'Endereço não encontrado';
        try {
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${center[1]},${center[0]}.json?access_token=${token}`);
            const data = await response.json();
            if (data && data.features && data.features.length > 0) {
                address = data.features[0].place_name;
            }
        } catch (e) {
            console.error('Erro ao buscar endereço:', e);
        }

        setTempFenceData({
            layerType: 'polygon',
            coordinates, // [{lat, lng}]
            center,
            perimeterSize: formatDistance(pSize),
            areaSize: formatArea(aSize),
            address
        });
        setIsFenceModalOpen(true);

        // Delete the drawn feature from the map so we can render it properly after saving
        if (drawRef.current) {
            drawRef.current.delete(feature.id);
        }
    }
  }, [token]);

  const handleSaveFence = async (formData: any) => {
      if (!tempFenceData) return;

      try {
          const fenceId = await dbService.addFence({
              name: formData.name,
              description: formData.description,
              color: formData.color,
              companyId: formData.companyId,
              status: formData.status || 'active',
              createdAt: new Date().toISOString()
          });

          // Create Perimeter
          const dbCoordinates = tempFenceData.coordinates?.map(c => [c.lat, c.lng]); // [lat, lng] for DB
          await dbService.addPerimeter({
              fenceId: fenceId,
              type: 'polygon',
              coordinates: dbCoordinates,
              createdAt: new Date().toISOString()
          });

          // Create Rule
          let ruleConfig: any = { condition: 'enter', action: 'notify' };
            let ruleName = 'Monitorar Entrada';

            if (formData.ruleTemplate === 'monitor_exit') {
                ruleConfig = { condition: 'exit', action: 'notify' };
                ruleName = 'Monitorar Saída';
            } else if (formData.ruleTemplate === 'block_entry') {
                ruleConfig = { condition: 'enter', action: 'block' };
                ruleName = 'Bloquear Entrada';
            } else if (formData.ruleTemplate === 'block_exit') {
                ruleConfig = { condition: 'exit', action: 'block' };
                ruleName = 'Bloquear Saída';
            }

            await dbService.addRule({
                fenceId: fenceId,
                name: ruleName,
                condition: ruleConfig.condition,
                action: ruleConfig.action,
                createdAt: new Date().toISOString()
            });

            wsService.sendMessage('fence_created', { fenceId });
            
            setIsFenceModalOpen(false);
            setTempFenceData(null);
            if (onRefresh) onRefresh();

      } catch (error) {
          console.error('Erro ao salvar cerca:', error);
          alert('Erro ao salvar cerca');
      }
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (drawMode === 'pin') {
        setNewPinCoordinates([e.lngLat.lat, e.lngLat.lng]);
        setIsPinModalOpen(true);
        setDrawMode(null);
    } else if (deleteMode) {
        // Handled by layer click
    } else {
        // Check if clicked on a feature
        const features = e.features;
        if (features && features.length > 0) {
             const feature = features[0];
             if (feature.layer?.id === 'fences-fill') {
                 const fenceId = feature.properties?.id;
                 const perimeterId = feature.properties?.perimeterId;
                 
                 if (deleteMode) {
                     if (window.confirm('Tem certeza que deseja excluir esta cerca?')) {
                         onDeleteFence && onDeleteFence(fenceId);
                     }
                 } else {
                     setSelectedFenceId(fenceId);
                     setSelectedPerimeterId(perimeterId);
                 }
             } else {
                 setSelectedFenceId(null);
                 setSelectedPerimeterId(null);
             }
        } else {
            setSelectedFenceId(null);
            setSelectedPerimeterId(null);
        }
    }
  };

  const handleCreatePin = (data: Omit<GeofencePin, 'id' | 'createdAt'>) => {
      if (onCreatePin) {
          onCreatePin(data);
      }
      setIsPinModalOpen(false);
      setNewPinCoordinates(null);
  };

  const startDrawing = (mode: 'polygon' | 'pin') => {
      setDrawMode(mode);
      setDeleteMode(false);
      setSelectedFenceId(null);
      setSelectedPerimeterId(null);
      setEditingPerimeterId(null);
      if (mode === 'polygon' && drawRef.current) {
          drawRef.current.changeMode('draw_polygon');
      }
  };

  const startEditingPerimeter = (perimeterId: number) => {
      const perimeter = perimeters.find(p => p.id === perimeterId);
      if (!perimeter || !perimeter.coordinates || perimeter.coordinates.length === 0) return;
      
      setEditingPerimeterId(perimeterId);
      setSelectedFenceId(null);
      setSelectedPerimeterId(null);
      setDrawMode(null);
      setDeleteMode(false);
      
      if (drawRef.current) {
          // Clear any existing features first
          const allFeatures = drawRef.current.getAll();
          allFeatures.features.forEach((f: any) => {
              drawRef.current?.delete(f.id);
          });
          
          // Convert [lat, lng] to [lng, lat] for Mapbox
          const mapboxCoords = perimeter.coordinates.map(c => [c[1], c[0]]);
          // Remove last point if it's a duplicate of the first (closed polygon)
          if (mapboxCoords.length > 1 && 
              mapboxCoords[0][0] === mapboxCoords[mapboxCoords.length - 1][0] && 
              mapboxCoords[0][1] === mapboxCoords[mapboxCoords.length - 1][1]) {
              mapboxCoords.pop();
          }
          
          // Create GeoJSON feature
          const feature = {
              type: 'Feature',
              geometry: {
                  type: 'Polygon',
                  coordinates: [mapboxCoords]
              },
              properties: {
                  perimeterId: perimeterId
              }
          };
          
          // Add to draw and enter direct_select mode for editing
          const addedFeatureIds = drawRef.current.add(feature);
          // Use setTimeout to ensure the feature is added before changing mode
          setTimeout(() => {
              if (drawRef.current && addedFeatureIds && addedFeatureIds.length > 0) {
                  drawRef.current.changeMode('direct_select', { featureId: addedFeatureIds[0] });
              }
          }, 100);
      }
  };

  const handleFitBounds = () => {
      if (!mapRef.current) return;

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      // Add fences to bounds
      perimeters.forEach(p => {
          if (p.coordinates && p.coordinates.length > 0) {
              p.coordinates.forEach(c => {
                  bounds.extend([c[1], c[0]]); // [lat, lng] -> [lng, lat]
                  hasPoints = true;
              });
          }
      });

      // Add pins to bounds
      pins.forEach(p => {
          bounds.extend([p.coordinates[1], p.coordinates[0]]);
          hasPoints = true;
      });

      if (hasPoints) {
          mapRef.current.fitBounds(bounds, { padding: 100 });
      } else {
        // Fallback to default view if no items
        setViewState(prev => ({
            ...prev,
            longitude: -46.6333,
            latitude: -23.5505,
            zoom: 13
        }));
      }
  };

  const handleExcluirClick = () => {
      if (perimeters.length === 0) {
          alert('Não há perímetros disponíveis para exclusão.');
          return;
      }
      setIsDeleteListModalOpen(true);
      setDeleteMode(false);
  };

  const handleConfirmDelete = async () => {
      if (!perimeterToDelete || !onDeletePerimeter) return;
      try {
          await onDeletePerimeter(perimeterToDelete.id);
          setPerimeterToDelete(null);
          setIsDeleteListModalOpen(false);
          alert('Perímetro excluído com sucesso!');
      } catch (error) {
          console.error('Erro ao excluir:', error);
          alert('Falha ao excluir o perímetro. Tente novamente.');
      }
  };

  if (!token) {
      return (
          <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Mapbox não configurado</h2>
                  <p className="text-gray-600 mb-4">O token de acesso do Mapbox não foi encontrado nas variáveis de ambiente.</p>
                  <p className="text-sm text-red-500">Verifique se VITE_MAPBOX_API está definido no arquivo .env</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex-1 relative h-full w-full">
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Novo Pin"
      >
        <PinForm
            initialCoordinates={newPinCoordinates}
            onSubmit={handleCreatePin}
            onCancel={() => setIsPinModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDeleteListModalOpen}
        onClose={() => setIsDeleteListModalOpen(false)}
        title="Excluir Perímetro"
      >
        <div className="p-4">
            <p className="mb-4 text-gray-600">Selecione um perímetro para excluir:</p>
            {perimeters.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum perímetro encontrado.</p>
            ) : (
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                    {perimeters.map(p => {
                        const fence = fences.find(f => f.id === p.fenceId);
                        return (
                            <div 
                                key={p.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                                onClick={() => {
                                    setPerimeterToDelete(p);
                                    setIsDeleteListModalOpen(false);
                                    setIsConfirmDeleteOpen(true);
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: fence?.color || '#ccc' }}
                                    ></div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{fence?.name || 'Cerca sem nome'}</span>
                                        <span className="text-xs text-gray-500">ID: {p.id} • {p.type === 'polygon' ? 'Polígono' : 'Círculo'}</span>
                                    </div>
                                </div>
                                <span className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={() => setIsDeleteListModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => { setIsConfirmDeleteOpen(false); setPerimeterToDelete(null); }}
        title="Confirmar Exclusão"
        className="!max-w-4xl !w-[90vw]"
      >
        <div className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Excluir Perímetro?</h3>
                <p className="text-gray-500 mb-4">
                    Tem certeza que deseja excluir este perímetro? A ação não poderá ser desfeita.
                </p>

                {/* Preview Map & Details */}
                {perimeterToDelete && (
                    <div className="w-full mb-2">
                        <div className="h-[400px] w-full rounded-lg overflow-hidden relative border border-gray-200 bg-gray-100 mb-4 shadow-inner">
                            {token ? (
                                <Map
                                    ref={previewMapRef}
                                    initialViewState={{
                                        longitude: -46,
                                        latitude: -23,
                                        zoom: 1
                                    }}
                                    mapStyle={mapStyle}
                                    mapboxAccessToken={token}
                                    interactive={false}
                                    attributionControl={false}
                                    reuseMaps
                                    onLoad={(e) => {
                                        if (perimeterToDelete.coordinates && perimeterToDelete.coordinates.length > 0) {
                                            try {
                                                const bounds = new mapboxgl.LngLatBounds();
                                                perimeterToDelete.coordinates.forEach(c => bounds.extend([c[1], c[0]]));
                                                e.target.fitBounds(bounds, { padding: 80, duration: 0 });
                                            } catch (err) {
                                                console.error('Error fitting bounds:', err);
                                            }
                                        }
                                    }}
                                >
                                    <Source 
                                        id="preview-source" 
                                        type="geojson" 
                                        data={{
                                            type: 'Feature',
                                            geometry: {
                                                type: 'Polygon',
                                                coordinates: [perimeterToDelete.coordinates?.map(c => [c[1], c[0]]) || []]
                                            },
                                            properties: {}
                                        } as any}
                                    >
                                        <Layer
                                            id="preview-fill"
                                            type="fill"
                                            paint={{
                                                'fill-color': fences.find(f => f.id === perimeterToDelete.fenceId)?.color || '#3b82f6',
                                                'fill-opacity': 0.5
                                            }}
                                        />
                                        <Layer
                                            id="preview-line"
                                            type="line"
                                            paint={{
                                                'line-color': fences.find(f => f.id === perimeterToDelete.fenceId)?.color || '#3b82f6',
                                                'line-width': 3
                                            }}
                                        />
                                    </Source>
                                </Map>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Mapa indisponível
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="text-left">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Identificação</span>
                                <span className="font-medium text-gray-900 block truncate" title={perimeterToDelete.name || fences.find(f => f.id === perimeterToDelete.fenceId)?.name}>
                                    {perimeterToDelete.name || fences.find(f => f.id === perimeterToDelete.fenceId)?.name || 'Sem nome'}
                                </span>
                                <span className="text-xs text-gray-500">ID: #{perimeterToDelete.id}</span>
                            </div>
                            <div className="text-left">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Área Total</span>
                                <span className="font-medium text-gray-900">
                                    {perimeterToDelete.coordinates 
                                        ? formatArea(calculatePolygonArea(perimeterToDelete.coordinates.map(c => ({ lat: c[0], lng: c[1] }))))
                                        : '0 m²'}
                                </span>
                            </div>
                            <div className="text-left">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Criado em</span>
                                <span className="font-medium text-gray-900">
                                    {perimeterToDelete.createdAt 
                                        ? new Date(perimeterToDelete.createdAt).toLocaleDateString('pt-BR')
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex justify-end gap-3">
                <button 
                    onClick={() => { setIsConfirmDeleteOpen(false); setPerimeterToDelete(null); }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
                >
                    Sim, excluir
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFenceModalOpen}
        onClose={() => { setIsFenceModalOpen(false); setTempFenceData(null); }}
        className="!max-w-7xl !w-[95vw] !h-[90vh] !p-0"
      >
        {tempFenceData && (
          <FenceForm
            companies={companies}
            initialData={tempFenceData}
            onSubmit={handleSaveFence}
            onCancel={() => { setIsFenceModalOpen(false); setTempFenceData(null); }}
          />
        )}
      </Modal>

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: any }) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={token}
        onClick={handleMapClick}
        // Disable interaction with static layers when editing to prevent conflict with DrawControl
        interactiveLayerIds={editingPerimeterId ? [] : ['fences-fill']} 
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl 
          position="top-right"
          trackUserLocation={true}
          showUserHeading={true}
        />

        <GeocoderControl 
            mapboxAccessToken={token} 
            position="top-left" 
            marker={true}
            placeholder="Buscar endereço..."
            language="pt-BR"
        />

        <DrawControl
            ref={drawRef}
            position="top-left"
            displayControlsDefault={false}
            onCreate={onCreate}
            onUpdate={onUpdate}
        />
        
        {/* Editing Mode Indicator */}
        {editingPerimeterId && (
            <div className="absolute top-[10px] left-1/2 transform -translate-x-1/2 z-20 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span className="font-medium">Modo de Edição: Arraste os pontos para editar o perímetro</span>
                <div className="flex gap-2 ml-2">
                    <button
                        onClick={handleSaveEditedPerimeter}
                        className="px-3 py-1.5 bg-white text-orange-500 rounded font-medium hover:bg-gray-100 text-sm transition-colors"
                    >
                        Salvar
                    </button>
                    <button
                        onClick={() => {
                            setEditingPerimeterId(null);
                            if (drawRef.current) {
                                const allFeatures = drawRef.current.getAll();
                                allFeatures.features.forEach((f: any) => {
                                    drawRef.current?.delete(f.id);
                                });
                                drawRef.current.changeMode('simple_select');
                            }
                        }}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        )}

        {/* Fences Source & Layers */}
        <Source id="fences-source" type="geojson" data={fencesGeoJSON as any}>
            <Layer
                id="fences-fill"
                type="fill"
                paint={{
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.3
                }}
            />
            <Layer
                id="fences-line"
                type="line"
                paint={{
                    'line-color': ['get', 'color'],
                    'line-width': 2
                }}
            />
        </Source>

        {/* Selected Fence Popup */}
        {selectedFenceId && (() => {
            const fence = fences.find(f => f.id === selectedFenceId);
            const perimeter = selectedPerimeterId 
                ? perimeters.find(p => p.id === selectedPerimeterId)
                : perimeters.find(p => p.fenceId === selectedFenceId);
                
            if (!fence || !perimeter || !perimeter.coordinates || perimeter.coordinates.length === 0) return null;
            
            // Calculate center for popup
            const lats = perimeter.coordinates.map(c => c[0]);
            const lngs = perimeter.coordinates.map(c => c[1]);
            const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
            const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

            return (
                <Popup
                    longitude={centerLng}
                    latitude={centerLat}
                    anchor="bottom"
                    onClose={() => {
                        setSelectedFenceId(null);
                        setSelectedPerimeterId(null);
                    }}
                    closeOnClick={false}
                >
                    <div className="p-2 min-w-[200px] text-left">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: fence.color }}></span>
                            {fence.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{fence.description || 'Sem descrição'}</p>
                        <button
                            onClick={() => {
                                if (perimeter) {
                                    startEditingPerimeter(perimeter.id);
                                }
                            }}
                            className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar Perímetro
                        </button>
                    </div>
                </Popup>
            );
        })()}

        {/* Pins */}
        {pins.map(pin => (
            <Marker 
                key={pin.id} 
                longitude={pin.coordinates[1]} 
                latitude={pin.coordinates[0]}
                anchor="bottom"
                onClick={(e: any) => {
                    e.originalEvent.stopPropagation();
                    // Handle pin click if needed (popup)
                }}
            >
                <div className="cursor-pointer text-red-500 hover:text-red-700">
                     <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                     </svg>
                </div>
            </Marker>
        ))}

      </Map>

      {/* Custom Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-full shadow-xl px-8 py-3 mb-4 flex items-center space-x-4 border border-gray-200">
        <button 
          className={`flex flex-col items-center space-y-1 ${drawMode === 'polygon' ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
          onClick={() => startDrawing('polygon')}
          title="Desenhar Polígono"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-5v12L3 14v-3z"></path>
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
          </svg>
          <span className="text-xs font-medium">Polígono</span>
        </button>
        
        <div className="w-px h-8 bg-gray-200"></div>

        <button 
          className={`flex flex-col items-center space-y-1 ${drawMode === 'pin' ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
          onClick={() => startDrawing('pin')}
          title="Adicionar Pin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
             <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="text-xs font-medium">Pin</span>
        </button>

        <div className="w-px h-8 bg-gray-200"></div>

        <button 
          className={`flex flex-col items-center space-y-1 ${deleteMode ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
          onClick={handleExcluirClick}
          title="Excluir"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <polyline points="3 6 5 6 21 6"></polyline>
             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
           </svg>
           <span className="text-xs font-medium">Excluir</span>
        </button>

        <div className="w-px h-8 bg-gray-200"></div>

        <button 
          className="flex flex-col items-center space-y-1 text-gray-600 hover:text-orange-500"
          onClick={handleFitBounds}
          title="Visualizar Tudo"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
           </svg>
           <span className="text-xs font-medium">Focar</span>
        </button>
      </div>
    </div>
  );
}