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
    
    wsService.on('rule_update', loadRules);
    
    // Limpar conexão ao desmontar
    return () => {
      wsService.disconnect();
      wsService.off('fence_update', loadData);
      wsService.off('fence_created', loadData);
      wsService.off('fence_updated', loadData);
      wsService.off('fence_deleted', loadData);
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
      const data = await dbService.getAllPerimeters();
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
    await dbService.delete('rules', id);
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
    // TODO: Deletar perimeters/rules/pins em cascata
    await dbService.delete('fences', id);
    loadFences();
    loadPerimeters(); // Recarregar perimetros pois podem ter ficado orfãos (se não deletados)
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
    await dbService.delete('companies', id); // Usando método genérico por enquanto ou adicionar específico
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
                 onUpdateFence={handleUpdateFence}
                 onDeleteFence={handleDeleteFence}
               />
             } />
             
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
