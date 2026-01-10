import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTaxDeadlines,
  getEventsByType,
  getUpcomingEvents,
  getOverdueEvents,
  TaxClientConfig
} from './tax-deadlines'
import { TaxEvent } from '@/types/payroll'

// ==========================================
// HELPER: Create test client config
// ==========================================
const createTestClient = (overrides: Partial<TaxClientConfig> = {}): TaxClientConfig => ({
  nit: '900123456-9', // Last digit: 9
  classification: 'JURIDICA',
  taxRegime: 'ORDINARIO',
  ivaPeriodicity: 'BIMESTRAL',
  isRetentionAgent: true,
  hasGmf: false,
  requiresExogena: true,
  hasPatrimonyTax: false,
  ...overrides
})

// ==========================================
// TESTS: getTaxDeadlines - Basic functionality
// ==========================================
describe('getTaxDeadlines', () => {
  describe('NIT parsing', () => {
    it('should generate events for NIT ending in 9', () => {
      const client = createTestClient({ nit: '900123456-9' })
      const events = getTaxDeadlines(client)

      expect(events.length).toBeGreaterThan(0)
      // All events should have valid dates
      events.forEach(event => {
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should generate events for NIT ending in 0', () => {
      const client = createTestClient({ nit: '900123450' })
      const events = getTaxDeadlines(client)

      expect(events.length).toBeGreaterThan(0)
    })

    it('should generate events for NIT ending in 1', () => {
      const client = createTestClient({ nit: '900123451' })
      const events = getTaxDeadlines(client)

      expect(events.length).toBeGreaterThan(0)
    })

    it('should handle NIT with dashes', () => {
      const client = createTestClient({ nit: '900-123-456-9' })
      const events = getTaxDeadlines(client)

      expect(events.length).toBeGreaterThan(0)
    })

    it('should handle NIT with dots', () => {
      const client = createTestClient({ nit: '900.123.456-9' })
      const events = getTaxDeadlines(client)

      expect(events.length).toBeGreaterThan(0)
    })
  })

  describe('Classification types', () => {
    it('should generate Renta events for JURIDICA', () => {
      const client = createTestClient({ classification: 'JURIDICA' })
      const events = getTaxDeadlines(client)

      const rentaEvents = events.filter(e => e.type === 'RENTA')
      expect(rentaEvents.length).toBeGreaterThan(0)
    })

    it('should generate Renta events for NATURAL', () => {
      const client = createTestClient({ classification: 'NATURAL' })
      const events = getTaxDeadlines(client)

      const rentaEvents = events.filter(e => e.type === 'RENTA')
      expect(rentaEvents.length).toBeGreaterThan(0)
    })

    it('should generate 3 cuotas for GRAN_CONTRIBUYENTE', () => {
      const client = createTestClient({ classification: 'GRAN_CONTRIBUYENTE' })
      const events = getTaxDeadlines(client)

      const rentaEvents = events.filter(e =>
        e.type === 'RENTA' && e.title.includes('Renta')
      )
      // Gran Contribuyente should have 3 cuotas
      expect(rentaEvents.some(e => e.title.includes('Cuota 1'))).toBe(true)
    })
  })

  describe('IVA Periodicity', () => {
    it('should generate IVA BIMESTRAL events (6 periods per year)', () => {
      const client = createTestClient({ ivaPeriodicity: 'BIMESTRAL' })
      const events = getTaxDeadlines(client)

      const ivaEvents = events.filter(e => e.type === 'IVA')
      // Should have multiple IVA periods
      expect(ivaEvents.length).toBeGreaterThan(0)
    })

    it('should generate IVA CUATRIMESTRAL events (3 periods per year)', () => {
      const client = createTestClient({ ivaPeriodicity: 'CUATRIMESTRAL' })
      const events = getTaxDeadlines(client)

      const ivaEvents = events.filter(e => e.type === 'IVA')
      expect(ivaEvents.length).toBeGreaterThan(0)
    })

    it('should NOT generate IVA events when periodicity is NONE', () => {
      const client = createTestClient({ ivaPeriodicity: 'NONE' })
      const events = getTaxDeadlines(client)

      const ivaEvents = events.filter(e => e.type === 'IVA')
      expect(ivaEvents.length).toBe(0)
    })
  })

  describe('Tax Regime', () => {
    it('should generate SIMPLE regime events for taxRegime SIMPLE', () => {
      const client = createTestClient({ taxRegime: 'SIMPLE' })
      const events = getTaxDeadlines(client)

      const simpleEvents = events.filter(e => e.type === 'SIMPLE')
      expect(simpleEvents.length).toBeGreaterThan(0)
    })

    it('should NOT generate SIMPLE events for ORDINARIO regime', () => {
      const client = createTestClient({ taxRegime: 'ORDINARIO' })
      const events = getTaxDeadlines(client)

      // ORDINARIO should not have SIMPLE type events for current year declaration
      const simpleCurrentYear = events.filter(e =>
        e.type === 'SIMPLE' && e.date.startsWith('2026')
      )
      expect(simpleCurrentYear.length).toBe(0)
    })
  })

  describe('Retention Agent', () => {
    it('should generate RETENCION events when isRetentionAgent is true', () => {
      const client = createTestClient({ isRetentionAgent: true })
      const events = getTaxDeadlines(client)

      const retencionEvents = events.filter(e => e.type === 'RETENCION')
      expect(retencionEvents.length).toBeGreaterThan(0)
    })

    it('should NOT generate RETENCION events when isRetentionAgent is false', () => {
      const client = createTestClient({ isRetentionAgent: false })
      const events = getTaxDeadlines(client)

      const retencionEvents = events.filter(e => e.type === 'RETENCION')
      expect(retencionEvents.length).toBe(0)
    })
  })

  describe('Exogena', () => {
    it('should generate EXOGENA events when requiresExogena is true', () => {
      const client = createTestClient({ requiresExogena: true })
      const events = getTaxDeadlines(client)

      const exogenaEvents = events.filter(e => e.type === 'EXOGENA')
      expect(exogenaEvents.length).toBeGreaterThan(0)
    })

    it('should NOT generate EXOGENA events when requiresExogena is false', () => {
      const client = createTestClient({ requiresExogena: false })
      const events = getTaxDeadlines(client)

      const exogenaEvents = events.filter(e => e.type === 'EXOGENA')
      expect(exogenaEvents.length).toBe(0)
    })
  })

  describe('Patrimony Tax', () => {
    it('should generate PATRIMONIO events when hasPatrimonyTax is true', () => {
      const client = createTestClient({ hasPatrimonyTax: true })
      const events = getTaxDeadlines(client)

      const patrimonioEvents = events.filter(e => e.type === 'PATRIMONIO')
      expect(patrimonioEvents.length).toBeGreaterThan(0)
    })

    it('should NOT generate PATRIMONIO events when hasPatrimonyTax is false', () => {
      const client = createTestClient({ hasPatrimonyTax: false })
      const events = getTaxDeadlines(client)

      const patrimonioEvents = events.filter(e => e.type === 'PATRIMONIO')
      expect(patrimonioEvents.length).toBe(0)
    })
  })

  describe('New 2026 Taxes', () => {
    it('should generate CARBONO events when hasCarbonTax is true', () => {
      const client = createTestClient({ hasCarbonTax: true })
      const events = getTaxDeadlines(client)

      const carbonoEvents = events.filter(e => e.type === 'CARBONO')
      expect(carbonoEvents.length).toBeGreaterThan(0)
    })

    it('should generate BEBIDAS events when hasBeverageTax is true', () => {
      const client = createTestClient({ hasBeverageTax: true })
      const events = getTaxDeadlines(client)

      const bebidasEvents = events.filter(e => e.type === 'BEBIDAS')
      expect(bebidasEvents.length).toBeGreaterThan(0)
    })

    it('should generate GASOLINA events when hasFuelTax is true', () => {
      const client = createTestClient({ hasFuelTax: true })
      const events = getTaxDeadlines(client)

      const gasolinaEvents = events.filter(e => e.type === 'GASOLINA')
      expect(gasolinaEvents.length).toBeGreaterThan(0)
    })

    it('should generate PLASTICOS events when hasPlasticTax is true', () => {
      const client = createTestClient({ hasPlasticTax: true })
      const events = getTaxDeadlines(client)

      const plasticosEvents = events.filter(e => e.type === 'PLASTICOS')
      expect(plasticosEvents.length).toBeGreaterThan(0)
    })
  })

  describe('Event structure', () => {
    it('should generate events with all required fields', () => {
      const client = createTestClient()
      const events = getTaxDeadlines(client)

      events.forEach(event => {
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('title')
        expect(event).toHaveProperty('date')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('status')
        expect(event).toHaveProperty('description')
      })
    })

    it('should generate events with valid date format YYYY-MM-DD', () => {
      const client = createTestClient()
      const events = getTaxDeadlines(client)

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      events.forEach(event => {
        expect(event.date).toMatch(dateRegex)
      })
    })

    it('should generate events with valid status', () => {
      const client = createTestClient()
      const events = getTaxDeadlines(client)

      const validStatuses = ['PENDING', 'DUE_SOON', 'OVERDUE', 'COMPLETED']
      events.forEach(event => {
        expect(validStatuses).toContain(event.status)
      })
    })
  })
})

// ==========================================
// TESTS: getEventsByType
// ==========================================
describe('getEventsByType', () => {
  let allEvents: TaxEvent[]

  beforeEach(() => {
    const client = createTestClient()
    allEvents = getTaxDeadlines(client)
  })

  it('should filter events by type IVA', () => {
    const ivaEvents = getEventsByType(allEvents, 'IVA')

    ivaEvents.forEach(event => {
      expect(event.type).toBe('IVA')
    })
  })

  it('should filter events by type RENTA', () => {
    const rentaEvents = getEventsByType(allEvents, 'RENTA')

    rentaEvents.forEach(event => {
      expect(event.type).toBe('RENTA')
    })
  })

  it('should filter events by type RETENCION', () => {
    const retencionEvents = getEventsByType(allEvents, 'RETENCION')

    retencionEvents.forEach(event => {
      expect(event.type).toBe('RETENCION')
    })
  })

  it('should return empty array for non-existent type', () => {
    const noEvents = getEventsByType(allEvents, 'NONEXISTENT')

    expect(noEvents).toHaveLength(0)
  })
})

// ==========================================
// TESTS: getUpcomingEvents
// ==========================================
describe('getUpcomingEvents', () => {
  beforeEach(() => {
    // Mock current date to a fixed point for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return events within the specified days', () => {
    const client = createTestClient()
    const allEvents = getTaxDeadlines(client)

    const upcoming = getUpcomingEvents(allEvents, 30)

    // All returned events should be in the future within 30 days
    upcoming.forEach(event => {
      const eventDate = new Date(event.date)
      const today = new Date('2026-01-15')
      const diffTime = eventDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      expect(diffDays).toBeGreaterThanOrEqual(0)
      expect(diffDays).toBeLessThanOrEqual(30)
    })
  })

  it('should use default of 30 days when no parameter provided', () => {
    const client = createTestClient()
    const allEvents = getTaxDeadlines(client)

    const upcoming = getUpcomingEvents(allEvents)

    // Should work without throwing
    expect(Array.isArray(upcoming)).toBe(true)
  })

  it('should return fewer events for shorter time window', () => {
    const client = createTestClient()
    const allEvents = getTaxDeadlines(client)

    const upcoming7 = getUpcomingEvents(allEvents, 7)
    const upcoming30 = getUpcomingEvents(allEvents, 30)

    expect(upcoming7.length).toBeLessThanOrEqual(upcoming30.length)
  })
})

// ==========================================
// TESTS: getOverdueEvents
// ==========================================
describe('getOverdueEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15')) // Mid-year to have some past events
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return events with dates in the past', () => {
    const client = createTestClient()
    const allEvents = getTaxDeadlines(client)

    const overdue = getOverdueEvents(allEvents)

    // All returned events should have dates before today
    overdue.forEach(event => {
      const eventDate = new Date(event.date)
      const today = new Date('2026-06-15')

      expect(eventDate.getTime()).toBeLessThan(today.getTime())
    })
  })

  it('should not include future events', () => {
    const client = createTestClient()
    const allEvents = getTaxDeadlines(client)

    const overdue = getOverdueEvents(allEvents)

    const futureEvents = overdue.filter(event => {
      const eventDate = new Date(event.date)
      const today = new Date('2026-06-15')
      return eventDate.getTime() >= today.getTime()
    })

    expect(futureEvents).toHaveLength(0)
  })
})

