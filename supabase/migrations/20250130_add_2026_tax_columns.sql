-- Add new 2026 tax columns to clients table
-- These columns support the new taxes introduced in the 2026 Colombian tax calendar

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS has_carbon_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_beverage_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_fuel_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_plastic_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_rub BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_transfer_pricing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_country_report BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN clients.has_carbon_tax IS 'Impuesto al Carbono - Bimestral 2026';
COMMENT ON COLUMN clients.has_beverage_tax IS 'Impuesto Bebidas Ultraprocesadas - Bimestral 2026';
COMMENT ON COLUMN clients.has_fuel_tax IS 'Impuesto Gasolina/ACPM - Mensual 2026';
COMMENT ON COLUMN clients.has_plastic_tax IS 'Impuesto Plasticos de un Solo Uso - Anual 2026';
COMMENT ON COLUMN clients.requires_rub IS 'Registro Unico de Beneficiarios Finales - 2026';
COMMENT ON COLUMN clients.requires_transfer_pricing IS 'Precios de Transferencia - Anual 2026';
COMMENT ON COLUMN clients.requires_country_report IS 'Informe Pais por Pais - Anual 2026';
