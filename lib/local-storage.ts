// Local Storage Service for Freemium Model
// Stores data locally for anonymous users

const STORAGE_KEYS = {
    CLIENTS: 'contabot_clients',
    EMPLOYEES: 'contabot_employees',
    PAYROLL_PRESETS: 'contabot_payroll_presets',
    GUEST_BANNER_DISMISSED: 'contabot_guest_banner_dismissed',
    // Feedback system keys
    FEEDBACK_USAGE: 'contabio_feedback_usage',
    FEEDBACK_COOLDOWN: 'contabio_feedback_cooldown',
} as const;

// Client type for localStorage
export interface LocalClient {
    id: string;
    name: string;
    nit: string;
    classification: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE';
    tax_regime: string;
    iva_periodicity: string;
    is_retention_agent: boolean;
    has_gmf: boolean;
    requires_exogena: boolean;
    has_patrimony_tax: boolean;
    // Impuestos especiales 2026
    has_carbon_tax?: boolean;
    has_beverage_tax?: boolean;
    has_fuel_tax?: boolean;
    has_plastic_tax?: boolean;
    // Obligaciones especiales
    requires_rub?: boolean;
    requires_transfer_pricing?: boolean;
    requires_country_report?: boolean;
    // Alertas
    alert_days: number[];
    email_alert: boolean;
    whatsapp_alert: boolean;
    target_emails?: string[];
    target_phone?: string;
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

// ============ LOCAL EMPLOYEES ============
// Employee type for localStorage (simplified for guest mode)
export interface LocalEmployee {
    id: string;
    client_id: string;
    name: string;
    salary: number;
    transport_aid: boolean;
    risk_level: 'I' | 'II' | 'III' | 'IV' | 'V';
    contract_type: 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR' | 'APRENDIZAJE';
    payment_frequency: 'MENSUAL' | 'QUINCENAL';
    worked_days: number;
    extra_hours_day: number;
    extra_hours_night: number;
    extra_hours_sunday: number;
    night_surcharge_hours: number;
    commissions: number;
    bonuses: number;
    other_income: number;
    loan_deduction: number;
    other_deductions: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
}

// Helper to check if a client ID is local (not from Supabase)
export function isLocalClientId(clientId: string | null): boolean {
    return clientId?.startsWith('local_') ?? false;
}

export function getLocalEmployees(clientId?: string): LocalEmployee[] {
    if (!isLocalStorageAvailable()) return [];
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const employees = safeJsonParse<LocalEmployee[]>(data, []);
    if (clientId) {
        return employees.filter(e => e.client_id === clientId);
    }
    return employees;
}

export function setLocalEmployees(employees: LocalEmployee[]): void {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

export function addLocalEmployee(employee: Omit<LocalEmployee, 'id' | 'created_at'>): LocalEmployee {
    const employees = getLocalEmployees();
    const newEmployee: LocalEmployee = {
        ...employee,
        id: `local_emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
    };
    employees.push(newEmployee);
    setLocalEmployees(employees);
    return newEmployee;
}

export function updateLocalEmployee(id: string, updates: Partial<LocalEmployee>): void {
    const employees = getLocalEmployees();
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
        employees[index] = { ...employees[index], ...updates };
        setLocalEmployees(employees);
    }
}

export function deleteLocalEmployee(id: string): void {
    const employees = getLocalEmployees();
    setLocalEmployees(employees.filter(e => e.id !== id));
}

export function clearLocalEmployees(clientId?: string): void {
    if (!isLocalStorageAvailable()) return;
    if (clientId) {
        // Solo eliminar empleados de un cliente específico
        const employees = getLocalEmployees();
        setLocalEmployees(employees.filter(e => e.client_id !== clientId));
    } else {
        // Eliminar todos los empleados locales
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    }
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
