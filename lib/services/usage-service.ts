/**
 * Servicio de tracking y verificación de uso de API
 * ContaBot - Sistema de límites por usuario (DIARIO)
 */

import { createClient } from '@/lib/supabase/server'
import {
    getLimitsForMembership,
    calculateUsagePercentage,
    ERROR_MESSAGES,
} from '@/lib/usage-limits'
import type { ApiUsageStats, MembershipType } from '@/types/database'

export interface UsageCheckResult {
    allowed: boolean
    remaining: number
    reason?: string
    code?: 'DAILY_FILES_EXCEEDED' | 'DAILY_BYTES_EXCEEDED' | 'OK'
}

export interface DailyUsage {
    files_processed: number
    bytes_processed: number
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
        return { files_processed: 0, bytes_processed: 0 }
    }

    if (data && data.length > 0) {
        return {
            files_processed: data[0].files || 0,
            bytes_processed: data[0].bytes || 0,
        }
    }

    return { files_processed: 0, bytes_processed: 0 }
}

/**
 * Verifica si el usuario puede hacer una solicitud OCR
 * Ahora basado en límites DIARIOS de archivos y bytes
 */
export async function checkCanMakeRequest(
    userId: string,
    membershipType: string = 'FREEMIUM',
    filesToProcess: number = 1,
    bytesToProcess: number = 0
): Promise<UsageCheckResult> {
    const limits = getLimitsForMembership(membershipType)
    const dailyUsage = await getUserDailyUsage(userId)

    // Verificar límite diario de archivos
    if (dailyUsage.files_processed + filesToProcess > limits.daily_files) {
        return {
            allowed: false,
            remaining: Math.max(0, limits.daily_files - dailyUsage.files_processed),
            reason: ERROR_MESSAGES.DAILY_FILES_EXCEEDED(limits.daily_files),
            code: 'DAILY_FILES_EXCEEDED',
        }
    }

    // Verificar límite diario de bytes
    const dailyBytesLimit = limits.daily_bytes_mb * 1024 * 1024
    if (dailyUsage.bytes_processed + bytesToProcess > dailyBytesLimit) {
        const usedMB = Math.round(dailyUsage.bytes_processed / (1024 * 1024))
        return {
            allowed: false,
            remaining: Math.max(0, limits.daily_files - dailyUsage.files_processed),
            reason: ERROR_MESSAGES.DAILY_BYTES_EXCEEDED(usedMB, limits.daily_bytes_mb),
            code: 'DAILY_BYTES_EXCEEDED',
        }
    }

    const remaining = limits.daily_files - dailyUsage.files_processed

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
                files_processed: data[0].files,
                bytes_processed: data[0].bytes,
            },
        }
    }

    return { success: true }
}

/**
 * Obtiene estadísticas completas de uso para mostrar en UI
 * Ahora solo tracking DIARIO
 */
export async function getUsageStats(
    userId: string,
    membershipType: string = 'FREEMIUM'
): Promise<ApiUsageStats> {
    const limits = getLimitsForMembership(membershipType)
    const dailyUsage = await getUserDailyUsage(userId)

    const filesPercentage = calculateUsagePercentage(
        dailyUsage.files_processed,
        limits.daily_files
    )
    const bytesPercentage = calculateUsagePercentage(
        dailyUsage.bytes_processed,
        limits.daily_bytes_mb * 1024 * 1024
    )

    return {
        daily: {
            files_processed: dailyUsage.files_processed,
            bytes_processed: dailyUsage.bytes_processed,
        },
        limits: {
            daily_files: limits.daily_files,
            daily_bytes_mb: limits.daily_bytes_mb,
            max_file_size_mb: limits.max_file_size_mb,
        },
        remaining: {
            daily_files: Math.max(0, limits.daily_files - dailyUsage.files_processed),
            daily_bytes: Math.max(0, (limits.daily_bytes_mb * 1024 * 1024) - dailyUsage.bytes_processed),
        },
        percentage: {
            files: filesPercentage,
            bytes: bytesPercentage,
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
