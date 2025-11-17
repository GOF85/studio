
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This page just redirects to the first page of the CPR module.
export default function CPRPage() {
    useEffect(() => {
        redirect('/cpr/dashboard');
    }, []);
    return null;
}
