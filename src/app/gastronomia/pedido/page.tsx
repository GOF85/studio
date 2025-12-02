
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function PedidoGastronomiaRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const osId = searchParams.get('osId');
    const briefingItemId = searchParams.get('briefingItemId');

    useEffect(() => {
        if (osId && briefingItemId) {
            router.replace(`/os/${osId}/gastronomia/${briefingItemId}`);
        } else if (osId) {
             router.replace(`/os/${osId}/gastronomia`);
        }
         else {
            router.replace('/pes');
        }
    }, [osId, briefingItemId, router]);

    return <LoadingSkeleton title="Redirigiendo..." />;
}
