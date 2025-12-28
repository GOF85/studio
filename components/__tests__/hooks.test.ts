import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
// Mock getSupabaseClient ANTES de importar los hooks
vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: function () { return this; },
      eq: function () { return { single: () => ({ data: { numero_expediente: 'EXP123' }, error: null }), data: [{ id: 1, os_id: 'os_001' }], error: null }; },
      single: function () { return { data: { numero_expediente: 'EXP123' }, error: null }; }
    })
  })
}));
import { useOS } from '../../hooks/useOS';
import { useModuleData } from '../../hooks/useModuleData';
import { useScrollTop } from '../../hooks/useScrollTop';
import './setupTests';

// Mock data and utilities can be added here

describe('Hooks principales', () => {
  it('useOS debe retornar datos válidos para un numero_expediente', async () => {
    const { result } = renderHook(() => useOS('EXP123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.evento).toBeDefined();
    expect(result.current.evento?.numero_expediente || result.current.evento?.serviceNumber).toBeDefined();
  });

  it('useModuleData debe retornar datos satélite para un os_id', async () => {
    const { result } = renderHook(() => useModuleData('os_001', 'personalExterno'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeInstanceOf(Array);
    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it('useScrollTop debe ejecutarse sin errores', () => {
    const { result } = renderHook(() => useScrollTop());
    expect(result.current).toBeUndefined(); // El hook no retorna nada
  });
});
