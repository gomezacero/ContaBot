-- Migration: Add payroll parameter overrides to employees table
-- Purpose: Allow accountants to use historical SMMLV and transport aid values
--          for employees who started in previous years (e.g., 2024, 2025)

-- Add columns to store override parameters per employee
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS ano_base integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS smmlv_override numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aux_transporte_override numeric DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN employees.ano_base IS 'Año base para cálculos de nómina/liquidación (2024, 2025, 2026). NULL = usar año actual';
COMMENT ON COLUMN employees.smmlv_override IS 'SMMLV personalizado para este empleado. NULL = usar valor del año seleccionado';
COMMENT ON COLUMN employees.aux_transporte_override IS 'Auxilio de transporte personalizado. NULL = usar valor del año seleccionado';

-- Create index for filtering by year (useful for reports)
CREATE INDEX IF NOT EXISTS idx_employees_ano_base ON employees(ano_base) WHERE ano_base IS NOT NULL;
