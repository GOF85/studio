'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        // Redirigir a una ruta por defecto, por ejemplo, overview general o dashboard
        router.replace('/os');
    }, [router]);
    return null;
}