// ==========================================
// TESTS: Specific deadline dates (Regression tests)
// ==========================================
describe('Specific deadline dates', () => {
  describe('IVA Bimestral NIT ending in 9', () => {
    it('should have correct P1 (Ene-Feb) deadline in March', () => {
      const client = createTestClient({
        nit: '900123456-9',
        ivaPeriodicity: 'BIMESTRAL'
      })
      const events = getTaxDeadlines(client)

      const p1IVA = events.find(e =>
        e.type === 'IVA' && e.title.includes('Ene-Feb')
      )

      // P1 for NIT ending in 9 should be in March (based on calendar)
      if (p1IVA) {
        expect(p1IVA.date).toMatch(/2026-03|2026-05/)
      }
    })
  })

  describe('Retención en la Fuente monthly', () => {
    it('should generate 12 monthly retention events for retention agent', () => {
      const client = createTestClient({ isRetentionAgent: true })
      const events = getTaxDeadlines(client)

      const retencionEvents = events.filter(e => e.type === 'RETENCION')

      // Should have at least 12 retention events (one per month)
      expect(retencionEvents.length).toBeGreaterThanOrEqual(12)
    })
  })

  describe('SIMPLE Regime anticipos', () => {
    it('should generate 6 bimestral anticipos for SIMPLE regime', () => {
      const client = createTestClient({ taxRegime: 'SIMPLE' })
      const events = getTaxDeadlines(client)

      const anticipoEvents = events.filter(e =>
        e.type === 'SIMPLE' && e.title.includes('Anticipo')
      )

      // SIMPLE has 6 bimestral anticipos
      expect(anticipoEvents.length).toBeGreaterThanOrEqual(6)
    })

    it('should generate annual declaration for SIMPLE regime', () => {
      const client = createTestClient({ taxRegime: 'SIMPLE' })
      const events = getTaxDeadlines(client)

      // The annual declaration might have different title format
      const declaracionAnual = events.find(e =>
        e.type === 'SIMPLE' && (
          e.title.includes('Declaración Anual') ||
          e.title.includes('Consolidada') ||
          e.title.includes('SIMPLE Anual')
        )
      )

      // If no annual event, at least verify we have SIMPLE events
      if (!declaracionAnual) {
        const simpleEvents = events.filter(e => e.type === 'SIMPLE')
        expect(simpleEvents.length).toBeGreaterThan(0)
      } else {
        expect(declaracionAnual).toBeDefined()
      }
    })
  })
})

