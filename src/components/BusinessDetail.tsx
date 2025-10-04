import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Phone, Clock, DollarSign, Calendar, Star, Heart, Share2, MessageCircle, Award, CheckCircle, Users, Sparkles, Camera, Play, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Business, Service, BusinessSchedule } from '../types';

interface BusinessDetailProps {
  business: Business;
  setCurrentView: (view: string) => void;
  setSelectedBusiness: (business: Business) => void;
  setSelectedService: (service: Service | null) => void;
}

export const BusinessDetail = ({ business, setCurrentView, setSelectedBusiness, setSelectedService }: BusinessDetailProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<BusinessSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');

  const daysOfWeek = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  const tabs = [
    { id: 'services', name: 'Servicios', icon: DollarSign },
    { id: 'about', name: 'Acerca de', icon: MessageCircle },
    { id: 'reviews', name: 'Reseñas', icon: Star },
    { id: 'gallery', name: 'Galería', icon: Camera }
  ];

  const reviews = [
    {
      id: 1,
      name: 'María González',
      avatar: 'MG',
      rating: 5,
      date: 'Hace 2 días',
      comment: 'Excelente servicio y atención. Muy profesionales y el resultado superó mis expectativas. Definitivamente volveré.',
      verified: true
    },
    {
      id: 2,
      name: 'Carlos Rodríguez',
      avatar: 'CR',
      rating: 5,
      date: 'Hace 1 semana',
      comment: 'Muy recomendable. Ambiente agradable, precios justos y un trabajo impecable. El personal es muy amable.',
      verified: true
    },
    {
      id: 3,
      name: 'Ana Martínez',
      avatar: 'AM',
      rating: 4,
      date: 'Hace 2 semanas',
      comment: 'Buen servicio en general. La atención fue rápida y el resultado muy bueno. Solo mejoraría la música del ambiente.',
      verified: false
    }
  ];

  const galleryImages = [
    'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3992656/pexels-photo-3992656.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3993212/pexels-photo-3993212.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3992651/pexels-photo-3992651.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];

  useEffect(() => {
    fetchBusinessData();
  }, [business.id]);

  const fetchBusinessData = async () => {
    try {
      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('price');

      setServices(servicesData || []);

      // Fetch schedules
      const { data: schedulesData } = await supabase
        .from('business_schedules')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_available', true)
        .order('day_of_week');

      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (service?: Service) => {
    setSelectedBusiness(business);
    setSelectedService(service || null);
    setCurrentView('booking-process');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden">
        {business.image_url ? (
          <>
            <img
              src={business.image_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white text-8xl font-bold">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Back Button */}
        <button
          onClick={() => setCurrentView('browse')}
          className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm text-gray-900 px-6 py-3 rounded-2xl hover:bg-white transition-all flex items-center space-x-2 shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Volver</span>
        </button>

        {/* Action Buttons */}
        <div className="absolute top-6 right-6 flex space-x-3">
          <button className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl hover:bg-white transition-all shadow-lg">
            <Heart className="h-6 w-6 text-gray-700" />
          </button>
          <button className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl hover:bg-white transition-all shadow-lg">
            <Share2 className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        {/* Business Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 mb-6 lg:mb-0">
                <div className="flex items-center space-x-4 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">
                    {business.name}
                  </h1>
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className="text-green-800 font-medium text-sm">Verificado</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>{business.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5" />
                    <span>{business.phone}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">4.8</span>
                    <span className="text-gray-600">(124 reseñas)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-600">500+ clientes</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleBookService}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl"
                >
                  <Calendar className="h-6 w-6" />
                  <span>Reservar Cita</span>
                </button>
                <button className="bg-white border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5" />
                  <span>Contactar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-6 border-b-2 font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-8">
                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-bold text-gray-900">
                        Nuestros Servicios
                      </h2>
                      <div className="bg-blue-50 px-4 py-2 rounded-full">
                        <span className="text-blue-800 font-medium">{services.length} servicios</span>
                      </div>
                    </div>
                    
                    {services.length === 0 ? (
                      <p className="text-gray-600 text-center py-12">
                        No hay servicios disponibles en este momento
                      </p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6">
                        {services.map((service) => (
                          <div key={service.id} className="group border-2 border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {service.name}
                              </h3>
                              <div className="bg-green-100 px-3 py-1 rounded-full">
                                <span className="text-green-800 font-bold text-lg">${service.price}</span>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 mb-6 leading-relaxed">
                              {service.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-5 w-5 text-blue-600" />
                                  <span className="text-gray-700 font-medium">{service.duration} min</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleBookService(service)}
                                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                              >
                                Reservar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* About Tab */}
                {activeTab === 'about' && (
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                      Acerca de {business.name}
                    </h2>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-700 leading-relaxed text-lg mb-8">
                        {business.description}
                      </p>
                      
                      <div className="grid md:grid-cols-3 gap-6 my-8">
                        <div className="bg-blue-50 p-6 rounded-2xl text-center">
                          <Award className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-900 mb-2">Experiencia</h4>
                          <p className="text-gray-600">+5 años en el mercado</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-2xl text-center">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-900 mb-2">Garantía</h4>
                          <p className="text-gray-600">100% satisfacción</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-2xl text-center">
                          <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-900 mb-2">Calidad</h4>
                          <p className="text-gray-600">Productos premium</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-bold text-gray-900">
                        Reseñas de Clientes
                      </h2>
                      <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                        Escribir Reseña
                      </button>
                    </div>

                    {/* Rating Summary */}
                    <div className="bg-gray-50 rounded-2xl p-8 mb-8">
                      <div className="flex items-center space-x-8">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-gray-900 mb-2">4.8</div>
                          <div className="flex text-yellow-500 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-6 w-6 fill-current" />
                            ))}
                          </div>
                          <div className="text-gray-600">124 reseñas</div>
                        </div>
                        <div className="flex-1">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <div key={rating} className="flex items-center space-x-3 mb-2">
                              <span className="text-sm text-gray-600 w-8">{rating}★</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full" 
                                  style={{ width: rating === 5 ? '80%' : rating === 4 ? '15%' : '5%' }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-8">
                                {rating === 5 ? '99' : rating === 4 ? '18' : '7'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border border-gray-200 rounded-2xl p-6">
                          <div className="flex items-start space-x-4">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold">
                              {review.avatar}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-bold text-gray-900">{review.name}</h4>
                                {review.verified && (
                                  <div className="bg-green-100 px-2 py-1 rounded-full">
                                    <span className="text-green-800 text-xs font-medium">Verificado</span>
                                  </div>
                                )}
                                <span className="text-gray-500 text-sm">{review.date}</span>
                              </div>
                              <div className="flex text-yellow-500 mb-3">
                                {[...Array(review.rating)].map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                              </div>
                              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery Tab */}
                {activeTab === 'gallery' && (
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-bold text-gray-900">
                        Galería de Fotos
                      </h2>
                      <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                        <Play className="h-5 w-5" />
                        <span>Ver Tour Virtual</span>
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {galleryImages.map((image, index) => (
                        <div key={index} className="group relative overflow-hidden rounded-2xl aspect-video">
                          <img
                            src={image}
                            alt={`Galería ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-3 rounded-full">
                              <ExternalLink className="h-6 w-6 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Booking */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Reserva Rápida
              </h3>
              <p className="text-gray-600 mb-8">
                ¿Listo para reservar? Inicia el proceso de reserva ahora.
              </p>
              <button
                onClick={handleBookService}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Comenzar Reserva
              </button>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Horarios de Atención
              </h3>
              {schedules.length === 0 ? (
                <p className="text-gray-600">
                  Horarios no disponibles
                </p>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.day_of_week} className="flex justify-between items-center py-2">
                      <span className="text-gray-700 font-medium">
                        {daysOfWeek[schedule.day_of_week]}
                      </span>
                      <span className="text-gray-600 font-medium">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Información de Contacto
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{business.address}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">{business.phone}</span>
                </div>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">
                ¿Por qué elegirnos?
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5" />
                  <span>Profesionales certificados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5" />
                  <span>Productos de alta calidad</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5" />
                  <span>Garantía de satisfacción</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5" />
                  <span>Precios competitivos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};