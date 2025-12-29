import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Geofence, Perimeter, Company } from '../services/DatabaseService'

interface FencesPageProps {
  fences: Geofence[]
  perimeters: Perimeter[]
  companies: Company[]
  onUpdateFence: (id: number, data: Partial<Geofence>) => void
  onDeleteFence: (id: number) => void
  onDeletePerimeter: (id: number) => void
  onUpdatePerimeter: (perimeterId: number, coordinates: number[][]) => void
  onAddPerimeter: (fenceId: number, perimeter: Omit<Perimeter, 'id' | 'fenceId' | 'createdAt'>) => void
}

// Função para formatar data relativa
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInYears > 0) {
    return `Criado há cerca de ${diffInYears} ${diffInYears === 1 ? 'ano' : 'anos'}`
  } else if (diffInMonths > 0) {
    return `Criado há cerca de ${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'}`
  } else if (diffInDays > 0) {
    return `Criado há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`
  } else {
    return 'Criado hoje'
  }
}

// Componente de preview do mapa
const MapPreview: React.FC<{ fence: Geofence; perimeters: Perimeter[] }> = ({ fence, perimeters }) => {
  const fencePerimeters = perimeters.filter(p => p.fenceId === fence.id && p.type === 'polygon' && p.coordinates && p.coordinates.length > 0);
  const hasPolygon = fencePerimeters.length > 0;
  
  // Cor da linha baseada na cor da cerca
  const borderColor = fence.color || '#f97316'
  
  // Função para normalizar coordenadas para o viewBox
  const getPolygons = () => {
    if (fencePerimeters.length === 0) return [];
    
    const allCoords = fencePerimeters.flatMap(p => p.coordinates || []);
    if (allCoords.length === 0) return [];

    // Encontrar min/max de lat e lng
    const lats = allCoords.map(c => c[0]);
    const lngs = allCoords.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    // Correção de aspecto para projeção (aproximação simples usando cos(lat))
    const latCorrection = 1;
    const lngCorrection = Math.cos(centerLat * Math.PI / 180);

    const latRange = (maxLat - minLat) * latCorrection || 0.0001;
    const lngRange = (maxLng - minLng) * lngCorrection || 0.0001;
    
    const maxDimension = Math.max(latRange, lngRange);
    
    // Normalizar para viewBox 0-200 com padding
    const padding = 20;
    const size = 200 - (padding * 2);
    
    // Fatores de escala
    const scale = size / maxDimension;
    
    // Offsets para centralizar
    const xOffset = (200 - (lngRange * scale)) / 2;
    const yOffset = (200 - (latRange * scale)) / 2;

    return fencePerimeters.map(p => {
        if (!p.coordinates) return null;
        return p.coordinates.map(coord => {
            const lat = coord[0];
            const lng = coord[1];
            
            // Projetar
            const yRaw = (maxLat - lat) * latCorrection; // Inverter Y e aplicar correção (1)
            const xRaw = (lng - minLng) * lngCorrection;
            
            const x = xOffset + (xRaw * scale);
            const y = yOffset + (yRaw * scale); // O yOffset já considera a centralização vertical
            
            return `${x},${y}`;
        }).join(' ');
    }).filter(Boolean) as string[];
  }
  
  const polygons = getPolygons();

  return (
    <div className="relative w-full h-32 bg-gray-200 overflow-hidden">
      {hasPolygon ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
            {/* Fundo do mapa simplificado */}
            <rect width="200" height="200" fill="#e5e7eb" />
            {/* Linhas de rua simuladas - Grade sutil */}
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5"/>
                </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#grid)" />
            
            {/* Polígonos da cerca */}
            {polygons.map((points, idx) => (
                <polygon
                    key={idx}
                    points={points}
                    fill={fence.color || '#f97316'}
                    fillOpacity="0.3"
                    stroke={borderColor}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            ))}
          </svg>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="text-gray-400 text-xs">Sem preview</div>
        </div>
      )}
      {/* Linha colorida separadora */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: borderColor }}></div>
    </div>
  )
}

const FencesPage: React.FC<FencesPageProps> = ({
  fences,
  perimeters,
  companies,
  onUpdateFence,
  onDeleteFence,
  onDeletePerimeter,
  onUpdatePerimeter,
  onAddPerimeter
}) => {
  const navigate = useNavigate()

  const openEditFencePage = (fence: Geofence) => {
    navigate(`/fences/${fence.id}/edit`)
  }

  const handleCreateFence = () => {
    navigate('/')
  }

  const handleRulesClick = (fenceId: number) => {
    navigate('/rules')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Cercas Virtuais
        </h1>
        <button
          onClick={handleCreateFence}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Criar Nova Cerca
        </button>
      </div>

      {fences.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-left text-gray-500">
          <p className="text-lg font-medium mb-2">Nenhuma cerca virtual criada</p>
          <p className="text-sm">Use o mapa para desenhar e criar novas cercas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fences.map(fence => {
            const fencePerimeters = perimeters.filter(p => p.fenceId === fence.id)
            const fencePerimeter = fencePerimeters[0]
            const fenceType = fencePerimeter?.type || 'polygon'
            
            return (
              <div key={fence.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left">
                {/* Preview do mapa */}
                <MapPreview fence={fence} perimeters={fencePerimeters} />
                
                {/* Conteúdo do card */}
                <div className="p-4 relative text-left">
                  {/* Indicador de status e cor */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      (fence.status === 'active' || !fence.status) 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {(fence.status === 'active' || !fence.status) ? 'Ativa' : 'Inativa'}
                    </span>
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: fence.color || '#f97316' }} title="Cor da cerca"></div>
                  </div>
                  
                  {/* Nome da cerca */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 pr-8">
                    {fence.name}
                  </h3>
                  
                  {/* Tipo da cerca */}
                  <p className="text-sm text-gray-500 mb-1">
                    Cerca do tipo: {fenceType}
                  </p>
                  
                  {/* Data de criação */}
                  <p className="text-sm text-gray-500 mb-4">
                    {formatRelativeTime(fence.createdAt)}
                  </p>
                  
                  {/* Botões de ação */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => handleRulesClick(fence.id)}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                        <line x1="4" y1="22" x2="4" y2="15"></line>
                      </svg>
                      Regras
                    </button>
                    <button
                      onClick={() => openEditFencePage(fence)}
                      className="p-2 text-gray-400 hover:text-orange-500 rounded-md hover:bg-orange-50 transition-colors border border-gray-200"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteFence(fence.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors border border-red-200"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FencesPage
