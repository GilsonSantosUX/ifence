import React, { useState, useEffect } from 'react';
import type { Rule, Geofence } from '../../services/DatabaseService';

interface RuleFormProps {
  initialData?: Rule | null;
  fences: Geofence[];
  onSubmit: (data: Omit<Rule, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const RuleForm: React.FC<RuleFormProps> = ({ initialData, fences, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    fenceId: fences.length > 0 ? fences[0].id : 0,
    condition: 'enter' as 'enter' | 'exit' | 'inside' | 'outside',
    action: 'notify' as 'notify' | 'alert' | 'block' | 'custom'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        fenceId: initialData.fenceId,
        condition: initialData.condition,
        action: initialData.action
      });
    } else if (fences.length > 0) {
       // Se for criação, garante que tem um fenceId válido selecionado por padrão
       setFormData(prev => ({ ...prev, fenceId: fences[0].id }));
    }
  }, [initialData, fences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fenceId === 0) {
        alert("Selecione uma cerca válida.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Nome da Regra
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
          Aplicar à Cerca
        </label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300"
          value={formData.fenceId}
          onChange={(e) => setFormData({ ...formData, fenceId: Number(e.target.value) })}
        >
            {fences.map(fence => (
                <option key={fence.id} value={fence.id}>{fence.name}</option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Condição
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
            >
                <option value="enter">Entrar</option>
                <option value="exit">Sair</option>
                <option value="inside">Dentro</option>
                <option value="outside">Fora</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Ação
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300"
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
            >
                <option value="notify">Notificar</option>
                <option value="alert">Alertar</option>
                <option value="block">Bloquear</option>
                <option value="custom">Personalizado</option>
            </select>
          </div>
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

export default RuleForm;
