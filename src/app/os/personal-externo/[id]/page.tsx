'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalExternoIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-externo`);
    }, [router, params.id]);
    return null;
}
