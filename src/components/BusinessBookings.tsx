import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, User, Phone, Mail, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, useNotification } from './Notification';
import { Business, Booking } from '../types';

interface BusinessBookingsProps {
  setCurrentView: (view: string) => void;
}

export const BusinessBookings = ({ setCurrentView }: BusinessBookingsProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  // Get current user ID from external auth or Supabase
  const getCurrentUserId = () => {
    if (isExternalAuth && externalUser) {
      return externalUser.user.id;
    }
    return user?.id;
  };
  const statusOptions = [
    { value: 'all', label: 'Todas', color: 'gray' },
    { value: 'pending', label: 'Pendientes', color: 'yellow' },
    { value: 'confirmed', label: 'Confirmadas', color: 'green' },
    { value: 'completed', label: 'Completadas', color: 'blue' },
    { value: 'cancelled', label: 'Canceladas', color: 'red' }
  ];

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchData();
    }
  }, [user, externalUser, isExternalAuth]);

  useEffect(() => {
    filterBookings();
  }, [statusFilter, bookings]);

  const fetchData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Fetch business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (businessData) {
        setBusiness(businessData);

        // Fetch bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            service:services(
              name,
              price,
              duration
            )
          `)
          .eq('business_id', businessData.id)
          .order('scheduled_at', { ascending: false });

        setBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (statusFilter === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === statusFilter));
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus as any }
          : booking
      ));

      const statusText = newStatus === 'confirmed' ? 'confirmada' : newStatus === 'cancelled' ? 'cancelada' : 'actualizada';
      showSuccess(`Reserva ${statusText}`, `La reserva se ${statusText} correctamente`);
    } catch (error) {
      console.error('Error updating booking:', error);
      showError('Error al actualizar', 'No se pudo actualizar la reserva. Intenta nuevamente.');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const parseClientInfo = (notes: string) => {
    const clientInfo = { name: '', email: '', phone: '' };
    if (notes) {
      const nameMatch = notes.match(/Cliente:\s*([^,]+)/);
      const emailMatch = notes.match(/Email:\s*([^,]+)/);
      const phoneMatch = notes.match(/Teléfono:\s*(.+)/);
      
      if (nameMatch) clientInfo.name = nameMatch[1].trim();
      if (emailMatch) clientInfo.email = emailMatch[1].trim();
      if (phoneMatch) clientInfo.phone = phoneMatch[1].trim();
    }
    return clientInfo;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Primero necesitas configurar tu negocio</p>
            <button
              onClick={() => setCurrentView('business-setup')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
            >
              Configurar Negocio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservas - {business.name}
          </h1>
          <p className="text-gray-600">
            Gestiona todas las reservas de tus clientes
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtrar por estado</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  statusFilter === option.value
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
                <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
                  {option.value === 'all' ? bookings.length : bookings.filter(b => b.status === option.value).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {statusFilter === 'all' ? 'No hay reservas' : `No hay reservas ${statusOptions.find(s => s.value === statusFilter)?.label.toLowerCase()}`}
            </h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'Las reservas aparecerán aquí cuando los clientes las hagan'
                : 'Cambia el filtro para ver otras reservas'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const clientInfo = parseClientInfo(booking.notes || '');
              return (
                <div key={booking.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {booking.service?.name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                        
                        {/* Client Info */}
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{clientInfo.name || 'Cliente'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{clientInfo.email || 'No disponible'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{clientInfo.phone || 'No disponible'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Fecha</p>
                          <p className="font-medium">
                            {new Date(booking.scheduled_at).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
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

                    {/* Action Buttons */}
                    {booking.status === 'pending' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          disabled={updating === booking.id}
                          className="flex items-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>{updating === booking.id ? 'Confirmando...' : 'Confirmar'}</span>
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          disabled={updating === booking.id}
                          className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{updating === booking.id ? 'Cancelando...' : 'Cancelar'}</span>
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          disabled={updating === booking.id}
                          className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>{updating === booking.id ? 'Completando...' : 'Marcar como Completada'}</span>
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          disabled={updating === booking.id}
                          className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{updating === booking.id ? 'Cancelando...' : 'Cancelar'}</span>
                        </button>
                      </div>
                    )}

                    {/* Booking created info */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          Reserva creada el {new Date(booking.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
};