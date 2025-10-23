'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main CPR page.
export default function RedirectToCprPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr');
    }, [router]);
    return null;
}
