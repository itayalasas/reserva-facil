import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Notification, useNotification } from './components/Notification';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { AuthForms } from './components/AuthForms';
import { BrowseServices } from './components/BrowseServices';
import { BusinessDashboard } from './components/BusinessDashboard';
import { BusinessSetup } from './components/BusinessSetup';
import { BusinessServices } from './components/BusinessServices';
import { BusinessScheduleComponent } from './components/BusinessSchedule';
import { BusinessSettings } from './components/BusinessSettings';
import { BusinessDetail } from './components/BusinessDetail';
import { BookingProcess } from './components/BookingProcess';
import { MyBookings } from './components/MyBookings';
import { BusinessBookings } from './components/BusinessBookings';
import { AuthCallback } from './components/AuthCallback';
import { MaintenancePage } from './components/MaintenancePage';
import { Business } from './types';

// Component interno para manejar la lógica de la app
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [currentView, setCurrentView] = useState('home');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  // Detectar callback de pago y procesar reserva
  useEffect(() => {
    // Extraer parámetros tanto de search como de hash
    let urlParams: URLSearchParams;

    // Si hay hash, los parámetros están después del hash
    if (window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      urlParams = new URLSearchParams(hashQuery);
      console.log('Extracting params from hash:', hashQuery);
    } else {
      urlParams = new URLSearchParams(window.location.search);
      console.log('Extracting params from search:', window.location.search);
    }

    const paymentStatus = urlParams.get('payment');
    const paymentId = urlParams.get('payment_id');
    const status = urlParams.get('status');
    const externalReference = urlParams.get('external_reference');

    console.log('Payment callback params:', {
      paymentStatus,
      paymentId,
      status,
      externalReference,
      isAuthenticated,
      paymentProcessed
    });

    // Procesar callback de pago si existe y el usuario está autenticado
    if (paymentStatus && externalReference && isAuthenticated && !paymentProcessed) {
      console.log('Processing payment callback:', {
        paymentStatus,
        paymentId,
        status,
        externalReference
      });

      setProcessingPayment(true);
      processPaymentCallback(paymentStatus, externalReference, paymentId);
    }

    // También procesar si viene directamente con status=approved de Mercado Pago
    if (!paymentStatus && status === 'approved' && externalReference && isAuthenticated && !paymentProcessed) {
      console.log('Processing Mercado Pago direct callback:', {
        status,
        externalReference,
        paymentId
      });

      setProcessingPayment(true);
      processPaymentCallback('success', externalReference, paymentId);
    }
  }, [isAuthenticated, paymentProcessed]);

  const processPaymentCallback = async (paymentStatus: string, externalReference: string, paymentId?: string) => {
    try {
      console.log('Processing payment callback:', { paymentStatus, externalReference, paymentId });
      
      // Buscar la reserva usando el external_reference en las notas
      const timestampMatch = externalReference.match(/booking_(\d+)/);
      if (!timestampMatch) {
        console.error('Invalid external_reference format:', externalReference);
        throw new Error('No se pudo obtener el timestamp de la reserva del external_reference');
      }
      
      const timestamp = timestampMatch[1];
      console.log('Extracted timestamp:', timestamp);

      // Buscar la reserva que contiene este timestamp en las notas
      const { data: bookings, error: searchError } = await supabase
        .from('bookings')
        .select('id, notes, status')
        .ilike('notes', `%${timestamp}%`)
        .in('status', ['pending', 'confirmed']) // Permitir ambos estados
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;
      
      if (!bookings || bookings.length === 0) {
        console.error('No booking found with timestamp:', timestamp);
        // Buscar sin filtro de estado como fallback
        const { data: fallbackBookings, error: fallbackError } = await supabase
          .from('bookings')
          .select('id, notes, status')
          .ilike('notes', `%${timestamp}%`)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (fallbackError || !fallbackBookings || fallbackBookings.length === 0) {
          throw new Error('No se encontró la reserva correspondiente');
        }
        
        bookings.push(...fallbackBookings);
      }

      const booking = bookings[0];
      console.log('Found booking:', booking);

      // Actualizar estado de la reserva
      const newStatus = paymentStatus === 'success' ? 'confirmed' : 
                       paymentStatus === 'pending' ? 'pending' : 'cancelled';
      
      console.log('Updating booking status to:', newStatus);
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          notes: `${booking.notes} - Pago: ${paymentStatus} - Payment ID: ${paymentId || 'N/A'} - Timestamp: ${timestamp}`
        })
        .eq('id', booking.id);

      if (error) throw error;

      console.log('Booking updated successfully:', { bookingId: booking.id, status: newStatus, paymentId });
      
      // Limpiar URL completamente (incluyendo hash)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      window.location.hash = '';
      
      // Marcar como procesado
      setPaymentProcessed(true);
      setProcessingPayment(false);
      
      // Mostrar mensaje de éxito
      showSuccess(
        '¡Pago procesado exitosamente!',
        newStatus === 'confirmed' 
          ? 'Tu reserva ha sido confirmada y aparecerá en "Mis Reservas".'
          : 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
      );
      
      // Redirigir después de un momento
      setTimeout(() => {
        setCurrentView('my-bookings');
      }, 1500);
      
    } catch (error) {
      console.error('Error processing payment callback:', error);
      setProcessingPayment(false);
      
      // En caso de error, mostrar mensaje y redirigir
      showError(
        'Error procesando el pago',
        `No se pudo actualizar la reserva: ${error.message || 'Error desconocido'}`
      );
      
      // Limpiar URL incluso si hay error (incluyendo hash)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      window.location.hash = '';
      
      setTimeout(() => {
        setCurrentView('my-bookings');
      }, 3000);
    }
  };

  // Detectar rutas especiales
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    console.log('App - Current path:', path);
    console.log('App - Search params:', Object.fromEntries(searchParams.entries()));
    
    if (path === '/auth/callback') {
      setCurrentView('auth-callback');
    } else if (path === '/maintenance') {
      setCurrentView('maintenance');
    } else if (searchParams.has('state') && searchParams.has('token')) {
      // Handle callback with query parameters (even if path is root)
      console.log('Detected auth callback with parameters');
      setCurrentView('auth-callback');
    }
  }, []);

  const renderCurrentView = () => {
    // Si está procesando pago, mostrar mensaje de procesamiento
    if (processingPayment) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¡Pago Exitoso!
            </h2>
            <p className="text-gray-600">
              Confirmando tu reserva y redirigiendo a Mis Reservas...
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'home':
        return <HomePage setCurrentView={setCurrentView} setSelectedBusiness={setSelectedBusiness} />;
      case 'login':
        return <AuthForms view="login" setCurrentView={setCurrentView} />;
      case 'register':
        return <AuthForms view="register" setCurrentView={setCurrentView} />;
      case 'browse':
        return <BrowseServices setCurrentView={setCurrentView} setSelectedBusiness={setSelectedBusiness} />;
      case 'business-dashboard':
        return <BusinessDashboard setCurrentView={setCurrentView} />;
      case 'business-setup':
        return <BusinessSetup setCurrentView={setCurrentView} />;
      case 'business-services':
        return <BusinessServices setCurrentView={setCurrentView} />;
      case 'business-schedule':
        return <BusinessScheduleComponent setCurrentView={setCurrentView} />;
      case 'business-settings':
        return <BusinessSettings setCurrentView={setCurrentView} />;
      case 'business-detail':
        return selectedBusiness ? (
          <BusinessDetail 
            business={selectedBusiness} 
            setCurrentView={setCurrentView}
            setSelectedBusiness={setSelectedBusiness}
          />
        ) : <BrowseServices setCurrentView={setCurrentView} setSelectedBusiness={setSelectedBusiness} />;
      case 'booking-process':
        return selectedBusiness ? (
          <BookingProcess 
            business={selectedBusiness} 
            setCurrentView={setCurrentView}
          />
        ) : <BrowseServices setCurrentView={setCurrentView} setSelectedBusiness={setSelectedBusiness} />;
      case 'my-bookings':
        return <MyBookings setCurrentView={setCurrentView} />;
      case 'business-bookings':
        return <BusinessBookings setCurrentView={setCurrentView} />;
      case 'auth-callback':
        return <AuthCallback setCurrentView={setCurrentView} />;
      case 'maintenance':
        return <MaintenancePage setCurrentView={setCurrentView} />;
      default:
        return <HomePage setCurrentView={setCurrentView} setSelectedBusiness={setSelectedBusiness} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {currentView !== 'home' && !processingPayment && (
        <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      )}
      {renderCurrentView()}
      
      {/* Global Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;