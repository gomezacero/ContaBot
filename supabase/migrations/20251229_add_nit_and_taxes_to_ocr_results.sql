-- Add missing columns to ocr_results table
ALTER TABLE ocr_results 
ADD COLUMN IF NOT EXISTS nit text,
ADD COLUMN IF NOT EXISTS tax_inc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS retentions jsonb DEFAULT '{"reteFuente": 0, "reteIca": 0, "reteIva": 0}'::jsonb;
