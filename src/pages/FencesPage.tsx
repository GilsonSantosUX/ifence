import React, { useState } from 'react'
import type { Geofence, Perimeter } from '../services/DatabaseService'
import Modal from '../components/ui/Modal'
import FenceForm from '../components/forms/FenceForm'

interface FencesPageProps {
  fences: Geofence[]
  perimeters: Perimeter[]
  onUpdateFence: (id: number, data: Partial<Geofence>) => void
  onDeleteFence: (id: number) => void
}

const FencesPage: React.FC<FencesPageProps> = ({
  fences,
  perimeters,
  onUpdateFence,
  onDeleteFence
}) => {
  const [isFenceModalOpen, setIsFenceModalOpen] = useState(false)
  const [editingFence, setEditingFence] = useState<Geofence | null>(null)

  const openEditFenceModal = (fence: Geofence) => {
    setEditingFence(fence)
    setIsFenceModalOpen(true)
  }

  const handleUpdateFence = (data: Partial<Geofence>) => {
    if (editingFence) {
        onUpdateFence(editingFence.id, data)
    }
    setIsFenceModalOpen(false)
    setEditingFence(null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
            Gerenciar Cercas Virtuais
        </h1>
      </div>

      <Modal
        isOpen={isFenceModalOpen}
        onClose={() => setIsFenceModalOpen(false)}
        title="Editar Cerca"
      >
        <FenceForm
            initialData={editingFence}
            onSubmit={handleUpdateFence}
            onCancel={() => setIsFenceModalOpen(false)}
        />
      </Modal>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {fences.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhuma cerca virtual criada</p>
            <p className="text-sm">Use o mapa para desenhar e criar novas cercas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {fences.map(fence => {
                const fencePerimeters = perimeters.filter(p => p.fenceId === fence.id);
                return (
                  <div key={fence.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: fence.color }}></span>
                        {fence.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {fencePerimeters.length} perímetro(s)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                          Criado em: {new Date(fence.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <button
                        onClick={() => openEditFenceModal(fence)}
                        className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-50"
                        title="Editar"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                         </svg>
                       </button>
                       <button
                        onClick={() => onDeleteFence(fence.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                        title="Excluir"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                         </svg>
                       </button>
                    </div>
                  </div>
                )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default FencesPage
