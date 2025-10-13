'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GastronomiaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/gastronomia`);
    }, [router, params.id]);
    return null;
}
