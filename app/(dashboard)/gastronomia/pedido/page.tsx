
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

function PedidoGastronomiaRedirectPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams() ?? new URLSearchParams();
    const osId = searchParams.get('osId');
    const briefingItemId = searchParams.get('briefingItemId');

    useEffect(() => {
        if (osId && briefingItemId) {
            router.replace(`/os/${osId}/gastronomia/${briefingItemId}`);
        } else if (osId) {
             router.replace(`/os/${osId}/gastronomia`);
        }
         else {
            router.replace(`/os/${osId || 'unknown'}/info`);
        }
    }, [osId, briefingItemId, router]);

    return <LoadingSkeleton title="Redirigiendo..." />;
}

export default function PedidoGastronomiaRedirectPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando ..." />}>
            <PedidoGastronomiaRedirectPageInner />
        </Suspense>
    );
}
