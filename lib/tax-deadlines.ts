// Colombian Tax Deadlines Calculator (Updated for 2026)
// Based on DIAN resolution for 2026 tax calendar

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
    // New 2026 taxes (optional for backward compatibility)
    hasCarbonTax?: boolean;          // Impuesto al Carbono
    hasBeverageTax?: boolean;        // Bebidas Ultraprocesadas
    hasFuelTax?: boolean;            // Gasolina/ACPM
    hasPlasticTax?: boolean;         // Plasticos de un solo uso
    requiresRUB?: boolean;           // Registro Unico Beneficiarios
    requiresTransferPricing?: boolean; // Precios de Transferencia
    requiresCountryReport?: boolean;  // Informe Pais por Pais
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

// ==========================================
// 2026 TAX CALENDAR CONSTANTS
// ==========================================

// RENTA Personas Juridicas y Grandes Contribuyentes 2026 (Año Gravable 2025)
const RENTA_PJ_2026 = {
    // Grandes Contribuyentes - 3 cuotas
    grandes: {
        // FEBRERO - Pago 1ª Cuota (NIT 1-0 → dias 10-23)
        cuota1: ['10', '11', '12', '13', '16', '17', '18', '19', '20', '23'],
        // ABRIL - Declaracion y Pago 2ª Cuota (NIT 1-0 → dias 13-24)
        cuota2: ['13', '14', '15', '16', '17', '20', '21', '22', '23', '24'],
        // JUNIO - Pago 3ª Cuota (NIT 1-0 → dias 10-24)
        cuota3: ['10', '11', '12', '16', '17', '18', '19', '22', '23', '24'],
    },
    // Personas Juridicas - 2 cuotas
    juridicas: {
        // MAYO - Pago 1ª Cuota (NIT 1-0 → dias 12-26)
        cuota1: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'],
        // JULIO - Declaracion y Pago 2ª Cuota (NIT 1-0 → dias 09-23)
        cuota2: ['09', '10', '13', '14', '15', '16', '17', '21', '22', '23'],
    }
};

