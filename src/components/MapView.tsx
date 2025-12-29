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
  onRefresh?: () => void;
}

export default function MapView({ fences, perimeters, pins, companies, onCreatePin, onDeleteFence, onRefresh }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<DrawControlRef>(null);

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

  // Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPinCoordinates, setNewPinCoordinates] = useState<[number, number] | null>(null);
  
  const [isFenceModalOpen, setIsFenceModalOpen] = useState(false);
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
      if (tokenSetting?.value) setToken(tokenSetting.value);
      if (styleSetting?.value) setMapStyle(styleSetting.value.startsWith('mapbox://') ? styleSetting.value : `mapbox://styles/mapbox/${styleSetting.value}-v12`);
    };
    loadSettings();
  }, []);

  // Prepare GeoJSON for Fences
  const fencesGeoJSON = useMemo(() => {
    const features = perimeters
      .filter(p => p.type === 'polygon' && p.coordinates && p.coordinates.length > 0)
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
  }, [fences, perimeters]);

  // Handle Draw Create
  const onUpdate = useCallback((e: any) => {
      // Handle updates if needed
  }, []);

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
                 if (deleteMode) {
                     if (window.confirm('Tem certeza que deseja excluir esta cerca?')) {
                         onDeleteFence && onDeleteFence(fenceId);
                     }
                 } else {
                     setSelectedFenceId(fenceId);
                 }
             } else {
                 setSelectedFenceId(null);
             }
        } else {
            setSelectedFenceId(null);
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
      if (mode === 'polygon' && drawRef.current) {
          drawRef.current.changeMode('draw_polygon');
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

  if (!token) {
      return (
          <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Mapbox não configurado</h2>
                  <p className="text-gray-600 mb-4">Configure o token de acesso nas configurações para visualizar o mapa.</p>
                  <a href="/settings" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Ir para Configurações</a>
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
        isOpen={isFenceModalOpen}
        onClose={() => { setIsFenceModalOpen(false); setTempFenceData(null); }}
        title="Nova Cerca"
        className="max-w-4xl"
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
        interactiveLayerIds={['fences-fill']} // Enable click on fences
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl position="top-right" />

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
            const perimeter = perimeters.find(p => p.fenceId === selectedFenceId);
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
                    onClose={() => setSelectedFenceId(null)}
                    closeOnClick={false}
                >
                    <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: fence.color }}></span>
                            {fence.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{fence.description || 'Sem descrição'}</p>
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
          onClick={() => { setDeleteMode(!deleteMode); setDrawMode(null); if (drawRef.current) drawRef.current.changeMode('simple_select'); }}
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