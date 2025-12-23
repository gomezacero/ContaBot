// Colombian Tax Deadlines Calculator (Updated for 2025)
// Based on DIAN resolution for 2025 tax calendar

import { TaxEvent } from '@/types/payroll';

export interface TaxClientConfig {
    nit: string;
    classification: 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE';
    taxRegime: 'ORDINARIO' | 'SIMPLE' | 'ESPECIAL';
    ivaPeriodicity: 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE';
    isRetentionAgent: boolean;
    hasGmf: boolean;
    requiresExogena: boolean;
    hasPatrimonyTax: boolean;
}

// Get last digit of NIT for deadline lookup
const getLastDigit = (nit: string): number => {
    const cleanNit = nit.replace(/\D/g, '');
    return parseInt(cleanNit.slice(-1)) || 0;
};

// 2025 Tax Calendar - Deadline days by last NIT digit
const RENTA_PJ_2025 = {
    cuota1: ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], // May
    cuota2: ['18', '11', '12', '15', '16', '17', '18', '21', '22', '23'], // Jul
};

const RENTA_PN_2025 = {
    aug: ['12', '13', '14', '15', '18', '19', '20', '21', '22', '25'],
    sep: ['01', '02', '03', '04', '05', '08', '09', '10', '11', '12'],
};

const IVA_BIMESTRAL_2025 = {
    p1: { month: '03', days: ['25', '11', '12', '13', '14', '17', '18', '19', '20', '21'], year: 2025 },
    p2: { month: '05', days: ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], year: 2025 },
    p3: { month: '07', days: ['18', '11', '12', '15', '16', '17', '18', '21', '22', '23'], year: 2025 },
    p4: { month: '09', days: ['18', '09', '10', '11', '12', '15', '16', '17', '18', '19'], year: 2025 },
    p5: { month: '11', days: ['20', '11', '12', '13', '14', '17', '18', '19', '20', '21'], year: 2025 },
    p6: { month: '01', days: ['23', '14', '15', '16', '17', '20', '21', '22', '23', '24'], year: 2026 },
};

const IVA_CUATRIMESTRAL_2025 = {
    p1: { month: '05', days: ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], year: 2025 },
    p2: { month: '09', days: ['18', '09', '10', '11', '12', '15', '16', '17', '18', '19'], year: 2025 },
    p3: { month: '01', days: ['23', '14', '15', '16', '17', '20', '21', '22', '23', '24'], year: 2026 },
};

const RETENCION_2025: Record<string, string[]> = {
    '02': ['21', '10', '11', '12', '13', '14', '17', '18', '19', '20'],
    '03': ['21', '10', '11', '12', '13', '14', '17', '18', '19', '20'],
    '04': ['23', '08', '09', '10', '11', '14', '15', '16', '17', '18'],
    '05': ['22', '12', '13', '14', '15', '16', '19', '20', '21', '22'],
    '06': ['20', '09', '10', '11', '12', '13', '16', '17', '18', '19'],
    '07': ['17', '10', '11', '14', '15', '16', '17', '18', '21', '22'],
    '08': ['21', '08', '11', '12', '13', '14', '15', '18', '19', '20'],
    '09': ['17', '08', '09', '10', '11', '12', '15', '16', '17', '18'],
    '10': ['21', '08', '09', '10', '13', '14', '15', '16', '17', '20'],
    '11': ['20', '10', '11', '12', '13', '14', '17', '18', '19', '20'],
    '12': ['19', '09', '10', '11', '12', '15', '16', '17', '18', '19'],
};

const EXOGENA_2025 = {
    grandes: { month: '04', days: ['28', '29', '30'] },
    juridicas: { month: '05', days: ['05', '06', '07', '08', '09', '12', '13', '14', '15', '16'] },
    naturales: { month: '05', days: ['19', '20', '21', '22', '23', '26', '27', '28', '29', '30'] },
};

