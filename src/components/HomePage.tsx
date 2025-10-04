import { useState, useEffect } from 'react';
import { ArrowRight, Calendar, Clock, CreditCard, Bell, Search, MapPin, Star, Filter, Heart, Share2, Eye, Sparkles, TrendingUp, Users, Award, CheckCircle, Play } from 'lucide-react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification, useNotification } from './Notification';
import { Business, Service } from '../types';
import { ReservaFacilIcon } from './ReservaFacilIcon';

interface HomePageProps {
  setCurrentView: (view: string) => void;
  setSelectedBusiness: (business: Business) => void;
  setSelectedService: (service: Service | null) => void;
}

interface BusinessWithServices extends Business {
  services: Service[];
}

export const HomePage = ({ setCurrentView, setSelectedBusiness, setSelectedService }: HomePageProps) => {
  const { isAuthenticated, userRole, user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [businesses, setBusinesses] = useState<BusinessWithServices[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessWithServices[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const categories = [
    { id: 'all', name: 'Todos', emoji: '🏪', gradient: 'from-gray-500 to-gray-600' },
    { id: 'beauty', name: 'Belleza', emoji: '💄', gradient: 'from-pink-500 to-rose-600' },
    { id: 'health', name: 'Salud', emoji: '🏥', gradient: 'from-green-500 to-emerald-600' },
    { id: 'fitness', name: 'Fitness', emoji: '💪', gradient: 'from-orange-500 to-red-600' },
    { id: 'education', name: 'Educación', emoji: '📚', gradient: 'from-blue-500 to-indigo-600' },
    { id: 'services', name: 'Servicios', emoji: '🔧', gradient: 'from-purple-500 to-violet-600' },
    { id: 'automotive', name: 'Automotriz', emoji: '🚗', gradient: 'from-yellow-500 to-orange-600' },
    { id: 'home', name: 'Hogar', emoji: '🏠', gradient: 'from-teal-500 to-cyan-600' },
  ];

  const stats = [
    { number: '10K+', label: 'Clientes Felices', icon: Users },
    { number: '500+', label: 'Negocios Activos', icon: Award },
    { number: '50K+', label: 'Reservas Exitosas', icon: CheckCircle },
    { number: '4.9', label: 'Calificación Promedio', icon: Star }
  ];

  // Get current user ID from external auth or Supabase
  const getCurrentUserId = () => {
    if (isExternalAuth && externalUser) {
      return externalUser.user.id;
    }
    return user?.id;
  };

  // Process payment callback if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const status = urlParams.get('status');
    const externalReference = urlParams.get('external_reference');
    const paymentId = urlParams.get('payment_id');
    
    // Only process if user is authenticated and we have payment parameters
    if (isAuthenticated && (paymentStatus || status === 'approved') && externalReference) {
      setProcessingPayment(true);
      processPaymentCallback(paymentStatus || 'success', externalReference, paymentId);
    }
  }, [isAuthenticated]);

  const processPaymentCallback = async (paymentStatus: string, externalReference: string, paymentId?: string) => {
    try {
      
      // Extract timestamp from external_reference
      const timestampMatch = externalReference.match(/booking_(\d+)/);
      if (!timestampMatch) {
        console.error('Invalid external_reference format:', externalReference);
        throw new Error('No se pudo obtener el timestamp de la reserva del external_reference');
      }
      
      const timestamp = timestampMatch[1];

      // Search for booking with this timestamp in notes
      const { data: bookings, error: searchError } = await supabase
        .from('bookings')
        .select('id, notes, status')
        .ilike('notes', `%${timestamp}%`)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;
      
      if (!bookings || bookings.length === 0) {
        console.error('No booking found with timestamp:', timestamp);
        // Fallback search without status filter
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

      // Update booking status
      const newStatus = paymentStatus === 'success' ? 'confirmed' : 
                       paymentStatus === 'pending' ? 'pending' : 'cancelled';
      
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          notes: `${booking.notes} - Pago: ${paymentStatus} - Payment ID: ${paymentId || 'N/A'}`
        })
        .eq('id', booking.id);

      if (error) throw error;

      
      // Clean URL completely
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      setProcessingPayment(false);
      
      // Show success message
      showSuccess(
        '¡Pago procesado exitosamente!',
        newStatus === 'confirmed' 
          ? 'Tu reserva ha sido confirmada. Ve a "Mis Reservas" para ver los detalles.'
          : 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
      );
      
      // Redirect after a moment
      setTimeout(() => {
        setCurrentView('my-bookings');
      }, 2000);
      
    } catch (error) {
      console.error('Error processing payment callback:', error);
      setProcessingPayment(false);
      
      // Show error message
      showError(
        'Error procesando el pago',
        `No se pudo actualizar la reserva: ${error.message || 'Error desconocido'}`
      );
      
      // Clean URL even if there's an error
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      setTimeout(() => {
        setCurrentView('my-bookings');
      }, 3000);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [searchTerm, selectedCategory, businesses]);

  const fetchBusinesses = async () => {
    try {
      const { data: businessesData, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }


      // Fetch services for each business
      const businessesWithServices = await Promise.all(
        (businessesData || []).map(async (business) => {
          const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', business.id)
            .eq('is_active', true)
            .limit(3);

          return {
            ...business,
            services: servicesData || [],
          };
        })
      );

      setBusinesses(businessesWithServices);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = businesses;

    if (searchTerm) {
      filtered = filtered.filter(business =>
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(business => business.category === selectedCategory);
    }

    setFilteredBusinesses(filtered);
  };

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business);
    setCurrentView('business-detail');
  };

  const handleBookNow = (business: Business, service?: Service, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBusiness(business);
    setSelectedService(service || null);
    setCurrentView('booking-process');
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      if (userRole === 'admin') {
        setCurrentView('admin-dashboard');
      } else if (userRole === 'business') {
        setCurrentView('business-dashboard');
      } else {
        setCurrentView('browse');
      }
    } else {
      setCurrentView('login');
    }
  };

  // Show processing payment overlay if needed
  if (processingPayment) {
    return (
      <>
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
      <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <ReservaFacilIcon size={48} />
              <span className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">ReservaFácil</span>
            </div>
            {!isAuthenticated ? (
              <button
                onClick={handleAuthAction}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <LogIn className="h-5 w-5" />
                <span>Entrar</span>
              </button>
            ) : (
              <button
                onClick={handleAuthAction}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Calendar className="h-5 w-5" />
                <span>{userRole === 'business' ? 'Mi Negocio' : 'Explorar'}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">La plataforma #1 de reservas</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Descubre y Reserva
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Servicios Increíbles
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Conectamos clientes con los mejores negocios locales. 
              <span className="font-semibold text-gray-800"> Reserva fácil, rápido y seguro.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button
                onClick={() => setCurrentView('register')}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center space-x-3"
              >
                <span>Comenzar Ahora</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className="group flex items-center space-x-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 px-8 py-5 rounded-2xl font-semibold hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full">
                  <Play className="h-5 w-5 text-white" />
                </div>
                <span>Ver Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl w-fit mx-auto mb-4">
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                    <div className="text-gray-600 font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Encuentra el Servicio Perfecto
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explora miles de servicios de calidad en tu área
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center mb-12">
            {/* Search Bar */}
            <div className="flex-1 relative max-w-2xl">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
              <input
                type="text"
                placeholder="Buscar negocios, servicios, ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg shadow-lg transition-all duration-300"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  selectedCategory === category.id
                    ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg transform scale-105`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span className="text-xl">{category.emoji}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Business Feed */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-lg animate-pulse overflow-hidden">
                  <div className="h-64 bg-gray-300"></div>
                  <div className="p-8 space-y-4">
                    <div className="h-6 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white rounded-3xl shadow-xl p-16 max-w-md mx-auto">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Search className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-600">
                  Intenta con otros términos de búsqueda o categorías
                </p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBusinesses.map((business) => (
                <div
                  key={business.id}
                  onClick={() => handleBusinessClick(business)}
                  className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 overflow-hidden border border-gray-100"
                >
                  {/* Business Image */}
                  <div className="relative h-64 overflow-hidden">
                    {business.image_url ? (
                      <img
                        src={business.image_url}
                        alt={business.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-5xl font-bold">
                          {business.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-3">
                        <button className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors shadow-lg">
                          <Heart className="h-5 w-5 text-gray-700" />
                        </button>
                        <button className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors shadow-lg">
                          <Share2 className="h-5 w-5 text-gray-700" />
                        </button>
                        <button className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors shadow-lg">
                          <Eye className="h-5 w-5 text-gray-700" />
                        </button>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <span className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <span>{categories.find(c => c.id === business.category)?.emoji}</span>
                        <span>{categories.find(c => c.id === business.category)?.name}</span>
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-semibold text-gray-800">4.8</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {business.name}
                      </h3>
                    </div>

                    <p className="text-gray-600 mb-6 line-clamp-2 leading-relaxed">
                      {business.description}
                    </p>

                    <div className="flex items-center text-gray-500 mb-6">
                      <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{business.address}</span>
                    </div>

                    {/* Services Preview */}
                    {business.services.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Servicios destacados:</h4>
                        <div className="space-y-3">
                          {business.services.slice(0, 2).map((service) => (
                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-3" />
                                <span className="text-gray-700 font-medium">{service.name}</span>
                              </div>
                              <span className="font-bold text-green-600 text-lg">${service.price}</span>
                            </div>
                          ))}
                          {business.services.length > 2 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                              +{business.services.length - 2} servicios más
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={(e) => handleBookNow(business, e)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                      >
                        <Calendar className="h-5 w-5" />
                        <span>Reservar</span>
                      </button>
                      <button className="px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/10 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-12">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
              ¿Tienes un Negocio?
            </h2>
            <p className="text-2xl text-white/90 mb-12 leading-relaxed">
              Únete a nuestra plataforma y comienza a recibir más clientes hoy mismo.
            </p>
            <button
              onClick={() => setCurrentView('register')}
              className="bg-white text-blue-600 px-12 py-6 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 inline-flex items-center space-x-3"
            >
              <span>Registrar mi Negocio</span>
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">ReservaFácil</span>
          </div>
          <p className="text-gray-400 text-lg">
            Conectando clientes con los mejores servicios locales.
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      </div>
      
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
    </>
  );
};