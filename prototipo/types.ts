
export enum RiskLevel {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
}

export interface User {
  name: string;
  email: string;
  phone?: string;
  occupation?: 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE';
  role: 'ACCOUNTANT' | 'MANAGER' | 'ADMIN';
  firmName?: string;
  registrationDate: string;
  membershipType: 'FREEMIUM' | 'PRO' | 'ENTERPRISE';
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
}

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

export interface ClientFolder {
    id: string;
    name: string;
    nit?: string;
    color?: string;
}

export interface ExpenseHistoryItem {
    id: string;
    clientId: string; // Relación con carpeta
    date: string;
    fileName: string;
    totalAmount: number;
    entity: string;
    itemCount: number;
}

export interface UserData {
    employees: PayrollInput[];
    calendarClients: CalendarClientConfig[];
    expenseHistory: ExpenseHistoryItem[];
    clientFolders?: ClientFolder[];
}

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
    employeeDeductions: { health: number; pension: number; solidarityFund: number; subsistenceAccount: number; retencionFuente: number; totalDeductions: number; };
    netPay: number;
    employerCosts: { health: number; pension: number; arl: number; sena: number; icbf: number; compensationBox: number; vacations: number; cesantias: number; interesesCesantias: number; prima: number; totalEmployerCost: number; };
    totals: { grandTotalCost: number; };
}

export interface PayrollResult { monthly: PayrollFinancials; annual: PayrollFinancials; employeeCount?: number; }

export interface CalculadoraProInput {
    contractType: ContractType;
    baseSalary: number;
    hasTransportAid: boolean;
    startDate: string;
    endDate: string;
    paymentPeriodicity: 'MENSUAL' | 'QUINCENAL';
    riskLevel: RiskLevel;
    isParafiscalExempt: boolean;
    isIntegralSalary: boolean;
    daysWorked: number;
    hedHours: number;
    henHours: number;
    rnHours: number;
    domFestHours: number;
    heddfHours: number;
    hendfHours: number;
    incapacityGeneralDays: number;
    incapacityARLDays: number;
    incapacityMaternityDays: number;
    commissions: number;
    salaryBonuses: number;
    nonSalaryBonuses: number;
    loans: number;
    volPensionObligatory: number;
    volPensionVoluntary: number;
    prepaidMedicine: number;
    housingInterest: number;
    hasDependents: boolean;
    otherDeductions: number;
}

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

export interface AdvancedPayrollInput {
    startDate: string;
    endDate: string;
    daysWorked: number;
    baseSalary: number;
    contractType: ContractType;
    applyTransportAid: boolean;
    employeeHealthRate: number;
    employeePensionRate: number;
    isParafiscalExempt: boolean;
    pensionFund: string;
    severanceFund: string;
    riskLevel: RiskLevel;
    applyRetefuente: boolean;
    hedHours: number;
    henHours: number;
    rnHours: number;
    heddfHours: number;
    hendfHours: number;
    commissions: number;
    salaryBonuses: number;
    otherSalaryEarnings: number;
    nonSalaryBonuses: number;
    nonSalaryViaticos: number;
    nonSalaryAuxiliaries: number;
    generalSickDays: number;
    generalSickValueEmployer: number;
    maternityLeaveDays: number;
    unpaidLeaveDays: number;
    arlSickDays: number;
    voluntaryPension: number;
    afc: number;
    hasDependents: boolean;
    housingInterests: number;
    prepaidMedicine: number;
    liens: number;
    companyLoans: number;
    otherDeductions: number;
    daysPrima: number;
    daysCesantias: number;
    daysVacations: number;
    baseVacations: number;
    basePrimaCesantias: number;
    smmlv: number;
    auxTransport: number;
}
