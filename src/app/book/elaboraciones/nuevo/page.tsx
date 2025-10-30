
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the unified form page.
export default function NuevaElaboracionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/book/elaboraciones/nueva');
    }, [router]);
    return null;
}
