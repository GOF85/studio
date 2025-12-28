'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useEvento } from '@/hooks/use-data-queries';

export default function HieloIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { data: evento, isLoading } = useEvento(params.id);

    useEffect(() => {
        if (isLoading) return;
        
        const serviceNumber = evento?.serviceNumber;
        router.replace(`/os/${serviceNumber || params.id}/hielo`);
    }, [router, params.id, evento, isLoading]);
    return null;
}
