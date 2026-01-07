import { AUX_TRANSPORTE_2026, RISK_LEVEL_RATES, SMMLV_2026, UVT_2026 } from "@/lib/constants";
import { PayrollInput, PayrollResult, PayrollFinancials, RiskLevel, LiquidationResult, LiquidationAdvancesInput, DeduccionPersonalizada } from "@/types/payroll";

// Helper: Calculate Days 360
// Used for Liquidation Logic - Colombian standard (360 days per year, 30 days per month)
export const calculateDays360 = (startDateStr?: string, endDateStr?: string): number => {
    if (!startDateStr || !endDateStr) return 30;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30;

    // Using 360 day logic standard for Colombia Payroll
    const sYear = start.getFullYear();
    const sMonth = start.getMonth() + 1;
    const sDay = start.getDate();

    const eYear = end.getFullYear();
    const eMonth = end.getMonth() + 1;
    const eDay = end.getDate();

    let d1 = sDay;
    let d2 = eDay;

    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;

    const days = ((eYear - sYear) * 360) + ((eMonth - sMonth) * 30) + (d2 - d1) + 1;

    return Math.max(0, days);
};

// Helper: Solidarity Rate 2025
// Acepta smmlv opcional para permitir cálculos con años anteriores
export const getSolidarityRate = (ibc: number, smmlv: number = SMMLV_2026): number => {
    const m = smmlv;
    if (ibc < 4 * m) return 0;
    else if (ibc < 16 * m) return 0.01;
    else if (ibc < 17 * m) return 0.012; // 1.0% + 0.2%
    else if (ibc < 18 * m) return 0.014; // 1.0% + 0.4%
    else if (ibc < 19 * m) return 0.016; // 1.0% + 0.6%
    else if (ibc < 20 * m) return 0.018; // 1.0% + 0.8%
    else return 0.02; // 1.0% + 1.0%
};

