
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first module of the OS.
export default function OsRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const osId = searchParams.get('id');

    useEffect(() => {
        if (osId) {
            router.replace(`/os/${osId}/comercial`);
        } else {
            router.replace('/pes');
        }
    }, [osId, router]);

    return null;
}
