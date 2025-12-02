-- Create 'recetas' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('recetas', 'recetas', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to images
-- Drop existing policies if they exist to avoid conflicts during re-runs
DROP POLICY IF EXISTS "Recetas Public Access" ON storage.objects;
CREATE POLICY "Recetas Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'recetas' );

-- Policy to allow authenticated users to upload images
DROP POLICY IF EXISTS "Recetas Authenticated Upload" ON storage.objects;
CREATE POLICY "Recetas Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'recetas' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update their images
DROP POLICY IF EXISTS "Recetas Authenticated Update" ON storage.objects;
CREATE POLICY "Recetas Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'recetas' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete images
DROP POLICY IF EXISTS "Recetas Authenticated Delete" ON storage.objects;
CREATE POLICY "Recetas Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'recetas' AND auth.role() = 'authenticated' );
