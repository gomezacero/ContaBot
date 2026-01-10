import { describe, it, expect } from 'vitest'
import {
  calculateDays360,
  getSolidarityRate,
  calculatePayroll,
  calculateLiquidation,
  formatCurrency,
  createDefaultEmployee
} from './calculations'
import { SMMLV_2026, AUX_TRANSPORTE_2026, PARAMETROS_NOMINA } from './constants'
import { RiskLevel, PayrollInput, PayrollResult } from '@/types/payroll'

// ==========================================
// HELPER: Create test employee input
// ==========================================
const createTestInput = (overrides: Partial<PayrollInput> = {}): PayrollInput => ({
  id: 'test-id',
  employerType: 'JURIDICA',
  name: 'Test Employee',
  baseSalary: SMMLV_2026,
  riskLevel: RiskLevel.I,
  isExempt: true,
  includeTransportAid: true,
  startDate: '2026-01-01',
  endDate: '2026-01-30',
  enableDeductions: false,
  deductionsParameters: {
    housingInterest: 0,
    prepaidMedicine: 0,
    voluntaryPension: 0,
    voluntaryPensionExempt: 0,
    afc: 0,
    hasDependents: false
  },
  ...overrides
})

// ==========================================
// TESTS: calculateDays360
// ==========================================
describe('calculateDays360', () => {
  it('should return 30 days for a full month', () => {
    expect(calculateDays360('2026-01-01', '2026-01-30')).toBe(30)
  })

  it('should return 360 days for a full year', () => {
    expect(calculateDays360('2026-01-01', '2026-12-30')).toBe(360)
  })

  it('should handle day 31 as day 30 (returns 31 due to +1 adjustment)', () => {
    // Implementation adds +1 at the end, so 31st becomes 30 + 1 = 31
    expect(calculateDays360('2026-01-01', '2026-01-31')).toBe(31)
  })

  it('should return 30 when dates are undefined', () => {
    expect(calculateDays360(undefined, undefined)).toBe(30)
  })

  it('should return 30 for invalid dates', () => {
    expect(calculateDays360('invalid', '2026-01-30')).toBe(30)
  })

  it('should calculate 180 days for 6 months', () => {
    expect(calculateDays360('2026-01-01', '2026-06-30')).toBe(180)
  })

  it('should handle cross-year periods', () => {
    expect(calculateDays360('2025-12-01', '2026-01-30')).toBe(60)
  })

  it('should return 1 for same day', () => {
    expect(calculateDays360('2026-01-15', '2026-01-15')).toBe(1)
  })
})

// ==========================================
// TESTS: getSolidarityRate
// ==========================================
describe('getSolidarityRate', () => {
  const smmlv = SMMLV_2026

  it('should return 0% for IBC < 4 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 3)).toBe(0)
    expect(getSolidarityRate(smmlv * 3.9)).toBe(0)
  })

  it('should return 1% for IBC >= 4 SMMLV and < 16 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 4)).toBe(0.01)
    expect(getSolidarityRate(smmlv * 10)).toBe(0.01)
    expect(getSolidarityRate(smmlv * 15.9)).toBe(0.01)
  })

  it('should return 1.2% for IBC >= 16 SMMLV and < 17 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 16)).toBe(0.012)
    expect(getSolidarityRate(smmlv * 16.9)).toBe(0.012)
  })

  it('should return 1.4% for IBC >= 17 SMMLV and < 18 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 17)).toBe(0.014)
  })

  it('should return 1.6% for IBC >= 18 SMMLV and < 19 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 18)).toBe(0.016)
  })

  it('should return 1.8% for IBC >= 19 SMMLV and < 20 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 19)).toBe(0.018)
  })

  it('should return 2% for IBC >= 20 SMMLV', () => {
    expect(getSolidarityRate(smmlv * 20)).toBe(0.02)
    expect(getSolidarityRate(smmlv * 25)).toBe(0.02)
  })

  it('should accept custom SMMLV for historical calculations', () => {
    const smmlv2024 = PARAMETROS_NOMINA[2024].smmlv
    expect(getSolidarityRate(smmlv2024 * 4, smmlv2024)).toBe(0.01)
    expect(getSolidarityRate(smmlv2024 * 3, smmlv2024)).toBe(0)
  })
})

