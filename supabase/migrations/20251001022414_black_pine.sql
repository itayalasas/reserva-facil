/*
  # Arreglar referencia de foreign key

  1. Eliminar foreign key constraint que apunta a auth.users
  2. Crear nueva foreign key constraint que apunte a public.users
  3. Esto permitirá que usuarios externos puedan crear negocios
*/

-- Eliminar la foreign key constraint existente que apunta a auth.users
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_user_id_fkey;

-- Crear nueva foreign key constraint que apunte a public.users
ALTER TABLE businesses 
ADD CONSTRAINT businesses_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Hacer lo mismo para la tabla bookings si tiene el mismo problema
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;
ALTER TABLE bookings 
ADD CONSTRAINT bookings_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;