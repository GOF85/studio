
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the unified form page.
export default function NuevoPersonalExternoRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/bd/personal-externo/nuevo');
    }, [router]);
    return null;
}
