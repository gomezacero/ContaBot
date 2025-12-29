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

// Get last two digits of NIT for specific deadline lookups (Renta PN)
const getLastTwoDigits = (nit: string): number => {
    const cleanNit = nit.replace(/\D/g, '');
    return parseInt(cleanNit.slice(-2)) || 0;
};

// 2025 Tax Calendar
// Dates are day numbers. Months and years are specified in logic or objects.

const RENTA_PJ_2025 = {
    // Large Taxpayers
    grandes: {
        cuota1: ['11', '12', '13', '14', '17', '18', '19', '20', '21', '24'], // Feb
        cuota2: ['09', '10', '11', '21', '22', '23', '24', '25', '28', '29'], // Apr
        cuota3: ['11', '12', '13', '16', '17', '18', '23', '24', '25', '25'], // Jun (Note: Last day logic varies, approximation)
    },
    // Legal Entities
    juridicas: {
        cuota1: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'], // May
        cuota2: ['09', '10', '11', '14', '15', '16', '17', '18', '21', '22'], // Jul
    }
};

// Renta Personas Naturales 2025 (Declaración Renta Año Gravable 2024)
// Based on last TWO digits of NIT
const getRentaPNDate = (lastTwo: number): { month: string, day: string } => {
    // 01-26 digits range map to Aug 12 - Aug 29
    if (lastTwo >= 1 && lastTwo <= 26) {
        if (lastTwo <= 2) return { month: '08', day: '12' };
        if (lastTwo <= 4) return { month: '08', day: '13' };
        if (lastTwo <= 6) return { month: '08', day: '14' };
        if (lastTwo <= 8) return { month: '08', day: '15' };
        if (lastTwo <= 10) return { month: '08', day: '19' };
        if (lastTwo <= 12) return { month: '08', day: '20' };
        if (lastTwo <= 14) return { month: '08', day: '21' };
        if (lastTwo <= 16) return { month: '08', day: '22' };
        if (lastTwo <= 18) return { month: '08', day: '25' };
        if (lastTwo <= 20) return { month: '08', day: '26' };
        if (lastTwo <= 22) return { month: '08', day: '27' };
        if (lastTwo <= 24) return { month: '08', day: '28' };
        return { month: '08', day: '29' };
    }
    // 27-66 digits range map to Sep 1 - Sep 26
    if (lastTwo >= 27 && lastTwo <= 66) {
        if (lastTwo <= 28) return { month: '09', day: '01' };
        if (lastTwo <= 30) return { month: '09', day: '02' };
        if (lastTwo <= 32) return { month: '09', day: '03' };
        if (lastTwo <= 34) return { month: '09', day: '04' };
        if (lastTwo <= 36) return { month: '09', day: '05' };
        if (lastTwo <= 38) return { month: '09', day: '08' };
        if (lastTwo <= 40) return { month: '09', day: '09' };
        if (lastTwo <= 42) return { month: '09', day: '10' };
        if (lastTwo <= 44) return { month: '09', day: '11' };
        if (lastTwo <= 46) return { month: '09', day: '12' };
        if (lastTwo <= 48) return { month: '09', day: '15' };
        if (lastTwo <= 50) return { month: '09', day: '16' };
        if (lastTwo <= 52) return { month: '09', day: '17' };
        if (lastTwo <= 54) return { month: '09', day: '18' };
        if (lastTwo <= 56) return { month: '09', day: '19' };
        if (lastTwo <= 58) return { month: '09', day: '22' };
        if (lastTwo <= 60) return { month: '09', day: '23' };
        if (lastTwo <= 62) return { month: '09', day: '24' };
        if (lastTwo <= 64) return { month: '09', day: '25' };
        return { month: '09', day: '26' };
    }
    // 67-00 digits range map to Oct 1 - Oct 24
    if (lastTwo >= 67 && lastTwo <= 99) {
        if (lastTwo <= 68) return { month: '10', day: '01' };
        if (lastTwo <= 70) return { month: '10', day: '02' };
        if (lastTwo <= 72) return { month: '10', day: '03' };
        if (lastTwo <= 74) return { month: '10', day: '06' };
        if (lastTwo <= 76) return { month: '10', day: '07' };
        if (lastTwo <= 78) return { month: '10', day: '08' };
        if (lastTwo <= 80) return { month: '10', day: '09' };
        if (lastTwo <= 82) return { month: '10', day: '10' };
        if (lastTwo <= 84) return { month: '10', day: '14' };
        if (lastTwo <= 86) return { month: '10', day: '15' };
        if (lastTwo <= 88) return { month: '10', day: '16' };
        if (lastTwo <= 90) return { month: '10', day: '17' };
        if (lastTwo <= 92) return { month: '10', day: '20' };
        if (lastTwo <= 94) return { month: '10', day: '21' };
        if (lastTwo <= 96) return { month: '10', day: '22' };
        if (lastTwo <= 98) return { month: '10', day: '23' };
        return { month: '10', day: '24' }; // 99
    }
    // 00 case
    if (lastTwo === 0) return { month: '10', day: '24' };

    return { month: '08', day: '12' }; // Fallback
};

