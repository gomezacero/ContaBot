-- ============================================
-- MIGRACIÓN: Sistema de tracking de uso de API
-- Fecha: 2025-01-24
-- Propósito: Implementar límites de uso por usuario
-- ============================================

-- Tabla principal de uso de API
CREATE TABLE IF NOT EXISTS public.api_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Fecha de uso (una fila por usuario por día)
    usage_date date NOT NULL DEFAULT CURRENT_DATE,

    -- Contadores de uso
    ocr_requests_count integer DEFAULT 0,
    files_processed integer DEFAULT 0,
    bytes_processed bigint DEFAULT 0,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Restricción única: solo un registro por usuario por día
    UNIQUE(user_id, usage_date)
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON public.api_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON public.api_usage(user_id, usage_date);

-- Habilitar Row Level Security
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio uso
CREATE POLICY "Users can view their own usage"
ON public.api_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Permitir inserción/actualización desde el servidor (service role)
-- Nota: Las operaciones de incremento se harán desde el backend con service role
CREATE POLICY "Service role can manage all usage"
ON public.api_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política: Los usuarios autenticados pueden insertar su propio registro
CREATE POLICY "Users can insert their own usage"
ON public.api_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios autenticados pueden actualizar su propio registro
CREATE POLICY "Users can update their own usage"
ON public.api_usage
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permisos
GRANT SELECT, INSERT, UPDATE ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_api_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS api_usage_updated_at ON public.api_usage;
CREATE TRIGGER api_usage_updated_at
    BEFORE UPDATE ON public.api_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_api_usage_updated_at();

-- ============================================
-- FUNCIÓN: Incrementar uso de API
-- Uso: SELECT increment_api_usage('user-uuid', 1, 1024);
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_api_usage(
    p_user_id uuid,
    p_files_count integer DEFAULT 1,
    p_bytes bigint DEFAULT 0
)
RETURNS TABLE (
    ocr_requests integer,
    files integer,
    bytes bigint
) AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Insertar o actualizar el registro de uso del día
    INSERT INTO public.api_usage (user_id, usage_date, ocr_requests_count, files_processed, bytes_processed)
    VALUES (p_user_id, CURRENT_DATE, 1, p_files_count, p_bytes)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        ocr_requests_count = api_usage.ocr_requests_count + 1,
        files_processed = api_usage.files_processed + p_files_count,
        bytes_processed = api_usage.bytes_processed + p_bytes,
        updated_at = now()
    RETURNING ocr_requests_count, files_processed, bytes_processed INTO v_result;

    RETURN QUERY SELECT v_result.ocr_requests_count, v_result.files_processed, v_result.bytes_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.increment_api_usage TO authenticated;

-- ============================================
-- FUNCIÓN: Obtener uso del día actual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id uuid)
RETURNS TABLE (
    ocr_requests integer,
    files integer,
    bytes bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(au.ocr_requests_count, 0),
        COALESCE(au.files_processed, 0),
        COALESCE(au.bytes_processed, 0::bigint)
    FROM public.api_usage au
    WHERE au.user_id = p_user_id AND au.usage_date = CURRENT_DATE;

    -- Si no hay registro, retornar zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0::bigint;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.get_daily_usage TO authenticated;

-- ============================================
-- FUNCIÓN: Obtener uso mensual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_monthly_usage(p_user_id uuid)
RETURNS TABLE (
    total_requests integer,
    total_files integer,
    total_bytes bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(au.ocr_requests_count)::integer, 0),
        COALESCE(SUM(au.files_processed)::integer, 0),
        COALESCE(SUM(au.bytes_processed), 0::bigint)
    FROM public.api_usage au
    WHERE au.user_id = p_user_id
    AND au.usage_date >= date_trunc('month', CURRENT_DATE)::date
    AND au.usage_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.get_monthly_usage TO authenticated;

-- ============================================
-- Limpieza: Eliminar registros de más de 90 días (opcional, para cron)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_api_usage()
RETURNS void AS $$
BEGIN
    DELETE FROM public.api_usage
    WHERE usage_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
