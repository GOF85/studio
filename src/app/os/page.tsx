'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first page of the CPR module.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}
