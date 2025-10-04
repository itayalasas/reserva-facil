import { useState, useEffect } from 'react';
import { ArrowRight, Shield, Zap, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ReservaFacilIcon } from './ReservaFacilIcon';

interface AuthFormsProps {
  view: 'login' | 'register';
  setCurrentView: (view: string) => void;
}

export const AuthForms = ({ view, setCurrentView }: AuthFormsProps) => {
  const { login: externalLogin, isAuthenticated, userRole } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === 'admin') {
        setCurrentView('admin-dashboard');
      } else if (userRole === 'business') {
        setCurrentView('business-dashboard');
      } else {
        setCurrentView('browse');
      }
    }
  }, [isAuthenticated, userRole, setCurrentView]);

  // Si ya está autenticado, mostrar mensaje de redirección
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <ReservaFacilIcon size={48} />
              <span className="text-3xl font-bold text-gray-900">ReservaFácil</span>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ya tienes una sesión activa
              </h2>
              
              <p className="text-lg text-green-600 mb-6">
                Redirigiendo a tu panel...
              </p>
              
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = () => {
    setIsRedirecting(true);
    // Pequeño delay para mostrar el estado de carga
    setTimeout(() => {
      externalLogin(view); // 'login' o 'register'
    }, 800);
  };

  const features = [
    {
      icon: Shield,
      title: 'Seguridad Avanzada',
      description: 'Autenticación empresarial con los más altos estándares de seguridad'
    },
    {
      icon: Zap,
      title: 'Acceso Rápido',
      description: 'Inicia sesión en segundos con tu cuenta empresarial'
    },
    {
      icon: Users,
      title: 'Gestión Unificada',
      description: 'Administra tanto tu negocio como tus reservas personales'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding & Features */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-8">
              <ReservaFacilIcon size={48} />
              <span className="text-4xl font-bold text-gray-900">ReservaFácil</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {view === 'login' ? 'Bienvenido de vuelta' : 'Únete a ReservaFácil'}
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {view === 'login' 
                ? 'Accede a tu cuenta y gestiona tus reservas y negocio de forma segura y eficiente.'
                : 'Crea tu cuenta y comienza a disfrutar de la mejor plataforma de reservas.'
              }
            </p>

            {/* Features */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Auth Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-12">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              
              <p className="text-gray-600">
                Usa tu sistema de autenticación empresarial para acceder de forma segura
              </p>
            </div>

            {/* Main Auth Button */}
            <button
              onClick={handleLogin}
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center space-x-3"
            >
              {isRedirecting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Redirigiendo...</span>
                </>
              ) : (
                <>
                  <Shield className="h-6 w-6" />
                  <span>{view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Benefits */}
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ¿Por qué usar autenticación empresarial?
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                  Máxima seguridad con encriptación avanzada
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                  Acceso unificado a todos tus servicios
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                  Gestión centralizada de permisos y roles
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                  Soporte técnico especializado 24/7
                </li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentView(view === 'login' ? 'register' : 'login')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                {view === 'login' 
                  ? '¿No tienes cuenta? Crear cuenta' 
                  : '¿Ya tienes cuenta? Iniciar sesión'
                }
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentView('home')}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                ← Volver al inicio
              </button>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm mb-6">Confiado por más de 1,000+ empresas</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="bg-gray-200 h-8 w-24 rounded"></div>
            <div className="bg-gray-200 h-8 w-24 rounded"></div>
            <div className="bg-gray-200 h-8 w-24 rounded"></div>
            <div className="bg-gray-200 h-8 w-24 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};