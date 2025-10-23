
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function NuevoIngredientePage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/book/ingredientes/nuevo');
    }, [router]);

    return null;
}
