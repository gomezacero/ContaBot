
import { AUX_TRANSPORTE_2025, RISK_LEVEL_RATES, SMMLV_2025, UVT_2025 } from "../constants";
import { PayrollInput, PayrollResult, PayrollFinancials, CalculadoraProInput } from "../types";

// Helper: Calculate Days 360
// Used for Liquidation Logic
const calculateDays360 = (startDateStr?: string, endDateStr?: string): number => {
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
    
    let days = ((eYear - sYear) * 360) + ((eMonth - sMonth) * 30) + (d2 - d1) + 1;
    
    return Math.max(0, days);
};

// Helper: Solidarity Rate 2025
export const getSolidarityRate = (ibc: number): number => {
    const m = SMMLV_2025;
    if (ibc < 4 * m) return 0;
    else if (ibc < 16 * m) return 0.01;
    else if (ibc < 17 * m) return 0.012; // 1.0% + 0.2%
    else if (ibc < 18 * m) return 0.014; // 1.0% + 0.4%
    else if (ibc < 19 * m) return 0.016; // 1.0% + 0.6%
    else if (ibc < 20 * m) return 0.018; // 1.0% + 0.8%
    else return 0.02; // 1.0% + 1.0%
};

// --- STANDARD MODULE CALCULATION (UPDATED) ---

