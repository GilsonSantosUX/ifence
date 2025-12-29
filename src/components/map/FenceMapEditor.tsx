import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, GeolocateControl } from 'react-map-gl/mapbox';
import DrawControl, { type DrawControlRef } from './DrawControl';
import { dbService } from '../../services/DatabaseService';
import type { Perimeter } from '../../services/DatabaseService';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import mapboxgl from 'mapbox-gl';

interface FenceMapEditorProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  perimeters: Perimeter[];
  editingPerimeterId: number | null; // If null and isAdding=false, view only (or select to edit)
  isAddingPerimeter: boolean;
  fenceColor: string;
  onSave: (perimeterId: number | null, coordinates: number[][]) => void; // perimeterId null means new
  onCancel: () => void;
}

export default function FenceMapEditor({
  initialViewState,
  perimeters,
  editingPerimeterId,
  isAddingPerimeter,
  fenceColor,
  onSave,
  onCancel
}: FenceMapEditorProps) {
  const mapRef = useRef<any>(null);
  const drawRef = useRef<DrawControlRef>(null);

  const [token, setToken] = useState<string>(import.meta.env.VITE_MAPBOX_API || '');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/satellite-v9');
  const [viewState, setViewState] = useState(initialViewState || {
    longitude: -46.6333,
    latitude: -23.5505,
    zoom: 13
  });

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      const styleSetting = await dbService.getSettings('mapbox_style');
      if (styleSetting?.value) setMapStyle(styleSetting.value.startsWith('mapbox://') ? styleSetting.value : `mapbox://styles/mapbox/${styleSetting.value}-v12`);
    };
    loadSettings();
  }, []);

  // Initialize Draw Control with existing perimeter if editing
  const onMapLoad = useCallback(() => {
    if (!drawRef.current) return;

    if (editingPerimeterId) {
      const perimeter = perimeters.find(p => p.id === editingPerimeterId);
      if (perimeter && perimeter.coordinates) {
        // Convert [lat, lng] to [lng, lat]
        const mapboxCoords = perimeter.coordinates.map(c => [c[1], c[0]]);
        
        // Ensure closed polygon
        if (mapboxCoords.length > 0 && (
            mapboxCoords[0][0] !== mapboxCoords[mapboxCoords.length - 1][0] || 
            mapboxCoords[0][1] !== mapboxCoords[mapboxCoords.length - 1][1])) {
            mapboxCoords.push(mapboxCoords[0]);
        }

        const feature = {
          id: 'editing-feature',
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [mapboxCoords]
          },
          properties: {}
        };

        drawRef.current.add(feature);
        
        // Fit bounds
        if (mapRef.current) {
            const bounds = mapboxCoords.reduce((bounds, coord) => {
                return bounds.extend(coord as [number, number]);
            }, new mapboxgl.LngLatBounds(mapboxCoords[0] as [number, number], mapboxCoords[0] as [number, number]));
            
            mapRef.current.fitBounds(bounds, { padding: 100 });
        }

        // Enter direct_select mode
        setTimeout(() => {
            if (drawRef.current) {
                drawRef.current.changeMode('direct_select', { featureId: 'editing-feature' });
            }
        }, 100);
      }
    } else if (isAddingPerimeter) {
        if (drawRef.current) {
            drawRef.current.changeMode('draw_polygon');
        }
    } else {
        // View mode - fit bounds to all perimeters
        const allCoords: number[][] = [];
        perimeters.forEach(p => {
            if (p.coordinates) {
                p.coordinates.forEach(c => allCoords.push([c[1], c[0]])); // [lng, lat]
            }
        });

        if (allCoords.length > 0 && mapRef.current) {
            const bounds = allCoords.reduce((bounds, coord) => {
                return bounds.extend(coord as [number, number]);
            }, new mapboxgl.LngLatBounds(allCoords[0] as [number, number], allCoords[0] as [number, number]));
            mapRef.current.fitBounds(bounds, { padding: 100 });
        }
    }
  }, [editingPerimeterId, isAddingPerimeter, perimeters]);

  const handleSave = () => {
    if (!drawRef.current) return;
    
    const all = drawRef.current.getAll();
    if (all.features.length === 0) return;

    const feature = all.features[0];
    if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0]; // [lng, lat]
        // Convert to [lat, lng]
        const dbCoords = coords.map((c: any) => [c[1], c[0]]);
        
        // Remove duplicate last point
         if (dbCoords.length > 1 && 
            dbCoords[0][0] === dbCoords[dbCoords.length - 1][0] && 
            dbCoords[0][1] === dbCoords[dbCoords.length - 1][1]) {
            dbCoords.pop();
        }

        onSave(editingPerimeterId, dbCoords);
    }
  };

  // GeoJSON for other perimeters (read-only context)
  const otherPerimetersGeoJSON = {
    type: 'FeatureCollection',
    features: perimeters
        .filter(p => p.id !== editingPerimeterId)
        .map(p => ({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [p.coordinates?.map(c => [c[1], c[0]])] // [lng, lat]
            },
            properties: {}
        }))
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
    <div className="relative w-full h-full">
        <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            mapboxAccessToken={token}
            onLoad={onMapLoad}
        >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />
            <GeolocateControl position="top-right" />

            <DrawControl
                ref={drawRef}
                position="top-left"
                displayControlsDefault={false}
                controls={{
                    polygon: true,
                    trash: true
                }}
            />

            {/* Render other perimeters as static layers */}
            <Source id="other-perimeters" type="geojson" data={otherPerimetersGeoJSON as any}>
                <Layer
                    id="other-perimeters-fill"
                    type="fill"
                    paint={{
                        'fill-color': fenceColor,
                        'fill-opacity': 0.1
                    }}
                />
                <Layer
                    id="other-perimeters-line"
                    type="line"
                    paint={{
                        'line-color': fenceColor,
                        'line-width': 2
                    }}
                />
            </Source>

            {/* Controls */}
            <div className="absolute top-4 right-14 bg-white p-2 rounded shadow flex gap-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                    Salvar Perímetro
                </button>
            </div>
        </Map>
    </div>
  );
}
