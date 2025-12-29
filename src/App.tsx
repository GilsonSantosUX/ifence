import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'

// Componentes
import Header from './components/Header'
import NavigationSidebar from './components/NavigationSidebar'
import MapView from './components/MapView'

// Páginas
import OrganizationPage from './pages/OrganizationPage'
import RulesPage from './pages/RulesPage'
import EventsPage from './pages/EventsPage'
import FencesPage from './pages/FencesPage'
import FenceEditPage from './pages/FenceEditPage'
import SettingsPage from './pages/SettingsPage'

// Serviços
import { wsService } from './services/WebSocketService'
import { dbService } from './services/DatabaseService'
import type { Geofence, Rule, Perimeter, GeofencePin, Company, Branch } from './services/DatabaseService'

function App() {
  const [fences, setFences] = useState<Geofence[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [perimeters, setPerimeters] = useState<Perimeter[]>([])
  const [pins, setPins] = useState<GeofencePin[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Carregar dados iniciais e configurar WebSocket
  useEffect(() => {
    // Carregar dados iniciais
    loadData();

    // Conectar ao servidor WebSocket
    const wsUrl = 'ws://localhost:5173';
    wsService.connect(wsUrl);
    
    // Listeners para atualizações em tempo real
    wsService.on('fence_update', loadData);
    wsService.on('fence_created', loadData);
    wsService.on('fence_updated', loadData);
    wsService.on('fence_deleted', loadData);
    wsService.on('perimeter_updated', (data) => {
        console.log('[App] WS perimeter_updated received:', data);
        loadPerimeters();
    });
    
    wsService.on('rule_update', loadRules);
    
    // Limpar conexão ao desmontar
    return () => {
      wsService.disconnect();
      wsService.off('fence_update', loadData);
      wsService.off('fence_created', loadData);
      wsService.off('fence_updated', loadData);
      wsService.off('fence_deleted', loadData);
      wsService.off('perimeter_updated', loadData); // Isso removerá qualquer listener genérico se houver
      wsService.off('rule_update', loadRules);
    };
  }, []);

  const loadFences = async () => {
    try {
      const data = await dbService.getFences();
      setFences(data);
    } catch (error) {
      console.error('Erro ao carregar cercas:', error);
    }
  };

  const loadRules = async () => {
    try {
      const data = await dbService.getRules();
      setRules(data);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    }
  };

  const loadPerimeters = async () => {
    try {
      console.log('[App] Loading perimeters...');
      const data = await dbService.getAllPerimeters();
      console.log('[App] Loaded perimeters:', data.length);
      setPerimeters(data);
    } catch (error) {
      console.error('Erro ao carregar perímetros:', error);
    }
  };

  const loadPins = async () => {
    try {
      const data = await dbService.getAllPins();
      setPins(data);
    } catch (error) {
      console.error('Erro ao carregar pins:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await dbService.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await dbService.getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([
      loadFences(), 
      loadRules(), 
      loadPerimeters(), 
      loadPins(),
      loadCompanies(),
      loadBranches()
    ]);
  };

  const handleCreateRule = async (rule: Omit<Rule, 'id' | 'createdAt'>) => {
    await dbService.addRule({
      ...rule,
      createdAt: new Date().toISOString()
    });
    loadRules();
  };

  const handleDeleteRule = async (id: number) => {
    await dbService.deleteRule(id);
    loadRules();
  };

  const handleUpdateFence = async (id: number, data: Partial<Geofence>) => {
    const fence = fences.find(f => f.id === id);
    if (fence) {
        await dbService.updateFence({ ...fence, ...data });
        loadFences();
    }
  };

  const handleDeleteFence = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta cerca? Todas as regras, perímetros e eventos associados serão excluídos.')) return;

    try {
        // Cascade delete
        const fencePerimeters = await dbService.getPerimetersByFence(id);
        for (const p of fencePerimeters) {
            await dbService.deletePerimeter(p.id);
        }

        const fenceRules = await dbService.getRulesByFence(id);
        for (const r of fenceRules) {
            await dbService.deleteRule(r.id);
        }

        const fencePins = await dbService.getPinsByFence(id);
        for (const p of fencePins) {
            await dbService.deletePin(p.id);
        }

        await dbService.deleteFence(id);
        
        loadData(); // Reload all data to ensure consistency
    } catch (error) {
        console.error('Erro ao excluir cerca:', error);
        alert('Erro ao excluir cerca');
    }
  };

  const handleUpdatePerimeter = async (perimeterId: number, coordinates: number[][]) => {
    try {
      console.log('[App] handleUpdatePerimeter:', perimeterId);
      const perimeter = perimeters.find(p => p.id === perimeterId);
      if (perimeter) {
        const updatedPerimeter = {
          ...perimeter,
          coordinates: coordinates
        };
        
        // Atualização Otimista
        setPerimeters(prev => prev.map(p => p.id === perimeterId ? updatedPerimeter : p));
        
        await dbService.updatePerimeter(updatedPerimeter);
        console.log('[App] Perimeter updated in DB');
        
        // Recarregar para garantir consistência e disparar eventos
        // loadPerimeters(); // Não estritamente necessário se a otimista estiver correta, mas bom para garantir
        
        wsService.sendMessage('perimeter_updated', { perimeterId });
      }
    } catch (error) {
      console.error('Erro ao atualizar perímetro:', error);
      alert('Erro ao atualizar perímetro');
      loadPerimeters(); // Reverter em caso de erro
    }
  };

  const handleDeletePerimeter = async (id: number) => {
    try {
      await dbService.deletePerimeter(id);
      loadPerimeters();
    } catch (error) {
      console.error('Erro ao deletar perímetro:', error);
      alert('Erro ao deletar perímetro');
    }
  };

  const handleAddPerimeter = async (fenceId: number, perimeter: Omit<Perimeter, 'id' | 'fenceId' | 'createdAt'>) => {
    try {
      await dbService.addPerimeter({
        ...perimeter,
        fenceId,
        createdAt: new Date().toISOString()
      });
      loadPerimeters();
    } catch (error) {
      console.error('Erro ao adicionar perímetro:', error);
      alert('Erro ao adicionar perímetro');
    }
  };

  const handleCreatePin = async (pin: Omit<GeofencePin, 'id' | 'createdAt'>) => {
    await dbService.addPin({
      ...pin,
      createdAt: new Date().toISOString()
    });
    loadPins();
  };

  const handleDeletePin = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        await dbService.deletePin(id);
        loadPins();
    }
  };

  const handleCreateCompany = async (company: Omit<Company, 'id' | 'createdAt'>) => {
    await dbService.addCompany({
      ...company,
      createdAt: new Date().toISOString()
    });
    loadCompanies();
  };

  const handleDeleteCompany = async (id: number) => {
    // TODO: Adicionar confirmação
    // TODO: Deletar filiais em cascata (idealmente no backend/serviço)
    await dbService.deleteCompany(id);
    loadCompanies();
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-100">
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar com menu de navegação */}
        <NavigationSidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        {/* Conteúdo Principal (Rotas) */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
           <Routes>
             <Route path="/" element={
               <MapView 
                 fences={fences} 
                 perimeters={perimeters}
                 pins={pins}
                 companies={companies}
                 rules={rules}
                 onCreatePin={handleCreatePin}
                 onDeleteFence={handleDeleteFence}
                 onDeletePerimeter={handleDeletePerimeter}
                 onUpdatePerimeter={handleUpdatePerimeter}
                 onRefresh={loadData}
               />
             } />
             
             <Route path="/organization" element={
               <OrganizationPage 
                 companies={companies}
                 branches={branches}
                 onCreateCompany={handleCreateCompany}
                 onDeleteCompany={handleDeleteCompany}
               />
             } />
             
             <Route path="/rules" element={
               <RulesPage 
                 rules={rules}
                 fences={fences}
                 onCreateRule={handleCreateRule}
                 onDeleteRule={handleDeleteRule}
               />
             } />

             <Route path="/fences" element={
               <FencesPage 
                 fences={fences}
                 perimeters={perimeters}
                 companies={companies}
                 onUpdateFence={handleUpdateFence}
                 onDeleteFence={handleDeleteFence}
                 onDeletePerimeter={handleDeletePerimeter}
                 onUpdatePerimeter={handleUpdatePerimeter}
                 onAddPerimeter={handleAddPerimeter}
               />
             } />

             <Route path="/fences/:id/edit" element={<FenceEditPage />} />
             
             <Route path="/events" element={
               <EventsPage 
                 pins={pins}
                 onDeletePin={handleDeletePin}
               />
             } />
             
             <Route path="/settings" element={<SettingsPage />} />
           </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
