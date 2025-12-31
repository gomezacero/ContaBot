/**
 * TRM Service - Colombian Exchange Rate (Tasa Representativa del Mercado)
 *
 * Fetches the official USD/COP exchange rate from the Colombian Central Bank.
 * Uses a free public API with caching to minimize requests.
 */

// Cache TRM for 1 hour (rate changes daily, not real-time)
let cachedTRM: { rate: number; date: string; fetchedAt: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Fallback TRM if API fails (updated periodically)
const FALLBACK_TRM = 4350; // Approximate rate as of late 2024

/**
 * Fetch TRM from Banco de la República API
 * Free, no API key required
 */
async function fetchTRMFromBanRep(): Promise<{ rate: number; date: string } | null> {
    try {
        // Use the Banco de la República SOAP-to-REST proxy or direct API
        // Alternative: Use datos.gov.co which has TRM data
        const today = new Date().toISOString().split('T')[0];

        // Try datos.gov.co API (Colombian Open Data Portal - Free)
        const response = await fetch(
            `https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde <= '${today}' AND vigenciahasta >= '${today}'&$limit=1`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 3600 } // Cache for 1 hour in Next.js
            }
        );

        if (!response.ok) {
            console.warn('TRM API response not OK:', response.status);
            return null;
        }

        const data = await response.json();

        if (data && data.length > 0 && data[0].valor) {
            return {
                rate: parseFloat(data[0].valor),
                date: data[0].vigenciadesde?.split('T')[0] || today
            };
        }

        return null;
    } catch (error) {
        console.warn('Error fetching TRM from BanRep:', error);
        return null;
    }
}

/**
 * Get current TRM (with caching)
 * Returns the exchange rate for USD to COP
 */
export async function getTRM(): Promise<{ rate: number; date: string; source: 'api' | 'cache' | 'fallback' }> {
    const now = Date.now();

    // Return cached value if still valid
    if (cachedTRM && (now - cachedTRM.fetchedAt) < CACHE_DURATION_MS) {
        return {
            rate: cachedTRM.rate,
            date: cachedTRM.date,
            source: 'cache'
        };
    }

    // Fetch fresh TRM
    const freshTRM = await fetchTRMFromBanRep();

    if (freshTRM) {
        cachedTRM = {
            rate: freshTRM.rate,
            date: freshTRM.date,
            fetchedAt: now
        };
        return {
            rate: freshTRM.rate,
            date: freshTRM.date,
            source: 'api'
        };
    }

    // Use cached even if expired, or fallback
    if (cachedTRM) {
        return {
            rate: cachedTRM.rate,
            date: cachedTRM.date,
            source: 'cache'
        };
    }

    // Ultimate fallback
    return {
        rate: FALLBACK_TRM,
        date: new Date().toISOString().split('T')[0],
        source: 'fallback'
    };
}

/**
 * Convert USD to COP using current TRM
 */
export async function convertUSDtoCOP(amountUSD: number): Promise<{ amountCOP: number; rate: number; date: string }> {
    const trm = await getTRM();
    return {
        amountCOP: Math.round(amountUSD * trm.rate),
        rate: trm.rate,
        date: trm.date
    };
}

/**
 * Synchronous conversion using cached/fallback TRM
 * Use this when you need immediate conversion without async
 */
export function convertUSDtoCOPSync(amountUSD: number, trmRate?: number): number {
    const rate = trmRate || cachedTRM?.rate || FALLBACK_TRM;
    return Math.round(amountUSD * rate);
}

/**
 * Format currency with proper locale
 */
export function formatCurrencyWithCode(amount: number, currency: string = 'COP'): string {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}
