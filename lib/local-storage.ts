// Local Storage Service for Freemium Model
// Stores data locally for anonymous users

const STORAGE_KEYS = {
    CLIENTS: 'contabot_clients',
    PAYROLL_PRESETS: 'contabot_payroll_presets',
    GUEST_BANNER_DISMISSED: 'contabot_guest_banner_dismissed',
} as const;

// Client type for localStorage
export interface LocalClient {
    id: string;
    name: string;
    nit: string;
    classification: 'NATURAL' | 'JURIDICA';
    tax_regime: string;
    iva_periodicity: string;
    is_retention_agent: boolean;
    has_gmf: boolean;
    requires_exogena: boolean;
    has_patrimony_tax: boolean;
    alert_days: number[];
    email_alert: boolean;
    whatsapp_alert: boolean;
    created_at: string;
}

// Safe JSON parse with fallback
function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

// ============ CLIENTS ============

export function getLocalClients(): LocalClient[] {
    if (!isLocalStorageAvailable()) return [];
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return safeJsonParse<LocalClient[]>(data, []);
}

export function setLocalClients(clients: LocalClient[]): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
}

export function addLocalClient(client: Omit<LocalClient, 'id' | 'created_at'>): LocalClient {
    const clients = getLocalClients();
    const newClient: LocalClient = {
        ...client,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
    };
    clients.push(newClient);
    setLocalClients(clients);
    return newClient;
}

export function deleteLocalClient(id: string): void {
    const clients = getLocalClients();
    setLocalClients(clients.filter(c => c.id !== id));
}

export function clearLocalClients(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
}

// ============ GUEST BANNER ============

export function isGuestBannerDismissed(): boolean {
    if (!isLocalStorageAvailable()) return false;
    return localStorage.getItem(STORAGE_KEYS.GUEST_BANNER_DISMISSED) === 'true';
}

export function dismissGuestBanner(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.GUEST_BANNER_DISMISSED, 'true');
}

export function resetGuestBannerDismissal(): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.GUEST_BANNER_DISMISSED);
}

// ============ STORAGE INFO ============

export function getStorageUsage(): { used: number; available: number; percentage: number } {
    if (!isLocalStorageAvailable()) {
        return { used: 0, available: 0, percentage: 0 };
    }

    let used = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            used += localStorage.getItem(key)?.length || 0;
        }
    }

    // Approximate limit (5MB)
    const available = 5 * 1024 * 1024;
    const percentage = (used / available) * 100;

    return { used, available, percentage };
}
