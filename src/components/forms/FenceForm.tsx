import React, { useState } from 'react';
import type { Company } from '../../services/DatabaseService';
// import { MapContainer, TileLayer, Polygon, Circle } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';

interface FenceFormProps {
  companies: Company[];
  initialData?: {
    name?: string;
    description?: string;
    companyId?: number;
    color?: string;
    ruleTemplate?: string;
    perimeterSize?: string; // Formatted string, e.g., "1.5 km" or "500 m"
    areaSize?: string;      // Formatted string
    address?: string;
    layerType?: 'polygon' | 'circle';
    coordinates?: any[];   // For polygon
    center?: [number, number]; // For circle
    radius?: number;       // For circle
  } | null;
  onSubmit: (data: {
    name: string;
    companyId: number;
    ruleTemplate: string;
    color: string;
    description: string;
  }) => void;
  onCancel: () => void;
}

const FenceForm: React.FC<FenceFormProps> = ({ companies, initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [companyId, setCompanyId] = useState<number | ''>(initialData?.companyId || '');
  const [ruleTemplate, setRuleTemplate] = useState(initialData?.ruleTemplate || 'monitor_entry');
  const [color, setColor] = useState(initialData?.color || '#f97316');
  const [description, setDescription] = useState(initialData?.description || '');

  const ruleOptions = [
    { value: 'monitor_entry', label: 'Monitorar Entrada' },
    { value: 'monitor_exit', label: 'Monitorar Saída' },
    { value: 'block_entry', label: 'Bloquear Entrada' },
    { value: 'block_exit', label: 'Bloquear Saída' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyId) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    onSubmit({
      name,
      companyId: Number(companyId),
      ruleTemplate,
      color,
      description
    });
  };

  /*
  // Determine center for mini-map
  const getCenter = (): [number, number] => {
    if (initialData?.layerType === 'circle' && initialData.center) {
      return initialData.center;
    }
    if (initialData?.layerType === 'polygon' && initialData.coordinates && initialData.coordinates.length > 0) {
        // Simple centroid approximation
        const lats = initialData.coordinates.map((c: any) => c.lat || c[0]);
        const lngs = initialData.coordinates.map((c: any) => c.lng || c[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
    }
    return [-23.5505, -46.6333];
  };

  const center = getCenter();
  */

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left Column: Form */}
      <div className="flex-1 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome da Cerca *</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Área Industrial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Organização *</label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              value={companyId}
              onChange={(e) => setCompanyId(Number(e.target.value))}
            >
              <option value="">Selecione uma organização...</option>
              {companies && companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Regra Inicial</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              value={ruleTemplate}
              onChange={(e) => setRuleTemplate(e.target.value)}
            >
              {ruleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700">Cor</label>
             <div className="flex items-center gap-2 mt-1">
               <input
                 type="color"
                 value={color}
                 onChange={(e) => setColor(e.target.value)}
                 className="h-10 w-20 p-1 rounded border border-gray-300"
               />
               <span className="text-sm text-gray-500">{color}</span>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Info Cards */}
          <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
             <div className="flex justify-between">
                <span className="text-gray-500">Perímetro:</span>
                <span className="font-medium">{initialData.perimeterSize}</span>
             </div>
             <div className="flex justify-between">
                  <span className="text-gray-500">Área Estimada:</span>
                  <span className="font-medium">{initialData?.areaSize}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                  <span className="block text-gray-500 text-xs mb-1">Endereço Aproximado:</span>
                  <p className="font-medium text-gray-800">{initialData?.address || 'Buscando...'}</p>
              </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
            >
              Salvar Cerca
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Mini Map (Snapshot) - Disabled for now due to Mapbox migration */}
      {/* 
      <div className="w-full md:w-64 h-64 md:h-auto bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
         <div className="absolute inset-0 pointer-events-none">
            <MapContainer 
                center={center} 
                zoom={15} 
                zoomControl={false} 
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {initialData.layerType === 'polygon' && (
                    <Polygon 
                        positions={initialData.coordinates as any}
                        pathOptions={{ color: color, fillColor: color, fillOpacity: 0.4 }}
                    />
                )}
                {initialData.layerType === 'circle' && initialData.center && initialData.radius && (
                    <Circle 
                        center={initialData.center}
                        radius={initialData.radius}
                        pathOptions={{ color: color, fillColor: color, fillOpacity: 0.4 }}
                    />
                )}
            </MapContainer>
         </div>
         <div className="absolute bottom-2 right-2 bg-white/80 text-xs px-2 py-1 rounded">
            Visualização
         </div>
      </div>
      */}
    </div>
  );
};

export default FenceForm;
