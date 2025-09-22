'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first page of the CPR module.
export default function CPRPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/planificacion');
    }, [router]);
    return null;
}