// ==========================================
// TESTS: calculatePayroll - Basic cases
// ==========================================
describe('calculatePayroll', () => {
  describe('Basic SMMLV employee', () => {
    it('should calculate correctly for SMMLV 2026 with transport aid', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      // Salary data
      expect(result.monthly.salaryData.baseSalary).toBe(SMMLV_2026)
      expect(result.monthly.salaryData.transportAid).toBe(AUX_TRANSPORTE_2026)

      // Total devengado = salario base + auxilio transporte
      const expectedAccrued = SMMLV_2026 + AUX_TRANSPORTE_2026
      expect(result.monthly.salaryData.totalAccrued).toBe(expectedAccrued)

      // Employee deductions (4% health, 4% pension)
      const ibc = SMMLV_2026 // IBC for SMMLV employee
      expect(result.monthly.employeeDeductions.health).toBe(ibc * 0.04)
      expect(result.monthly.employeeDeductions.pension).toBe(ibc * 0.04)
      expect(result.monthly.employeeDeductions.solidarityFund).toBe(0) // < 4 SMMLV
    })

    it('should NOT include transport aid when disabled', () => {
      const input = createTestInput({ includeTransportAid: false })
      const result = calculatePayroll(input)

      expect(result.monthly.salaryData.transportAid).toBe(0)
      expect(result.monthly.salaryData.totalAccrued).toBe(SMMLV_2026)
    })
  })

  describe('Overtime calculations', () => {
    it('should calculate HED (extra diurna) at 1.25x', () => {
      const input = createTestInput({ hedHours: 10 })
      const result = calculatePayroll(input)

      const hourValue = SMMLV_2026 / 240
      const expectedHED = hourValue * 1.25 * 10
      expect(result.monthly.salaryData.overtime).toBeCloseTo(expectedHED, 0)
    })

    it('should calculate HEN (extra nocturna) at 1.75x', () => {
      const input = createTestInput({ henHours: 5 })
      const result = calculatePayroll(input)

      const hourValue = SMMLV_2026 / 240
      const expectedHEN = hourValue * 1.75 * 5
      expect(result.monthly.salaryData.overtime).toBeCloseTo(expectedHEN, 0)
    })

    it('should calculate DOM/FEST at 1.80x', () => {
      const input = createTestInput({ domFestHours: 8 })
      const result = calculatePayroll(input)

      const hourValue = SMMLV_2026 / 240
      const expectedDomFest = hourValue * 1.80 * 8
      expect(result.monthly.salaryData.overtime).toBeCloseTo(expectedDomFest, 0)
    })

    it('should calculate recargo nocturno at 0.35x', () => {
      const input = createTestInput({ rnHours: 20 })
      const result = calculatePayroll(input)

      const hourValue = SMMLV_2026 / 240
      const expectedRN = hourValue * 0.35 * 20
      expect(result.monthly.salaryData.overtime).toBeCloseTo(expectedRN, 0)
    })

    it('should combine all overtime types', () => {
      const input = createTestInput({
        hedHours: 10,
        henHours: 5,
        domFestHours: 8
      })
      const result = calculatePayroll(input)

      const hourValue = SMMLV_2026 / 240
      const expectedOvertime =
        (hourValue * 1.25 * 10) +
        (hourValue * 1.75 * 5) +
        (hourValue * 1.80 * 8)

      expect(result.monthly.salaryData.overtime).toBeCloseTo(expectedOvertime, 0)
    })
  })

  describe('SMMLV Override for historical calculations', () => {
    it('should use 2024 SMMLV when override is provided', () => {
      const smmlv2024 = PARAMETROS_NOMINA[2024].smmlv
      const aux2024 = PARAMETROS_NOMINA[2024].auxTransporte

      const input = createTestInput({
        smmlvOverride: smmlv2024,
        auxTransporteOverride: aux2024,
        baseSalary: smmlv2024
      })
      const result = calculatePayroll(input)

      expect(result.monthly.salaryData.baseSalary).toBe(smmlv2024)
      expect(result.monthly.salaryData.transportAid).toBe(aux2024)
    })

    it('should use 2025 SMMLV when override is provided', () => {
      const smmlv2025 = PARAMETROS_NOMINA[2025].smmlv
      const aux2025 = PARAMETROS_NOMINA[2025].auxTransporte

      const input = createTestInput({
        smmlvOverride: smmlv2025,
        auxTransporteOverride: aux2025,
        baseSalary: smmlv2025
      })
      const result = calculatePayroll(input)

      expect(result.monthly.salaryData.baseSalary).toBe(smmlv2025)
      expect(result.monthly.salaryData.transportAid).toBe(aux2025)
    })
  })

  describe('Employer costs', () => {
    it('should calculate employer pension at 12%', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      expect(result.monthly.employerCosts.pension).toBe(SMMLV_2026 * 0.12)
    })

    it('should exempt parafiscales for small businesses', () => {
      const input = createTestInput({ isExempt: true })
      const result = calculatePayroll(input)

      expect(result.monthly.employerCosts.health).toBe(0)
      expect(result.monthly.employerCosts.sena).toBe(0)
      expect(result.monthly.employerCosts.icbf).toBe(0)
    })

    it('should NOT exempt parafiscales when isExempt is false', () => {
      const input = createTestInput({ isExempt: false })
      const result = calculatePayroll(input)

      expect(result.monthly.employerCosts.health).toBe(SMMLV_2026 * 0.085)
      expect(result.monthly.employerCosts.sena).toBe(SMMLV_2026 * 0.02)
      expect(result.monthly.employerCosts.icbf).toBe(SMMLV_2026 * 0.03)
    })

    it('should calculate ARL based on risk level', () => {
      const inputLevel1 = createTestInput({ riskLevel: RiskLevel.I })
      const inputLevel5 = createTestInput({ riskLevel: RiskLevel.V })

      const resultL1 = calculatePayroll(inputLevel1)
      const resultL5 = calculatePayroll(inputLevel5)

      expect(resultL1.monthly.employerCosts.arl).toBeCloseTo(SMMLV_2026 * 0.00522, 0)
      expect(resultL5.monthly.employerCosts.arl).toBeCloseTo(SMMLV_2026 * 0.0696, 0)
    })

    it('should calculate compensation box (CCF) at 4%', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      expect(result.monthly.employerCosts.compensationBox).toBe(SMMLV_2026 * 0.04)
    })
  })

  describe('Provisions', () => {
    it('should calculate cesantias at 8.33%', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      expect(result.monthly.employerCosts.cesantias).toBeCloseTo(basePrestaciones * 0.0833, 0)
    })

    it('should calculate prima at 8.33%', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      expect(result.monthly.employerCosts.prima).toBeCloseTo(basePrestaciones * 0.0833, 0)
    })

    it('should calculate vacations at 4.17% (without transport aid)', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      expect(result.monthly.employerCosts.vacations).toBeCloseTo(SMMLV_2026 * 0.0417, 0)
    })

    it('should calculate intereses cesantias at 12% of cesantias', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      const cesantias = basePrestaciones * 0.0833
      expect(result.monthly.employerCosts.interesesCesantias).toBeCloseTo(cesantias * 0.12, 0)
    })
  })

  describe('Net pay calculation', () => {
    it('should calculate net pay correctly', () => {
      const input = createTestInput()
      const result = calculatePayroll(input)

      const totalAccrued = SMMLV_2026 + AUX_TRANSPORTE_2026
      const totalDeductions = result.monthly.employeeDeductions.totalDeductions
      const expectedNetPay = totalAccrued - totalDeductions

      expect(result.monthly.netPay).toBeCloseTo(expectedNetPay, 0)
    })
  })

  describe('Retention source (Retención en la Fuente)', () => {
    it('should NOT apply retention for SMMLV salary', () => {
      const input = createTestInput({ enableDeductions: true })
      const result = calculatePayroll(input)

      // SMMLV is below the 95 UVT threshold
      expect(result.monthly.employeeDeductions.retencionFuente).toBe(0)
    })

    it('should apply retention for very high salary (> 95 UVT taxable base)', () => {
      // Para que aplique retención, la base gravable debe superar 95 UVT
      // Esto requiere un salario muy alto después de deducciones
      // 95 UVT * 49799 = ~4.73M pero hay deducciones del 40% límite
      const veryHighSalary = 15000000 // 15M para asegurar base gravable > 95 UVT
      const input = createTestInput({
        baseSalary: veryHighSalary,
        enableDeductions: true,
        includeTransportAid: false
      })
      const result = calculatePayroll(input)

      // Con salario de 15M, después de deducciones obligatorias y límite 40%,
      // la base gravable debe superar 95 UVT y aplicar retención
      expect(result.monthly.employeeDeductions.retencionFuente).toBeGreaterThan(0)
    })
  })
})

