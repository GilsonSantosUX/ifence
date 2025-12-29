import React, { useState } from 'react'
import type { Rule, Geofence } from '../services/DatabaseService'
import Modal from '../components/ui/Modal'
import RuleForm from '../components/forms/RuleForm'

interface RulesPageProps {
  rules: Rule[]
  fences: Geofence[]
  onCreateRule: (rule: Omit<Rule, 'id' | 'createdAt'>) => void
  onDeleteRule: (id: number) => void
}

const RulesPage: React.FC<RulesPageProps> = ({
  rules,
  fences,
  onCreateRule,
  onDeleteRule
}) => {
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  const handleCreateRule = (data: Omit<Rule, 'id' | 'createdAt'>) => {
    onCreateRule(data)
    setIsRuleModalOpen(false)
    setEditingRule(null)
  }

  const openNewRuleModal = () => {
    setEditingRule(null)
    setIsRuleModalOpen(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            Regras de Monitoramento
        </h1>
        <button
          onClick={openNewRuleModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nova Regra
        </button>
      </div>

      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? "Editar Regra" : "Nova Regra"}
      >
        <RuleForm
          initialData={editingRule}
          fences={fences}
          onSubmit={handleCreateRule}
          onCancel={() => setIsRuleModalOpen(false)}
        />
      </Modal>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhuma regra definida</p>
            <p className="text-sm">Crie regras para disparar alertas quando condições forem atendidas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {rule.condition === 'enter' ? 'Entrada' : 'Saída'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {rule.action}
                      </span>
                  </div>
                </div>
                <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                   <button
                    onClick={() => onDeleteRule(rule.id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RulesPage
