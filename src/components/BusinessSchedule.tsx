import { useState, useEffect } from 'react';
import { Clock, Calendar, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, useNotification } from './Notification';
import { Business, BusinessSchedule } from '../types';

interface BusinessScheduleProps {
  setCurrentView: (view: string) => void;
}

export const BusinessScheduleComponent = ({ setCurrentView }: BusinessScheduleProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [business, setBusiness] = useState<Business | null>(null);
  const [schedules, setSchedules] = useState<BusinessSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get current user ID from external auth or Supabase
  const getCurrentUserId = () => {
    if (isExternalAuth && externalUser) {
      return externalUser.user.id;
    }
    return user?.id;
  };
  const daysOfWeek = [
    { id: 0, name: 'Domingo', short: 'Dom' },
    { id: 1, name: 'Lunes', short: 'Lun' },
    { id: 2, name: 'Martes', short: 'Mar' },
    { id: 3, name: 'Miércoles', short: 'Mié' },
    { id: 4, name: 'Jueves', short: 'Jue' },
    { id: 5, name: 'Viernes', short: 'Vie' },
    { id: 6, name: 'Sábado', short: 'Sáb' }
  ];

  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchData();
    }
  }, [user, externalUser, isExternalAuth]);

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

        // Fetch schedules
        const { data: schedulesData } = await supabase
          .from('business_schedules')
          .select('*')
          .eq('business_id', businessData.id)
          .order('day_of_week');

        // Initialize schedules for all days if they don't exist
        const existingSchedules = schedulesData || [];
        const allSchedules = daysOfWeek.map(day => {
          const existing = existingSchedules.find(s => s.day_of_week === day.id);
          return existing || {
            id: `temp-${day.id}`,
            business_id: businessData.id,
            day_of_week: day.id,
            start_time: '09:00',
            end_time: '18:00',
            is_available: day.id >= 1 && day.id <= 5, // Monday to Friday by default
            created_at: new Date().toISOString()
          };
        });

        setSchedules(allSchedules);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (dayId: number, field: string, value: any) => {
    setSchedules(schedules.map(schedule => 
      schedule.day_of_week === dayId 
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const handleSave = async () => {
    if (!business) return;

    setSaving(true);
    try {
      // Delete existing schedules
      await supabase
        .from('business_schedules')
        .delete()
        .eq('business_id', business.id);

      // Insert new schedules
      const schedulesToInsert = schedules
        .filter(schedule => schedule.is_available)
        .map(schedule => ({
          business_id: business.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_available: schedule.is_available
        }));

      if (schedulesToInsert.length > 0) {
        const { error } = await supabase
          .from('business_schedules')
          .insert(schedulesToInsert);

        if (error) throw error;
      }

      showSuccess('Horarios guardados', 'Los horarios se guardaron exitosamente');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving schedules:', error);
      showError('Error al guardar', 'No se pudieron guardar los horarios. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const copyToAllDays = (sourceDay: BusinessSchedule) => {
    setSchedules(schedules.map(schedule => ({
      ...schedule,
      start_time: sourceDay.start_time,
      end_time: sourceDay.end_time,
      is_available: sourceDay.is_available
    })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando horarios...</p>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Horarios de Atención - {business.name}
            </h1>
            <p className="text-gray-600">
              Configure los días y horarios en que su negocio estará disponible para recibir reservas
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Guardando...' : 'Guardar Horarios'}</span>
          </button>
        </div>

        {/* Schedule Configuration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración de Horarios
              </h2>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {schedules.map((schedule, index) => {
                const day = daysOfWeek.find(d => d.id === schedule.day_of_week);
                return (
                  <div key={schedule.day_of_week} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-24">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={schedule.is_available}
                          onChange={(e) => updateSchedule(schedule.day_of_week, 'is_available', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                        />
                        <span className="font-medium text-gray-900">{day?.name}</span>
                      </label>
                    </div>

                    {schedule.is_available ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Desde:</span>
                          <select
                            value={schedule.start_time}
                            onChange={(e) => updateSchedule(schedule.day_of_week, 'start_time', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Hasta:</span>
                          <select
                            value={schedule.end_time}
                            onChange={(e) => updateSchedule(schedule.day_of_week, 'end_time', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => copyToAllDays(schedule)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Copiar a todos</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500 italic">Cerrado</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Setup Options */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl">
              <h3 className="font-semibold text-blue-900 mb-3">Configuración Rápida</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSchedules(schedules.map(schedule => ({
                      ...schedule,
                      is_available: schedule.day_of_week >= 1 && schedule.day_of_week <= 5,
                      start_time: '09:00',
                      end_time: '18:00'
                    })));
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Lunes a Viernes (9:00 - 18:00)
                </button>
                <button
                  onClick={() => {
                    setSchedules(schedules.map(schedule => ({
                      ...schedule,
                      is_available: schedule.day_of_week >= 1 && schedule.day_of_week <= 6,
                      start_time: '10:00',
                      end_time: '19:00'
                    })));
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Lunes a Sábado (10:00 - 19:00)
                </button>
                <button
                  onClick={() => {
                    setSchedules(schedules.map(schedule => ({
                      ...schedule,
                      is_available: true,
                      start_time: '08:00',
                      end_time: '20:00'
                    })));
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Todos los días (8:00 - 20:00)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa de Horarios</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedules.filter(s => s.is_available).map(schedule => {
              const day = daysOfWeek.find(d => d.id === schedule.day_of_week);
              return (
                <div key={schedule.day_of_week} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-medium text-green-900">{day?.name}</div>
                  <div className="text-sm text-green-700">
                    {schedule.start_time} - {schedule.end_time}
                  </div>
                </div>
              );
            })}
          </div>
          {schedules.filter(s => s.is_available).length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No hay días disponibles configurados
            </p>
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
    </div>
  );
};