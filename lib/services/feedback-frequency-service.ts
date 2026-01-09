// Servicio de control de frecuencia para Feedback LightBox
// Maneja tracking de uso y cooldowns en localStorage

import {
    FeedbackModule,
    FeedbackAction,
    FeedbackTriggerConfig,
    UsageTracker,
    FeedbackCooldown
} from '@/types/feedback';

// Configuración de triggers por módulo y acción
export const FEEDBACK_TRIGGERS: Record<string, FeedbackTriggerConfig> = {
    'nomina_pdf_download': {
        module: 'nomina',
        action: 'pdf_download',
        frequency: 3,
        title: 'Califica el módulo de Nómina',
        subtitle: '¿Qué tan útil te pareció la generación de PDFs?'
    },
    'nomina_save_employee': {
        module: 'nomina',
        action: 'save_employee',
        frequency: 5,
        title: 'Califica el módulo de Nómina',
        subtitle: '¿Cómo ha sido tu experiencia guardando empleados?'
    },
    'gastos_excel_export': {
        module: 'gastos',
        action: 'excel_export',
        frequency: 3,
        title: 'Califica el Digitador OCR',
        subtitle: '¿Qué tan útiles son los asientos contables exportados?'
    },
    'gastos_ocr_process': {
        module: 'gastos',
        action: 'ocr_process',
        frequency: 5,
        title: 'Califica el Digitador OCR',
        subtitle: '¿Qué tan precisa ha sido la extracción de datos?'
    },
    'calendario_save_client': {
        module: 'calendario',
        action: 'save_client',
        frequency: 3,
        title: 'Califica el Calendario Tributario',
        subtitle: '¿Te ha ayudado a organizar tus obligaciones?'
    }
};

// Cooldown: 24 horas entre solicitudes de feedback por módulo
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEYS = {
    USAGE_TRACKER: 'contabio_feedback_usage',
    COOLDOWN: 'contabio_feedback_cooldown'
} as const;

// Verificar si localStorage está disponible
function isLocalStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

// Safe JSON parse
function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

// Obtener tracker de uso
function getUsageTracker(): UsageTracker {
    if (!isLocalStorageAvailable()) return {};
    const data = localStorage.getItem(STORAGE_KEYS.USAGE_TRACKER);
    return safeJsonParse<UsageTracker>(data, {});
}

// Guardar tracker de uso
function setUsageTracker(tracker: UsageTracker): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.USAGE_TRACKER, JSON.stringify(tracker));
}

// Obtener cooldowns
function getCooldown(): FeedbackCooldown {
    if (!isLocalStorageAvailable()) return {};
    const data = localStorage.getItem(STORAGE_KEYS.COOLDOWN);
    return safeJsonParse<FeedbackCooldown>(data, {});
}

// Registrar cooldown para un módulo
function setCooldown(module: FeedbackModule): void {
    if (!isLocalStorageAvailable()) return;
    const cooldown = getCooldown();
    cooldown[module] = Date.now();
    localStorage.setItem(STORAGE_KEYS.COOLDOWN, JSON.stringify(cooldown));
}

/**
 * Incrementa el contador de uso para una acción
 * @returns El nuevo contador
 */
export function trackActionUsage(module: FeedbackModule, action: FeedbackAction): number {
    const key = `${module}_${action}`;
    const tracker = getUsageTracker();
    tracker[key] = (tracker[key] || 0) + 1;
    setUsageTracker(tracker);
    return tracker[key];
}

/**
 * Verifica si se debe mostrar el feedback basado en frecuencia y cooldown
 */
export function shouldTriggerFeedback(module: FeedbackModule, action: FeedbackAction): boolean {
    const key = `${module}_${action}`;
    const config = FEEDBACK_TRIGGERS[key];

    // Si no hay configuración para esta acción, no mostrar
    if (!config) return false;

    const tracker = getUsageTracker();
    const count = tracker[key] || 0;

    // Verificar frecuencia (mostrar cada N usos)
    if (count === 0 || count % config.frequency !== 0) {
        return false;
    }

    // Verificar cooldown (no mostrar si ya se mostró en las últimas 24h)
    const cooldown = getCooldown();
    const lastFeedback = cooldown[module] || 0;
    if (Date.now() - lastFeedback < COOLDOWN_MS) {
        return false;
    }

    return true;
}

/**
 * Marca que se mostró feedback para un módulo (activa cooldown)
 */
export function markFeedbackShown(module: FeedbackModule): void {
    setCooldown(module);
}

/**
 * Obtiene la configuración del trigger para una acción
 */
export function getTriggerConfig(module: FeedbackModule, action: FeedbackAction): FeedbackTriggerConfig | null {
    return FEEDBACK_TRIGGERS[`${module}_${action}`] || null;
}

/**
 * Resetea todo el tracking (útil para testing o cambio de usuario)
 */
export function resetFeedbackTracking(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.USAGE_TRACKER);
    localStorage.removeItem(STORAGE_KEYS.COOLDOWN);
}

/**
 * Obtiene estadísticas de uso (para debugging)
 */
export function getFeedbackStats(): { usage: UsageTracker; cooldowns: FeedbackCooldown } {
    return {
        usage: getUsageTracker(),
        cooldowns: getCooldown()
    };
}
