
'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first module of the OS.
export default function OsRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId) {
            router.replace(`/os/${osId}/info`);
        } else {
            router.replace('/pes');
        }
    }, [osId, router]);

    return null;
}
