import React, { useState, useEffect } from 'react';
import type { GeofencePin } from '../../services/DatabaseService';

interface PinFormProps {
  initialData?: GeofencePin | null;
  initialCoordinates?: [number, number] | null;
  fenceId?: number; // Opcional, se quisermos vincular a uma cerca específica
  onSubmit: (data: Omit<GeofencePin, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const PinForm: React.FC<PinFormProps> = ({ initialData, initialCoordinates, fenceId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    fenceId: fenceId || 0,
    coordinates: initialCoordinates || [0, 0] as [number, number],
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'canceled'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        fenceId: initialData.fenceId,
        coordinates: initialData.coordinates,
        status: initialData.status
      });
    } else if (initialCoordinates) {
        setFormData(prev => ({ ...prev, coordinates: initialCoordinates }));
    }
  }, [initialData, initialCoordinates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Nome do Pin
        </label>
        <input
          type="text"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Coordenadas
        </label>
        <div className="flex space-x-2">
            <input
                type="number"
                step="any"
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm text-gray-500"
                value={formData.coordinates[0]}
            />
            <input
                type="number"
                step="any"
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm text-gray-500"
                value={formData.coordinates[1]}
            />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Status
        </label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="canceled">Cancelado</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

export default PinForm;
