
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first page of the module.
export default function AlmacenPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/almacen/picking');
    }, [router]);
    return null;
}
