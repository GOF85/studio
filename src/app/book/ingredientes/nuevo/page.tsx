
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main ingredients page, as creation is now handled by a modal.
export default function NuevoIngredientePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/book/ingredientes');
    }, [router]);
    return null;
}
