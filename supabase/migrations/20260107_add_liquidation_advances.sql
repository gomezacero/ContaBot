-- Migration: Add advances_data column for liquidation anticipos
-- Purpose: Store anticipated benefit payments (primas, vacaciones, cesantías, intereses) and custom deductions
-- Date: 2026-01-07

-- ===========================================
-- 1. ADD advances_data COLUMN
-- ===========================================

-- Add JSONB column to store advances and custom deductions per liquidation record
-- This stores data from LiquidationAdvancesInput type
ALTER TABLE public.liquidation_records
ADD COLUMN IF NOT EXISTS advances_data JSONB DEFAULT NULL;

-- ===========================================
-- 2. CREATE INDEX FOR QUERIES
-- ===========================================

-- Index for queries that check if advances exist (filter liquidations with anticipos)
CREATE INDEX IF NOT EXISTS idx_liquidation_has_advances
ON public.liquidation_records((advances_data IS NOT NULL))
WHERE advances_data IS NOT NULL;

-- ===========================================
-- 3. DOCUMENTATION
-- ===========================================

COMMENT ON COLUMN public.liquidation_records.advances_data IS
'JSON containing LiquidationAdvancesInput: anticipos (prima, vacaciones, cesantías, intereses) and deduccionesPersonalizadas[]. Structure: { anticipos: { prima: { tipo, semestreJunioPagado, semestreDiciembrePagado, montoPagado }, vacacionesPagadas, cesantiasParciales, interesesCesantiasPagados }, deduccionesPersonalizadas: [{ id, nombre, valor }] }';
