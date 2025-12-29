-- ============================================
-- MIGRACIÓN: Corregir sistema de tracking de uso
-- Fecha: 2025-01-29
-- Cambios:
--   - Contador por archivos (no por requests)
--   - Sistema diario (eliminando mensual)
-- ============================================

-- ============================================
-- FUNCIÓN CORREGIDA: Incrementar uso de API
-- Ahora incrementa ocr_requests_count por la cantidad de archivos
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
    -- Ahora ocr_requests_count incrementa por p_files_count (archivos procesados)
    INSERT INTO public.api_usage (user_id, usage_date, ocr_requests_count, files_processed, bytes_processed)
    VALUES (p_user_id, CURRENT_DATE, p_files_count, p_files_count, p_bytes)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        ocr_requests_count = api_usage.ocr_requests_count + p_files_count,
        files_processed = api_usage.files_processed + p_files_count,
        bytes_processed = api_usage.bytes_processed + p_bytes,
        updated_at = now()
    RETURNING ocr_requests_count, files_processed, bytes_processed INTO v_result;

    RETURN QUERY SELECT v_result.ocr_requests_count, v_result.files_processed, v_result.bytes_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN: Obtener uso del día actual (sin cambios, solo verificar que existe)
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

-- Permisos
GRANT EXECUTE ON FUNCTION public.increment_api_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_usage TO authenticated;

-- ============================================
-- Nota: La función get_monthly_usage se mantiene por compatibilidad
-- pero el frontend ya no la usará
-- ============================================