// --- STANDARD MODULE CALCULATION ---
export const calculatePayroll = (input: PayrollInput): PayrollResult => {
    // Usar override si está definido, sino usar valores 2026
    const smmlv = input.smmlvOverride ?? SMMLV_2026;
    const auxTransport = input.auxTransporteOverride ?? AUX_TRANSPORTE_2026;

    // Asegurar que baseSalary sea un número válido
    const baseSalary = Number(input.baseSalary) || smmlv;

    // 1. CALCULATE DAYS
    const liquidationDays = calculateDays360(input.startDate, input.endDate);
    const monthlyDays = 30;

    // 1. Recargos y Horas Extras
    const hourValue = baseSalary / 240;
    const valHED = hourValue * 1.25 * (input.hedHours || 0);
    const valHEN = hourValue * 1.75 * (input.henHours || 0);
    const valRN = hourValue * 0.35 * (input.rnHours || 0);
    const valDomFest = hourValue * 1.80 * (input.domFestHours || 0);
    const valHEDDF = hourValue * 2.00 * (input.heddfHours || 0);
    const valHENDF = hourValue * 2.50 * (input.hendfHours || 0);
    const overtimeTotal = valHED + valHEN + valRN + valDomFest + valHEDDF + valHENDF;

    // 2. Variables Salariales
    const variables = (input.commissions || 0) + (input.salaryBonuses || 0);
    const nonSalary = (input.nonSalaryBonuses || 0);

    // 3. Transport Aid
    const transportAid = input.includeTransportAid ? auxTransport : 0;

    // Subtotal Salarial
    const subtotalSalary = baseSalary + overtimeTotal + variables;

    // 4. IBC Calculation
    let ibcRaw = subtotalSalary;
    const totalRemuneration = subtotalSalary + nonSalary;
    const limit40 = totalRemuneration * 0.40;
    const excessNonSalary = Math.max(0, nonSalary - limit40);
    ibcRaw += excessNonSalary;

    const ibc = Math.min(Math.max(ibcRaw, smmlv), smmlv * 25);

    // Total Accrued
    const totalAccrued = subtotalSalary + transportAid + nonSalary;

    // Employee Deductions
    const healthEmp = ibc * 0.04;
    const pensionEmp = ibc * 0.04;
    const fspRate = getSolidarityRate(ibc, smmlv);
    const fsp = ibc * fspRate;

    // --- LOGICA RETENCIÓN EN LA FUENTE ---
    // Extraer valores con defaults usando nullish coalescing
    const inputDedParams = input.deductionsParameters || {};
    const dedParams = {
        housingInterest: inputDedParams.housingInterest ?? 0,
        prepaidMedicine: inputDedParams.prepaidMedicine ?? 0,
        voluntaryPension: inputDedParams.voluntaryPension ?? 0,
        voluntaryPensionExempt: inputDedParams.voluntaryPensionExempt ?? 0,
        afc: inputDedParams.afc ?? 0,
        hasDependents: inputDedParams.hasDependents ?? false,
    };

    let retencion = 0;
    if (input.enableDeductions) {
        // Ingreso Bruto Laboral
        const grossIncome = subtotalSalary;

        // 1. Ingresos No Constitutivos de Renta (INCR)
        const mandatoryContributions = healthEmp + pensionEmp + fsp;
        const incr = mandatoryContributions + dedParams.voluntaryPension;

        // 2. Ingreso Neto (Base para Dependientes)
        const netLaborBase = Math.max(0, grossIncome - mandatoryContributions);
        const netIncome = Math.max(0, grossIncome - incr);

        // 3. Deducciones
        const dedHousing = Math.min(dedParams.housingInterest, 100 * UVT_2026);
        const dedHealth = Math.min(dedParams.prepaidMedicine, 16 * UVT_2026);

        // Dependientes: 10% del Ingreso Laboral Neto
        const rawDependents = netLaborBase * 0.10;
        const dedDependents = dedParams.hasDependents ? Math.min(rawDependents, 32 * UVT_2026) : 0;

        const totalDeductions = dedHousing + dedHealth + dedDependents;

        // 4. Rentas Exentas
        const exemptVoluntary = Math.min(dedParams.voluntaryPensionExempt + dedParams.afc, 316 * UVT_2026);

        // 5. Rentas Exentas de Trabajo (25%)
        const baseFor25 = Math.max(0, netIncome - totalDeductions - exemptVoluntary);
        const limit25Monthly = (790 * UVT_2026) / 12;
        const exempt25 = Math.min(baseFor25 * 0.25, limit25Monthly);

        // 6. Limitación del 40%
        const totalBenefits = totalDeductions + exemptVoluntary + exempt25;
        const limit40Val = netIncome * 0.40;
        const limitUVTAnnual = 1340 * UVT_2026;
        const limitUVTMonthly = limitUVTAnnual / 12;

        const taxableBaseCOP = Math.max(0, netIncome - Math.min(totalBenefits, limit40Val, limitUVTMonthly));
        const taxableBaseUVT = taxableBaseCOP / UVT_2026;

        // Tabla Art. 383 E.T. 2025
        let retentionUVT = 0;
        if (taxableBaseUVT > 95 && taxableBaseUVT <= 150) retentionUVT = (taxableBaseUVT - 95) * 0.19;
        else if (taxableBaseUVT > 150 && taxableBaseUVT <= 360) retentionUVT = (taxableBaseUVT - 150) * 0.28 + 10;
        else if (taxableBaseUVT > 360 && taxableBaseUVT <= 640) retentionUVT = (taxableBaseUVT - 360) * 0.33 + 69;
        else if (taxableBaseUVT > 640 && taxableBaseUVT <= 945) retentionUVT = (taxableBaseUVT - 640) * 0.35 + 162;
        else if (taxableBaseUVT > 945 && taxableBaseUVT <= 2300) retentionUVT = (taxableBaseUVT - 945) * 0.37 + 268;
        else if (taxableBaseUVT > 2300) retentionUVT = (taxableBaseUVT - 2300) * 0.39 + 770;

        retencion = Math.round(retentionUVT * UVT_2026);
    }

    // Total Deductions
    const deductionsFromPay = dedParams.voluntaryPension + dedParams.voluntaryPensionExempt + dedParams.afc;
    const additionalDeductions = (input.loans || 0) + (input.otherDeductions || 0);

    const totalDeductionsEmp = healthEmp + pensionEmp + fsp + retencion + deductionsFromPay + additionalDeductions;
    const netPay = totalAccrued - totalDeductionsEmp;

    // Employer Costs
    const isExempt = input.isExempt && (subtotalSalary < 10 * smmlv);

    const healthComp = isExempt ? 0 : ibc * 0.085;
    const pensionComp = ibc * 0.12;
    // Asegurar que riskLevel tenga un valor válido, usar Nivel I como fallback
    const arlRate = RISK_LEVEL_RATES[input.riskLevel] ?? RISK_LEVEL_RATES[RiskLevel.I];
    const arlComp = ibc * arlRate;

    const baseParafiscal = subtotalSalary + nonSalary;

    const sena = isExempt ? 0 : baseParafiscal * 0.02;
    const icbf = isExempt ? 0 : baseParafiscal * 0.03;
    const ccf = baseParafiscal * 0.04;

    // Provisions
    const basePrestacionesMonthly = subtotalSalary + transportAid;
    const cesantiasMonthly = basePrestacionesMonthly * 0.0833;
    const intCesantiasMonthly = cesantiasMonthly * 0.12;
    const primaMonthly = basePrestacionesMonthly * 0.0833;
    const vacationsMonthly = subtotalSalary * 0.0417;

    const totalEmployerCostMonthly = totalAccrued + healthComp + pensionComp + arlComp + sena + icbf + ccf + cesantiasMonthly + intCesantiasMonthly + primaMonthly + vacationsMonthly;

    const monthly: PayrollFinancials = {
        salaryData: {
            baseSalary,
            transportAid,
            totalAccrued,
            daysWorked: monthlyDays,
            overtime: overtimeTotal,
            variables,
            nonSalary
        },
        employeeDeductions: {
            health: healthEmp,
            pension: pensionEmp,
            solidarityFund: fsp,
            subsistenceAccount: 0,
            retencionFuente: retencion,
            totalDeductions: totalDeductionsEmp
        },
        netPay,
        employerCosts: {
            health: healthComp,
            pension: pensionComp,
            arl: arlComp,
            sena,
            icbf,
            compensationBox: ccf,
            vacations: vacationsMonthly,
            cesantias: cesantiasMonthly,
            interesesCesantias: intCesantiasMonthly,
            prima: primaMonthly,
            totalEmployerCost: totalEmployerCostMonthly
        },
        totals: {
            grandTotalCost: totalEmployerCostMonthly
        }
    };

    // --- LIQUIDATION PROVISIONS (Based on Actual Days) ---
    const cesantiasTotal = (basePrestacionesMonthly * liquidationDays) / 360;
    const intCesantiasTotal = (cesantiasTotal * liquidationDays * 0.12) / 360;
    const primaTotal = (basePrestacionesMonthly * liquidationDays) / 360;
    const vacationsTotal = (subtotalSalary * liquidationDays) / 720;

    const annual: PayrollFinancials = {
        ...monthly,
        salaryData: {
            ...monthly.salaryData,
            daysWorked: liquidationDays
        },
        employerCosts: {
            ...monthly.employerCosts,
            cesantias: cesantiasTotal,
            interesesCesantias: intCesantiasTotal,
            prima: primaTotal,
            vacations: vacationsTotal
        }
    };

    return {
        monthly,
        annual,
        employeeCount: 1
    };
};

