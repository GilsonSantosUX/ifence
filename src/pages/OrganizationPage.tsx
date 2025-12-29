import React, { useState } from 'react'
import type { Company, Branch } from '../services/DatabaseService'
import Modal from '../components/ui/Modal'
import CompanyForm from '../components/forms/CompanyForm'

interface OrganizationPageProps {
  companies: Company[]
  branches: Branch[]
  onCreateCompany: (company: Omit<Company, 'id' | 'createdAt'>) => void
  onDeleteCompany: (id: number) => void
}

const OrganizationPage: React.FC<OrganizationPageProps> = ({
  companies,
  branches,
  onCreateCompany,
  onDeleteCompany
}) => {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const handleCreateCompany = (data: Omit<Company, 'id' | 'createdAt'>) => {
    onCreateCompany(data)
    setIsCompanyModalOpen(false)
    setEditingCompany(null)
  }

  const openNewCompanyModal = () => {
    setEditingCompany(null)
    setIsCompanyModalOpen(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Organização
        </h1>
        <button
          onClick={openNewCompanyModal}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nova Empresa
        </button>
      </div>

      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={editingCompany ? "Editar Empresa" : "Nova Empresa"}
      >
        <CompanyForm
          initialData={editingCompany}
          onSubmit={handleCreateCompany}
          onCancel={() => setIsCompanyModalOpen(false)}
        />
      </Modal>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {companies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhuma empresa cadastrada</p>
            <p className="text-sm">Comece criando uma organização para gerenciar suas filiais.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {companies.map(company => (
              <div key={company.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                  <p className="text-sm text-gray-500">
                    {branches.filter(b => b.companyId === company.id).length} Filiais
                  </p>
                </div>
                <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                   <button
                    onClick={() => setEditingCompany(company)} // TODO: Enable editing properly if needed
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                    title="Editar"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                     </svg>
                   </button>
                   <button
                    onClick={() => onDeleteCompany(company.id)}
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

export default OrganizationPage
