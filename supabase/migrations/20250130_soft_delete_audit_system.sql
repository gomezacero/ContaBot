-- ============================================================
-- MIGRATION: Soft Delete & Audit Trail System for ContaBot
-- Purpose: Protect against accidental deletions with recovery
-- Date: 2025-01-30
-- ============================================================

-- ===========================================
-- 1. ADD SOFT DELETE COLUMNS TO ALL TABLES
-- ===========================================

-- Clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Payroll records table
ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Liquidation records table
ALTER TABLE public.liquidation_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- OCR results table
ALTER TABLE public.ocr_results
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- ===========================================
-- 2. CREATE AUDIT LOG TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was affected
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,

    -- What happened
    action TEXT NOT NULL CHECK (action IN ('SOFT_DELETE', 'RESTORE', 'HARD_DELETE')),

    -- Who did it
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,

    -- When
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Context
    record_snapshot JSONB,
    reason TEXT
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit log entries
CREATE POLICY "Users can view their own audit log"
ON public.audit_log FOR SELECT
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON public.audit_log TO authenticated;

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
    ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
    ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
    ON public.audit_log(action);

-- ===========================================
-- 3. CREATE INDEXES FOR SOFT DELETE QUERIES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
    ON public.clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at
    ON public.employees(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_records_deleted_at
    ON public.payroll_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_liquidation_records_deleted_at
    ON public.liquidation_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ocr_results_deleted_at
    ON public.ocr_results(deleted_at) WHERE deleted_at IS NULL;

-- ===========================================
-- 4. CREATE SOFT DELETE FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION soft_delete_record(
    p_table_name TEXT,
    p_record_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_record_snapshot JSONB;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- Get record snapshot before deletion
    EXECUTE format(
        'SELECT to_jsonb(t.*) FROM %I t WHERE id = $1 AND deleted_at IS NULL',
        p_table_name
    ) INTO v_record_snapshot USING p_record_id;

    IF v_record_snapshot IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Record not found or already deleted'
        );
    END IF;

    -- Perform soft delete
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
        p_table_name
    ) USING v_user_id, p_record_id;

    -- Log to audit table
    INSERT INTO public.audit_log (
        table_name, record_id, action, user_id, user_email,
        record_snapshot, reason
    ) VALUES (
        p_table_name, p_record_id, 'SOFT_DELETE', v_user_id, v_user_email,
        v_record_snapshot, p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_at', NOW(),
        'record_id', p_record_id
    );
END;
$$;

-- ===========================================
-- 5. CREATE RESTORE FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION restore_deleted_record(
    p_table_name TEXT,
    p_record_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_deleted_at TIMESTAMPTZ;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- Check if record exists and is deleted
    EXECUTE format(
        'SELECT deleted_at FROM %I WHERE id = $1',
        p_table_name
    ) INTO v_deleted_at USING p_record_id;

    IF v_deleted_at IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Record not found or not deleted'
        );
    END IF;

    -- Restore the record
    EXECUTE format(
        'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
        p_table_name
    ) USING p_record_id;

    -- Log to audit table
    INSERT INTO public.audit_log (
        table_name, record_id, action, user_id, user_email
    ) VALUES (
        p_table_name, p_record_id, 'RESTORE', v_user_id, v_user_email
    );

    RETURN jsonb_build_object(
        'success', true,
        'restored_at', NOW(),
        'record_id', p_record_id
    );
END;
$$;

-- ===========================================
-- 6. CREATE BULK SOFT DELETE FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION soft_delete_bulk(
    p_table_name TEXT,
    p_filter_column TEXT,
    p_filter_value UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_count INTEGER;
    v_record RECORD;
BEGIN
    v_user_id := auth.uid();

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- Log each record before bulk deletion
    FOR v_record IN EXECUTE format(
        'SELECT id, to_jsonb(t.*) as snapshot FROM %I t WHERE %I = $1 AND deleted_at IS NULL',
        p_table_name, p_filter_column
    ) USING p_filter_value
    LOOP
        INSERT INTO public.audit_log (
            table_name, record_id, action, user_id, user_email,
            record_snapshot, reason
        ) VALUES (
            p_table_name, v_record.id, 'SOFT_DELETE', v_user_id, v_user_email,
            v_record.snapshot, p_reason
        );
    END LOOP;

    -- Perform bulk soft delete
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE %I = $2 AND deleted_at IS NULL',
        p_table_name, p_filter_column
    ) USING v_user_id, p_filter_value;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_count
    );
END;
$$;

-- ===========================================
-- 7. UPDATE RLS POLICIES FOR SOFT DELETE
-- ===========================================

-- Drop existing policies for clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

-- New policies for clients (filter soft-deleted by default)
CREATE POLICY "Users can read their active clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can read their deleted clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop existing policies for employees
DROP POLICY IF EXISTS "Users can manage employees of their clients" ON public.employees;

