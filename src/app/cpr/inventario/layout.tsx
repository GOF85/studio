
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Inventario..." />}>
            {children}
        </Suspense>
    )
}
