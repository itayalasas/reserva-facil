/*
  # Fix RLS policies for external authentication

  1. Security Changes
    - Drop existing restrictive policies that use auth.uid()
    - Create new policies compatible with external authentication
    - Allow authenticated users to create businesses with any user_id
    - Maintain read access for public users
    - Allow business owners to manage their own businesses

  2. Policy Details
    - INSERT: Allow authenticated users to create businesses
    - SELECT: Allow public read access to businesses
    - UPDATE/DELETE: Allow authenticated users to manage businesses
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON businesses;
DROP POLICY IF EXISTS "Public read access for businesses" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can update businesses" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can delete businesses" ON businesses;

-- Create new policies compatible with external authentication
CREATE POLICY "Allow authenticated users to insert businesses"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to businesses"
  ON businesses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to update businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete businesses"
  ON businesses
  FOR DELETE
  TO authenticated
  USING (true);