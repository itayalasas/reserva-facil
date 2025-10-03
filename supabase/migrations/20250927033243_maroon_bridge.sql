/*
  # Create booking system database schema

  1. New Tables
    - `businesses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `description` (text)
      - `address` (text)
      - `phone` (text)
      - `category` (text)
      - `image_url` (text)
      - `created_at` (timestamp)

    - `services`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `duration` (integer, minutes)
      - `is_active` (boolean)
      - `created_at` (timestamp)

    - `business_schedules`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `day_of_week` (integer, 0-6)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      - `created_at` (timestamp)

    - `bookings`
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key to services)
      - `client_id` (uuid, foreign key to auth.users)
      - `business_id` (uuid, foreign key to businesses)
      - `scheduled_at` (timestamp)
      - `status` (text)
      - `notes` (text)
      - `created_at` (timestamp)

    - `payment_configs`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `mercado_pago_access_token` (text)
      - `mercado_pago_public_key` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Allow public read access to businesses and services for browsing
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create business_schedules table
CREATE TABLE IF NOT EXISTS public.business_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.business_schedules ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create payment_configs table
CREATE TABLE IF NOT EXISTS public.payment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mercado_pago_access_token TEXT,
  mercado_pago_public_key TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses table
CREATE POLICY "Allow all users to read businesses"
  ON public.businesses
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create businesses"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow business owners to update their business"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow business owners to delete their business"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for services table
CREATE POLICY "Allow all users to read active services"
  ON public.services
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow business owners to manage their services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for business_schedules table
CREATE POLICY "Allow all users to read business schedules"
  ON public.business_schedules
  FOR SELECT
  USING (is_available = true);

CREATE POLICY "Allow business owners to manage their schedules"
  ON public.business_schedules
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for bookings table
CREATE POLICY "Allow business owners to read their bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
    OR client_id = auth.uid()
  );

CREATE POLICY "Allow authenticated users to create bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow business owners to update their bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payment_configs table
CREATE POLICY "Allow business owners to manage their payment config"
  ON public.payment_configs
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_schedules_business_id ON public.business_schedules(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_payment_configs_business_id ON public.payment_configs(business_id);