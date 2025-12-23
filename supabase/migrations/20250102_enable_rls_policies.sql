-- Migration: Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- ===========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ===========================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 2. DROP EXISTING POLICIES (if any)
-- ===========================================

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage employees of their clients" ON public.employees;
DROP POLICY IF EXISTS "Users can manage payroll of their employees" ON public.payroll_records;

-- ===========================================
-- 3. CREATE POLICIES FOR CLIENTS TABLE
-- ===========================================

-- Policy: Users can only SELECT/INSERT/UPDATE/DELETE their own clients
CREATE POLICY "Users can manage their own clients"
ON public.clients
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 4. CREATE POLICIES FOR EMPLOYEES TABLE
-- ===========================================

-- Policy: Users can only access employees that belong to their clients
CREATE POLICY "Users can manage employees of their clients"
ON public.employees
FOR ALL
USING (
    client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
);

-- ===========================================
-- 5. CREATE POLICIES FOR PAYROLL_RECORDS TABLE
-- ===========================================

-- Policy: Users can only access payroll records of their employees
CREATE POLICY "Users can manage payroll of their employees"
ON public.payroll_records
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
-- 6. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ===========================================

-- These grants allow authenticated users to perform operations
-- RLS policies will filter the actual data they can access

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_records TO authenticated;

-- ===========================================
-- 7. COMMENTS
-- ===========================================

COMMENT ON POLICY "Users can manage their own clients" ON public.clients IS 
'Row Level Security: Users can only access clients they created (user_id matches auth.uid())';

COMMENT ON POLICY "Users can manage employees of their clients" ON public.employees IS 
'Row Level Security: Users can only access employees that belong to their clients';

COMMENT ON POLICY "Users can manage payroll of their employees" ON public.payroll_records IS 
'Row Level Security: Users can only access payroll records of employees from their clients';
