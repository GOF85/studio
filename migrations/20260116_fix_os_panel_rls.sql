-- Migration: Fix RLS for OS Panel columns
-- Date: 2026-01-16
-- Purpose: Ensure authenticated users can read/write OS Panel control columns

-- The eventos table already has RLS enabled with policies
-- But we need to ensure the new columns are accessible

-- Grant explicit column permissions to authenticated users
GRANT SELECT, UPDATE ON public.eventos TO authenticated;

-- If there are existing policies that might be restrictive, we create a specific one
-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated full access to eventos" ON public.eventos;

-- Create permissive policy for authenticated users
CREATE POLICY "Allow authenticated full access to eventos"
  ON public.eventos
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure service role can always access (should be default, but explicit is better)
GRANT ALL ON public.eventos TO service_role;

-- Refresh grants
GRANT USAGE ON SCHEMA public TO authenticated;