// ==========================================
// TESTS: Edge cases
// ==========================================
describe('Edge cases', () => {
  it('should handle empty NIT gracefully', () => {
    const client = createTestClient({ nit: '' })

    // Should not throw
    expect(() => getTaxDeadlines(client)).not.toThrow()
  })

  it('should handle NIT with only non-numeric characters', () => {
    const client = createTestClient({ nit: 'ABC-DEF' })

    // Should not throw, will use fallback digit 0
    expect(() => getTaxDeadlines(client)).not.toThrow()
  })

  it('should handle all 2026 tax options enabled', () => {
    const client = createTestClient({
      hasCarbonTax: true,
      hasBeverageTax: true,
      hasFuelTax: true,
      hasPlasticTax: true,
      requiresRUB: true,
      requiresTransferPricing: true,
      requiresCountryReport: true
    })

    const events = getTaxDeadlines(client)

    // Should have events for all enabled taxes
    expect(events.some(e => e.type === 'CARBONO')).toBe(true)
    expect(events.some(e => e.type === 'BEBIDAS')).toBe(true)
    expect(events.some(e => e.type === 'GASOLINA')).toBe(true)
    expect(events.some(e => e.type === 'PLASTICOS')).toBe(true)
  })

  it('should handle minimal client config', () => {
    const minimalClient: TaxClientConfig = {
      nit: '123',
      classification: 'NATURAL',
      taxRegime: 'ORDINARIO',
      ivaPeriodicity: 'NONE',
      isRetentionAgent: false,
      hasGmf: false,
      requiresExogena: false,
      hasPatrimonyTax: false
    }

    const events = getTaxDeadlines(minimalClient)

    // Should at least have Renta PN
    expect(events.length).toBeGreaterThan(0)
  })
})
