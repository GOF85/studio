-- Migration: Create historico_precios_erp table
-- Purpose: Track historical prices for ERP articles on each import
-- Date: 2025-12-04

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS historico_precios_erp CASCADE;

-- Create table for price history
CREATE TABLE historico_precios_erp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_erp_id TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL,
    precio_calculado DECIMAL(10,2) NOT NULL,
    proveedor_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(articulo_erp_id, fecha)
);

-- Index for efficient querying by article and date
CREATE INDEX idx_historico_precios_articulo_fecha 
ON historico_precios_erp(articulo_erp_id, fecha DESC);

-- Index for date range queries
CREATE INDEX idx_historico_precios_fecha 
ON historico_precios_erp(fecha DESC);

-- Comments
COMMENT ON TABLE historico_precios_erp IS 
'Historical prices for ERP articles, tracked on each import or price change';

COMMENT ON COLUMN historico_precios_erp.articulo_erp_id IS 
'Reference to the ERP article ID (erp_id from articulos_erp table)';

COMMENT ON COLUMN historico_precios_erp.fecha IS 
'Date when this price was recorded';

COMMENT ON COLUMN historico_precios_erp.precio_calculado IS 
'Calculated price: (precio_compra * (1 - descuento/100)) / unidad_conversion';

COMMENT ON COLUMN historico_precios_erp.proveedor_id IS 
'Optional reference to the provider at the time of this price record';
