import { useState, useEffect } from 'react';
import { dbService } from '../services/DatabaseService';
import { Check, ExternalLink, Map as MapIcon, Layers } from 'lucide-react';
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
  const [mapboxToken, setMapboxToken] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('mapbox://styles/mapbox/satellite-v9');
  const [isSaved, setIsSaved] = useState(false);
  // const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const tokenSetting = await dbService.getSettings('mapbox_token');
      const styleSetting = await dbService.getSettings('mapbox_style');
      
      if (tokenSetting) {
        setMapboxToken(tokenSetting.value);
        setIsSaved(true);
      }
      if (styleSetting) {
        setSelectedStyle(styleSetting.value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      // setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await dbService.saveSettings({ id: 'mapbox_token', value: mapboxToken });
      await dbService.saveSettings({ id: 'mapbox_style', value: selectedStyle });
      setIsSaved(true);
      
      // Force reload to apply map changes if needed, or better, use context/state
      // For now, simple save is enough.
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <p className="text-gray-500 mb-6">Configure os serviços necessários para o funcionamento do aplicativo</p>

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
                  Insira seu token de acesso público do Mapbox para habilitar a funcionalidade de mapas
                </p>
              </div>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={mapboxToken}
                onChange={(e) => {
                    setMapboxToken(e.target.value);
                    setIsSaved(false);
                }}
                placeholder="pk.ey..."
                className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
              />
              <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                Obtenha seu token de acesso em
                <a 
                  href="https://account.mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 hover:underline flex items-center gap-1"
                >
                  account.mapbox.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 rounded-md transition-colors shadow-sm mb-4"
            >
              Salvar Token
            </button>

            {isSaved && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-8">
                <Check className="w-4 h-4" />
                Token configurado
              </div>
            )}

            <hr className="border-gray-100 my-8" />

            <div className="flex items-start gap-3 mb-6">
              <Layers className="w-6 h-6 text-gray-700 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Estilo do Mapa</h3>
                <p className="text-gray-500 text-sm mt-1">Escolha a aparência padrão do mapa</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        // Auto-save style change or require button? 
                        // UX-wise, let's require explicit save or just update state for now.
                        // For consistency with token, let's require "Salvar Token" to save everything or auto-save this part?
                        // Let's rely on the main save button for now to keep it simple as per screenshot which has one big button.
                        setIsSaved(false); 
                    }}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{style.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}