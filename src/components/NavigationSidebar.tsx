import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface NavigationSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ 
  isOpen = false,
  onClose
}) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-500' : 'text-gray-600 hover:bg-gray-50';
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[1040] md:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-[1050] w-64 bg-white h-full shadow-xl transform transition-transform duration-300 ease-in-out border-r border-gray-200
        md:hidden flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100">
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <span className="bg-blue-600 text-white p-1 rounded">iF</span>
             iFence
           </h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            <li>
              <Link 
                to="/" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <map name="map"></map>
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                  <line x1="8" y1="2" x2="8" y2="18"></line>
                  <line x1="16" y1="6" x2="16" y2="22"></line>
                </svg>
                <span className="font-medium">Mapa Geral</span>
              </Link>
            </li>
            
            <li className="px-6 py-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Gestão
            </li>

            <li>
              <Link 
                to="/organization" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/organization')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span className="font-medium">Organização</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/fences" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/fences')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  <path d="M2 12h20"></path>
                </svg>
                <span className="font-medium">Cercas Virtuais</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/rules" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/rules')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                  <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                <span className="font-medium">Regras</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/events" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/events')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span className="font-medium">Pins e Eventos</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/settings" 
                className={`flex items-center px-6 py-3 transition-colors ${isActive('/settings')}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="font-medium">Configurações</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                 <circle cx="12" cy="7" r="4"></circle>
               </svg>
             </div>
             <div>
               <p className="text-sm font-medium text-gray-700">Admin User</p>
               <p className="text-xs text-gray-500">admin@ifence.com</p>
             </div>
           </div>
        </div>
      </div>
    </>
  )
}

export default NavigationSidebar
