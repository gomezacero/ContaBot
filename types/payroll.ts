// ==========================================
// PAYROLL TYPES
// ==========================================

export enum RiskLevel {
    I = 'I',
    II = 'II',
    III = 'III',
    IV = 'IV',
    V = 'V',
}

export type ContractType = 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR' | 'APRENDIZAJE';

export interface DeductionsParameters {
    housingInterest: number;
    prepaidMedicine: number;
    voluntaryPension: number;
    voluntaryPensionExempt: number;
    afc: number;
    hasDependents: boolean;
}

export interface PayrollInput {
    id: string;
    employerType: 'NATURAL' | 'JURIDICA';
    companyName?: string;
    companyNit?: string;
    name: string;
    documentNumber?: string;
    jobTitle?: string;
    contractType?: ContractType;
    baseSalary: number;
    riskLevel: RiskLevel;
    isExempt: boolean;
    includeTransportAid: boolean;
    startDate?: string;
    endDate?: string;
    enableDeductions: boolean;
    deductionsParameters: DeductionsParameters;
    hedHours?: number;
    henHours?: number;
    rnHours?: number;
    domFestHours?: number;
    heddfHours?: number;
    hendfHours?: number;
    commissions?: number;
    salaryBonuses?: number;
    nonSalaryBonuses?: number;
    loans?: number;
    otherDeductions?: number;
    // Override de parámetros base (opcional) - para liquidaciones con años anteriores
    anoBase?: 2024 | 2025 | 2026;
    smmlvOverride?: number;
    auxTransporteOverride?: number;
    // Persistencia de anticipos y deducciones personalizadas
    advancesData?: {
        anticipos?: AnticiposPrestaciones;
        deduccionesPersonalizadas?: DeduccionPersonalizada[];
    };
}

export interface PayrollFinancials {
    salaryData: {
        baseSalary: number;
        transportAid: number;
        totalAccrued: number;
        daysWorked?: number;
        overtime?: number;
        variables?: number;
        nonSalary?: number;
    };
    employeeDeductions: {
        health: number;
        pension: number;
        solidarityFund: number;
        subsistenceAccount: number;
        retencionFuente: number;
        totalDeductions: number;
    };
    netPay: number;
    employerCosts: {
        health: number;
        pension: number;
        arl: number;
        sena: number;
        icbf: number;
        compensationBox: number;
        vacations: number;
        cesantias: number;
        interesesCesantias: number;
        prima: number;
        totalEmployerCost: number;
    };
    totals: {
        grandTotalCost: number;
    };
}

export interface PayrollResult {
    monthly: PayrollFinancials;
    annual: PayrollFinancials;
    employeeCount?: number;
}

// ==========================================
// TAX CALENDAR TYPES
// ==========================================

export type TaxClientClassification = 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE';
export type TaxIvaPeriodicity = 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE';

export interface CalendarClientConfig {
    id: string;
    clientName: string;
    nit: string;
    classification: TaxClientClassification;
    ivaPeriodicity: TaxIvaPeriodicity;
    isSimpleRegime: boolean;
    taxRegime: 'ORDINARIO' | 'ESPECIAL' | 'SIMPLE' | 'SIMPLIFICADO';
    isRetentionAgent: boolean;
    wealthSituation: 'DECLARANTE_RENTA' | 'DECLARANTE_PATRIMONIO' | 'NO_DECLARANTE';
    sectoralTaxes: string[];
    alertDays: number[];
    lastUpdated: string;
    notifications: {
        emailEnabled: boolean;
        whatsappEnabled: boolean;
        targetEmails?: string[];
        targetPhone?: string;
    };
}

export interface TaxEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    type:
        | 'RENTA' | 'IVA' | 'RETEFUENTE' | 'RETENCION' | 'GMF'
        | 'EXOGENA' | 'SIMPLE' | 'PATRIMONIO' | 'EXTERIOR'
        // New 2026 taxes
        | 'CARBONO' | 'BEBIDAS' | 'GASOLINA' | 'PLASTICOS'
        | 'RUB' | 'PRECIOS_TRANSFERENCIA' | 'INFORME_PAIS';
    status: 'PENDING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
    description: string;
    alertDates?: { daysBefore: number, date: string, triggered: boolean }[];
}

// ==========================================
// SMART EXPENSE TYPES
// ==========================================

export interface SmartExpenseResult {
    type: 'INVOICE' | 'SPREADSHEET';
    fileName: string;
    summary: {
        entity: string;
        date: string;
        totalAmount: number;
        confidenceScore: number;
    };
    extractedItems: {
        description: string;
        qty?: number;
        unitPrice?: number;
        total: number;
        category?: string;
    }[];
    rawTextOutput: string;
}

export interface ClientFolder {
    id: string;
    name: string;
    nit?: string;
    color?: string;
}

export interface ExpenseHistoryItem {
    id: string;
    clientId: string;
    date: string;
    fileName: string;
    totalAmount: number;
    entity: string;
    itemCount: number;
}

