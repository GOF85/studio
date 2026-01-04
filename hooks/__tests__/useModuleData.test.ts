import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useModuleData } from '../useModuleData';
import * as supabaseModule from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: function () { return this; },
      eq: function () { return { data: [{ id: 1, os_id: 'os1' }], error: null }; }
    })
  }) as any,
  resolveOsId: async (id: string) => id,
  buildFieldOr: (field: string, a: string, b: string) => `${field}.eq.${a},${field}.eq.${b}`
}));

describe('useModuleData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve datos correctamente', async () => {
    const { result } = renderHook(() => useModuleData('os1', 'tabla'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1, os_id: 'os1' }]);
    expect(result.current.error).toBeNull();
  });

  it('maneja error de supabase', async () => {
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValueOnce({
      from: () => ({
        select: function () { return this; },
        eq: function () { return { data: null, error: { message: 'Error supabase' } }; }
      })
    } as any);
    const { result } = renderHook(() => useModuleData('os2', 'tabla'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe('Error supabase');
  });

  it('maneja error inesperado', async () => {
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockImplementationOnce(() => { throw new Error('Error inesperado'); });
    const { result } = renderHook(() => useModuleData('os3', 'tabla'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe('Error inesperado');
  });

  it('permite refetch', async () => {
    const { result } = renderHook(() => useModuleData('os1', 'tabla'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1, os_id: 'os1' }]);
  });
});