export const calculateGroupPayroll = (employees: PayrollInput[]) => {
    return { monthly: {} as PayrollFinancials, annual: {} as PayrollFinancials, employeeCount: employees.length };
};

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

// Helper function to create a new employee with default values
export const createDefaultEmployee = (index: number = 1): PayrollInput => ({
    id: crypto.randomUUID(),
    employerType: 'JURIDICA',
    companyName: '',
    companyNit: '',
    name: `Empleado ${index}`,
    documentNumber: '',
    jobTitle: '',
    contractType: 'INDEFINIDO',
    baseSalary: SMMLV_2026,
    riskLevel: RiskLevel.I,
    isExempt: true,
    includeTransportAid: true,
    startDate: '2025-01-01',
    endDate: '2025-01-30',
    enableDeductions: false,
    deductionsParameters: {
        housingInterest: 0,
        prepaidMedicine: 0,
        voluntaryPension: 0,
        voluntaryPensionExempt: 0,
        afc: 0,
        hasDependents: false
    },
    hedHours: 0,
    henHours: 0,
    rnHours: 0,
    domFestHours: 0,
    heddfHours: 0,
    hendfHours: 0,
    commissions: 0,
    salaryBonuses: 0,
    nonSalaryBonuses: 0,
    loans: 0,
    otherDeductions: 0
});

// ==========================================
// LIQUIDATION CALCULATION
// ==========================================

/**
 * Calculates employee termination settlement (Liquidación)
 * Uses Colombian labor law formulas for:
 * - Cesantías: (Base × Days) / 360
 * - Intereses Cesantías: (Cesantías × Days × 12%) / 360
 * - Prima de Servicios: (Base × Days) / 360
 * - Vacaciones: (Salary × Days) / 720 (without transport aid)
 *
 * Supports advances (anticipos) for each benefit type:
 * - Prima: by semester or direct amount
 * - Vacaciones, Cesantías, Intereses: direct amounts
 * - Custom deductions: up to 5 named deductions
 */
