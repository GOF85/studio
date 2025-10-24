
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the warehouse picking page.
export default function AlmacenPlanificacionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/of');
    }, [router]);
    return null;
}