// ==========================================
// USER TYPES
// ==========================================

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    occupation?: 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE';
    role: 'ACCOUNTANT' | 'MANAGER' | 'ADMIN';
    firmName?: string;
    registrationDate: string;
    membershipType: 'FREEMIUM' | 'PRO' | 'ENTERPRISE';
}

// ==========================================
// EXOGENA TYPES
// ==========================================

export interface ThirdPartyIssue {
    nit: string;
    name: string;
    issueType: string;
    description: string;
    suggestedFix: string;
}

export interface TaxCrossCheck {
    concept: string;
    sourceExogena: string;
    valueExogena: number;
    sourceTaxReturn: string;
    valueTaxReturn: number;
    difference: number;
    status: 'OK' | 'RISK' | 'CRITICAL';
}

export interface MinorAmountGroup {
    originalNit: string;
    totalAmount: number;
    concept: string;
    action: string;
}

export interface ExogenaAuditResult {
    stats: {
        totalThirdParties: number;
        processedRecords: number;
        riskScore: number;
    };
    masterDataIssues: ThirdPartyIssue[];
    crossChecks: TaxCrossCheck[];
    minorAmounts: MinorAmountGroup[];
    sanctionPrediction: {
        estimatedFineCOP: number;
        article: string;
        details: string;
    };
}

// ==========================================
// LIQUIDATION TYPES
// ==========================================

export type TerminationReason =
    | 'RENUNCIA'
    | 'DESPIDO_JUSTA_CAUSA'
    | 'DESPIDO_SIN_JUSTA_CAUSA'
    | 'MUTUO_ACUERDO'
    | 'FIN_CONTRATO';

// Tipo de anticipo de prima: por semestre o monto directo
export type TipoPrimaAnticipada = 'SEMESTRE' | 'MONTO';

// Anticipo de prima con opción semestre o monto directo
export interface PrimaAnticipada {
    tipo: TipoPrimaAnticipada;
    semestreJunioPagado: boolean;    // Semestre Ene-Jun (prima de junio)
    semestreDiciembrePagado: boolean; // Semestre Jul-Dic (prima de diciembre)
    montoPagado: number;              // Monto directo si tipo='MONTO'
}

// Colección de anticipos de prestaciones sociales
export interface AnticiposPrestaciones {
    prima: PrimaAnticipada;
    vacacionesPagadas: number;         // Monto de vacaciones ya pagadas
    cesantiasParciales: number;        // Retiro parcial de cesantías
    interesesCesantiasPagados: number; // Intereses de cesantías ya pagados
}

// Deducción personalizada (máximo 5)
export interface DeduccionPersonalizada {
    id: string;
    nombre: string;
    valor: number;
}

// Input completo de anticipos para liquidación
export interface LiquidationAdvancesInput {
    anticipos: AnticiposPrestaciones;
    deduccionesPersonalizadas: DeduccionPersonalizada[];
}

// Valores por defecto para anticipos
export const DEFAULT_ANTICIPOS: AnticiposPrestaciones = {
    prima: {
        tipo: 'MONTO',
        semestreJunioPagado: false,
        semestreDiciembrePagado: false,
        montoPagado: 0
    },
    vacacionesPagadas: 0,
    cesantiasParciales: 0,
    interesesCesantiasPagados: 0
};

export interface LiquidationDeductions {
    loans: number;
    retefuente: number;
    voluntaryContributions: number;
    other: number;
    // Desglose de anticipos de prestaciones
    anticiposPrestaciones: {
        prima: number;
        vacaciones: number;
        cesantias: number;
        interesesCesantias: number;
    };
    // Deducciones personalizadas (máx 5)
    deduccionesPersonalizadas: DeduccionPersonalizada[];
    total: number;
}

export interface LiquidationResult {
    daysWorked: number;
    baseLiquidation: number;

    // Prestaciones con desglose Bruto/Anticipo/Neto
    cesantias: number;               // Valor bruto calculado
    cesantiasAnticipadas: number;    // Anticipo ya pagado
    cesantiasNetas: number;          // Neto = bruto - anticipo

    interesesCesantias: number;
    interesesCesantiasAnticipados: number;
    interesesCesantiasNetos: number;

    prima: number;
    primaAnticipada: number;
    primaNeta: number;

    vacaciones: number;
    vacacionesAnticipadas: number;
    vacacionesNetas: number;

    // Totales
    totalPrestacionesBrutas: number;  // Suma de todas las prestaciones brutas
    totalAnticipos: number;           // Suma de todos los anticipos
    totalPrestaciones: number;        // Netas = brutas - anticipos

    deductions: LiquidationDeductions;
    netToPay: number;
}

export interface LiquidationRecord {
    id: string;
    employeeId: string;
    hireDate: string;
    terminationDate: string;
    terminationReason: TerminationReason | null;
    daysWorked: number;
    calculationData: LiquidationResult;
    netPay: number;
    pdfUrl?: string;
    createdAt: string;
}
