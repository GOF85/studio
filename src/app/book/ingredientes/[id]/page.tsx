
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated. Redirecting to the main ingredients page.
export default function IngredienteFormPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/book/ingredientes');
    }, [router]);
    return null;
}
