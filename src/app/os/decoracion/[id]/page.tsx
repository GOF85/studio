'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DecoracionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/decoracion`);
    }, [router, params.id]);
    return null;
}
