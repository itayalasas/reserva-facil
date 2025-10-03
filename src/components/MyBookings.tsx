import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, MapPin, Phone, X, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, useNotification } from './Notification';
import { Booking } from '../types';

interface MyBookingsProps {
  setCurrentView: (view: string) => void;
}

export const MyBookings = ({ setCurrentView }: MyBookingsProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Get current user ID from external auth or Supabase
  const getCurrentUserId = () => {
    if (isExternalAuth && externalUser) {
      return externalUser.user.id;
    }
    return user?.id;
  };
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchBookings();
    }
  }, [user, externalUser, isExternalAuth]);

  // Refrescar bookings cuando se cambia a esta vista
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchBookings();
    }
  }, []); // Se ejecuta cada vez que el componente se monta
  const fetchBookings = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(
            name,
            price,
            duration,
            cancellation_hours
          ),
          business:businesses(
            name,
            address,
            phone,
            image_url
          )
        `)
        .eq('client_id', userId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at);
    const cancellationHours = booking.service?.cancellation_hours || 24;
    const cancellationDeadline = new Date(scheduledTime.getTime() - (cancellationHours * 60 * 60 * 1000));

    return now < cancellationDeadline;
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      showSuccess('Reserva cancelada', 'Tu reserva se canceló correctamente');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showError('Error al cancelar', 'No se pudo cancelar la reserva. Intenta nuevamente.');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const getTimeUntilBooking = (scheduledAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return 'Ya pasó';
    } else if (diffDays > 0) {
      return `En ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `En ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Muy pronto';
    }
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando tus reservas...</p>
          </div>
        </div>
        
        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            isVisible={notification.isVisible}
            onClose={hideNotification}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mis Reservas
            </h1>
            <p className="text-gray-600">
              Gestiona todas tus citas y reservas de servicios
            </p>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-3xl w-24 h-24 mx-auto mb-8 flex items-center justify-center shadow-lg">
                <Calendar className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                ¡Bienvenido a ReservaFácil!
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Aún no tienes reservas, pero eso está a punto de cambiar. 
                <br />
                <span className="font-semibold text-gray-800">Explora miles de servicios increíbles y agenda tu primera cita.</span>
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="bg-blue-100 p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Search className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Explora</h4>
                    <p className="text-gray-600 text-sm">Miles de servicios disponibles</p>
                  </div>
                  <div>
                    <div className="bg-green-100 p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Reserva</h4>
                    <p className="text-gray-600 text-sm">En solo unos clics</p>
                  </div>
                  <div>
                    <div className="bg-purple-100 p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Disfruta</h4>
                    <p className="text-gray-600 text-sm">Servicios de calidad</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setCurrentView('browse')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center space-x-3"
                >
                  <Search className="h-6 w-6" />
                  <span>Explorar Servicios</span>
                </button>
                <button
                  onClick={() => setCurrentView('home')}
                  className="bg-white border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center justify-center space-x-3"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Volver al Inicio</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        {/* Business Image */}
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center overflow-hidden">
                          {booking.business?.image_url ? (
                            <img
                              src={booking.business.image_url}
                              alt={booking.business.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xl font-bold">
                              {booking.business?.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Booking Info */}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {booking.service?.name}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {booking.business?.name}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.business?.address}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="h-4 w-4" />
                              <span>{booking.business?.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>

                    {/* Booking Details */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Fecha</p>
                          <p className="font-medium">
                            {new Date(booking.scheduled_at).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Clock className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Hora</p>
                          <p className="font-medium">
                            {new Date(booking.scheduled_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Precio</p>
                          <p className="font-medium">${booking.service?.price}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-sm text-gray-600">Duración</p>
                          <p className="font-medium">{booking.service?.duration} min</p>
                        </div>
                      </div>
                    </div>

                    {/* Time Until Booking */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-gray-600">
                          {getTimeUntilBooking(booking.scheduled_at)}
                        </span>
                      </div>

                      {/* Cancel Button */}
                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
                              handleCancelBooking(booking.id);
                            }
                          }}
                          disabled={cancelling === booking.id}
                          className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="h-4 w-4" />
                          <span>{cancelling === booking.id ? 'Cancelando...' : 'Cancelar'}</span>
                        </button>
                      )}

                      {!canCancelBooking(booking) && (booking.status === 'pending' || booking.status === 'confirmed') && (
                        <div className="flex items-center space-x-2 text-gray-500 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            No se puede cancelar (menos de {booking.service?.cancellation_hours || 24}h)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-800">
                          <strong>Notas:</strong> {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </>
  );
};