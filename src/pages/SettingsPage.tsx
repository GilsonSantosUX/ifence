import { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/DatabaseService';
import { wsService } from '../services/WebSocketService';
import { runIntegrationTests } from '../utils/IntegrationTests';
import { Check, ExternalLink, Map as MapIcon, Layers, Wifi, WifiOff, RefreshCw, Upload, Download, Trash2, Database, Activity } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const MAPBOX_STYLES = [
  { id: 'mapbox://styles/mapbox/streets-v12', label: 'Ruas', value: 'streets' },
  { id: 'mapbox://styles/mapbox/satellite-v9', label: 'Satélite', value: 'satellite' },
  { id: 'mapbox://styles/mapbox/light-v11', label: 'Claro', value: 'light' },
  { id: 'mapbox://styles/mapbox/dark-v11', label: 'Escuro', value: 'dark' },
  { id: 'mapbox://styles/mapbox/outdoors-v12', label: 'Ao ar livre', value: 'outdoors' },
  { id: 'mapbox://styles/mapbox/standard', label: '3D (Edifícios)', value: 'standard' },
];

export default function SettingsPage() {
  const [selectedStyle, setSelectedStyle] = useState('mapbox://styles/mapbox/satellite-v9');
  const [mapboxToken, setMapboxToken] = useState('');
  const [envTokenStatus, setEnvTokenStatus] = useState<'loaded' | 'missing'>('missing');
  const [isSaved, setIsSaved] = useState(false);
  
  // WebSocket State
  const [wsUrl, setWsUrl] = useState('');
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [wsMessage, setWsMessage] = useState('');

  // Data State
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    checkEnvToken();

    // WebSocket Listeners
    const onConnect = () => setWsStatus('connected');
    const onDisconnect = () => setWsStatus('disconnected');
    const onError = () => setWsStatus('disconnected');

    wsService.on('connect', onConnect);
    wsService.on('disconnect', onDisconnect);
    wsService.on('error', onError);

    return () => {
        wsService.off('connect', onConnect);
        wsService.off('disconnect', onDisconnect);
        wsService.off('error', onError);
    };
  }, []);

  const checkEnvToken = () => {
    const token = import.meta.env.VITE_MAPBOX_API;
    if (token) {
      console.log('Mapbox token loaded successfully from environment variables.');
      setEnvTokenStatus('loaded');
    } else {
      console.error('Mapbox token is missing in environment variables (VITE_MAPBOX_API).');
      setEnvTokenStatus('missing');
    }
  };

  const loadSettings = async () => {
    try {
      const getSettingValue = (setting: any) => {
        if (!setting?.value) return '';
        if (typeof setting.value === 'object' && setting.value !== null && 'value' in setting.value) {
            return setting.value.value;
        }
        return setting.value;
      };

      const styleSetting = await dbService.getSettings('mapbox_style');
      if (styleSetting) {
        setSelectedStyle(getSettingValue(styleSetting));
      }
      
      const tokenSetting = await dbService.getSettings('mapbox_token');
      if (tokenSetting) {
        setMapboxToken(getSettingValue(tokenSetting));
      }

      const wsUrlSetting = await dbService.getSettings('websocket_url');
      if (wsUrlSetting) {
        setWsUrl(getSettingValue(wsUrlSetting));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await dbService.saveSettings({ id: 'mapbox_style', value: selectedStyle });
      await dbService.saveSettings({ id: 'mapbox_token', value: mapboxToken });
      await dbService.saveSettings({ id: 'websocket_url', value: wsUrl });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    }
  };

  // WebSocket Handlers
  const handleConnectWs = () => {
    if (!wsUrl) return;
    setWsStatus('connecting');
    wsService.connect(wsUrl);
  };

  const handleDisconnectWs = () => {
    wsService.disconnect();
  };

  // Data Handlers
  const handleExportData = async () => {
    try {
        const data = await dbService.exportDatabase();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifence-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        alert('Erro ao exportar dados.');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            await dbService.importDatabase(data);
            alert('Dados importados com sucesso!');
            window.location.reload();
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            alert('Erro ao importar arquivo. Verifique se o formato é válido.');
        }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados do aplicativo (cercas, configurações, etc). Esta ação não pode ser desfeita. Deseja continuar?')) {
        try {
            await dbService.clearDatabase();
            alert('Todos os dados foram apagados.');
            window.location.reload();
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            alert('Erro ao limpar dados.');
        }
    }
  };

  const handleRunDiagnostics = async () => {
    const results = await runIntegrationTests();
    alert(results.join('\n'));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-left">Configurações</h1>
      <p className="text-gray-500 mb-6 text-left">Configure os serviços necessários para o funcionamento do aplicativo</p>

      <Tabs.Root defaultValue="mapbox" className="w-full">
        <Tabs.List className="flex border-b border-gray-200 mb-6 bg-gray-50 rounded-t-lg">
          <Tabs.Trigger 
            value="mapbox"
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-white rounded-tl-lg transition-colors"
          >
            Mapbox
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="websocket"
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-white transition-colors"
          >
            WebSocket
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="data"
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-white rounded-tr-lg transition-colors"
          >
            Dados
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="mapbox" className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm min-h-[400px]">
          <div className="max-w-2xl">
            <div className="flex items-start gap-3 mb-6">
              <MapIcon className="w-6 h-6 text-gray-700 mt-1" />
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Configuração do Mapbox</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Status da integração com Mapbox API
                </p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="mb-4">
                <label htmlFor="mapbox-token" className="block text-sm font-medium text-gray-700 mb-2">Token de Acesso (Opcional)</label>
                <input
                  id="mapbox-token"
                  type="text"
                  value={mapboxToken}
                  onChange={(e) => {
                    setMapboxToken(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder={envTokenStatus === 'loaded' ? 'Usando token do ambiente (.env)' : 'Insira seu token público (pk...)'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se deixado em branco, o sistema tentará usar o token definido no arquivo .env
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${envTokenStatus === 'loaded' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium text-gray-700 text-sm">
                  {envTokenStatus === 'loaded' ? 'Token de API detectado no ambiente (.env)' : 'Token de API não encontrado no arquivo .env'}
                </span>
              </div>
              {envTokenStatus === 'missing' && !mapboxToken && (
                <p className="text-sm text-red-500 mt-2 ml-6">
                  Defina a variável VITE_MAPBOX_API no arquivo .env ou insira o token manualmente acima.
                </p>
              )}
            </div>

            <hr className="border-gray-100 my-8" />

            <div className="flex items-start gap-3 mb-6">
              <Layers className="w-6 h-6 text-gray-700 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 text-left">Estilo do Mapa</h3>
                <p className="text-gray-500 text-sm mt-1">Escolha a aparência padrão do mapa</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {MAPBOX_STYLES.map((style) => (
                <label 
                  key={style.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedStyle === style.id 
                      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mapStyle"
                    value={style.id}
                    checked={selectedStyle === style.id}
                    onChange={(e) => {
                        setSelectedStyle(e.target.value);
                        setIsSaved(false); 
                    }}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{style.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 rounded-md transition-colors shadow-sm"
            >
              Salvar Configurações
            </button>
            
            {isSaved && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-4 justify-center">
                <Check className="w-4 h-4" />
                Configurações salvas
              </div>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="websocket" className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm min-h-[400px]">
          <div className="max-w-2xl">
            <div className="flex items-start gap-3 mb-6">
              <Wifi className="w-6 h-6 text-gray-700 mt-1" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Configuração do WebSocket</h2>
                <p className="text-gray-500 text-sm mt-1">Conexão em tempo real para monitoramento</p>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="ws-url" className="block text-sm font-medium text-gray-700 mb-2">URL do Servidor</label>
              <input
                id="ws-url"
                type="text"
                value={wsUrl}
                onChange={(e) => {
                    setWsUrl(e.target.value);
                    setIsSaved(false);
                }}
                placeholder="ws://localhost:8080"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Insira o endereço completo do servidor WebSocket (ex: ws://192.168.1.10:8080)</p>
            </div>

            <div className="flex items-center gap-4 mb-8">
              {wsStatus === 'disconnected' ? (
                <button
                  onClick={handleConnectWs}
                  disabled={!wsUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Testar Conexão
                </button>
              ) : (
                <button
                  onClick={handleDisconnectWs}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <WifiOff className="w-4 h-4" />
                  Desconectar
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-500' : 
                  wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span className="text-sm font-medium text-gray-700">
                  {wsStatus === 'connected' ? 'Conectado' : 
                   wsStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>
            </div>

            <hr className="border-gray-100 my-8" />

            <button
              onClick={handleSave}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 rounded-md transition-colors shadow-sm"
            >
              Salvar Configurações
            </button>
            
            {isSaved && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-4 justify-center">
                <Check className="w-4 h-4" />
                Configurações salvas
              </div>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="data" className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm min-h-[400px]">
          <div className="max-w-2xl">
            <div className="flex items-start gap-3 mb-6">
              <Database className="w-6 h-6 text-gray-700 mt-1" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Gerenciamento de Dados</h2>
                <p className="text-gray-500 text-sm mt-1">Importar, exportar ou limpar dados do aplicativo</p>
              </div>
            </div>

            <div className="space-y-6">
                {/* Exportar */}
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-md font-bold text-gray-800">Exportar Backup</h3>
                            <p className="text-sm text-gray-600 mt-1">Baixar todos os dados (cercas, configurações) em formato JSON.</p>
                        </div>
                        <button 
                            onClick={handleExportData}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    </div>
                </div>

                {/* Importar */}
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-md font-bold text-gray-800">Restaurar Backup</h3>
                            <p className="text-sm text-gray-600 mt-1">Importar dados de um arquivo JSON. Isso substituirá os dados atuais.</p>
                        </div>
                        <div className="relative">
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImportData}
                                accept=".json"
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
                            >
                                <Upload className="w-4 h-4" />
                                Importar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Diagnóstico */}
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-md font-bold text-blue-800">Diagnóstico do Sistema</h3>
                            <p className="text-sm text-blue-600 mt-1">Executar testes de integridade e verificar conexões.</p>
                        </div>
                        <button 
                            onClick={handleRunDiagnostics}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-all shadow-sm"
                        >
                            <Activity className="w-4 h-4" />
                            Verificar
                        </button>
                    </div>
                </div>

                {/* Limpar */}
                <div className="p-4 border border-red-100 rounded-lg bg-red-50 hover:bg-red-100 transition-colors mt-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-md font-bold text-red-800">Zona de Perigo</h3>
                            <p className="text-sm text-red-600 mt-1">Apagar permanentemente todos os dados armazenados localmente.</p>
                        </div>
                        <button 
                            onClick={handleClearData}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Limpar Tudo
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}