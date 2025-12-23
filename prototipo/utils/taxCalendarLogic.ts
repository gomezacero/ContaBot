
import { CalendarClientConfig } from '../types';

export interface TaxEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    type: 'RENTA' | 'IVA' | 'RETEFUENTE' | 'EXOGENA' | 'SIMPLE' | 'PATRIMONIO' | 'EXTERIOR';
    status: 'PENDING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
    description: string;
    alertDates?: { daysBefore: number, date: string, triggered: boolean }[];
}

export const calculateAlerts = (dueDate: string, daysBeforeList: number[]) => {
    return daysBeforeList.map(days => {
        const alertDate = new Date(dueDate);
        alertDate.setDate(alertDate.getDate() - days);
        return {
            daysBefore: days,
            date: alertDate.toISOString().split('T')[0],
            triggered: new Date() >= alertDate
        };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const getRentaPN_Date = (lastTwo: number): string => {
    // Agosto
    if (lastTwo >= 1 && lastTwo <= 2) return '08-12';
    if (lastTwo >= 3 && lastTwo <= 4) return '08-13';
    if (lastTwo >= 5 && lastTwo <= 6) return '08-14';
    if (lastTwo >= 7 && lastTwo <= 8) return '08-15';
    if (lastTwo >= 9 && lastTwo <= 10) return '08-19';
    if (lastTwo >= 11 && lastTwo <= 12) return '08-20';
    if (lastTwo >= 13 && lastTwo <= 14) return '08-21';
    if (lastTwo >= 15 && lastTwo <= 16) return '08-22';
    if (lastTwo >= 17 && lastTwo <= 18) return '08-25';
    if (lastTwo >= 19 && lastTwo <= 20) return '08-26';
    if (lastTwo >= 21 && lastTwo <= 22) return '08-27';
    if (lastTwo >= 23 && lastTwo <= 24) return '08-28';
    if (lastTwo >= 25 && lastTwo <= 26) return '08-29';
    
    // Septiembre
    if (lastTwo >= 27 && lastTwo <= 28) return '09-01';
    if (lastTwo >= 29 && lastTwo <= 30) return '09-02';
    if (lastTwo >= 31 && lastTwo <= 32) return '09-03';
    if (lastTwo >= 33 && lastTwo <= 34) return '09-04';
    if (lastTwo >= 35 && lastTwo <= 36) return '09-05';
    if (lastTwo >= 37 && lastTwo <= 38) return '09-08';
    if (lastTwo >= 39 && lastTwo <= 40) return '09-09';
    if (lastTwo >= 41 && lastTwo <= 42) return '09-10';
    if (lastTwo >= 43 && lastTwo <= 44) return '09-11';
    if (lastTwo >= 45 && lastTwo <= 46) return '09-12';
    if (lastTwo >= 47 && lastTwo <= 48) return '09-15';
    if (lastTwo >= 49 && lastTwo <= 50) return '09-16';
    if (lastTwo >= 51 && lastTwo <= 52) return '09-17';
    if (lastTwo >= 53 && lastTwo <= 54) return '09-18';
    if (lastTwo >= 55 && lastTwo <= 56) return '09-19';
    if (lastTwo >= 57 && lastTwo <= 58) return '09-22';
    if (lastTwo >= 59 && lastTwo <= 60) return '09-23';
    if (lastTwo >= 61 && lastTwo <= 62) return '09-24';
    if (lastTwo >= 63 && lastTwo <= 64) return '09-25';
    if (lastTwo >= 65 && lastTwo <= 66) return '09-26';

    // Octubre
    if (lastTwo >= 67 && lastTwo <= 68) return '10-01';
    if (lastTwo >= 69 && lastTwo <= 70) return '10-02';
    if (lastTwo >= 71 && lastTwo <= 72) return '10-03';
    if (lastTwo >= 73 && lastTwo <= 74) return '10-06';
    if (lastTwo >= 75 && lastTwo <= 76) return '10-07';
    if (lastTwo >= 77 && lastTwo <= 78) return '10-08';
    if (lastTwo >= 79 && lastTwo <= 80) return '10-09';
    if (lastTwo >= 81 && lastTwo <= 82) return '10-10';
    if (lastTwo >= 83 && lastTwo <= 84) return '10-14';
    if (lastTwo >= 85 && lastTwo <= 86) return '10-15';
    if (lastTwo >= 87 && lastTwo <= 88) return '10-16';
    if (lastTwo >= 89 && lastTwo <= 90) return '10-17';
    if (lastTwo >= 91 && lastTwo <= 92) return '10-20';
    if (lastTwo >= 93 && lastTwo <= 94) return '10-21';
    if (lastTwo >= 95 && lastTwo <= 96) return '10-22';
    if (lastTwo >= 97 && lastTwo <= 98) return '10-23';
    if (lastTwo === 99 || lastTwo === 0) return '10-24';

    return '10-24';
};

export const getTaxDeadlines = (config: CalendarClientConfig): TaxEvent[] => {
    const cleanNit = config.nit.replace(/\D/g, '');
    const lastDigit = parseInt(cleanNit.slice(-1)) || 0;
    const lastTwoDigits = parseInt(cleanNit.slice(-2)) || 0;
    const year = 2025;
    
    const events: TaxEvent[] = [];

    // --- 1. RENTA GRANDES CONTRIBUYENTES ---
    if (config.classification === 'GRAN_CONTRIBUYENTE') {
        const c1Table = ['24', '11', '12', '13', '14', '17', '18', '19', '20', '21'];
        const c2Table = ['24', '09', '10', '11', '14', '15', '16', '21', '22', '23'];
        const c3Table = ['25', '11', '12', '13', '16', '17', '18', '19', '20', '24'];
        
        events.push({ id: 'renta-gc-1', title: 'Renta GC - Pago 1ª Cuota', date: `${year}-02-${c1Table[lastDigit]}`, type: 'RENTA', status: 'PENDING', description: 'Pago primera cuota Gran Contribuyente' });
        events.push({ id: 'renta-gc-2', title: 'Renta GC - Declaración + Pago 2ª Cuota', date: `${year}-04-${c2Table[lastDigit]}`, type: 'RENTA', status: 'PENDING', description: 'Formulario 110 - Declaración y pago cuota 2' });
        events.push({ id: 'renta-gc-3', title: 'Renta GC - Pago 3ª Cuota', date: `${year}-06-${c3Table[lastDigit]}`, type: 'RENTA', status: 'PENDING', description: 'Pago final cuota 3' });
        events.push({ id: 'exterior-gc', title: 'Activos en el Exterior GC', date: `${year}-04-${c2Table[lastDigit]}`, type: 'EXTERIOR', status: 'PENDING', description: 'Declaración anual activos exterior' });
    }

    // --- 2. RENTA PERSONAS JURÍDICAS (ORDINARIA) ---
    if (config.classification === 'JURIDICA') {
        const c1Table = ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'];
        const c2Table = ['22', '09', '10', '11', '14', '15', '16', '17', '18', '21'];
        
        events.push({ id: 'renta-pj-1', title: 'Renta PJ - Decl. y Pago 1ª Cuota', date: `${year}-05-${c1Table[lastDigit]}`, type: 'RENTA', status: 'PENDING', description: 'Declaración y pago cuota 1' });
        events.push({ id: 'renta-pj-2', title: 'Renta PJ - Pago 2ª Cuota', date: `${year}-07-${c2Table[lastDigit]}`, type: 'RENTA', status: 'PENDING', description: 'Pago cuota 2' });
        events.push({ id: 'exterior-pj', title: 'Activos en el Exterior PJ', date: `${year}-05-${c1Table[lastDigit]}`, type: 'EXTERIOR', status: 'PENDING', description: 'Declaración anual activos exterior' });
    }

    // --- 3. RENTA PERSONAS NATURALES ---
    if (config.classification === 'NATURAL') {
        const monthDay = getRentaPN_Date(lastTwoDigits);
        events.push({ id: 'renta-pn', title: 'Declaración Renta PN', date: `${year}-${monthDay}`, type: 'RENTA', status: 'PENDING', description: 'Declaración anual Impuesto Renta' });
        events.push({ id: 'exterior-pn', title: 'Activos en el Exterior PN', date: `${year}-${monthDay}`, type: 'EXTERIOR', status: 'PENDING', description: 'Declaración activos exterior (Simultánea con Renta)' });
    }

    // --- 4. IVA BIMESTRAL ---
    if (config.ivaPeriodicity === 'BIMESTRAL') {
        const biDays = [
            ['25', '11', '12', '13', '14', '17', '18', '19', '20', '21'], // Mar
            ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], // May
            ['22', '09', '10', '11', '14', '15', '16', '17', '18', '21'], // Jul
            ['22', '09', '10', '11', '12', '15', '16', '17', '18', '19'], // Sep
            ['26', '12', '13', '14', '18', '19', '20', '21', '24', '25'], // Nov
            ['26', '13', '14', '15', '16', '19', '20', '21', '22', '23'], // Ene 26
        ];
        const biMonths = ['03', '05', '07', '09', '11', '01'];
        biMonths.forEach((mm, idx) => {
            const evYear = mm === '01' ? year + 1 : year;
            events.push({ id: `iva-bi-${idx}`, title: `IVA Bimestral P${idx+1}`, date: `${evYear}-${mm}-${biDays[idx][lastDigit]}`, type: 'IVA', status: 'PENDING', description: `Vencimiento IVA Bimestral Periodo ${idx+1}` });
        });
    }

    // --- 5. IVA CUATRIMESTRAL ---
    if (config.ivaPeriodicity === 'CUATRIMESTRAL') {
        const cuatDays = [
            ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], // May
            ['22', '09', '10', '11', '12', '15', '16', '17', '18', '19'], // Sep
            ['26', '13', '14', '15', '16', '19', '20', '21', '22', '23'], // Ene 26
        ];
        const cuatMonths = ['05', '09', '01'];
        cuatMonths.forEach((mm, idx) => {
            const evYear = mm === '01' ? year + 1 : year;
            events.push({ id: `iva-cua-${idx}`, title: `IVA Cuatrimestral P${idx+1}`, date: `${evYear}-${mm}-${cuatDays[idx][lastDigit]}`, type: 'IVA', status: 'PENDING', description: `Vencimiento IVA Cuatrimestral P${idx+1}` });
        });
    }

    // --- 6. RETENCIÓN EN LA FUENTE (MENSUAL) ---
    if (config.isRetentionAgent) {
        const rfDays = [
            ['24', '11', '12', '13', '14', '17', '18', '19', '20', '21'], // Feb (Ene)
            ['25', '11', '12', '13', '14', '17', '18', '19', '20', '21'], // Mar (Feb)
            ['24', '09', '10', '11', '14', '15', '16', '21', '22', '23'], // Abr (Mar)
            ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'], // May (Abr)
            ['25', '11', '12', '13', '16', '17', '18', '19', '20', '24'], // Jun (May)
            ['22', '09', '10', '11', '14', '15', '16', '17', '18', '21'], // Jul (Jun)
            ['26', '12', '13', '14', '15', '19', '20', '21', '22', '25'], // Ago (Jul)
            ['22', '09', '10', '11', '12', '15', '16', '17', '18', '19'], // Sep (Ago)
            ['23', '09', '10', '14', '15', '16', '17', '20', '21', '22'], // Oct (Sep)
            ['26', '12', '13', '14', '18', '19', '20', '21', '24', '25'], // Nov (Oct)
            ['23', '10', '11', '12', '15', '16', '17', '18', '19', '22'], // Dic (Nov)
            ['26', '13', '14', '15', '16', '19', '20', '21', '22', '23'], // Ene (Dic)
        ];
        const rfMonths = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '01'];
        rfMonths.forEach((mm, idx) => {
            const evYear = mm === '01' ? year + 1 : year;
            events.push({ id: `rf-${idx}`, title: `Retefuente Mes ${idx+1}`, date: `${evYear}-${mm}-${rfDays[idx][lastDigit]}`, type: 'RETEFUENTE', status: 'PENDING', description: `Declaración y pago Retención Mensual` });
        });
    }

    // --- 7. RÉGIMEN SIMPLE (SIMPLE) ---
    if (config.taxRegime === 'SIMPLE') {
        const simpleDays = ['23', '15', '15', '16', '16', '21', '21', '22', '22', '23']; // 1-2, 3-4, etc. agrupados
        events.push({ id: 'simple-anual', title: 'Declaración Anual SIMPLE', date: `${year}-04-${simpleDays[lastDigit]}`, type: 'SIMPLE', status: 'PENDING', description: 'Declaración consolidada RST' });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getStatusColor = (status: string, daysDiff: number) => {
    if (daysDiff < 0) return 'bg-gray-100 text-gray-500 border-gray-200'; // Pasado
    if (daysDiff <= 5) return 'bg-red-50 text-red-700 border-red-200 animate-pulse'; // Urgente
    if (daysDiff <= 15) return 'bg-orange-50 text-orange-700 border-orange-200'; // Advertencia
    return 'bg-green-50 text-green-700 border-green-200'; // Seguro
};