const IVA_BIMESTRAL_2025 = {
    p1: { month: '03', days: ['11', '12', '13', '14', '17', '18', '19', '20', '21', '25'], year: 2025 }, // Mar 11-25
    p2: { month: '05', days: ['09', '12', '13', '14', '15', '16', '19', '20', '21', '23'], year: 2025 }, // May 09-23
    p3: { month: '07', days: ['11', '14', '15', '16', '17', '18', '22', '23', '24', '25'], year: 2025 }, // Jul 11-25
    p4: { month: '09', days: ['10', '11', '12', '15', '16', '17', '18', '19', '22', '24'], year: 2025 }, // Sep 10-24
    p5: { month: '11', days: ['11', '12', '13', '14', '18', '19', '20', '21', '24', '25'], year: 2025 }, // Nov 11-25
    p6: { month: '01', days: ['13', '14', '15', '16', '19', '20', '21', '22', '23', '26'], year: 2026 }, // Jan 13-26 (2026)
};

const IVA_CUATRIMESTRAL_2025 = {
    p1: { month: '05', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'], year: 2025 }, // May 12-23
    p2: { month: '09', days: ['10', '11', '12', '15', '16', '17', '18', '19', '22', '23'], year: 2025 }, // Sep 10-23
    p3: { month: '01', days: ['13', '14', '15', '16', '19', '20', '21', '22', '23', '26'], year: 2026 }, // Jan 13-26 (2026)
};

const RETENCION_2025: Record<string, string[]> = {
    '01': ['07', '10', '11', '12', '13', '14', '17', '18', '19', '20'], // Feb - approx based on standard +2 weeks
    '02': ['11', '12', '13', '14', '17', '18', '19', '20', '21', '24'], // Mar
    '03': ['09', '10', '11', '21', '22', '23', '24', '25', '28', '29'], // Apr
    '04': ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'], // May
    '05': ['11', '12', '13', '16', '17', '18', '23', '24', '25', '26'], // Jun
    '06': ['09', '10', '11', '14', '15', '16', '17', '18', '21', '22'], // Jul
    '07': ['12', '13', '14', '19', '20', '21', '22', '25', '26', '27'], // Aug
    '08': ['10', '11', '12', '15', '16', '17', '18', '19', '22', '23'], // Sep
    '09': ['07', '08', '09', '10', '14', '15', '16', '17', '20', '21'], // Oct
    '10': ['11', '12', '13', '14', '18', '19', '20', '21', '24', '25'], // Nov
    '11': ['10', '11', '12', '15', '16', '17', '18', '19', '22', '23'], // Dec
    '12': ['13', '14', '15', '16', '19', '20', '21', '22', '23', '26'], // Jan 2026
};

// Exogena 2025 (Year 2024 info)
const EXOGENA_2025 = {
    grandes: { month: '04', days: ['22', '23', '24', '25', '26', '29', '30', '02', '03', '04'] }, // Late April - Early May range
    juridicas: { month: '05', days: ['09', '12', '13', '14', '15', '16', '19', '20', '21', '22'] }, // May 09 - Jun 06 range logic needs expansion if using single digit. Using first batch as approximation.
    naturales: { month: '05', days: ['19', '20', '21', '22', '23', '26', '27', '28', '29', '30'] },
};

const PATRIMONIO_2025 = {
    cuota1: { month: '05', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'] },
    cuota2: { month: '09', days: ['10', '11', '12', '15', '16', '17', '18', '19', '22', '23'] },
};

const SIMPLE_2025 = {
    anticipos: [
        { month: '05', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'] }, // May - Apr Delay
        { month: '07', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'] }, // Jul
        { month: '09', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'] }, // Sep
        { month: '11', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'] }, // Nov
        { month: '01', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'], year: 2026 }, // Jan
        { month: '03', days: ['12', '13', '14', '15', '16', '19', '20', '21', '22', '23'], year: 2026 }, // Mar
    ],
    // Annual declaration is usually in April
    annual: { month: '04', days: ['15', '16', '17', '20', '21', '22', '23', '24', '27', '28'] }
};

export function getTaxDeadlines(client: TaxClientConfig): TaxEvent[] {
    const events: TaxEvent[] = [];
    const lastDigit = getLastDigit(client.nit);
    const lastTwoDigits = getLastTwoDigits(client.nit);
    const year = 2025;

    // ========== SIMPLE REGIME ==========
    if (client.taxRegime === 'SIMPLE') {
        const annualDay = SIMPLE_2025.annual.days[lastDigit] || '15';
        events.push({
            id: 'simple-anual',
            title: 'Declaración Anual SIMPLE',
            date: `${year + 1}-04-${annualDay}`,
            type: 'RENTA',
            status: 'PENDING',
            description: 'Declaración anual consolidada Régimen Simple de Tributación (Año Gravable 2025)',
        });

        SIMPLE_2025.anticipos.forEach((anticipo, idx) => {
            const day = anticipo.days[lastDigit] || '15';
            events.push({
                id: `simple-adv-${idx + 1}`,
                title: `Anticipo SIMPLE Bimestre ${idx + 1}`,
                date: `${anticipo.year || year}-${anticipo.month}-${day}`,
                type: 'RENTA',
                status: 'PENDING',
                description: `Pago anticipo bimestral SIMPLE (Bimestre ${idx + 1})`,
            });
        });

    } else {
        // ========== RENTA (ORDINARIO / ESPECIAL) ==========
        if (client.classification === 'JURIDICA' || client.classification === 'GRAN_CONTRIBUYENTE') {
            const days = client.classification === 'GRAN_CONTRIBUYENTE' ? RENTA_PJ_2025.grandes : RENTA_PJ_2025.juridicas;

            events.push({
                id: 'renta-pj-1',
                title: 'Renta PJ - Cuota 1',
                date: `${year}-05-${days.cuota1[lastDigit]}`, // May (Juridicas)
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaración y pago primera cuota impuesto de renta',
            });
            events.push({
                id: 'renta-pj-2',
                title: 'Renta PJ - Cuota 2',
                date: `${year}-07-${days.cuota2[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Pago segunda cuota impuesto de renta',
            });

            if (client.classification === 'GRAN_CONTRIBUYENTE') {
                events[0].date = `${year}-02-${RENTA_PJ_2025.grandes.cuota1[lastDigit]}`;
                events[1].date = `${year}-04-${RENTA_PJ_2025.grandes.cuota2[lastDigit]}`;
                events.push({
                    id: 'renta-pj-3',
                    title: 'Renta PJ - Cuota 3',
                    date: `${year}-06-${RENTA_PJ_2025.grandes.cuota3[lastDigit]}`,
                    type: 'RENTA',
                    status: 'PENDING',
                    description: 'Pago tercera cuota impuesto de renta (Grandes Contribuyentes)',
                });
            }
        }

        if (client.classification === 'NATURAL') {
            const { month, day } = getRentaPNDate(lastTwoDigits);
            events.push({
                id: 'renta-pn',
                title: 'Renta Persona Natural',
                date: `${year}-${month}-${day}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaración anual de renta personas naturales (Año Gravable 2024)',
            });
        }
    }

    // ========== IVA ==========
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
                    title: `IVA Bimestre ${p.name}`,
                    date: `${p.year || year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaración y pago IVA ${p.name}`,
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
                    title: `IVA Cuatrimestre ${p.name}`,
                    date: `${p.year || year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaración y pago IVA ${p.name}`,
                });
            });
        }
    }

    // ========== RETENCIÓN EN LA FUENTE ==========
    if (client.isRetentionAgent) {
        Object.entries(RETENCION_2025).forEach(([monthIdx, days]) => {
            const periodMonth = parseInt(monthIdx);
            const declareYear = periodMonth === 12 ? year + 1 : year;
            const declareMonth = periodMonth === 12 ? '01' : (periodMonth + 1).toString().padStart(2, '0');

            events.push({
                id: `retencion-${monthIdx}`,
                title: `Retención Fuente ${getMonthName(periodMonth - 1)}`,
                date: `${declareYear}-${declareMonth}-${days[lastDigit]}`,
                type: 'RETENCION',
                status: 'PENDING',
                description: `Declaración mensual retenciones (Mes ${monthIdx})`,
            });
        });
    }

    // ========== EXOGENA ==========
    if (client.requiresExogena) {
        let exogenaDate: string = '';
        if (client.classification === 'GRAN_CONTRIBUYENTE') {
            exogenaDate = `${year}-${EXOGENA_2025.grandes.month}-${EXOGENA_2025.grandes.days[lastDigit]}`;
        } else if (client.classification === 'JURIDICA') {
            exogenaDate = `${year}-${EXOGENA_2025.juridicas.month}-${EXOGENA_2025.juridicas.days[lastDigit]}`;
        } else {
            exogenaDate = `${year}-${EXOGENA_2025.naturales.month}-${EXOGENA_2025.naturales.days[lastDigit]}`;
        }

        if (exogenaDate) {
            events.push({
                id: 'exogena',
                title: 'Información Exógena',
                date: exogenaDate,
                type: 'EXOGENA',
                status: 'PENDING',
                description: 'Presentación información exógena año gravable 2024',
            });
        }
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

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getMonthName(monthIndex: number): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[monthIndex] || '';
}

export function getEventsByType(events: TaxEvent[], type: string): TaxEvent[] {
    return events.filter(e => e.type === type);
}

export function getUpcomingEvents(events: TaxEvent[], days: number = 30): TaxEvent[] {
    const today = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= future;
    });
}

export function getOverdueEvents(events: TaxEvent[]): TaxEvent[] {
    const today = new Date();
    return events.filter(e => new Date(e.date) < today && e.status !== 'COMPLETED');
}
