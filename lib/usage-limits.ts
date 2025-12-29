/**
 * Configuración de límites de uso de API por tipo de membresía
 * ContaBot - Sistema de límites para usuarios
 */

export type { MembershipType } from '@/types/database'

export interface UsageLimits {
    /** Número máximo de archivos procesados por día */
    daily_files: number
    /** Tamaño máximo de bytes procesados por día en MB */
    daily_bytes_mb: number
    /** Tamaño máximo por archivo individual en MB */
    max_file_size_mb: number
    /** Tamaño máximo total por solicitud en MB */
    max_total_request_mb: number
}

/**
 * Límites de uso por tipo de membresía
 */
export const USAGE_LIMITS: Record<MembershipType, UsageLimits> = {
    FREEMIUM: {
        daily_files: 10,            // 10 archivos/día
        daily_bytes_mb: 50,         // 50 MB/día
        max_file_size_mb: 10,
        max_total_request_mb: 30,
    },
    PRO: {
        daily_files: 100,           // 100 archivos/día
        daily_bytes_mb: 500,        // 500 MB/día
        max_file_size_mb: 25,
        max_total_request_mb: 100,
    },
    ENTERPRISE: {
        daily_files: 1000,          // 1000 archivos/día
        daily_bytes_mb: 5000,       // 5 GB/día
        max_file_size_mb: 50,
        max_total_request_mb: 500,
    },
}

/**
 * Límites de archivo (constantes en bytes)
 */
export const FILE_LIMITS = {
    /** Tamaño máximo por archivo: 10MB */
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
    /** Tamaño máximo total por solicitud: 50MB */
    MAX_TOTAL_REQUEST_BYTES: 50 * 1024 * 1024,
    /** Tipos MIME permitidos */
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
    ] as const,
    /** Extensiones permitidas */
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const,
}

/**
 * Mensajes de error en español
 */
export const ERROR_MESSAGES = {
    AUTH_REQUIRED: 'Debes iniciar sesión para usar esta función',
    FILE_TOO_LARGE: (fileName: string, maxMB: number) =>
        `El archivo "${fileName}" excede el límite de ${maxMB}MB`,
    TOTAL_TOO_LARGE: (maxMB: number) =>
        `El tamaño total de los archivos excede ${maxMB}MB`,
    INVALID_FILE_TYPE: (fileName: string) =>
        `Tipo de archivo no soportado: "${fileName}". Usa JPG, PNG o PDF`,
    DAILY_FILES_EXCEEDED: (limit: number) =>
        `Has alcanzado el límite de ${limit} archivos diarios. Vuelve mañana o actualiza tu plan.`,
    DAILY_BYTES_EXCEEDED: (usedMB: number, limitMB: number) =>
        `Has alcanzado el límite de ${limitMB}MB diarios (usado: ${usedMB}MB). Vuelve mañana o actualiza tu plan.`,
    APPROACHING_LIMIT: (remaining: number) =>
        `Te quedan ${remaining} archivos para hoy`,
}

/**
 * Obtiene los límites para un tipo de membresía
 */
export function getLimitsForMembership(membershipType: string): UsageLimits {
    const type = membershipType.toUpperCase() as MembershipType
    return USAGE_LIMITS[type] || USAGE_LIMITS.FREEMIUM
}

/**
 * Valida si un archivo cumple con los límites de tamaño
 */
export function validateFileSize(
    fileSize: number,
    membershipType: string = 'FREEMIUM'
): { valid: boolean; error?: string } {
    const limits = getLimitsForMembership(membershipType)
    const maxBytes = limits.max_file_size_mb * 1024 * 1024

    if (fileSize > maxBytes) {
        return {
            valid: false,
            error: `El archivo excede el límite de ${limits.max_file_size_mb}MB`,
        }
    }

    return { valid: true }
}

/**
 * Valida el tipo MIME de un archivo
 */
export function validateMimeType(
    mimeType: string
): { valid: boolean; error?: string } {
    const allowedTypes = FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[]

    if (!allowedTypes.includes(mimeType)) {
        return {
            valid: false,
            error: 'Tipo de archivo no soportado. Usa JPG, PNG o PDF',
        }
    }

    return { valid: true }
}

/**
 * Calcula el porcentaje de uso
 */
export function calculateUsagePercentage(used: number, limit: number): number {
    if (limit === 0) return 100
    return Math.min(Math.round((used / limit) * 100), 100)
}

/**
 * Determina el estado de uso basado en el porcentaje
 */
export function getUsageStatus(percentage: number): 'normal' | 'warning' | 'critical' {
    if (percentage >= 100) return 'critical'
    if (percentage >= 80) return 'warning'
    return 'normal'
}

/**
 * Formatea bytes a una unidad legible
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
