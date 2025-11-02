'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the unified form page.
export default function EditarPersonalExternoRedirect({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/bd/personal-externo-db/${params.id}`);
    }, [router, params.id]);
    return null;
}
