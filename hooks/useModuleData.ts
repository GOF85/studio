import React from "react";
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase';

interface UseModuleDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useModuleData<T = any>(os_id: string, tableName: string): UseModuleDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabaseClient()
        .from(tableName)
        .select('*')
        .eq('os_id', os_id);
      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setData(data as T[]);
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [os_id, tableName]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os_id, tableName, refreshIndex]);

  const refetch = useCallback(() => setRefreshIndex(i => i + 1), []);

  return { data, loading, error, refetch };
}
