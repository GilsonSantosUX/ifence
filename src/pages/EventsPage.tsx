import React from 'react'
import type { GeofencePin } from '../services/DatabaseService'

interface EventsPageProps {
  pins: GeofencePin[]
  onDeletePin: (id: number) => void
}

const EventsPage: React.FC<EventsPageProps> = ({ pins, onDeletePin }) => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Pins e Eventos
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {pins.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhum evento registrado</p>
            <p className="text-sm">Os eventos e pins criados no mapa aparecerão aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pins.map(pin => (
              <div key={pin.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                        pin.status === 'completed' ? 'bg-green-500' : 
                        pin.status === 'in_progress' ? 'bg-blue-500' : 
                        pin.status === 'canceled' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                        <h3 className="font-medium text-gray-900">{pin.name}</h3>
                        <p className="text-sm text-gray-500">
                            {pin.actionType || 'Sem tipo de ação'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Status: <span className="capitalize">{pin.status}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onDeletePin(pin.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                    title="Excluir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                  <div className="text-sm text-gray-500">
                    {new Date(pin.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default EventsPage
