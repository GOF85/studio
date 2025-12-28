'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useEvento } from '@/hooks/use-data-queries';

export default function PersonalExternoIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { data: serviceOrder, isLoading } = useEvento(params.id);

    useEffect(() => {
        if (!isLoading && params.id) {
            const serviceNumber = serviceOrder?.serviceNumber;
            router.replace(`/os/${serviceNumber || params.id}/personal-externo`);
        }
    }, [router, params.id, serviceOrder, isLoading]);
    return null;
}
