/**
 * Servicio de tracking y verificación de uso de API
 * ContaBot - Sistema de límites por usuario
 */

import { createClient } from '@/lib/supabase/server'
import {
    USAGE_LIMITS,
    getLimitsForMembership,
    calculateUsagePercentage,
    getUsageStatus,
    ERROR_MESSAGES,
} from '@/lib/usage-limits'
import type { ApiUsageStats, MembershipType } from '@/types/database'

export interface UsageCheckResult {
    allowed: boolean
    remaining: number
    reason?: string
    code?: 'DAILY_LIMIT_EXCEEDED' | 'MONTHLY_LIMIT_EXCEEDED' | 'MONTHLY_BYTES_EXCEEDED' | 'OK'
}

export interface DailyUsage {
    ocr_requests: number
    files_processed: number
    bytes_processed: number
}

export interface MonthlyUsage {
    total_requests: number
    total_files: number
    total_bytes: number
}

/**
 * Obtiene el uso diario del usuario actual
 */
export async function getUserDailyUsage(userId: string): Promise<DailyUsage> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_daily_usage', {
        p_user_id: userId,
    })

    if (error) {
        console.error('Error fetching daily usage:', error)
        return { ocr_requests: 0, files_processed: 0, bytes_processed: 0 }
    }

    if (data && data.length > 0) {
        return {
            ocr_requests: data[0].ocr_requests || 0,
            files_processed: data[0].files || 0,
            bytes_processed: data[0].bytes || 0,
        }
    }

    return { ocr_requests: 0, files_processed: 0, bytes_processed: 0 }
}

/**
 * Obtiene el uso mensual del usuario actual
 */
export async function getUserMonthlyUsage(userId: string): Promise<MonthlyUsage> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_monthly_usage', {
        p_user_id: userId,
    })

    if (error) {
        console.error('Error fetching monthly usage:', error)
        return { total_requests: 0, total_files: 0, total_bytes: 0 }
    }

    if (data && data.length > 0) {
        return {
            total_requests: data[0].total_requests || 0,
            total_files: data[0].total_files || 0,
            total_bytes: data[0].total_bytes || 0,
        }
    }

    return { total_requests: 0, total_files: 0, total_bytes: 0 }
}

/**
 * Verifica si el usuario puede hacer una solicitud OCR
 */
export async function checkCanMakeRequest(
    userId: string,
    membershipType: string = 'FREEMIUM'
): Promise<UsageCheckResult> {
    const limits = getLimitsForMembership(membershipType)

    // Obtener uso actual
    const [dailyUsage, monthlyUsage] = await Promise.all([
        getUserDailyUsage(userId),
        getUserMonthlyUsage(userId),
    ])

    // Verificar límite diario
    if (dailyUsage.ocr_requests >= limits.daily_ocr_requests) {
        return {
            allowed: false,
            remaining: 0,
            reason: ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED(limits.daily_ocr_requests),
            code: 'DAILY_LIMIT_EXCEEDED',
        }
    }

    // Verificar límite mensual de archivos
    if (monthlyUsage.total_files >= limits.monthly_files) {
        return {
            allowed: false,
            remaining: 0,
            reason: ERROR_MESSAGES.MONTHLY_LIMIT_EXCEEDED(limits.monthly_files),
            code: 'MONTHLY_LIMIT_EXCEEDED',
        }
    }

    // Verificar límite mensual de bytes (lo que ocurra primero)
    const monthlyBytesLimitBytes = limits.monthly_bytes_mb * 1024 * 1024
    if (monthlyUsage.total_bytes >= monthlyBytesLimitBytes) {
        const usedMB = Math.round(monthlyUsage.total_bytes / (1024 * 1024))
        return {
            allowed: false,
            remaining: 0,
            reason: ERROR_MESSAGES.MONTHLY_BYTES_EXCEEDED(usedMB, limits.monthly_bytes_mb),
            code: 'MONTHLY_BYTES_EXCEEDED',
        }
    }

    const remaining = limits.daily_ocr_requests - dailyUsage.ocr_requests

    return {
        allowed: true,
        remaining,
        code: 'OK',
    }
}

/**
 * Incrementa el contador de uso después de una solicitud exitosa
 */
export async function incrementUsage(
    userId: string,
    filesCount: number = 1,
    bytesProcessed: number = 0
): Promise<{ success: boolean; newUsage?: DailyUsage }> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('increment_api_usage', {
        p_user_id: userId,
        p_files_count: filesCount,
        p_bytes: bytesProcessed,
    })

    if (error) {
        console.error('Error incrementing usage:', error)
        return { success: false }
    }

    if (data && data.length > 0) {
        return {
            success: true,
            newUsage: {
                ocr_requests: data[0].ocr_requests,
                files_processed: data[0].files,
                bytes_processed: data[0].bytes,
            },
        }
    }

    return { success: true }
}

/**
 * Obtiene estadísticas completas de uso para mostrar en UI
 */
export async function getUsageStats(
    userId: string,
    membershipType: string = 'FREEMIUM'
): Promise<ApiUsageStats> {
    const limits = getLimitsForMembership(membershipType)

    const [dailyUsage, monthlyUsage] = await Promise.all([
        getUserDailyUsage(userId),
        getUserMonthlyUsage(userId),
    ])

    const dailyPercentage = calculateUsagePercentage(
        dailyUsage.ocr_requests,
        limits.daily_ocr_requests
    )
    const monthlyPercentage = calculateUsagePercentage(
        monthlyUsage.total_files,
        limits.monthly_files
    )

    return {
        daily: {
            ocr_requests: dailyUsage.ocr_requests,
            files_processed: dailyUsage.files_processed,
            bytes_processed: dailyUsage.bytes_processed,
        },
        monthly: {
            total_requests: monthlyUsage.total_requests,
            total_files: monthlyUsage.total_files,
            total_bytes: monthlyUsage.total_bytes,
        },
        limits: {
            daily_ocr_requests: limits.daily_ocr_requests,
            monthly_files: limits.monthly_files,
            max_file_size_mb: limits.max_file_size_mb,
            monthly_bytes_mb: limits.monthly_bytes_mb,
        },
        remaining: {
            daily_requests: Math.max(0, limits.daily_ocr_requests - dailyUsage.ocr_requests),
            monthly_files: Math.max(0, limits.monthly_files - monthlyUsage.total_files),
            monthly_bytes: Math.max(0, (limits.monthly_bytes_mb * 1024 * 1024) - monthlyUsage.total_bytes),
        },
        percentage: {
            daily: dailyPercentage,
            monthly: monthlyPercentage,
        },
    }
}

/**
 * Obtiene el tipo de membresía del usuario
 */
export async function getUserMembershipType(userId: string): Promise<MembershipType> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('profiles')
        .select('membership_type')
        .eq('id', userId)
        .single()

    if (error || !data) {
        console.error('Error fetching membership type:', error)
        return 'FREEMIUM'
    }

    return (data.membership_type?.toUpperCase() as MembershipType) || 'FREEMIUM'
}

/**
 * Función combinada para verificar permisos y obtener stats
 */
export async function checkUsageAndGetStats(
    userId: string
): Promise<{
    canMakeRequest: boolean
    stats: ApiUsageStats
    message?: string
}> {
    const membershipType = await getUserMembershipType(userId)
    const [checkResult, stats] = await Promise.all([
        checkCanMakeRequest(userId, membershipType),
        getUsageStats(userId, membershipType),
    ])

    return {
        canMakeRequest: checkResult.allowed,
        stats,
        message: checkResult.reason,
    }
}
