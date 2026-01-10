/**
 * Rate Limiter - Sistema de limitación de requests por IP/usuario
 * Contabio - Prevención de abuso de APIs
 *
 * Implementa un algoritmo de sliding window en memoria.
 * Para producción a escala, considerar Redis.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// RateLimitConfig interface - used internally by RATE_LIMIT_CONFIGS
type RateLimitConfig = {
  windowMs: number;      // Ventana de tiempo en ms
  maxRequests: number;   // Máximo de requests por ventana
};

// Configuraciones por tipo de endpoint
export const RATE_LIMIT_CONFIGS = {
  // OCR: 10 requests por minuto (usa Gemini API)
  ocr: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // TRM: 30 requests por minuto (API externa)
  trm: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  // Health: 60 requests por minuto
  health: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  // Default: 100 requests por minuto
  default: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

// Store en memoria (por proceso)
// En producción con múltiples instancias, usar Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas expiradas
const CLEANUP_INTERVAL = 60 * 1000; // 1 minuto
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const maxWindowMs = Math.max(...Object.values(RATE_LIMIT_CONFIGS).map(c => c.windowMs));

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > maxWindowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;       // ms hasta reset
  retryAfter?: number;   // segundos para header Retry-After
}

/**
 * Verifica y actualiza el rate limit para un identificador
 * @param identifier - IP, userId, o combinación
 * @param type - Tipo de endpoint para aplicar config específica
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): RateLimitResult {
  cleanupExpiredEntries();

  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // Primera request o ventana expirada
  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Dentro de la ventana
  const resetIn = config.windowMs - (now - entry.windowStart);

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      retryAfter: Math.ceil(resetIn / 1000),
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn,
  };
}

/**
 * Obtiene el identificador de rate limit desde un request
 * Prioriza userId autenticado, luego IP
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Obtener IP del request
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }

  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback
  return 'ip:unknown';
}

/**
 * Headers de rate limit para incluir en la respuesta
 */
export function getRateLimitHeaders(result: RateLimitResult, type: RateLimitType = 'default'): Record<string, string> {
  const config = RATE_LIMIT_CONFIGS[type];

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil((Date.now() + result.resetIn) / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
