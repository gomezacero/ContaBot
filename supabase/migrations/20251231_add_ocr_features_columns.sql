-- Migration: Add missing columns for OCR feature persistence
-- Features: Currency (USD/COP), AIU, IVA rate, Impoconsumo rate

-- ===========================================
-- 1. ADD NEW COLUMNS
-- ===========================================

ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'COP',
ADD COLUMN IF NOT EXISTS aiu jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iva_rate numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tax_inc_rate numeric DEFAULT NULL;

-- ===========================================
-- 2. ADD COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON COLUMN ocr_results.currency IS 'Invoice currency: COP, USD, etc.';
COMMENT ON COLUMN ocr_results.aiu IS 'Colombian AIU breakdown: {administracion, imprevistos, utilidad, base_gravable, administracion_rate, imprevistos_rate, utilidad_rate}';
COMMENT ON COLUMN ocr_results.iva_rate IS 'IVA tax rate as decimal (0.19 = 19%)';
COMMENT ON COLUMN ocr_results.tax_inc_rate IS 'Impoconsumo rate as decimal (0.08 = 8%)';

