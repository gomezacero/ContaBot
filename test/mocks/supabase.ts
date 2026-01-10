import { vi } from 'vitest'

// Mock de respuestas de Supabase
export const mockSupabaseUser = {
  id: 'test-user-id',
  email: 'test@contabio.co',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockSupabaseSession = {
  user: mockSupabaseUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
}

// Mock del cliente de Supabase
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseUser }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSupabaseSession }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSupabaseSession }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
})

// Mock del módulo de Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}))

// Mock del módulo de Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => createMockSupabaseClient()),
}))
