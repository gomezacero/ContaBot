-- Migration: Add validation columns to ocr_results table
-- Purpose: Persist validation results so they survive page refresh

-- ===========================================
-- 1. ADD NEW COLUMNS
-- ===========================================

ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS validation_result jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_passed boolean DEFAULT NULL;

-- ===========================================
-- 2. ADD COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON COLUMN ocr_results.validation_result IS 'JSON with validation errors, warnings, and calculated values from ocr-validation-service';
COMMENT ON COLUMN ocr_results.validation_passed IS 'True if validation has no errors, false otherwise';

-- ===========================================
-- 3. CREATE INDEX FOR FILTERING
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_ocr_results_validation_passed
ON ocr_results(validation_passed)
WHERE validation_passed IS NOT NULL;
