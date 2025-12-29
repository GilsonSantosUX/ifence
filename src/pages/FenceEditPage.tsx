import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FenceForm from '../components/forms/FenceForm';
import FenceMapEditor from '../components/map/FenceMapEditor';
import { dbService } from '../services/DatabaseService';
import { wsService } from '../services/WebSocketService';
import type { Geofence, Perimeter, Company, Rule } from '../services/DatabaseService';

const FenceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [fence, setFence] = useState<Geofence | null>(null);
  const [perimeters, setPerimeters] = useState<Perimeter[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);

  // Map/Editor State
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingPerimeterId, setEditingPerimeterId] = useState<number | null>(null);
  const [isAddingPerimeter, setIsAddingPerimeter] = useState(false);

  useEffect(() => {
    loadData();
    
    // Listen for updates
    wsService.on('fence_updated', loadData);
    wsService.on('perimeter_updated', loadData);
    
    return () => {
        wsService.off('fence_updated', loadData);
        wsService.off('perimeter_updated', loadData);
    };
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [fencesData, perimetersData, companiesData, rulesData] = await Promise.all([
        dbService.getFences(),
        dbService.getAllPerimeters(),
        dbService.getCompanies(),
        dbService.getRulesByFence(Number(id))
      ]);

      const currentFence = fencesData.find(f => f.id === Number(id));
      if (!currentFence) {
        alert('Cerca não encontrada');
        navigate('/fences');
        return;
      }

      setFence(currentFence);
      setPerimeters(perimetersData.filter(p => p.fenceId === Number(id)));
      setCompanies(companiesData);
      if (rulesData && rulesData.length > 0) {
        setRule(rulesData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRuleTemplate = (r: Rule): string => {
    if (r.condition === 'enter' && r.action === 'notify') return 'monitor_entry';
    if (r.condition === 'exit' && r.action === 'notify') return 'monitor_exit';
    if (r.condition === 'enter' && r.action === 'block') return 'block_entry';
    if (r.condition === 'exit' && r.action === 'block') return 'block_exit';
    return 'monitor_entry'; // default
  };

  const handleUpdateFence = async (data: {
    name: string;
    companyId: number | null;
    ruleTemplate: string;
    color: string;
    description: string;
    status: 'active' | 'inactive';
  }) => {
    if (!fence) return;
    
    try {
        await dbService.updateFence({
            ...fence,
            name: data.name,
            companyId: data.companyId || undefined, // Convert null to undefined if needed, or pass null
            color: data.color,
            description: data.description,
            status: data.status
        });

        // Update Rule
        if (rule) {
             let ruleConfig: any = { condition: 'enter', action: 'notify' };
             let ruleName = 'Monitorar Entrada';

             if (data.ruleTemplate === 'monitor_exit') {
                 ruleConfig = { condition: 'exit', action: 'notify' };
                 ruleName = 'Monitorar Saída';
             } else if (data.ruleTemplate === 'block_entry') {
                 ruleConfig = { condition: 'enter', action: 'block' };
                 ruleName = 'Bloquear Entrada';
             } else if (data.ruleTemplate === 'block_exit') {
                 ruleConfig = { condition: 'exit', action: 'block' };
                 ruleName = 'Bloquear Saída';
             }

             await dbService.updateRule({
                 ...rule,
                 name: ruleName,
                 condition: ruleConfig.condition,
                 action: ruleConfig.action
             });
        }

        navigate('/fences');
    } catch (error) {
        console.error('Erro ao atualizar cerca:', error);
        alert('Erro ao atualizar cerca');
    }
  };

  const handleDeletePerimeter = async (perimeterId: number) => {
    if (confirm('Tem certeza que deseja excluir este perímetro?')) {
        try {
            await dbService.deletePerimeter(perimeterId);
            loadData();
        } catch (error) {
            console.error('Erro ao deletar perímetro:', error);
        }
    }
  };

  const handleEditPerimeterRequest = (perimeterId: number) => {
    setEditingPerimeterId(perimeterId);
    setIsAddingPerimeter(false);
    setIsMapOpen(true);
  };

  const handleAddPerimeterRequest = () => {
    setEditingPerimeterId(null);
    setIsAddingPerimeter(true);
    setIsMapOpen(true);
  };

  const handleMapSave = async (perimeterId: number | null, coordinates: number[][]) => {
      if (!fence) return;

      try {
          console.log('[FenceEditPage] Saving perimeter:', perimeterId);
          if (perimeterId) {
              // Update existing
              const perimeter = perimeters.find(p => p.id === perimeterId);
              if (perimeter) {
                  await dbService.updatePerimeter({
                      ...perimeter,
                      coordinates
                  });
                  wsService.sendMessage('perimeter_updated', { perimeterId });
              }
          } else {
              // Create new
              const newId = await dbService.addPerimeter({
                  fenceId: fence.id,
                  type: 'polygon',
                  coordinates,
                  createdAt: new Date().toISOString()
              });
              wsService.sendMessage('fence_updated', { fenceId: fence.id }); // Ou criar evento específico perimeter_created
              wsService.sendMessage('perimeter_updated', { perimeterId: newId });
          }
          
          console.log('[FenceEditPage] Saved successfully');
          loadData();
          setIsMapOpen(false);
          setEditingPerimeterId(null);
          setIsAddingPerimeter(false);
      } catch (error) {
          console.error('Erro ao salvar perímetro:', error);
          alert('Erro ao salvar perímetro');
      }
  };

  const handleUpdatePerimeterName = async (perimeterId: number, name: string) => {
    // Optimistic update
    setPerimeters(prev => prev.map(p => 
        p.id === perimeterId ? { ...p, name } : p
    ));

    try {
        const perimeter = perimeters.find(p => p.id === perimeterId);
        if (perimeter) {
            await dbService.updatePerimeter({
                ...perimeter,
                name
            });
            wsService.sendMessage('perimeter_updated', { perimeterId });
        }
    } catch (error) {
        console.error('Erro ao atualizar nome do perímetro:', error);
        loadData(); // Revert on error
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!fence) return null;

  return (
    <div className="flex flex-col h-full bg-white">
        {isMapOpen ? (
            <div className="flex-1 relative">
                <FenceMapEditor
                    perimeters={perimeters}
                    editingPerimeterId={editingPerimeterId}
                    isAddingPerimeter={isAddingPerimeter}
                    fenceColor={fence.color || '#f97316'}
                    onSave={handleMapSave}
                    onCancel={() => {
                        setIsMapOpen(false);
                        setEditingPerimeterId(null);
                        setIsAddingPerimeter(false);
                    }}
                />
            </div>
        ) : (
            <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
                <FenceForm
                    companies={companies}
                    fenceId={fence.id}
                    perimeters={perimeters}
                    initialData={{
                        name: fence.name,
                        description: fence.description,
                        companyId: fence.companyId,
                        color: fence.color,
                        status: fence.status || 'active',
                        ruleTemplate: rule ? getRuleTemplate(rule) : 'monitor_entry'
                    }}
                    onSubmit={handleUpdateFence}
                    onCancel={() => navigate('/fences')}
                    onDeletePerimeter={handleDeletePerimeter}
                    onEditPerimeterRequest={handleEditPerimeterRequest}
                    onAddPerimeterRequest={handleAddPerimeterRequest}
                    onUpdatePerimeterName={handleUpdatePerimeterName}
                />
            </div>
        )}
    </div>
  );
};

export default FenceEditPage;
