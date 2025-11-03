
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { PersonalExternoTurno, SolicitudPersonalCPR, Personal, PersonalExternoDB, CategoriaPersonal } from '@/types';

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
    const allTiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];


    let workers: AssignableWorker[] = [];
    
    // Si es un turno de evento, o es un turno de CPR ya asignado a una ETT
    const isEventTurno = turno.type === 'EVENTO';
    const isCprAsignado = turno.type === 'CPR' && turno.estado === 'Asignada' && turno.proveedorId;

    if (isEventTurno || isCprAsignado) {
        const tipoPersonal = allTiposPersonal.find(t => t.id === turno.proveedorId);
        const providerId = tipoPersonal?.proveedorId;
        
        if (providerId) {
            workers = allPersonalExterno
                .filter(p => p.proveedorId === providerId)
                .map(p => ({ label: p.nombreCompleto, value: p.id, id: p.id }));
        }
    } else if (turno.type === 'CPR' && (turno.estado === 'Pendiente' || turno.estado === 'Aprobada')) {
        // CPR request pendiente de asignación a ETT, debe ser asignado desde personal interno de cocina
         workers = allPersonalInterno
            .filter(p => p.departamento === 'CPR' || p.departamento === 'Cocina')
            .map(p => ({ label: `${p.nombre} ${p.apellidos}`, value: p.id, id: p.id }));
    }

    setAssignableWorkers(workers);
    setIsDataLoading(false);

  }, [turno]);

  return { assignableWorkers, isLoading: isDataLoading };
}
