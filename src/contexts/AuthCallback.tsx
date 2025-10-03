import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MaintenancePage } from './MaintenancePage';

interface AuthCallbackProps {
  setCurrentView: (view: string) => void;
}

export const AuthCallback = ({ setCurrentView }: AuthCallbackProps) => {
  const { processAuthCallback, userRole } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');
  const [errorType, setErrorType] = useState<'maintenance' | 'auth_error' | 'server_error'>('auth_error');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Check if this is a payment callback first
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const externalReference = urlParams.get('external_reference');
      
      if (paymentStatus && externalReference) {
        console.log('Payment callback detected, redirecting to booking process');
        // This is a payment callback, redirect to home with payment params
        const paymentParams = new URLSearchParams();
        paymentParams.set('payment', paymentStatus);
        if (urlParams.get('payment_id')) paymentParams.set('payment_id', urlParams.get('payment_id')!);
        if (urlParams.get('status')) paymentParams.set('status', urlParams.get('status')!);
        paymentParams.set('external_reference', externalReference);
        
        window.location.href = `/?${paymentParams.toString()}`;
        return;
      }
      
      setMessage('Procesando autenticación...');
      
      // Debug: Log the callback URL
      console.log('AuthCallback - Processing URL:', window.location.href);
      
      // Procesar callback usando el contexto de autenticación
      const success = await processAuthCallback();
      
      if (!success) {
        // More specific error handling
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          throw new Error(`Error de autenticación: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
        } else {
          throw new Error('Error procesando autenticación - no se encontraron parámetros válidos');
        }
      }
      
      setStatus('success');
      setMessage('¡Autenticación exitosa! Redirigiendo...');
      
      // Limpiar la URL y redirigir
      setTimeout(() => {
        // Limpiar la URL del callback
        window.history.replaceState({}, document.title, '/');
        
        // Forzar recarga completa de la página para actualizar el estado
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error en callback de autenticación:', error);
      setStatus('error');
      
      // Determinar el tipo de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('conexión') || errorMessage.includes('no se encontraron parámetros válidos')) {
        setErrorType('server_error');
        setMessage('Error de conectividad con el servidor de autenticación');
      } else if (errorMessage.includes('mantenimiento') || errorMessage.includes('maintenance')) {
        setErrorType('maintenance');
        setMessage('Sistema de autenticación en mantenimiento');
      } else {
        setErrorType('auth_error');
        setMessage(errorMessage);
      }
    }
  };

  // Si hay error, mostrar página de mantenimiento
  if (status === 'error') {
    return (
      <MaintenancePage 
        setCurrentView={setCurrentView}
        errorType={errorType}
        errorMessage={message}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Calendar className="h-12 w-12 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">ReservaFácil</span>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center justify-center mb-6">
              {status === 'loading' && (
                <div className="bg-blue-100 p-3 rounded-full">
                  <Loader className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              )}
              {status === 'error' && (
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {status === 'loading' && 'Procesando...'}
              {status === 'success' && '¡Éxito!'}
              {status === 'error' && 'Error de Autenticación'}
            </h2>
            
            <p className={`text-lg mb-6 ${
              status === 'success' ? 'text-green-600' : 
              status === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {message}
            </p>
            
            {status === 'error' && (
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentView('home')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Volver al Inicio
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Intentar Nuevamente
                </button>
              </div>
            )}
            
            {status === 'loading' && (
              <div className="text-sm text-gray-500">
                Por favor, no cierres esta ventana...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};