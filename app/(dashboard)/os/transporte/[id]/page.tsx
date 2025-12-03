'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TransporteIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/transporte`);
    }, [router, params.id]);
    return null;
}
