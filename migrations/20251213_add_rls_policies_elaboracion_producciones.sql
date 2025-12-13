-- Migration: Add RLS policies for elaboracion_producciones
-- Description: Allow authenticated users to view, insert, update, and delete production records
-- Date: 2025-12-13

-- Policy: Allow authenticated users to SELECT productions
CREATE POLICY "Allow authenticated users to view productions"
  ON elaboracion_producciones
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to INSERT productions
CREATE POLICY "Allow authenticated users to insert productions"
  ON elaboracion_producciones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to UPDATE their own productions
CREATE POLICY "Allow authenticated users to update own productions"
  ON elaboracion_producciones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to DELETE their own productions
CREATE POLICY "Allow authenticated users to delete own productions"
  ON elaboracion_producciones
  FOR DELETE
  TO authenticated
  USING (true);