// Renta Personas Naturales 2026 (Declaracion Renta Año Gravable 2025)
// Based on last TWO digits of NIT
const getRentaPNDate = (lastTwo: number): { month: string, day: string } => {
    // AGOSTO
    if (lastTwo >= 1 && lastTwo <= 2) return { month: '08', day: '12' };
    if (lastTwo >= 3 && lastTwo <= 4) return { month: '08', day: '13' };
    if (lastTwo >= 5 && lastTwo <= 6) return { month: '08', day: '14' };
    if (lastTwo >= 7 && lastTwo <= 8) return { month: '08', day: '18' };
    if (lastTwo >= 9 && lastTwo <= 10) return { month: '08', day: '19' };
    if (lastTwo >= 11 && lastTwo <= 12) return { month: '08', day: '20' };
    if (lastTwo >= 13 && lastTwo <= 14) return { month: '08', day: '21' };
    if (lastTwo >= 15 && lastTwo <= 16) return { month: '08', day: '24' };
    if (lastTwo >= 17 && lastTwo <= 18) return { month: '08', day: '25' };
    if (lastTwo >= 19 && lastTwo <= 20) return { month: '08', day: '26' };
    if (lastTwo >= 21 && lastTwo <= 22) return { month: '08', day: '27' };
    if (lastTwo >= 23 && lastTwo <= 24) return { month: '08', day: '28' };
    if (lastTwo >= 25 && lastTwo <= 26) return { month: '08', day: '31' };

    // SEPTIEMBRE
    if (lastTwo >= 27 && lastTwo <= 28) return { month: '09', day: '01' };
    if (lastTwo >= 29 && lastTwo <= 30) return { month: '09', day: '02' };
    if (lastTwo >= 31 && lastTwo <= 32) return { month: '09', day: '03' };
    if (lastTwo >= 33 && lastTwo <= 34) return { month: '09', day: '04' };
    if (lastTwo >= 35 && lastTwo <= 36) return { month: '09', day: '07' };
    if (lastTwo >= 37 && lastTwo <= 38) return { month: '09', day: '08' };
    if (lastTwo >= 39 && lastTwo <= 40) return { month: '09', day: '09' };
    if (lastTwo >= 41 && lastTwo <= 42) return { month: '09', day: '10' };
    if (lastTwo >= 43 && lastTwo <= 44) return { month: '09', day: '11' };
    if (lastTwo >= 45 && lastTwo <= 46) return { month: '09', day: '14' };
    if (lastTwo >= 47 && lastTwo <= 48) return { month: '09', day: '15' };
    if (lastTwo >= 49 && lastTwo <= 50) return { month: '09', day: '16' };
    if (lastTwo >= 51 && lastTwo <= 52) return { month: '09', day: '17' };
    if (lastTwo >= 53 && lastTwo <= 54) return { month: '09', day: '18' };
    if (lastTwo >= 55 && lastTwo <= 56) return { month: '09', day: '21' };
    if (lastTwo >= 57 && lastTwo <= 58) return { month: '09', day: '22' };
    if (lastTwo >= 59 && lastTwo <= 60) return { month: '09', day: '23' };
    if (lastTwo >= 61 && lastTwo <= 62) return { month: '09', day: '24' };
    if (lastTwo >= 63 && lastTwo <= 64) return { month: '09', day: '25' };
    if (lastTwo >= 65 && lastTwo <= 66) return { month: '09', day: '28' };

    // OCTUBRE
    if (lastTwo >= 67 && lastTwo <= 68) return { month: '10', day: '01' };
    if (lastTwo >= 69 && lastTwo <= 70) return { month: '10', day: '02' };
    if (lastTwo >= 71 && lastTwo <= 72) return { month: '10', day: '05' };
    if (lastTwo >= 73 && lastTwo <= 74) return { month: '10', day: '06' };
    if (lastTwo >= 75 && lastTwo <= 76) return { month: '10', day: '07' };
    if (lastTwo >= 77 && lastTwo <= 78) return { month: '10', day: '08' };
    if (lastTwo >= 79 && lastTwo <= 80) return { month: '10', day: '09' };
    if (lastTwo >= 81 && lastTwo <= 82) return { month: '10', day: '13' };
    if (lastTwo >= 83 && lastTwo <= 84) return { month: '10', day: '14' };
    if (lastTwo >= 85 && lastTwo <= 86) return { month: '10', day: '15' };
    if (lastTwo >= 87 && lastTwo <= 88) return { month: '10', day: '16' };
    if (lastTwo >= 89 && lastTwo <= 90) return { month: '10', day: '19' };
    if (lastTwo >= 91 && lastTwo <= 92) return { month: '10', day: '20' };
    if (lastTwo >= 93 && lastTwo <= 94) return { month: '10', day: '21' };
    if (lastTwo >= 95 && lastTwo <= 96) return { month: '10', day: '22' };
    if (lastTwo >= 97 && lastTwo <= 98) return { month: '10', day: '23' };
    if (lastTwo === 99 || lastTwo === 0) return { month: '10', day: '26' };

    return { month: '08', day: '12' }; // Fallback
};

