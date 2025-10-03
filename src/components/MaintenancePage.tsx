import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, RefreshCw, Home, Clock } from 'lucide-react';

interface MaintenancePageProps {
  setCurrentView: (view: string) => void;
  errorType?: 'maintenance' | 'auth_error' | 'server_error';
  errorMessage?: string;
}

export const MaintenancePage = ({ 
  setCurrentView, 
  errorType = 'maintenance',
  errorMessage 
}: MaintenancePageProps) => {
  const [countdown, setCountdown] = useState(60);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 60);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const getErrorConfig = () => {
    switch (errorType) {
      case 'auth_error':
        return {
          title: 'Error de Autenticación',
          subtitle: 'Sistema de autenticación no disponible',
          description: 'Estamos experimentando problemas con nuestro sistema de autenticación. Por favor, intenta nuevamente en unos minutos.',
          icon: AlertTriangle,
          color: 'red'
        };
      case 'server_error':
        return {
          title: 'Error del Servidor',
          subtitle: 'Problemas de conectividad',
          description: 'No pudimos conectar con nuestros servidores. Estamos trabajando para resolver este problema.',
          icon: AlertTriangle,
          color: 'orange'
        };
      default:
        return {
          title: 'Mantenimiento Programado',
          subtitle: 'Mejorando tu experiencia',
          description: 'Estamos realizando mejoras en nuestro sistema para brindarte un mejor servicio. Volveremos pronto.',
          icon: Clock,
          color: 'blue'
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <Calendar className="h-12 w-12 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">ReservaFácil</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${
            config.color === 'red' ? 'bg-red-50 border-b border-red-200' :
            config.color === 'orange' ? 'bg-orange-50 border-b border-orange-200' :
            'bg-blue-50 border-b border-blue-200'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              <IconComponent className={`h-5 w-5 ${
                config.color === 'red' ? 'text-red-600' :
                config.color === 'orange' ? 'text-orange-600' :
                'text-blue-600'
              }`} />
              <span className={`text-sm font-medium ${
                config.color === 'red' ? 'text-red-800' :
                config.color === 'orange' ? 'text-orange-800' :
                'text-blue-800'
              }`}>
                {errorType === 'maintenance' ? 'Sistema en Mantenimiento' : 'Servicio Temporalmente No Disponible'}
              </span>
            </div>
          </div>

          <div className="p-12 text-center">
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 ${
              config.color === 'red' ? 'bg-red-100' :
              config.color === 'orange' ? 'bg-orange-100' :
              'bg-blue-100'
            }`}>
              <IconComponent className={`h-12 w-12 ${
                config.color === 'red' ? 'text-red-600' :
                config.color === 'orange' ? 'text-orange-600' :
                'text-blue-600'
              }`} />
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {config.title}
            </h1>

            {/* Subtitle */}
            <h2 className="text-xl text-gray-600 mb-6">
              {config.subtitle}
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
              {config.description}
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-gray-50 rounded-xl p-4 mb-8 max-w-lg mx-auto">
                <p className="text-sm text-gray-700">
                  <strong>Detalles técnicos:</strong> {errorMessage}
                </p>
              </div>
            )}

            {/* Countdown */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 max-w-sm mx-auto">
              <div className="flex items-center justify-center space-x-3">
                <RefreshCw className={`h-5 w-5 ${countdown <= 10 ? 'animate-spin' : ''} text-gray-600`} />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Próximo intento automático en:</p>
                  <p className="text-2xl font-bold text-gray-900">{countdown}s</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  config.color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  config.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <RefreshCw className={`h-5 w-5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Reintentando...' : 'Reintentar Ahora'}</span>
              </button>

              <button
                onClick={() => setCurrentView('home')}
                className="flex items-center justify-center space-x-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <Home className="h-5 w-5" />
                <span>Volver al Inicio</span>
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Tiempo Estimado</h3>
                  <p className="text-sm text-gray-600">5-15 minutos</p>
                </div>

                <div>
                  <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Actualizaciones</h3>
                  <p className="text-sm text-gray-600">Automáticas cada minuto</p>
                </div>

                <div>
                  <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Tus Reservas</h3>
                  <p className="text-sm text-gray-600">Están seguras</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Si el problema persiste, puedes contactarnos en{' '}
            <a href="mailto:soporte@reservafacil.com" className="text-blue-600 hover:text-blue-700 underline">
              soporte@reservafacil.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};