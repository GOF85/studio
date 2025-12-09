
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

// This page just redirects to the first sub-page of the OS module.
export default function OsPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId) {
            try {
                const all = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
                const current = all.find((o: any) => o.id === osId);
                const serviceNumber = current?.serviceNumber;
                router.replace(`/os/${serviceNumber || osId}/info`);
            } catch (e) {
                router.replace(`/os/${osId}/info`);
            }
        }
    }, [osId, router]);

    return <LoadingSkeleton title="Cargando Orden de Servicio..." />;
}
