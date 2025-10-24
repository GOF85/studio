
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the OF management page.
export default function PlanificacionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/of');
    }, [router]);
    return null;
}
