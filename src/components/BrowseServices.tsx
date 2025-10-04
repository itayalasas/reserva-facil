import { useState, useEffect } from 'react';
import { Search, MapPin, Clock, DollarSign, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Business, Service } from '../types';

interface BrowseServicesProps {
  setCurrentView: (view: string) => void;
  setSelectedBusiness: (business: Business) => void;
  setSelectedService: (service: Service | null) => void;
}

interface BusinessWithServices extends Business {
  services: Service[];
}

export const BrowseServices = ({ setCurrentView, setSelectedBusiness, setSelectedService }: BrowseServicesProps) => {
  const [businesses, setBusinesses] = useState<BusinessWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'beauty', name: 'Belleza' },
    { id: 'health', name: 'Salud' },
    { id: 'fitness', name: 'Fitness' },
    { id: 'education', name: 'Educación' },
    { id: 'services', name: 'Servicios' },
  ];

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data: businessesData, error } = await supabase
        .from('businesses')
        .select('*');

      if (error) throw error;

      // Fetch services for each business
      const businessesWithServices = await Promise.all(
        (businessesData || []).map(async (business) => {
          const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', business.id);

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

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || business.category === selectedCategory;
    return matchesSearch && matchesCategory && business.services.length > 0;
  });

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business);
    setCurrentView('business-detail');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Descubre Servicios Increíbles
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Encuentra y reserva servicios de calidad en tu área con solo unos clics
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar servicios, negocios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg p-12">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
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
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
                  {business.image_url ? (
                    <img
                      src={business.image_url}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur px-3 py-1 rounded-full">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 truncate">
                      {business.name}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {categories.find(c => c.id === business.category)?.name}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {business.description}
                  </p>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="truncate">{business.address}</span>
                  </div>

                  {/* Services Preview */}
                  <div className="space-y-2 mb-4">
                    {business.services.slice(0, 2).map((service) => (
                      <div key={service.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">{service.name}</span>
                        </div>
                        <div className="flex items-center text-green-600 font-medium">
                          <DollarSign className="h-4 w-4" />
                          <span>{service.price}</span>
                        </div>
                      </div>
                    ))}
                    {business.services.length > 2 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{business.services.length - 2} servicios más
                      </p>
                    )}
                  </div>

                  <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};