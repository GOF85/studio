-- Add comentarios_alergenos column to gastronomia_orders table
ALTER TABLE gastronomia_orders
ADD COLUMN comentarios_alergenos TEXT DEFAULT '';

-- Create an index for better query performance if needed
CREATE INDEX idx_gastronomia_orders_comentarios_alergenos 
ON gastronomia_orders(comentarios_alergenos) 
WHERE comentarios_alergenos IS NOT NULL AND comentarios_alergenos != '';
