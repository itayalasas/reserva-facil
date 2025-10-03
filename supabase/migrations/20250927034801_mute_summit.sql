/*
  # Add cancellation hours to services table

  1. Changes
    - Add `cancellation_hours` column to services table
    - Set default value to 24 hours
    - Update existing services to have 24 hours cancellation policy

  2. Notes
    - This allows businesses to configure how many hours before an appointment clients can cancel
    - Default is 24 hours which is a reasonable business practice
*/

-- Add cancellation_hours column to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'cancellation_hours'
  ) THEN
    ALTER TABLE services ADD COLUMN cancellation_hours integer DEFAULT 24 NOT NULL;
  END IF;
END $$;

-- Update existing services to have 24 hours cancellation policy
UPDATE services 
SET cancellation_hours = 24 
WHERE cancellation_hours IS NULL;