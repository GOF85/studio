
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PersonalExternoTurno, SolicitudPersonalCPR } from '@/types';
import { usePersonal, usePersonalExterno, useCategoriasPersonal } from './use-data-queries';

type UnifiedTurno = (PersonalExternoTurno & { type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });
type AssignableWorker = { label: string; value: string; id: string; };

export function useAssignablePersonal(turno: UnifiedTurno | null) {
  const [assignableWorkers, setAssignableWorkers] = useState<AssignableWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Supabase
  const { data: allPersonalInterno = [], isLoading: isLoadingInterno } = usePersonal();
  const { data: allPersonalExterno = [], isLoading: isLoadingExterno } = usePersonalExterno();
  const { data: allTiposPersonal = [], isLoading: isLoadingTipos } = useCategoriasPersonal();

  const isLoading = isLoadingInterno || isLoadingExterno || isLoadingTipos;

  const refresh = useCallback(() => {
    // React Query handles invalidation/refetching, but we can fake a loading state if needed or force refetch
    // For now transparency is better.
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  useEffect(() => {
    if (!turno) {
      setLoading(false);
      return;
    }

    // Logic adapted to use fetched data
    let workers: AssignableWorker[] = [];

    const isEventTurno = turno.type === 'EVENTO';
    const isCprAsignado = turno.type === 'CPR' && ('proveedorId' in turno) && turno.proveedorId;

    if (isEventTurno || isCprAsignado) {
      const tipoPersonal = allTiposPersonal.find((t: any) => t.id === turno.proveedorId);
      const providerId = tipoPersonal?.proveedorId;

      if (providerId) {
        workers = allPersonalExterno
          .filter((p: any) => p.proveedorId === providerId)
          .map((p: any) => ({ label: `${p.nombre} ${p.apellido1} (${p.id})`, value: p.id, id: p.id }));
      }
    } else if (turno.type === 'CPR' && ('estado' in turno) && (turno.estado === 'Solicitado' || turno.estado === 'Aprobada')) {
      workers = allPersonalInterno
        .filter((p: any) => p.departamento === 'CPR' || p.departamento === 'Cocina')
        .map((p: any) => ({ label: `${p.nombre} ${p.apellido1}`, value: p.id, id: p.id }));
    }

    setAssignableWorkers(workers);
    setLoading(false);

  }, [turno, allPersonalInterno, allPersonalExterno, allTiposPersonal]);

  return { assignableWorkers, isLoading: isLoading || loading, refresh };
}
