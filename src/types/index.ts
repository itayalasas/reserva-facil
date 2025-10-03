export interface User {
  id: string;
  email: string;
  role: 'business' | 'client';
  created_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  image_url?: string;
  category: string;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  cancellation_hours: number; // hours before appointment when cancellation is allowed
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  client_id: string;
  business_id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  service?: Service;
  business?: Business;
}

export interface BusinessSchedule {
  id: string;
  business_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  created_at: string;
}

export interface PaymentConfig {
  id: string;
  business_id: string;
  mercado_pago_access_token: string;
  mercado_pago_public_key: string;
  is_active: boolean;
  created_at: string;
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}