
'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function OsPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId === 'nuevo') {
             router.replace(`/os/nuevo/info`);
        } else if (osId) {
            router.replace(`/os/${osId}/info`);
        } else {
            router.replace('/pes');
        }
    }, [osId, router]);

    return <LoadingSkeleton title="Cargando Orden de Servicio..." />;
}