-- New policies for employees
CREATE POLICY "Users can read active employees of their clients"
ON public.employees FOR SELECT
USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    AND deleted_at IS NULL
);

CREATE POLICY "Users can read deleted employees of their clients"
ON public.employees FOR SELECT
USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    AND deleted_at IS NOT NULL
);

CREATE POLICY "Users can insert employees"
ON public.employees FOR INSERT
WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update employees"
ON public.employees FOR UPDATE
USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Drop existing policies for payroll_records
DROP POLICY IF EXISTS "Users can manage payroll of their employees" ON public.payroll_records;

-- New policies for payroll_records
CREATE POLICY "Users can read active payroll records"
ON public.payroll_records FOR SELECT
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
    AND deleted_at IS NULL
);

CREATE POLICY "Users can read deleted payroll records"
ON public.payroll_records FOR SELECT
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL
);

CREATE POLICY "Users can insert payroll records"
ON public.payroll_records FOR INSERT
WITH CHECK (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update payroll records"
ON public.payroll_records FOR UPDATE
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

-- Drop existing policies for liquidation_records
DROP POLICY IF EXISTS "Users can manage liquidations of their employees" ON public.liquidation_records;

-- New policies for liquidation_records
CREATE POLICY "Users can read active liquidation records"
ON public.liquidation_records FOR SELECT
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
    AND deleted_at IS NULL
);

CREATE POLICY "Users can read deleted liquidation records"
ON public.liquidation_records FOR SELECT
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL
);

CREATE POLICY "Users can insert liquidation records"
ON public.liquidation_records FOR INSERT
WITH CHECK (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update liquidation records"
ON public.liquidation_records FOR UPDATE
USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.clients c ON e.client_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

-- Drop existing policies for ocr_results
DROP POLICY IF EXISTS "Users can manage their own OCR results" ON public.ocr_results;

-- New policies for ocr_results
CREATE POLICY "Users can read active OCR results"
ON public.ocr_results FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can read deleted OCR results"
ON public.ocr_results FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Users can insert OCR results"
ON public.ocr_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update OCR results"
ON public.ocr_results FOR UPDATE
USING (auth.uid() = user_id);

-- ===========================================
-- 8. GRANT EXECUTE ON FUNCTIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION soft_delete_record TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_record TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_bulk TO authenticated;

-- ===========================================
-- 9. CLEANUP FUNCTION (for scheduled job)
-- ===========================================

CREATE OR REPLACE FUNCTION cleanup_old_soft_deleted_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
    -- Log permanent deletions before removing
    INSERT INTO public.audit_log (table_name, record_id, action, record_snapshot)
    SELECT 'clients', id, 'HARD_DELETE', to_jsonb(c.*)
    FROM public.clients c
    WHERE deleted_at < v_cutoff;

    INSERT INTO public.audit_log (table_name, record_id, action, record_snapshot)
    SELECT 'employees', id, 'HARD_DELETE', to_jsonb(e.*)
    FROM public.employees e
    WHERE deleted_at < v_cutoff;

    INSERT INTO public.audit_log (table_name, record_id, action, record_snapshot)
    SELECT 'ocr_results', id, 'HARD_DELETE', to_jsonb(o.*)
    FROM public.ocr_results o
    WHERE deleted_at < v_cutoff;

    INSERT INTO public.audit_log (table_name, record_id, action, record_snapshot)
    SELECT 'payroll_records', id, 'HARD_DELETE', to_jsonb(p.*)
    FROM public.payroll_records p
    WHERE deleted_at < v_cutoff;

    INSERT INTO public.audit_log (table_name, record_id, action, record_snapshot)
    SELECT 'liquidation_records', id, 'HARD_DELETE', to_jsonb(l.*)
    FROM public.liquidation_records l
    WHERE deleted_at < v_cutoff;

    -- Permanently delete old records (order matters for foreign keys)
    DELETE FROM public.ocr_results WHERE deleted_at < v_cutoff;
    DELETE FROM public.liquidation_records WHERE deleted_at < v_cutoff;
    DELETE FROM public.payroll_records WHERE deleted_at < v_cutoff;
    DELETE FROM public.employees WHERE deleted_at < v_cutoff;
    DELETE FROM public.clients WHERE deleted_at < v_cutoff;

    -- Clean up very old audit logs (keep 1 year)
    DELETE FROM public.audit_log WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- ===========================================
-- 10. COMMENTS
-- ===========================================

COMMENT ON TABLE public.audit_log IS
'Complete audit trail of all delete and restore operations in ContaBot';

COMMENT ON FUNCTION soft_delete_record IS
'Soft deletes a single record and logs to audit trail';

COMMENT ON FUNCTION restore_deleted_record IS
'Restores a soft-deleted record and logs the restoration';

COMMENT ON FUNCTION soft_delete_bulk IS
'Soft deletes multiple records matching a filter criterion';

COMMENT ON FUNCTION cleanup_old_soft_deleted_records IS
'Permanently deletes soft-deleted records older than 30 days. Should be run daily via cron.';
