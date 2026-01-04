import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOS } from '../useOS';
import type { ServiceOrder } from '@/types';
import * as supabaseModule from '../../lib/supabase';

const mockOrder: any = {
  id: '1',
  serviceNumber: 'EXP-1',
  client: 'Cliente',
  finalClient: 'Final',
  contact: 'Contacto',
  phone: '123',
  asistentes: 10,
  space: 'Sala',
  spaceAddress: 'Calle',
  spaceContact: 'Persona',
  spacePhone: '123',
  spaceMail: 'mail@mail.com',
  respMetre: '',
  respMetrePhone: '',
  respMetreMail: '',
  respCocinaCPR: '',
  respCocinaCPRPhone: '',
  respCocinaCPRMail: '',
  respPase: '',
  respPasePhone: '',
  respPaseMail: '',
  respCocinaPase: '',
  respCocinaPasePhone: '',
  respCocinaPaseMail: '',
  comercialAsiste: false,
  comercial: '',
  comercialPhone: '',
  comercialMail: '',
  rrhhAsiste: false,
  respRRHH: '',
  respRRHHPhone: '',
  respRRHHMail: '',
  agencyPercentage: 0,
  spacePercentage: 0,
};

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: function () { return this; },
      eq: function () { return { single: () => ({ data: mockOrder, error: null }) }; },
      single: function () { return { data: mockOrder, error: null }; }
    })
  }) as any
}));

describe('useOS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve evento correctamente', async () => {
    const { result } = renderHook(() => useOS('EXP-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.evento).toEqual(mockOrder);
    expect(result.current.error).toBeNull();
  });

  it('maneja error de supabase', async () => {
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValueOnce({
      from: () => ({
        select: function () { return this; },
        eq: function () { return { single: () => ({ data: null, error: { message: 'Error supabase' } }) }; },
        single: function () { return { data: null, error: { message: 'Error supabase' } }; }
      })
    } as any);
    const { result } = renderHook(() => useOS('EXP-2'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.evento).toBeNull();
    expect(result.current.error).toBe('Error supabase');
  });

  it('maneja error inesperado', async () => {
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockImplementationOnce(() => { throw new Error('Error inesperado'); });
    const { result } = renderHook(() => useOS('EXP-3'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.evento).toBeNull();
    expect(result.current.error).toBe('Error inesperado');
  });

  it('permite refetch', async () => {
    const { result } = renderHook(() => useOS('EXP-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.evento).toEqual(mockOrder);
  });
});
