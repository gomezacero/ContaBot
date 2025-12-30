import { RiskLevel } from "@/types/payroll";

// 2026 Official Values
export const SMMLV_2026 = 1750905;
export const AUX_TRANSPORTE_2026 = 249095;
export const UVT_2026 = 49799; // Art. 1.2.1 Resolución 000227 DIAN (2025)

// Regulatory References
export const DIAN_RESOLUTION_REF = "Resolución 000227 del 23 SEP 2025";

// Currency & Exchange Rates (Estimates)
export const TRM_USD = 4150; // COP per USD
export const TRM_MXN = 20.5; // MXN per USD
export const TRM_CLP = 950;  // CLP per USD
export const TRM_BRL = 5.8;  // BRL per USD

export const PERCENTAGES = {
    EMPLOYEE: {
        HEALTH: 0.04,
        PENSION: 0.04,
    },
    EMPLOYER: {
        HEALTH: 0.085,
        PENSION: 0.12,
        CAJA: 0.04,
        ICBF: 0.03,
        SENA: 0.02,
        // Provision Rates (NIIF Accrual)
        VACATIONS: 0.0417, // 15 days per year
        CESANTIAS: 0.0833, // 1 salary per year
        INTERESES_CESANTIAS: 0.01, // 1% monthly of the base (equivalent to 12% of Cesantias yearly)
        PRIMA: 0.0833, // 1 salary per year (paid biannually)
    },
};

export const RISK_LEVEL_RATES: Record<RiskLevel, number> = {
    [RiskLevel.I]: 0.00522,
    [RiskLevel.II]: 0.01044,
    [RiskLevel.III]: 0.02436,
    [RiskLevel.IV]: 0.04350,
    [RiskLevel.V]: 0.06960,
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
    [RiskLevel.I]: "Riesgo I (Oficina, Administrativo) - 0.522%",
    [RiskLevel.II]: "Riesgo II (Manufactura ligera, Ventas) - 1.044%",
    [RiskLevel.III]: "Riesgo III (Procesos industriales) - 2.436%",
    [RiskLevel.IV]: "Riesgo IV (Transporte, Construcción) - 4.350%",
    [RiskLevel.V]: "Riesgo V (Bomberos, Alto riesgo) - 6.960%",
};

// Tabla Retención en la Fuente 2025 - Art. 383 E.T. (Rangos en UVT)
export const RETENTION_TABLE_2025 = [
    { min: 0, max: 95, rate: 0, deduction: 0 },
    { min: 95, max: 150, rate: 0.19, deduction: 0 },
    { min: 150, max: 360, rate: 0.28, deduction: 10 },
    { min: 360, max: 640, rate: 0.33, deduction: 69 },
    { min: 640, max: 945, rate: 0.35, deduction: 162 },
    { min: 945, max: 2300, rate: 0.37, deduction: 268 },
    { min: 2300, max: 999999, rate: 0.39, deduction: 770 },
];

// Límites UVT para Deducciones de Retención en la Fuente 2025
export const DEDUCTION_LIMITS_UVT = {
    HOUSING_INTEREST: 100,       // Intereses vivienda (máx 100 UVT mensuales)
    PREPAID_MEDICINE: 16,        // Medicina prepagada (máx 16 UVT mensuales)
    DEPENDENTS: 32,              // Dependientes 10% ingreso neto (máx 32 UVT mensuales)
    VOLUNTARY_EXEMPT: 316,       // Aportes vol. renta exenta (máx 316 UVT anuales)
    EXEMPT_25_ANNUAL: 790,       // 25% Renta exenta (máx 790 UVT anuales)
    TOTAL_BENEFITS_ANNUAL: 1340, // Límite total beneficios tributarios (máx 1340 UVT anuales)
};

// Motivos de Terminación de Contrato Laboral
export const TERMINATION_REASONS = {
    RENUNCIA: 'Renuncia voluntaria',
    DESPIDO_JUSTA_CAUSA: 'Despido con justa causa',
    DESPIDO_SIN_JUSTA_CAUSA: 'Despido sin justa causa',
    MUTUO_ACUERDO: 'Terminación de mutuo acuerdo',
    FIN_CONTRATO: 'Terminación de contrato a término fijo',
} as const;

// Tax Calendar Constants
export const SECTORAL_TAXES = [
    "ICA (Anual)",
    "ICA (Bimestral)",
    "ReteICA",
    "Impoconsumo",
    "Impuesto al Carbono",
    "Sobretasa Bomberil",
    "Estampilla Pro-Cultura",
    "Contribución Turismo"
];

export const AVAILABLE_ALERT_DAYS = [30, 15, 7, 3, 1];
