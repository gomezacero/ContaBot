import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// Mock de variables de entorno
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

// Mock global de fetch para tests
global.fetch = vi.fn()

// Limpiar mocks después de cada test
afterEach(() => {
  vi.clearAllMocks()
})

// Mock de console.error para tests más limpios (opcional)
// vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock de ResizeObserver (necesario para algunos componentes UI)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock de matchMedia (necesario para responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
