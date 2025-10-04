import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, User, Calendar, CreditCard, Clock, DollarSign, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, useNotification } from './Notification';
import { PaymentForm } from './PaymentForm';
import { Business, Service, ClientInfo, TimeSlot, BusinessSchedule } from '../types';

interface BookingProcessProps {
  business: Business;
  preselectedService?: Service | null;
  setCurrentView: (view: string) => void;
}

export const BookingProcess = ({ business, preselectedService, setCurrentView }: BookingProcessProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<BusinessSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form data
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingTimestamp, setBookingTimestamp] = useState<string>('');

  const steps = [
    { number: 1, title: 'Datos del Cliente', icon: User },
    { number: 2, title: 'Servicio y Fecha', icon: Calendar },
    { number: 3, title: 'Pago', icon: CreditCard }
  ];

  useEffect(() => {
    fetchData();
    fetchPaymentConfig();

    // Si hay un servicio preseleccionado, establecerlo
    if (preselectedService) {
      setSelectedService(preselectedService);
    }

    // Autocompletar datos del usuario autenticado
    if (isExternalAuth && externalUser) {
      setClientInfo({
        name: externalUser.user.name || externalUser.user.email || '',
        email: externalUser.user.email || '',
        phone: ''
      });
    } else if (user) {
      setClientInfo({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: ''
      });
    }
  }, []);

  useEffect(() => {
    // Actualizar datos cuando cambie el usuario
    if (isExternalAuth && externalUser) {
      setClientInfo({
        name: externalUser.user.name || externalUser.user.email || '',
        email: externalUser.user.email || '',
        phone: ''
      });
    } else if (user) {
      setClientInfo({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: ''
      });
    }
  }, [user, externalUser, isExternalAuth]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      generateTimeSlots();
    }
  }, [selectedService, selectedDate]);

  const fetchData = async () => {
    try {
      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true);

      setServices(servicesData || []);

      // Fetch schedules
      const { data: schedulesData } = await supabase
        .from('business_schedules')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_available', true);

      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentConfig = async () => {
    try {
      const { data } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .maybeSingle();

      setPaymentConfig(data);
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedService || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const selectedDateObj = new Date(selectedDate);
      const dayOfWeek = selectedDateObj.getDay();
      
      const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
      if (!schedule) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      // Generate time slots based on business schedule
      const slots: TimeSlot[] = [];
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
      
      const serviceDuration = selectedService.duration;

      // Fetch existing bookings for the selected date with confirmed or pending status
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select(`
          scheduled_at, status,
          service:services!inner(duration)
        `)
        .eq('business_id', business.id)
        .gte('scheduled_at', `${selectedDate}T00:00:00.000Z`)
        .lt('scheduled_at', `${selectedDate}T23:59:59.999Z`)
        .in('status', ['confirmed', 'pending']);

      // Create a set of blocked time ranges (more precise)
      const blockedRanges: Array<{start: Date, end: Date}> = [];
      existingBookings?.filter(booking => booking.status !== 'cancelled')?.forEach(booking => {
        const bookingStart = new Date(booking.scheduled_at);
        const bookingDuration = booking.service?.duration || 60;
        const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);
        
        blockedRanges.push({
          start: bookingStart,
          end: bookingEnd
        });
      });
        // Generate time slots based on service duration
      // Generate time slots based on service duration (not fixed 30-min slots)
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        // Create the potential booking time slot
        const slotStart = new Date();
        slotStart.setHours(currentHour, currentMinute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
        
        const closingTime = new Date(selectedDate);
        closingTime.setHours(endHour, endMinute, 0, 0);
        const fitsInSchedule = slotEnd <= closingTime;
        
        // Don't show past times for today
        const now = new Date();
        const isToday = selectedDate === now.toISOString().split('T')[0];
        const isPastTime = isToday && slotStart <= now;
        
        // Check if this time slot conflicts with any existing booking
        let hasConflict = false;
        for (const blockedRange of blockedRanges) {
          // Move to next slot based on service duration
          currentMinute += serviceDuration;
          if ((slotStart >= blockedRange.start && slotStart < blockedRange.end) ||
            (slotEnd > blockedRange.start && slotEnd <= blockedRange.end)
          ) {
            hasConflict = true;
            break;
          }
        }
        
        const isAvailable = fitsInSchedule && !isPastTime && !hasConflict;
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
        
        // Move to next slot based on service duration
        currentMinute += serviceDuration;
        if (currentMinute >= 60) {
          const hoursToAdd = Math.floor(currentMinute / 60);
          currentHour += hoursToAdd;
          currentMinute = currentMinute % 60;
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Check if business is open on this day
      const hasSchedule = schedules.some(s => s.day_of_week === dayOfWeek);
      
      if (hasSchedule) {
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('es-ES', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })
        });
      }
    }
    
    return dates;
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createBookingBeforePayment = async (): Promise<string | null> => {
    setProcessing(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

      // Get the correct client_id based on authentication type
      const clientId = isExternalAuth && externalUser ? externalUser.user.id : user?.id;

      if (!clientId) {
        throw new Error('Usuario no autenticado');
      }

      // Crear un timestamp único para identificar esta reserva
      const timestamp = Date.now().toString();


      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([{
          service_id: selectedService!.id,
          client_id: clientId,
          business_id: business.id,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          notes: `Cliente: ${clientInfo.name}, Email: ${clientInfo.email}, Teléfono: ${clientInfo.phone} - Timestamp: ${timestamp}`
        }])
        .select()
        .single();

      if (error) throw error;


      // Store the timestamp in component state for payment
      setBookingTimestamp(timestamp);

      return timestamp;
    } catch (error) {
      console.error('Error creating booking before payment:', error);
      showError('Error al crear la reserva', 'Por favor, intenta nuevamente.');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const updateBookingAfterPayment = async (bookingId: string, paymentStatus: string) => {
    try {
      const newStatus = paymentStatus === 'success' ? 'confirmed' : 
                       paymentStatus === 'pending' ? 'pending' : 'cancelled';
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          notes: `${clientInfo.name}, Email: ${clientInfo.email}, Teléfono: ${clientInfo.phone} - Pago: ${paymentStatus}`
        })
        .eq('id', bookingId);

      if (error) throw error;

      
      // Clean up stored booking ID
      localStorage.removeItem('pending_booking_id');
      
      return true;
    } catch (error) {
      console.error('Error updating booking after payment:', error);
      return false;
    }
  };

  // Check for payment callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const externalReference = urlParams.get('external_reference');
    const pendingBookingId = localStorage.getItem('pending_booking_id');

    if (paymentStatus && pendingBookingId) {
      updateBookingAfterPayment(pendingBookingId, paymentStatus).then((success) => {
        if (success) {
          const statusText = paymentStatus === 'success' ? 'confirmada' : 
                           paymentStatus === 'pending' ? 'pendiente de pago' : 'cancelada';
          
          showSuccess(
            `¡Reserva ${statusText}!`,
            paymentStatus === 'success' 
              ? 'Tu pago fue procesado correctamente y la reserva está confirmada.'
              : paymentStatus === 'pending'
              ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
              : 'Hubo un problema con el pago. La reserva fue cancelada.'
          );
          
          // Clean URL and redirect
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            setCurrentView('my-bookings');
          }, 2000);
        }
      });
    }
  }, []);

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.email || !clientInfo.phone) {
      showError('Campos incompletos', 'Por favor completa todos los campos requeridos');
      return;
    }

    // Check if payment is required and configured
    if (paymentConfig && paymentConfig.is_active) {
      // Create booking first, then redirect to payment
      const timestamp = await createBookingBeforePayment();
      if (timestamp) {
        setShowPayment(true);
      }
    } else {
      // Create booking without payment
      await createBooking('pending');
    }
  };

  const createBooking = async (status: string = 'pending') => {
    setProcessing(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Get the correct client_id based on authentication type
      const clientId = isExternalAuth && externalUser ? externalUser.user.id : user?.id;

      if (!clientId) {
        throw new Error('Usuario no autenticado');
      }

      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert([{
          service_id: selectedService.id,
          client_id: clientId,
          business_id: business.id,
          scheduled_at: scheduledAt.toISOString(),
          status: status,
          notes: `Cliente: ${clientInfo.name}, Email: ${clientInfo.email}, Teléfono: ${clientInfo.phone}`
        }])
        .select()
        .single();

      if (error) throw error;


      // Show success message and redirect
      showSuccess(
        '¡Reserva creada exitosamente!', 
        status === 'confirmed' 
          ? 'Tu pago fue procesado correctamente y la reserva está confirmada.'
          : 'El negocio recibirá tu solicitud y te contactará para confirmar.'
      );
      
      // Redirect after showing success message
      setTimeout(() => {
        setCurrentView('my-bookings');
      }, 2000);
    } catch (error) {
      console.error('Error creating booking:', error);
      showError('Error al crear la reserva', 'Por favor, intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPayment(false);
    // Create booking with confirmed status after successful payment
    await createBooking('confirmed');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    showError('Error en el pago', error);
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setCurrentView('business-detail')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a {business.name}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservar Cita
          </h1>
          <p className="text-gray-600">
            Complete los siguientes pasos para confirmar su reserva
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    Paso {step.number}
                  </p>
                  <p className={`text-sm ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-8 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* Step 1: Client Information */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Información del Cliente
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="juan@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Service and Date Selection */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Seleccionar Servicio y Fecha
              </h2>
              
              {/* Service Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {preselectedService ? 'Servicio Seleccionado' : 'Elige un Servicio'}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {(preselectedService ? [preselectedService] : services).map((service) => (
                    <div
                      key={service.id}
                      onClick={() => !preselectedService && setSelectedService(service)}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        preselectedService
                          ? 'border-blue-600 bg-blue-50 cursor-default'
                          : selectedService?.id === service.id
                          ? 'border-blue-600 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                        {preselectedService && (
                          <span className="flex items-center text-sm text-blue-600 font-medium">
                            <Check className="h-4 w-4 mr-1" />
                            Preseleccionado
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-600">{service.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">${service.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              {selectedService && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Selecciona una Fecha
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                    {getAvailableDates().map((dateOption) => (
                      <button
                        key={dateOption.date}
                        onClick={() => setSelectedDate(dateOption.date)}
                        className={`p-3 text-center rounded-xl border-2 transition-all ${
                          selectedDate === dateOption.date
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{dateOption.display}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Selection */}
              {selectedService && selectedDate && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Horarios Disponibles
                  </h3>
                  {loadingSlots ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Cargando horarios disponibles...
                      </p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No hay horarios disponibles para esta fecha
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Intenta seleccionar otra fecha
                      </p>
                    </div>
                  ) : availableSlots.filter(slot => slot.available).length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No hay horarios disponibles para esta fecha
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Intenta seleccionar otra fecha
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-3 text-center rounded-xl border-2 transition-all ${
                            selectedTime === slot.time
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : slot.available
                              ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="font-medium">{slot.time}</div>
                          {!slot.available && (
                            <div className="text-xs text-gray-400 mt-1">Ocupado</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div>
              {!showPayment ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Confirmar {paymentConfig?.is_active ? 'y Pagar' : 'Reserva'}
                  </h2>
                  
                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Resumen de la Reserva
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cliente:</span>
                        <span className="font-medium">{clientInfo.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Servicio:</span>
                        <span className="font-medium">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">
                          {selectedDate && new Date(selectedDate).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hora:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duración:</span>
                        <span className="font-medium">{selectedService?.duration} minutos</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-lg font-bold text-green-600">${selectedService?.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Options */}
                  {paymentConfig?.is_active ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <h3 className="font-semibold text-green-900 mb-3">
                        Pago con Mercado Pago
                      </h3>
                      <p className="text-green-800 mb-4">
                        Paga de forma segura con Mercado Pago. Tu reserva se confirmará automáticamente después del pago.
                      </p>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <span className="text-green-900 font-medium">Pago online seguro</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="font-semibold text-blue-900 mb-3">
                        Opciones de Pago
                      </h3>
                      <p className="text-blue-800 mb-4">
                        Las reservas se confirman sin pago previo. 
                        El pago se realizará directamente en el establecimiento.
                      </p>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-900 font-medium">Pago en el local</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Procesar Pago
                  </h2>
                  
                  {paymentConfig && bookingTimestamp && (
                    <PaymentForm
                      amount={selectedService?.price || 0}
                      description={`${selectedService?.name} - ${business.name}`}
                      payerEmail={clientInfo.email}
                      payerName={clientInfo.name}
                      publicKey={paymentConfig.mercado_pago_public_key}
                      accessToken={paymentConfig.mercado_pago_access_token}
                      externalReference={`booking_${bookingTimestamp}`}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Anterior
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && (!clientInfo.name || !clientInfo.email || !clientInfo.phone)) ||
                  (currentStep === 2 && (!selectedService || !selectedDate || !selectedTime))
                }
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                  (currentStep === 1 && (!clientInfo.name || !clientInfo.email || !clientInfo.phone)) ||
                  (currentStep === 2 && (!selectedService || !selectedDate || !selectedTime))
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Siguiente
                <ArrowRight className="h-5 w-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleBooking}
                disabled={processing || !selectedService || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.email || !clientInfo.phone}
                className={`flex items-center px-8 py-3 rounded-xl font-medium transition-all ${
                  processing || !selectedService || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.email || !clientInfo.phone
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    {paymentConfig?.is_active ? 'Proceder al Pago' : 'Confirmar Reserva'}
                    <Check className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={hideNotification}
          />
        )}
      </div>
    </div>
  );
};