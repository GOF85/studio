'use client';

import { useState, useEffect, useMemo } from 'react';
import type { PersonalExternoTurno, SolicitudPersonalCPR, Personal, PersonalExternoDB } from '@/types';

type UnifiedTurno = (PersonalExternoTurno & { type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });
type AssignableWorker = { label: string; value: string; id: string; };

export function useAssignablePersonal(turno: UnifiedTurno | null) {
  const [assignableWorkers, setAssignableWorkers] = useState<AssignableWorker[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!turno) {
        setIsDataLoading(false);
        return;
    }

    const allPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const allPersonalExterno = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];

    let workers: AssignableWorker[] = [];

    if (turno.type === 'EVENTO' || (turno.type === 'CPR' && turno.estado === 'Asignada' && turno.proveedorId)) {
        // We need to show external staff from the specific provider
        const providerId = 'proveedorId' in turno ? turno.proveedorId : null;
        if(providerId) {
            workers = allPersonalExterno
                .filter(p => p.proveedorId === providerId)
                .map(p => ({ label: p.nombreCompleto, value: p.id, id: p.id }));
        }
    } else if (turno.type === 'CPR' && (turno.estado === 'Pendiente' || turno.estado === 'Aprobada')) {
        // CPR request pending assignment, should be assigned from internal MICE staff
         workers = allPersonalInterno
            .filter(p => p.departamento === 'CPR' || p.departamento === 'Cocina') // Or other relevant departments
            .map(p => ({ label: `${p.nombre} ${p.apellidos}`, value: p.id, id: p.id }));
    }

    setAssignableWorkers(workers);
    setIsDataLoading(false);

  }, [turno]);

  return { assignableWorkers, isLoading: isDataLoading };
}