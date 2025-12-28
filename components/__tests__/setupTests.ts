// Mock avanzado de Supabase para todos los tests
const supabaseMock = {
  from: () => ({
    select: () => ({ data: [{ id: 'mock', nombre: 'Mock Data' }], error: null }),
    insert: () => ({ data: [{ id: 'mock', nombre: 'Inserted' }], error: null }),
    update: () => ({ data: [{ id: 'mock', nombre: 'Updated' }], error: null }),
    delete: () => ({ data: [{ id: 'mock', nombre: 'Deleted' }], error: null }),
  }),
  auth: {
    signIn: () => Promise.resolve({ user: { id: 'mock-user' } }),
    signOut: () => Promise.resolve({}),
    getUser: () => Promise.resolve({ user: { id: 'mock-user' } }),
  },
};

vi.mock('../../lib/supabase', () => ({
  supabase: supabaseMock,
  getSupabaseClient: () => supabaseMock,
}));
