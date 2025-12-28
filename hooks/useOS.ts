import React from "react";
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import type { ServiceOrder } from '@/types';

interface UseOSResult {
  evento: ServiceOrder | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOS(numero_expediente: string): UseOSResult {
  const [evento, setEvento] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const fetchEvento = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const { data, error } = await getSupabaseClient()
        .from('eventos')
        .select('*')
        .eq('numero_expediente', numero_expediente)
        .single();
      if (error || !data) {
        setEvento(null);
        setError(error?.message || 'No encontrado');
      } else {
        setEvento(data as ServiceOrder);
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setEvento(null);
    } finally {
      setLoading(false);
    }
  }, [numero_expediente]);

  useEffect(() => {
    fetchEvento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numero_expediente, refreshIndex]);

  const refetch = useCallback(() => setRefreshIndex(i => i + 1), []);

  return { evento, loading, error, refetch };
}