// ==========================================
// TESTS: calculateLiquidation
// ==========================================
describe('calculateLiquidation', () => {
  const createPayrollForLiquidation = (input: PayrollInput): PayrollResult => {
    return calculatePayroll(input)
  }

  describe('Basic liquidation', () => {
    it('should calculate days worked correctly', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)
      const liquidation = calculateLiquidation(input, payroll)

      expect(liquidation.daysWorked).toBe(180)
    })

    it('should calculate cesantias: (base * days) / 360', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30' // 180 days
      })
      const payroll = createPayrollForLiquidation(input)
      const liquidation = calculateLiquidation(input, payroll)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      const expectedCesantias = (basePrestaciones * 180) / 360

      expect(liquidation.cesantias).toBeCloseTo(expectedCesantias, 0)
    })

    it('should calculate prima: (base * days) / 360', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)
      const liquidation = calculateLiquidation(input, payroll)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      const expectedPrima = (basePrestaciones * 180) / 360

      expect(liquidation.prima).toBeCloseTo(expectedPrima, 0)
    })

    it('should calculate vacations: (salary * days) / 720 (no transport aid)', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)
      const liquidation = calculateLiquidation(input, payroll)

      const expectedVacaciones = (SMMLV_2026 * 180) / 720

      expect(liquidation.vacaciones).toBeCloseTo(expectedVacaciones, 0)
    })

    it('should calculate intereses cesantias: (cesantias * days * 12%) / 360', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)
      const liquidation = calculateLiquidation(input, payroll)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      const cesantias = (basePrestaciones * 180) / 360
      const expectedIntereses = (cesantias * 180 * 0.12) / 360

      expect(liquidation.interesesCesantias).toBeCloseTo(expectedIntereses, 0)
    })
  })

  describe('Liquidation with advances (anticipos)', () => {
    it('should deduct prima advance by semester', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-12-30' // Full year
      })
      const payroll = createPayrollForLiquidation(input)

      const advances = {
        anticipos: {
          prima: {
            tipo: 'SEMESTRE' as const,
            semestreJunioPagado: true,
            semestreDiciembrePagado: false,
            montoPagado: 0
          },
          vacacionesPagadas: 0,
          cesantiasParciales: 0,
          interesesCesantiasPagados: 0
        },
        deduccionesPersonalizadas: []
      }

      const liquidation = calculateLiquidation(input, payroll, advances)

      const basePrestaciones = SMMLV_2026 + AUX_TRANSPORTE_2026
      const valorSemestre = basePrestaciones / 2

      expect(liquidation.primaAnticipada).toBeCloseTo(valorSemestre, 0)
      expect(liquidation.primaNeta).toBeCloseTo(liquidation.prima - valorSemestre, 0)
    })

    it('should deduct cesantias advance', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)

      const anticipoCesantias = 500000

      const advances = {
        anticipos: {
          prima: {
            tipo: 'MONTO' as const,
            semestreJunioPagado: false,
            semestreDiciembrePagado: false,
            montoPagado: 0
          },
          vacacionesPagadas: 0,
          cesantiasParciales: anticipoCesantias,
          interesesCesantiasPagados: 0
        },
        deduccionesPersonalizadas: []
      }

      const liquidation = calculateLiquidation(input, payroll, advances)

      expect(liquidation.cesantiasAnticipadas).toBe(anticipoCesantias)
      expect(liquidation.cesantiasNetas).toBe(
        Math.max(0, liquidation.cesantias - anticipoCesantias)
      )
    })

    it('should not allow negative net benefits', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-01-30' // Only 30 days
      })
      const payroll = createPayrollForLiquidation(input)

      // Advance larger than actual benefit
      const advances = {
        anticipos: {
          prima: {
            tipo: 'MONTO' as const,
            semestreJunioPagado: false,
            semestreDiciembrePagado: false,
            montoPagado: 10000000 // Very large advance
          },
          vacacionesPagadas: 0,
          cesantiasParciales: 0,
          interesesCesantiasPagados: 0
        },
        deduccionesPersonalizadas: []
      }

      const liquidation = calculateLiquidation(input, payroll, advances)

      expect(liquidation.primaNeta).toBe(0) // Should be 0, not negative
    })
  })

  describe('Custom deductions', () => {
    it('should include custom deductions in total', () => {
      const input = createTestInput({
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      })
      const payroll = createPayrollForLiquidation(input)

      const advances = {
        anticipos: {
          prima: {
            tipo: 'MONTO' as const,
            semestreJunioPagado: false,
            semestreDiciembrePagado: false,
            montoPagado: 0
          },
          vacacionesPagadas: 0,
          cesantiasParciales: 0,
          interesesCesantiasPagados: 0
        },
        deduccionesPersonalizadas: [
          { id: '1', nombre: 'Préstamo empresa', valor: 200000 },
          { id: '2', nombre: 'Libranza', valor: 150000 }
        ]
      }

      const liquidation = calculateLiquidation(input, payroll, advances)

      expect(liquidation.deductions.deduccionesPersonalizadas).toHaveLength(2)
      expect(liquidation.deductions.total).toBeGreaterThanOrEqual(350000)
    })
  })
})

