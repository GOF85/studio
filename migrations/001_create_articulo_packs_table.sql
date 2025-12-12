-- Create articulo_packs table for storing pack relationships
CREATE TABLE IF NOT EXISTS articulo_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL,
  erp_id VARCHAR(255) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
  UNIQUE(articulo_id, erp_id)
);

-- Create index for faster queries
CREATE INDEX idx_articulo_packs_articulo_id ON articulo_packs(articulo_id);

-- Enable RLS
ALTER TABLE articulo_packs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all" ON articulo_packs
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON articulo_packs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON articulo_packs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON articulo_packs
  FOR DELETE USING (auth.role() = 'authenticated');