export const calculateLiquidation = (
    input: PayrollInput,
    payrollResult: PayrollResult,
    advances?: LiquidationAdvancesInput
): LiquidationResult => {
    // Usar override si está definido, sino usar valores 2026
    const smmlv = input.smmlvOverride ?? SMMLV_2026;
    const auxTransport = input.auxTransporteOverride ?? AUX_TRANSPORTE_2026;

    // Calculate actual days worked using 360-day system
    const daysWorked = calculateDays360(input.startDate, input.endDate);

    // Base salary components
    const baseSalary = Number(input.baseSalary) || smmlv;
    const transportAid = input.includeTransportAid ? auxTransport : 0;

    // Overtime and variables from monthly calculation
    const overtime = payrollResult.monthly.salaryData.overtime || 0;
    const variables = payrollResult.monthly.salaryData.variables || 0;

    // Base for benefits calculation (includes transport aid for cesantías and prima)
    const basePrestaciones = baseSalary + transportAid + overtime + variables;

    // Colombian labor law formulas - GROSS values
    const cesantias = (basePrestaciones * daysWorked) / 360;
    const interesesCesantias = (cesantias * daysWorked * 0.12) / 360;
    const prima = (basePrestaciones * daysWorked) / 360;
    // Vacations do NOT include transport aid
    const vacaciones = (baseSalary * daysWorked) / 720;

    // ==========================================
    // ANTICIPOS DE PRESTACIONES
    // ==========================================

    // Calcular anticipo de prima (por semestre o monto directo)
    let primaAnticipada = 0;
    if (advances?.anticipos?.prima) {
        const primaConfig = advances.anticipos.prima;
        if (primaConfig.tipo === 'MONTO') {
            primaAnticipada = primaConfig.montoPagado || 0;
        } else {
            // Calcular por semestre: cada semestre equivale a medio año de prima
            // Valor semestre = (basePrestaciones * 180) / 360 = basePrestaciones / 2
            const valorSemestre = basePrestaciones / 2;
            if (primaConfig.semestreJunioPagado) primaAnticipada += valorSemestre;
            if (primaConfig.semestreDiciembrePagado) primaAnticipada += valorSemestre;
        }
    }

    // Otros anticipos (montos directos)
    const vacacionesAnticipadas = advances?.anticipos?.vacacionesPagadas || 0;
    const cesantiasAnticipadas = advances?.anticipos?.cesantiasParciales || 0;
    const interesesCesantiasAnticipados = advances?.anticipos?.interesesCesantiasPagados || 0;

    // Calcular valores NETOS (bruto - anticipo, mínimo 0)
    const cesantiasNetas = Math.max(0, cesantias - cesantiasAnticipadas);
    const interesesCesantiasNetos = Math.max(0, interesesCesantias - interesesCesantiasAnticipados);
    const primaNeta = Math.max(0, prima - primaAnticipada);
    const vacacionesNetas = Math.max(0, vacaciones - vacacionesAnticipadas);

    // Totales de prestaciones
    const totalAnticipos = primaAnticipada + vacacionesAnticipadas +
                           cesantiasAnticipadas + interesesCesantiasAnticipados;
    const totalPrestacionesBrutas = cesantias + interesesCesantias + prima + vacaciones;
    const totalPrestaciones = cesantiasNetas + interesesCesantiasNetos + primaNeta + vacacionesNetas;

    // ==========================================
    // DEDUCCIONES
    // ==========================================

    // Deducciones estándar
    const loans = input.loans || 0;
    const retefuente = payrollResult.monthly.employeeDeductions.retencionFuente;
    const dedParams = input.deductionsParameters || {
        voluntaryPension: 0,
        voluntaryPensionExempt: 0,
        afc: 0,
        housingInterest: 0,
        prepaidMedicine: 0,
        hasDependents: false
    };
    const voluntaryContributions =
        (dedParams.voluntaryPension || 0) +
        (dedParams.voluntaryPensionExempt || 0) +
        (dedParams.afc || 0);
    const otherDeductions = input.otherDeductions || 0;

    // Deducciones personalizadas (máx 5)
    const deduccionesPersonalizadas: DeduccionPersonalizada[] = advances?.deduccionesPersonalizadas || [];
    const totalDeduccionesPersonalizadas = deduccionesPersonalizadas.reduce(
        (sum, d) => sum + (d.valor || 0), 0
    );

    // Total de todas las deducciones
    const totalDeductions = loans + retefuente + voluntaryContributions +
                            otherDeductions + totalDeduccionesPersonalizadas;

    // Neto a pagar = prestaciones netas - deducciones
    const netToPay = totalPrestaciones - totalDeductions;

    return {
        daysWorked,
        baseLiquidation: basePrestaciones,

        // Desglose por prestación: Bruto / Anticipo / Neto
        cesantias,
        cesantiasAnticipadas,
        cesantiasNetas,

        interesesCesantias,
        interesesCesantiasAnticipados,
        interesesCesantiasNetos,

        prima,
        primaAnticipada,
        primaNeta,

        vacaciones,
        vacacionesAnticipadas,
        vacacionesNetas,

        // Totales
        totalPrestacionesBrutas,
        totalAnticipos,
        totalPrestaciones,

        deductions: {
            loans,
            retefuente,
            voluntaryContributions,
            other: otherDeductions,
            anticiposPrestaciones: {
                prima: primaAnticipada,
                vacaciones: vacacionesAnticipadas,
                cesantias: cesantiasAnticipadas,
                interesesCesantias: interesesCesantiasAnticipados,
            },
            deduccionesPersonalizadas,
            total: totalDeductions
        },
        netToPay: Math.max(0, netToPay) // Ensure non-negative
    };
};
