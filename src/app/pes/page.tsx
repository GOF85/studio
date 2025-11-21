'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PrevisionServiciosContent } from './prevision-servicios-content';

export default function PrevisionServiciosPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Previsión de Servicios..." />}>
            <PrevisionServiciosContent />
        </Suspense>
    );
}