// IVA Bimestral 2026
const IVA_BIMESTRAL_2026 = {
    // P1 (Ene-Feb) → Mayo (NIT 1-0 → dias 12-26)
    p1: { month: '05', days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'], year: 2026 },
    // P2 (Mar-Abr) → Julio (NIT 1-0 → dias 09-23)
    p2: { month: '07', days: ['09', '10', '13', '14', '15', '16', '17', '21', '22', '23'], year: 2026 },
    // P3 (May-Jun) → Septiembre (NIT 1-0 → dias 11-25)
    p3: { month: '09', days: ['11', '12', '13', '17', '18', '19', '20', '23', '24', '25'], year: 2026 },
    // P4 (Jul-Ago) → Noviembre (NIT 1-0 → dias 09-22)
    p4: { month: '11', days: ['09', '10', '11', '14', '15', '16', '17', '18', '21', '22'], year: 2026 },
    // P5 (Sep-Oct) → Enero 2027 (NIT 1-0 → dias 13-26)
    p5: { month: '01', days: ['13', '14', '15', '18', '19', '20', '21', '22', '25', '26'], year: 2027 },
    // P6 (Nov-Dic) → Enero 2027 (NIT 1-0 → dias 13-26 segundo bloque)
    p6: { month: '01', days: ['13', '14', '15', '18', '19', '20', '21', '22', '25', '26'], year: 2027 },
};

// IVA Cuatrimestral 2026
const IVA_CUATRIMESTRAL_2026 = {
    // P1 (Ene-Abr) → Mayo (NIT 1-0 → dias 12-26)
    p1: { month: '05', days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'], year: 2026 },
    // P2 (May-Ago) → Septiembre (NIT 1-0 → dias 11-25)
    p2: { month: '09', days: ['11', '12', '13', '17', '18', '19', '20', '23', '24', '25'], year: 2026 },
    // P3 (Sep-Dic) → Enero 2027 (NIT 1-0 → dias 13-26)
    p3: { month: '01', days: ['13', '14', '15', '18', '19', '20', '21', '22', '25', '26'], year: 2027 },
};

// Retencion en la Fuente 2026 (12 meses)
const RETENCION_2026: Record<string, { days: string[], declareMonth: string, declareYear?: number }> = {
    '01': { days: ['10', '11', '12', '13', '16', '17', '18', '19', '20', '23'], declareMonth: '02' }, // Ene → Feb
    '02': { days: ['10', '11', '12', '13', '16', '17', '18', '19', '20', '24'], declareMonth: '03' }, // Feb → Mar
    '03': { days: ['13', '14', '15', '16', '17', '20', '21', '22', '23', '24'], declareMonth: '04' }, // Mar → Abr
    '04': { days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'], declareMonth: '05' }, // Abr → May
    '05': { days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'], declareMonth: '06' }, // May → Jun
    '06': { days: ['09', '10', '13', '14', '15', '16', '17', '21', '22', '23'], declareMonth: '07' }, // Jun → Jul
    '07': { days: ['12', '13', '14', '18', '19', '20', '21', '24', '25', '26'], declareMonth: '08' }, // Jul → Ago
    '08': { days: ['11', '12', '13', '17', '18', '19', '20', '23', '24', '25'], declareMonth: '09' }, // Ago → Sep
    '09': { days: ['09', '13', '14', '15', '16', '19', '20', '21', '22', '23'], declareMonth: '10' }, // Sep → Oct
    '10': { days: ['10', '11', '14', '15', '16', '17', '18', '21', '22', '23'], declareMonth: '11' }, // Oct → Nov
    '11': { days: ['09', '10', '13', '14', '15', '16', '17', '20', '21', '22'], declareMonth: '12' }, // Nov → Dic
    '12': { days: ['13', '14', '15', '18', '19', '20', '21', '22', '25', '26'], declareMonth: '01', declareYear: 2027 }, // Dic → Ene 2027
};

// Exogena 2026 (Año Gravable 2025)
const EXOGENA_2026 = {
    grandes: { month: '04', days: ['22', '23', '24', '25', '28', '29', '30', '01', '02', '05'] }, // Abr-May
    juridicas: { month: '05', days: ['05', '06', '07', '08', '09', '12', '13', '14', '15', '16'] }, // May
    naturales: { month: '05', days: ['19', '20', '21', '22', '25', '26', '27', '28', '29', '30'] }, // May
};

// Patrimonio 2026 - FECHAS FIJAS (independiente del NIT)
const PATRIMONIO_2026 = {
    cuota1: { month: '05', day: '14' }, // 14-May
    cuota2: { month: '09', day: '14' }, // 14-Sep
};

// Regimen SIMPLE 2026
const SIMPLE_2026 = {
    anticipos: [
        // Bimestre 1 (Ene-Feb) → Marzo
        { month: '03', days: ['10', '11', '12', '13', '16', '17', '18', '19', '20', '24'] },
        // Bimestre 2 (Mar-Abr) → Mayo
        { month: '05', days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'] },
        // Bimestre 3 (May-Jun) → Julio
        { month: '07', days: ['09', '10', '13', '14', '15', '16', '17', '21', '22', '23'] },
        // Bimestre 4 (Jul-Ago) → Septiembre
        { month: '09', days: ['11', '12', '13', '17', '18', '19', '20', '23', '24', '25'] },
        // Bimestre 5 (Sep-Oct) → Noviembre
        { month: '11', days: ['09', '10', '11', '14', '15', '16', '17', '18', '21', '22'] },
        // Bimestre 6 (Nov-Dic) → Enero 2027
        { month: '01', days: ['13', '14', '15', '18', '19', '20', '21', '22', '25', '26'], year: 2027 },
    ],
    // Declaracion anual consolidada - Abril 2027
    annual: { month: '04', days: ['12', '13', '14', '15', '19', '20', '21', '22', '25', '26'] }
};

// ==========================================
// NUEVOS IMPUESTOS 2026
// ==========================================

// Impuesto al Carbono (Bimestral) - Fecha FIJA
const CARBONO_2026 = {
    p1: { month: '03', day: '13' }, // Ene-Feb → 13-Mar
    p2: { month: '05', day: '15' }, // Mar-Abr → 15-May
    p3: { month: '07', day: '14' }, // May-Jun → 14-Jul
    p4: { month: '09', day: '14' }, // Jul-Ago → 14-Sep
    p5: { month: '11', day: '17' }, // Sep-Oct → 17-Nov
    p6: { month: '01', day: '18', year: 2027 }, // Nov-Dic → 18-Ene 2027
};

// Impuesto Bebidas Ultraprocesadas (Bimestral) - Mismo calendario que Carbono
const BEBIDAS_ULTRAPROCESADAS_2026 = CARBONO_2026;

// Impuesto Gasolina/ACPM (Mensual) - Fecha FIJA
const GASOLINA_ACPM_2026: Record<string, { month: string; day: string; year?: number }> = {
    '01': { month: '02', day: '13' }, // Enero → 13-Feb
    '02': { month: '03', day: '13' }, // Febrero → 13-Mar
    '03': { month: '04', day: '16' }, // Marzo → 16-Abr
    '04': { month: '05', day: '15' }, // Abril → 15-May
    '05': { month: '06', day: '16' }, // Mayo → 16-Jun
    '06': { month: '07', day: '14' }, // Junio → 14-Jul
    '07': { month: '08', day: '18' }, // Julio → 18-Ago
    '08': { month: '09', day: '14' }, // Agosto → 14-Sep
    '09': { month: '10', day: '15' }, // Septiembre → 15-Oct
    '10': { month: '11', day: '17' }, // Octubre → 17-Nov
    '11': { month: '12', day: '15' }, // Noviembre → 15-Dic
    '12': { month: '01', day: '18', year: 2027 }, // Diciembre → 18-Ene 2027
};

// Productos Plasticos de un Solo Uso - Fecha FIJA
const PLASTICOS_2026 = {
    date: { month: '02', day: '02' } // 2-Feb
};

// RUB - Registro Unico Beneficiarios Finales - Fecha FIJA
const RUB_2026 = {
    date: { month: '04', day: '22' } // 22-Abr
};

// Precios de Transferencia - Fecha FIJA
const PRECIOS_TRANSFERENCIA_2026 = {
    date: { month: '09', day: '13' } // 13-Sep
};

// Informe Pais por Pais - Fecha FIJA
const INFORME_PAIS_2026 = {
    date: { month: '12', day: '15' } // 15-Dic
};

// ==========================================
// MAIN FUNCTION
// ==========================================

export function getTaxDeadlines(client: TaxClientConfig): TaxEvent[] {
    const events: TaxEvent[] = [];
    const lastDigit = getLastDigit(client.nit);
    const lastTwoDigits = getLastTwoDigits(client.nit);
    const year = 2026;

    // ========== SIMPLE REGIME ==========
    if (client.taxRegime === 'SIMPLE') {
        const annualDay = SIMPLE_2026.annual.days[lastDigit] || '15';
        events.push({
            id: 'simple-anual',
            title: 'Declaracion Anual SIMPLE',
            date: `${year + 1}-04-${annualDay}`,
            type: 'SIMPLE',
            status: 'PENDING',
            description: 'Declaracion anual consolidada Regimen Simple de Tributacion (Año Gravable 2026)',
        });

        SIMPLE_2026.anticipos.forEach((anticipo, idx) => {
            const day = anticipo.days[lastDigit] || '15';
            const anticipoYear = anticipo.year || year;
            events.push({
                id: `simple-adv-${idx + 1}`,
                title: `Anticipo SIMPLE Bimestre ${idx + 1}`,
                date: `${anticipoYear}-${anticipo.month}-${day}`,
                type: 'SIMPLE',
                status: 'PENDING',
                description: `Pago anticipo bimestral SIMPLE (Bimestre ${idx + 1})`,
            });
        });

    } else {
        // ========== RENTA (ORDINARIO / ESPECIAL) ==========
        if (client.classification === 'GRAN_CONTRIBUYENTE') {
            // Grandes Contribuyentes - 3 cuotas
            events.push({
                id: 'renta-gc-1',
                title: 'Renta GC - Cuota 1',
                date: `${year}-02-${RENTA_PJ_2026.grandes.cuota1[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Pago primera cuota impuesto de renta (Grandes Contribuyentes)',
            });
            events.push({
                id: 'renta-gc-2',
                title: 'Renta GC - Cuota 2 (Declaracion)',
                date: `${year}-04-${RENTA_PJ_2026.grandes.cuota2[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaracion y pago segunda cuota impuesto de renta (Grandes Contribuyentes)',
            });
            events.push({
                id: 'renta-gc-3',
                title: 'Renta GC - Cuota 3',
                date: `${year}-06-${RENTA_PJ_2026.grandes.cuota3[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Pago tercera cuota impuesto de renta (Grandes Contribuyentes)',
            });
        } else if (client.classification === 'JURIDICA') {
            // Personas Juridicas - 2 cuotas
            events.push({
                id: 'renta-pj-1',
                title: 'Renta PJ - Cuota 1',
                date: `${year}-05-${RENTA_PJ_2026.juridicas.cuota1[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Pago primera cuota impuesto de renta personas juridicas',
            });
            events.push({
                id: 'renta-pj-2',
                title: 'Renta PJ - Cuota 2 (Declaracion)',
                date: `${year}-07-${RENTA_PJ_2026.juridicas.cuota2[lastDigit]}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaracion y pago segunda cuota impuesto de renta personas juridicas',
            });
        }

        if (client.classification === 'NATURAL') {
            const { month, day } = getRentaPNDate(lastTwoDigits);
            events.push({
                id: 'renta-pn',
                title: 'Renta Persona Natural',
                date: `${year}-${month}-${day}`,
                type: 'RENTA',
                status: 'PENDING',
                description: 'Declaracion anual de renta personas naturales (Año Gravable 2025)',
            });
        }
    }

    // ========== IVA ==========
    if (client.taxRegime !== 'SIMPLE') {
        if (client.ivaPeriodicity === 'BIMESTRAL') {
            const periods = [
                { key: 'p1', name: 'Ene-Feb', ...IVA_BIMESTRAL_2026.p1 },
                { key: 'p2', name: 'Mar-Abr', ...IVA_BIMESTRAL_2026.p2 },
                { key: 'p3', name: 'May-Jun', ...IVA_BIMESTRAL_2026.p3 },
                { key: 'p4', name: 'Jul-Ago', ...IVA_BIMESTRAL_2026.p4 },
                { key: 'p5', name: 'Sep-Oct', ...IVA_BIMESTRAL_2026.p5 },
                { key: 'p6', name: 'Nov-Dic', ...IVA_BIMESTRAL_2026.p6 },
            ];
            periods.forEach((p, idx) => {
                events.push({
                    id: `iva-bim-${idx + 1}`,
                    title: `IVA Bimestre ${p.name}`,
                    date: `${p.year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaracion y pago IVA ${p.name}`,
                });
            });
        }

        if (client.ivaPeriodicity === 'CUATRIMESTRAL') {
            const periods = [
                { key: 'p1', name: 'Ene-Abr', ...IVA_CUATRIMESTRAL_2026.p1 },
                { key: 'p2', name: 'May-Ago', ...IVA_CUATRIMESTRAL_2026.p2 },
                { key: 'p3', name: 'Sep-Dic', ...IVA_CUATRIMESTRAL_2026.p3 },
            ];
            periods.forEach((p, idx) => {
                events.push({
                    id: `iva-cuat-${idx + 1}`,
                    title: `IVA Cuatrimestre ${p.name}`,
                    date: `${p.year}-${p.month}-${p.days[lastDigit]}`,
                    type: 'IVA',
                    status: 'PENDING',
                    description: `Declaracion y pago IVA ${p.name}`,
                });
            });
        }
    }

    // ========== RETENCION EN LA FUENTE ==========
    if (client.isRetentionAgent) {
        Object.entries(RETENCION_2026).forEach(([monthIdx, config]) => {
            const declareYear = config.declareYear || year;
            events.push({
                id: `retencion-${monthIdx}`,
                title: `Retencion Fuente ${getMonthName(parseInt(monthIdx) - 1)}`,
                date: `${declareYear}-${config.declareMonth}-${config.days[lastDigit]}`,
                type: 'RETENCION',
                status: 'PENDING',
                description: `Declaracion mensual retenciones (Mes ${monthIdx})`,
            });
        });
    }

    // ========== EXOGENA ==========
    if (client.requiresExogena) {
        let exogenaData: { month: string, days: string[] };
        if (client.classification === 'GRAN_CONTRIBUYENTE') {
            exogenaData = EXOGENA_2026.grandes;
        } else if (client.classification === 'JURIDICA') {
            exogenaData = EXOGENA_2026.juridicas;
        } else {
            exogenaData = EXOGENA_2026.naturales;
        }

        events.push({
            id: 'exogena',
            title: 'Informacion Exogena',
            date: `${year}-${exogenaData.month}-${exogenaData.days[lastDigit]}`,
            type: 'EXOGENA',
            status: 'PENDING',
            description: 'Presentacion informacion exogena año gravable 2025',
        });
    }

    // ========== IMPUESTO AL PATRIMONIO ==========
    if (client.hasPatrimonyTax) {
        // Patrimonio 2026 usa fechas FIJAS (independiente del NIT)
        events.push({
            id: 'patrimonio-1',
            title: 'Patrimonio - Cuota 1',
            date: `${year}-${PATRIMONIO_2026.cuota1.month}-${PATRIMONIO_2026.cuota1.day}`,
            type: 'PATRIMONIO',
            status: 'PENDING',
            description: 'Primera cuota impuesto al patrimonio',
        });
        events.push({
            id: 'patrimonio-2',
            title: 'Patrimonio - Cuota 2',
            date: `${year}-${PATRIMONIO_2026.cuota2.month}-${PATRIMONIO_2026.cuota2.day}`,
            type: 'PATRIMONIO',
            status: 'PENDING',
            description: 'Segunda cuota impuesto al patrimonio',
        });
    }

    // ========== IMPUESTO AL CARBONO ==========
    if (client.hasCarbonTax) {
        const carbonPeriods: { name: string; month: string; day: string; year?: number }[] = [
            { name: 'Ene-Feb', ...CARBONO_2026.p1 },
            { name: 'Mar-Abr', ...CARBONO_2026.p2 },
            { name: 'May-Jun', ...CARBONO_2026.p3 },
            { name: 'Jul-Ago', ...CARBONO_2026.p4 },
            { name: 'Sep-Oct', ...CARBONO_2026.p5 },
            { name: 'Nov-Dic', ...CARBONO_2026.p6 },
        ];
        carbonPeriods.forEach((p, idx) => {
            const pYear = p.year || year;
            events.push({
                id: `carbono-${idx + 1}`,
                title: `Imp. Carbono ${p.name}`,
                date: `${pYear}-${p.month}-${p.day}`,
                type: 'CARBONO',
                status: 'PENDING',
                description: `Declaracion y pago impuesto al carbono (${p.name})`,
            });
        });
    }

    // ========== IMPUESTO BEBIDAS ULTRAPROCESADAS ==========
    if (client.hasBeverageTax) {
        const beveragePeriods: { name: string; month: string; day: string; year?: number }[] = [
            { name: 'Ene-Feb', ...BEBIDAS_ULTRAPROCESADAS_2026.p1 },
            { name: 'Mar-Abr', ...BEBIDAS_ULTRAPROCESADAS_2026.p2 },
            { name: 'May-Jun', ...BEBIDAS_ULTRAPROCESADAS_2026.p3 },
            { name: 'Jul-Ago', ...BEBIDAS_ULTRAPROCESADAS_2026.p4 },
            { name: 'Sep-Oct', ...BEBIDAS_ULTRAPROCESADAS_2026.p5 },
            { name: 'Nov-Dic', ...BEBIDAS_ULTRAPROCESADAS_2026.p6 },
        ];
        beveragePeriods.forEach((p, idx) => {
            const pYear = p.year || year;
            events.push({
                id: `bebidas-${idx + 1}`,
                title: `Imp. Bebidas ${p.name}`,
                date: `${pYear}-${p.month}-${p.day}`,
                type: 'BEBIDAS',
                status: 'PENDING',
                description: `Declaracion y pago impuesto bebidas ultraprocesadas (${p.name})`,
            });
        });
    }

    // ========== IMPUESTO GASOLINA/ACPM ==========
    if (client.hasFuelTax) {
        Object.entries(GASOLINA_ACPM_2026).forEach(([monthIdx, config]) => {
            const fuelYear = config.year || year;
            events.push({
                id: `gasolina-${monthIdx}`,
                title: `Imp. Gasolina ${getMonthName(parseInt(monthIdx) - 1)}`,
                date: `${fuelYear}-${config.month}-${config.day}`,
                type: 'GASOLINA',
                status: 'PENDING',
                description: `Declaracion y pago impuesto gasolina/ACPM (${getMonthName(parseInt(monthIdx) - 1)})`,
            });
        });
    }

    // ========== PLASTICOS DE UN SOLO USO ==========
    if (client.hasPlasticTax) {
        events.push({
            id: 'plasticos',
            title: 'Imp. Plasticos de un Solo Uso',
            date: `${year}-${PLASTICOS_2026.date.month}-${PLASTICOS_2026.date.day}`,
            type: 'PLASTICOS',
            status: 'PENDING',
            description: 'Declaracion anual impuesto productos plasticos de un solo uso',
        });
    }

    // ========== RUB - REGISTRO UNICO BENEFICIARIOS ==========
    if (client.requiresRUB) {
        events.push({
            id: 'rub',
            title: 'Actualizacion RUB',
            date: `${year}-${RUB_2026.date.month}-${RUB_2026.date.day}`,
            type: 'RUB',
            status: 'PENDING',
            description: 'Actualizacion Registro Unico de Beneficiarios Finales',
        });
    }

    // ========== PRECIOS DE TRANSFERENCIA ==========
    if (client.requiresTransferPricing) {
        events.push({
            id: 'precios-transferencia',
            title: 'Precios de Transferencia',
            date: `${year}-${PRECIOS_TRANSFERENCIA_2026.date.month}-${PRECIOS_TRANSFERENCIA_2026.date.day}`,
            type: 'PRECIOS_TRANSFERENCIA',
            status: 'PENDING',
            description: 'Declaracion informativa y documentacion comprobatoria precios de transferencia',
        });
    }

    // ========== INFORME PAIS POR PAIS ==========
    if (client.requiresCountryReport) {
        events.push({
            id: 'informe-pais',
            title: 'Informe Pais por Pais',
            date: `${year}-${INFORME_PAIS_2026.date.month}-${INFORME_PAIS_2026.date.day}`,
            type: 'INFORME_PAIS',
            status: 'PENDING',
            description: 'Informe pais por pais (Country by Country Report)',
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