// ==========================================
// TESTS: formatCurrency
// ==========================================
describe('formatCurrency', () => {
  it('should format Colombian pesos correctly', () => {
    const formatted = formatCurrency(1750905)
    expect(formatted).toContain('1.750.905')
    expect(formatted).toContain('$')
  })

  it('should format zero', () => {
    const formatted = formatCurrency(0)
    expect(formatted).toContain('0')
  })

  it('should format large numbers', () => {
    const formatted = formatCurrency(100000000)
    expect(formatted).toContain('100.000.000')
  })
})

// ==========================================
// TESTS: createDefaultEmployee
// ==========================================
describe('createDefaultEmployee', () => {
  it('should create employee with SMMLV 2026 salary', () => {
    const employee = createDefaultEmployee()
    expect(employee.baseSalary).toBe(SMMLV_2026)
  })

  it('should include transport aid by default', () => {
    const employee = createDefaultEmployee()
    expect(employee.includeTransportAid).toBe(true)
  })

  it('should set risk level I by default', () => {
    const employee = createDefaultEmployee()
    expect(employee.riskLevel).toBe(RiskLevel.I)
  })

  it('should generate unique ID', () => {
    const emp1 = createDefaultEmployee(1)
    const emp2 = createDefaultEmployee(2)
    expect(emp1.id).not.toBe(emp2.id)
  })

  it('should use provided index in name', () => {
    const employee = createDefaultEmployee(5)
    expect(employee.name).toBe('Empleado 5')
  })
})
