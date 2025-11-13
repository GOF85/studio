
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function UbicacionesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto">
            <Suspense fallback={<LoadingSkeleton title="Cargando Ubicaciones..." />}>
                 {children}
            </Suspense>
        </div>
    )
}