const PATRIMONIO_2025 = {
    cuota1: { month: '05', days: ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'] },
    cuota2: { month: '09', days: ['18', '09', '10', '11', '12', '15', '16', '17', '18', '19'] },
};

const SIMPLE_2025 = {
    anticipos: [
        { month: '05', days: ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'] }, // Bimestre 1 (Ene-Feb)
        { month: '07', days: ['18', '11', '12', '15', '16', '17', '18', '21', '22', '23'] }, // Bimestre 2 (Mar-Abr)
        { month: '09', days: ['22', '08', '09', '10', '11', '12', '15', '16', '17', '18'] }, // Bimestre 3 (May-Jun)
        { month: '11', days: ['18', '10', '11', '12', '13', '14', '18', '19', '20', '21'] }, // Bimestre 4 (Jul-Ago)
        { month: '01', days: ['23', '14', '15', '16', '17', '20', '21', '22', '23', '24'], year: 2026 }, // Bimestre 5 (Sep-Oct)
        { month: '03', days: ['20', '10', '11', '12', '13', '14', '17', '18', '19', '20'], year: 2026 }, // Bimestre 6 (Nov-Dic) - Example, adjust as per DIAN
    ],
    annual: { month: '04', days: ['15', '16', '21', '22', '23', '24', '25', '28', '29', '30'] } // Annual declaration for previous year
};

export function getTaxDeadlines(client: TaxClientConfig): TaxEvent[] {
    const events: TaxEvent[] = [];
    const lastDigit = getLastDigit(client.nit);
    const year = 2025;

    // ========== SIMPLE REGIME ==========
    if (client.taxRegime === 'SIMPLE') {
        // Annual Declaration (for 2025, declared in 2026)
        events.push({
            id: 'simple-anual',
            title: 'Declaración Anual SIMPLE',
            date: `${year + 1}-04-${SIMPLE_2025.annual.days[lastDigit]}`, // Annual declaration for 2025 is in April 2026
            type: 'RENTA', // Consolidated category
            status: 'PENDING',
            description: 'Declaración anual consolidada Régimen Simple de Tributación (Año Gravable 2025)',
        });

        // Bimonthly advances
        SIMPLE_2025.anticipos.forEach((anticipo, idx) => {
            events.push({
                id: `simple-adv-${idx + 1}`,
                title: `Anticipo SIMPLE Bimestre ${idx + 1}`,
                date: `${anticipo.year || year}-${anticipo.month}-${anticipo.days[lastDigit]}`,
                type: 'RENTA', // Anticipos are part of RENTA for SIMPLE
                status: 'PENDING',
                description: `Pago anticipo bimestral SIMPLE (Bimestre ${idx + 1})`,
            });
        });

        // SIMPLE also pays IVA annual consolidated within the annual declaration,
        // but typically GMF is still separate if applicable, although SIMPLE integrates most.
        // We will skip RENTA ORDINARIA logic for SIMPLE clients.
    } else {
        // ========== RENTA (ORDINARIO / ESPECIAL) ==========
        if (client.classification === 'JURIDICA' || client.classification === 'GRAN_CONTRIBUYENTE') {
            events.push({
                id: 'renta-pj-1',
                title: 'Renta PJ - Cuota 1',
                date: `${year}-05-${RENTA_PJ_2025.cuota1[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaración y pago primera cuota impuesto de renta personas jurídicas',
            });
            events.push({
                id: 'renta-pj-2',
                title: 'Renta PJ - Cuota 2',
                date: `${year}-07-${RENTA_PJ_2025.cuota2[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Pago segunda cuota impuesto de renta personas jurídicas',
            });
        }

        if (client.classification === 'NATURAL') {
            const digit = lastDigit;
            const isAug = digit >= 0 && digit <= 4;
            events.push({
                id: 'renta-pn',
                title: 'Renta Persona Natural',
                date: isAug
                    ? `${year}-08-${RENTA_PN_2025.aug[digit]}`
                    : `${year}-09-${RENTA_PN_2025.sep[digit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaración anual de renta personas naturales',
            });
        }
    }

    // ========== IVA ==========
    // Only if not SIMPLE (usually SIMPLE has consolidated IVA, but depends on logic. Keeping regular IVA if assigned)
    if (client.taxRegime !== 'SIMPLE') {
        if (client.ivaPeriodicity === 'BIMESTRAL') {
            const periods = [
                { key: 'p1', name: 'Ene-Feb', ...IVA_BIMESTRAL_2025.p1 },
                { key: 'p2', name: 'Mar-Abr', ...IVA_BIMESTRAL_2025.p2 },
                { key: 'p3', name: 'May-Jun', ...IVA_BIMESTRAL_2025.p3 },
                { key: 'p4', name: 'Jul-Ago', ...IVA_BIMESTRAL_2025.p4 },
                { key: 'p5', name: 'Sep-Oct', ...IVA_BIMESTRAL_2025.p5 },
                { key: 'p6', name: 'Nov-Dic', ...IVA_BIMESTRAL_2025.p6 },
            ];
            periods.forEach((p, idx) => {
                events.push({
                    id: `iva-bim-${idx + 1}`,
                    title: `IVA Bimestral ${p.name}`,
                    date: `${p.year || year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaración y pago IVA período ${p.name}`,
                });
            });
        }

        if (client.ivaPeriodicity === 'CUATRIMESTRAL') {
            const periods = [
                { key: 'p1', name: 'Ene-Abr', ...IVA_CUATRIMESTRAL_2025.p1 },
                { key: 'p2', name: 'May-Ago', ...IVA_CUATRIMESTRAL_2025.p2 },
                { key: 'p3', name: 'Sep-Dic', ...IVA_CUATRIMESTRAL_2025.p3 },
            ];
            periods.forEach((p, idx) => {
                events.push({
                    id: `iva-cuat-${idx + 1}`,
                    title: `IVA Cuatrimestral ${p.name}`,
                    date: `${p.year || year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaración y pago IVA período ${p.name}`,
                });
            });
        }
    }

    // ========== RETENCIÓN EN LA FUENTE ==========
    if (client.isRetentionAgent) {
        Object.entries(RETENCION_2025).forEach(([month, days]) => {
            events.push({
                id: `retencion-${month}`,
                title: `Retención Fuente ${getMonthName(parseInt(month) - 1)}`,
                date: `${year}-${month}-${days[lastDigit]}`,
                type: 'RETENCION',
                status: 'PENDING',
                description: `Declaración y pago retención en la fuente mes anterior`,
            });
        });
    }

    // ========== GMF (4x1000) ==========
    if (client.hasGmf) {
        // GMF se presenta semanalmente pero aquí simplificamos a mensual
        for (let m = 1; m <= 12; m++) {
            const month = m.toString().padStart(2, '0');
            events.push({
                id: `gmf-${month}`,
                title: `GMF (4x1000) ${getMonthName(m - 1)}`,
                date: `${year}-${month}-15`,
                type: 'GMF',
                status: 'PENDING',
                description: 'Declaración y pago Gravamen a los Movimientos Financieros',
            });
        }
    }

    // ========== INFORMACIÓN EXÓGENA ==========
    if (client.requiresExogena) {
        let exogenaDate: string;
        if (client.classification === 'GRAN_CONTRIBUYENTE') {
            const dayIdx = Math.min(lastDigit, 2);
            exogenaDate = `${year}-04-${EXOGENA_2025.grandes.days[dayIdx]}`;
        } else if (client.classification === 'JURIDICA') {
            exogenaDate = `${year}-05-${EXOGENA_2025.juridicas.days[lastDigit]}`;
        } else {
            exogenaDate = `${year}-05-${EXOGENA_2025.naturales.days[lastDigit]}`;
        }
        events.push({
            id: 'exogena',
            title: 'Información Exógena',
            date: exogenaDate,
            type: 'EXOGENA',
            status: 'PENDING',
            description: 'Presentación información exógena año gravable anterior',
        });
    }

    // ========== IMPUESTO AL PATRIMONIO ==========
    if (client.hasPatrimonyTax) {
        events.push({
            id: 'patrimonio-1',
            title: 'Patrimonio - Cuota 1',
            date: `${year}-05-${PATRIMONIO_2025.cuota1.days[lastDigit]}`,
            type: 'PATRIMONIO',
            status: 'PENDING',
            description: 'Primera cuota impuesto al patrimonio',
        });
        events.push({
            id: 'patrimonio-2',
            title: 'Patrimonio - Cuota 2',
            date: `${year}-09-${PATRIMONIO_2025.cuota2.days[lastDigit]}`,
            type: 'PATRIMONIO',
            status: 'PENDING',
            description: 'Segunda cuota impuesto al patrimonio',
        });
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getMonthName(monthIndex: number): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[monthIndex] || '';
}

// Get events filtered by type
export function getEventsByType(events: TaxEvent[], type: string): TaxEvent[] {
    return events.filter(e => e.type === type);
}

// Get upcoming events (next N days)
export function getUpcomingEvents(events: TaxEvent[], days: number = 30): TaxEvent[] {
    const today = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= future;
    });
}

// Get overdue events
export function getOverdueEvents(events: TaxEvent[]): TaxEvent[] {
    const today = new Date();
    return events.filter(e => new Date(e.date) < today && e.status !== 'COMPLETED');
}