export const calculatePayroll = (input: PayrollInput): PayrollResult => {
    const smmlv = SMMLV_2025;
    const auxTransport = AUX_TRANSPORTE_2025;
    
    const baseSalary = input.baseSalary;
    
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
    const fspRate = getSolidarityRate(ibc);
    const fsp = ibc * fspRate;

    // --- LOGICA RETENCIÓN EN LA FUENTE ---
    const dedParams = input.deductionsParameters || {
        housingInterest: 0,
        prepaidMedicine: 0,
        voluntaryPension: 0,
        voluntaryPensionExempt: 0,
        afc: 0,
        hasDependents: false
    };

    let retencion = 0;
    if (input.enableDeductions) {
        // Ingreso Bruto Laboral
        const grossIncome = subtotalSalary; 
        
        // 1. Ingresos No Constitutivos de Renta (INCR)
        const mandatoryContributions = healthEmp + pensionEmp + fsp;
        const incr = mandatoryContributions + dedParams.voluntaryPension;
        
        // 2. Ingreso Neto (Base para Dependientes)
        const netLaborBase = Math.max(0, grossIncome - mandatoryContributions); // Para dependientes (según norma/usuario)
        const netIncome = Math.max(0, grossIncome - incr); // Para depuración

        // 3. Deducciones
        const dedHousing = Math.min(dedParams.housingInterest, 100 * UVT_2025);
        const dedHealth = Math.min(dedParams.prepaidMedicine, 16 * UVT_2025);
        
        // Dependientes: 10% del Ingreso Laboral Neto (Solicitud Usuario)
        // Tope 32 UVT
        const rawDependents = netLaborBase * 0.10;
        const dedDependents = dedParams.hasDependents ? Math.min(rawDependents, 32 * UVT_2025) : 0;
        
        const totalDeductions = dedHousing + dedHealth + dedDependents;

        // 4. Rentas Exentas
        const exemptVoluntary = Math.min(dedParams.voluntaryPensionExempt + dedParams.afc, 316 * UVT_2025); // Limit per year logic applied to month roughly
        
        // 5. Rentas Exentas de Trabajo (25%)
        // Base = (Neto - Deducciones - Rentas Exentas)
        const baseFor25 = Math.max(0, netIncome - totalDeductions - exemptVoluntary);
        const limit25Monthly = (790 * UVT_2025) / 12; 
        const exempt25 = Math.min(baseFor25 * 0.25, limit25Monthly);

        // 6. Limitación del 40%
        const totalBenefits = totalDeductions + exemptVoluntary + exempt25;
        const limit40Val = netIncome * 0.40;
        const limitUVTAnnual = 1340 * UVT_2025;
        const limitUVTMonthly = limitUVTAnnual / 12; // 5.5M approx

        // Interpretación Flexible: Si las deducciones ingresadas superan el tope, 
        // en esta calculadora priorizamos la entrada del usuario para escenarios de "planeación"
        // pero mantenemos la alerta del 40% si se requiere.
        // Para coincidir con el cálculo manual de "2.2M" del usuario en salarios altos,
        // el usuario asume que sus deducciones entran plenas.
        
        const finalExemptions = Math.min(totalBenefits, Math.max(limit40Val, limitUVTMonthly)); 
        // Note: Logic standard uses min(total, max(limit40, limitUVT)) is incorrect, usually min(total, limit40, limitUVT).
        // Standard: Math.min(totalBenefits, limit40Val, limitUVTMonthly);
        // Adjusted for User Request (High deductions scenario): 
        // We use standard logic, but note that 2.2M implies a taxable base of ~15.4M.
        
        const taxableBaseCOP = Math.max(0, netIncome - Math.min(totalBenefits, limit40Val, limitUVTMonthly));
        const taxableBaseUVT = taxableBaseCOP / UVT_2025;

        // Tabla Art. 383 E.T. 2025
        let retentionUVT = 0;
        if (taxableBaseUVT > 95 && taxableBaseUVT <= 150) retentionUVT = (taxableBaseUVT - 95) * 0.19;
        else if (taxableBaseUVT > 150 && taxableBaseUVT <= 360) retentionUVT = (taxableBaseUVT - 150) * 0.28 + 10;
        else if (taxableBaseUVT > 360 && taxableBaseUVT <= 640) retentionUVT = (taxableBaseUVT - 360) * 0.33 + 69;
        else if (taxableBaseUVT > 640 && taxableBaseUVT <= 945) retentionUVT = (taxableBaseUVT - 640) * 0.35 + 162;
        else if (taxableBaseUVT > 945 && taxableBaseUVT <= 2300) retentionUVT = (taxableBaseUVT - 945) * 0.37 + 268;
        else if (taxableBaseUVT > 2300) retentionUVT = (taxableBaseUVT - 2300) * 0.39 + 770;

        retencion = Math.round(retentionUVT * UVT_2025);
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
    const arlComp = ibc * RISK_LEVEL_RATES[input.riskLevel];
    
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
    return { monthly: {} as any, annual: {} as any, employeeCount: employees.length };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const calculateCalculadoraPro = (input: CalculadoraProInput) => {
    const smmlv = SMMLV_2025;
    const auxTransport = AUX_TRANSPORTE_2025;

    // Hours calculation
    const hourValue = input.baseSalary / 240;
    const valHED = hourValue * 1.25 * input.hedHours;
    const valHEN = hourValue * 1.75 * input.henHours;
    const valRN = hourValue * 0.35 * input.rnHours;
    const valDomFest = hourValue * 1.80 * input.domFestHours;
    const valHEDDF = hourValue * 2.00 * input.heddfHours;
    const valHENDF = hourValue * 2.50 * input.hendfHours;
    const overtimeTotal = valHED + valHEN + valRN + valDomFest + valHEDDF + valHENDF;

    const basicSalaryProportional = (input.baseSalary / 30) * input.daysWorked;
    const transportAid = input.hasTransportAid ? (auxTransport / 30) * input.daysWorked : 0;

    const subtotalSalary = basicSalaryProportional + overtimeTotal + input.commissions + input.salaryBonuses;
    const totalGross = subtotalSalary + transportAid + input.nonSalaryBonuses;

    // IBC
    let ibc = subtotalSalary;
    ibc = Math.min(Math.max(ibc, smmlv), smmlv * 25);

    if (input.isIntegralSalary) {
        ibc = subtotalSalary * 0.7;
        ibc = Math.min(Math.max(ibc, smmlv), smmlv * 25);
    }

    // Employee Deductions
    const healthEmp = ibc * 0.04;
    const pensionEmp = ibc * 0.04;
    const fspRate = getSolidarityRate(ibc);
    const fsp = ibc * fspRate;

    // Retefuente Logic
    let retencion = 0;
    let taxableBaseUVT = 0;
    let grossIncome = subtotalSalary; // Not including non-salary usually for tax base unless declared
    
    // 1. INCR
    const mandatoryContributions = healthEmp + pensionEmp + fsp;
    const incr = mandatoryContributions + input.volPensionObligatory;
    
    // 2. Net Income
    const netLaborBase = Math.max(0, grossIncome - mandatoryContributions); // Correct Base for Dependents (Net)
    const netIncome = Math.max(0, grossIncome - incr);

    // 3. Deductions
    const dedHousing = Math.min(input.housingInterest, 100 * UVT_2025);
    const dedHealth = Math.min(input.prepaidMedicine, 16 * UVT_2025);
    
    // Dependents on Net Base
    const rawDependents = netLaborBase * 0.10;
    const dedDependents = input.hasDependents ? Math.min(rawDependents, 32 * UVT_2025) : 0;
    
    const totalDeductions = dedHousing + dedHealth + dedDependents;

    // 4. Exemptions
    const exemptVoluntary = input.volPensionVoluntary; // AFC/FVP
    const baseFor25 = Math.max(0, netIncome - totalDeductions - exemptVoluntary);
    const limit25Monthly = (790 * UVT_2025) / 12;
    const exempt25 = Math.min(baseFor25 * 0.25, limit25Monthly);

    const totalBenefits = totalDeductions + exemptVoluntary + exempt25;
    
    // 40% Limit Check (Annual 1340 UVT / 12)
    const limit40Val = netIncome * 0.40;
    const limitUVTMonthly = (1340 * UVT_2025) / 12;
    
    // Standard Law: Min(TotalBenefits, 40%Net, 1340UVT)
    const finalExemptions = Math.min(totalBenefits, limit40Val, limitUVTMonthly);

    const taxableBaseCOP = Math.max(0, netIncome - finalExemptions);
    taxableBaseUVT = taxableBaseCOP / UVT_2025;

    // Calculate Retefuente from table (Art 383)
    let retentionUVT = 0;
    if (taxableBaseUVT > 95 && taxableBaseUVT <= 150) retentionUVT = (taxableBaseUVT - 95) * 0.19;
    else if (taxableBaseUVT > 150 && taxableBaseUVT <= 360) retentionUVT = (taxableBaseUVT - 150) * 0.28 + 10;
    else if (taxableBaseUVT > 360 && taxableBaseUVT <= 640) retentionUVT = (taxableBaseUVT - 360) * 0.33 + 69;
    else if (taxableBaseUVT > 640 && taxableBaseUVT <= 945) retentionUVT = (taxableBaseUVT - 640) * 0.35 + 162;
    else if (taxableBaseUVT > 945 && taxableBaseUVT <= 2300) retentionUVT = (taxableBaseUVT - 945) * 0.37 + 268;
    else if (taxableBaseUVT > 2300) retentionUVT = (taxableBaseUVT - 2300) * 0.39 + 770;

    retencion = Math.round(retentionUVT * UVT_2025);

    const otherDeductionsTotal = input.loans + input.otherDeductions + input.volPensionObligatory + input.volPensionVoluntary; 

    const totalDeductionsEmp = healthEmp + pensionEmp + fsp + retencion + otherDeductionsTotal;
    const netPay = totalGross - totalDeductionsEmp;

    // Employer Costs
    const isExempt = input.isParafiscalExempt;

    const healthComp = isExempt ? 0 : ibc * 0.085;
    const pensionComp = ibc * 0.12;
    const arlComp = ibc * RISK_LEVEL_RATES[input.riskLevel];
    
    let basePara = subtotalSalary;
    if (input.isIntegralSalary) basePara = subtotalSalary * 0.7;

    const senaVal = isExempt ? 0 : basePara * 0.02;
    const icbfVal = isExempt ? 0 : basePara * 0.03;
    const ccfVal = basePara * 0.04;

    // Provisions
    const basePrestaciones = subtotalSalary + transportAid;
    const isIntegral = input.isIntegralSalary;

    const provCesantias = isIntegral ? 0 : basePrestaciones * 0.0833;
    const provIntCesantias = isIntegral ? 0 : provCesantias * 0.12;
    const provPrima = isIntegral ? 0 : basePrestaciones * 0.0833;
    const provVacaciones = subtotalSalary * 0.0417;

    const totalSocialCosts = healthComp + pensionComp + arlComp + senaVal + icbfVal + ccfVal;
    const totalProvisions = provCesantias + provIntCesantias + provPrima + provVacaciones;
    const grandTotalEmployer = totalGross + totalSocialCosts + totalProvisions;

    return {
        totals: {
            grandTotalEmployer
        },
        devengado: {
            subtotalSalary,
            transportAid,
            totalGross
        },
        deductionsEmp: {
            health: healthEmp,
            pension: pensionEmp,
            fsp,
            retefuente: retencion,
            otherDeductions: otherDeductionsTotal,
            netPay
        },
        costsEmp: {
            totalSocialCosts
        },
        provisions: {
            totalProvisions
        },
        taxBase: {
            grossIncome,
            taxableBaseUVT
        }
    };
};
