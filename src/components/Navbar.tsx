import { useState } from 'react';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ReservaFacilIcon } from './ReservaFacilIcon';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar = ({ currentView, setCurrentView }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, externalUser, userRole, isExternalAuth, logout, loading } = useAuth();
  
  const currentUser = isExternalAuth ? externalUser : user;
  const userEmail = isExternalAuth ? externalUser?.user?.email : user?.email;
  const userName = isExternalAuth ? externalUser?.user?.name : user?.user_metadata?.name;

  const handleSignOut = async () => {
    await logout();
    setCurrentView('home');
  };

  // Mostrar loading si está cargando
  if (loading) {
    return (
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <ReservaFacilIcon size={32} />
                <span className="text-xl font-bold text-gray-800">ReservaFácil</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setCurrentView('home')}
            >
              <ReservaFacilIcon size={32} />
              <span className="text-xl font-bold text-gray-800">ReservaFácil</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!currentUser ? (
              <>
                <button
                  onClick={() => setCurrentView('home')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'home'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Inicio
                </button>
                <button
                  onClick={() => setCurrentView('browse')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'browse'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Explorar Servicios
                </button>
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrarse
                </button>
              </>
            ) : (
              <>
                {userRole === 'admin' ? (
                  <>
                    <button
                      onClick={() => setCurrentView('admin-dashboard')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'admin-dashboard'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Panel Admin
                    </button>
                    <button
                      onClick={() => setCurrentView('browse')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'browse'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Explorar
                    </button>
                  </>
                ) : userRole === 'business' ? (
                  <>
                    <button
                      onClick={() => setCurrentView('business-dashboard')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'business-dashboard'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Mi Negocio
                    </button>
                    <button
                      onClick={() => setCurrentView('business-bookings')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'business-bookings'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Reservas
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCurrentView('browse')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'browse'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Explorar
                    </button>
                    <button
                      onClick={() => setCurrentView('my-bookings')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentView === 'my-bookings'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      Mis Reservas
                    </button>
                  </>
                )}
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                      {userName || userEmail}
                    </span>
                    {userName && (
                      <span className="text-xs text-gray-500">{userEmail}</span>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-700 hover:text-red-600 p-2 rounded-md"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {!currentUser ? (
              <>
                <button
                  onClick={() => {
                    setCurrentView('home');
                    setIsOpen(false);
                  }}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                >
                  Inicio
                </button>
                <button
                  onClick={() => {
                    setCurrentView('browse');
                    setIsOpen(false);
                  }}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                >
                  Explorar Servicios
                </button>
                <button
                  onClick={() => {
                    setCurrentView('login');
                    setIsOpen(false);
                  }}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => {
                    setCurrentView('register');
                    setIsOpen(false);
                  }}
                  className="block px-3 py-2 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full text-left"
                >
                  Registrarse
                </button>
              </>
            ) : (
              <>
                {userRole === 'admin' ? (
                  <>
                    <button
                      onClick={() => {
                        setCurrentView('admin-dashboard');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Panel Admin
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('browse');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Explorar
                    </button>
                  </>
                ) : userRole === 'business' ? (
                  <>
                    <button
                      onClick={() => {
                        setCurrentView('business-dashboard');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Mi Negocio
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('business-bookings');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Reservas
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setCurrentView('browse');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Explorar
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('my-bookings');
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 w-full text-left"
                    >
                      Mis Reservas
                    </button>
                  </>
                )}
                <div className="px-3 py-2 border-t border-gray-200 mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {userName || userEmail}
                      </p>
                      {userName && (
                        <p className="text-xs text-gray-500">{userEmail}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-red-600 hover:text-red-700 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};