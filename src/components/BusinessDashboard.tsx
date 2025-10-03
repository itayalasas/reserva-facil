import { useState, useEffect } from 'react';
import { Plus, Settings, Calendar, DollarSign, Clock, Users, BarChart3, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Business, Service, Booking } from '../types';

interface BusinessDashboardProps {
  setCurrentView: (view: string) => void;
}

export const BusinessDashboard = ({ setCurrentView }: BusinessDashboardProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
    activeServices: 0
  });
  const [loading, setLoading] = useState(true);

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
      fetchBusinessData();
    }
  }, [user, externalUser, isExternalAuth]);

  const fetchBusinessData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Fetch business info
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (businessData) {
        setBusiness(businessData);

        // Fetch services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessData.id);

        setServices(servicesData || []);

        // Fetch recent bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, price),
            business:businesses(name)
          `)
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentBookings(bookingsData || []);

        // Calculate stats
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('*, service:services(price)')
          .eq('business_id', businessData.id);

        const totalBookings = allBookings?.length || 0;
        const pendingBookings = allBookings?.filter(b => b.status === 'pending').length || 0;
        const monthlyRevenue = allBookings
          ?.filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.service?.price || 0), 0) || 0;

        setStats({
          totalBookings,
          pendingBookings,
          monthlyRevenue,
          activeServices: servicesData?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Settings className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Configura tu Negocio
            </h2>
            <p className="text-gray-600 mb-8">
              Para comenzar a recibir reservas, primero necesitas configurar la información de tu negocio.
            </p>
            <button
              onClick={() => setCurrentView('business-setup')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
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
            Dashboard - {business.name}
          </h1>
          <p className="text-gray-600">
            Gestiona tu negocio y revisa el rendimiento de tus servicios
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reservas</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingBookings}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                <p className="text-3xl font-bold text-green-600">${stats.monthlyRevenue}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Servicios Activos</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activeServices}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setCurrentView('business-services')}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Servicios</h3>
                <p className="text-sm text-gray-600">Gestionar servicios</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('business-schedule')}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Horarios</h3>
                <p className="text-sm text-gray-600">Configurar agenda</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('business-bookings')}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reservas</h3>
                <p className="text-sm text-gray-600">Ver todas las reservas</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('business-settings')}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Configuración</h3>
                <p className="text-sm text-gray-600">Ajustes y pagos</p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Reservas Recientes</h2>
            <button
              onClick={() => setCurrentView('business-bookings')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Ver todas
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay reservas recientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-500' :
                      booking.status === 'pending' ? 'bg-orange-500' :
                      booking.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.service?.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(booking.scheduled_at).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${booking.service?.price}</p>
                    <p className={`text-sm capitalize ${
                      booking.status === 'confirmed' ? 'text-green-600' :
                      booking.status === 'pending' ? 'text-orange-600' :
                      booking.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmada' :
                       booking.status === 'pending' ? 'Pendiente' :
                       booking.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};