-- Migration: Create liquidation_records table
-- Purpose: Store employee termination settlement calculations with full breakdown
-- Date: 2025-01-27

-- ===========================================
-- 1. CREATE TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.liquidation_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    hire_date DATE NOT NULL,
    termination_date DATE NOT NULL,
    termination_reason TEXT DEFAULT NULL,
    days_worked INTEGER NOT NULL,
    calculation_data JSONB NOT NULL,
    net_pay NUMERIC(15, 2) NOT NULL,
    pdf_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 2. CREATE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_liquidation_employee ON public.liquidation_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_liquidation_created ON public.liquidation_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquidation_termination_date ON public.liquidation_records(termination_date DESC);

-- ===========================================
-- 3. ENABLE RLS
-- ===========================================

ALTER TABLE public.liquidation_records ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. CREATE RLS POLICY
-- ===========================================

DROP POLICY IF EXISTS "Users can manage liquidations of their employees" ON public.liquidation_records;

CREATE POLICY "Users can manage liquidations of their employees"
ON public.liquidation_records
FOR ALL
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
)
WITH CHECK (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

-- ===========================================
-- 5. GRANT PERMISSIONS
-- ===========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidation_records TO authenticated;

-- ===========================================
-- 6. COMMENTS
-- ===========================================

COMMENT ON TABLE public.liquidation_records IS
'Stores employee termination settlement calculations with full breakdown of Colombian labor benefits (cesantías, intereses, prima, vacaciones)';

COMMENT ON COLUMN public.liquidation_records.calculation_data IS
'JSON containing LiquidationResult: daysWorked, baseLiquidation, cesantias, interesesCesantias, prima, vacaciones, totalPrestaciones, deductions, netToPay';

COMMENT ON COLUMN public.liquidation_records.termination_reason IS
'RENUNCIA | DESPIDO_JUSTA_CAUSA | DESPIDO_SIN_JUSTA_CAUSA | MUTUO_ACUERDO | FIN_CONTRATO';

COMMENT ON COLUMN public.liquidation_records.days_worked IS
'Days calculated using Colombian 360-day system (calculateDays360)';
