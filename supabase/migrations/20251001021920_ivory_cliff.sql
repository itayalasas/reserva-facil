/*
  # Create users table for external authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches external auth user ID
      - `email` (text, unique, not null)
      - `name` (text)
      - `role` (text, default 'client')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for public access (needed for external auth)

  3. Changes
    - This table will store external users to satisfy foreign key constraints
    - Allows businesses table to reference valid user IDs
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'client',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (needed for external auth)
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to users"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to users"
  ON users
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete access to users"
  ON users
  FOR DELETE
  TO public
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);