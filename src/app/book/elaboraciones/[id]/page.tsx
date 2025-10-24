
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page has been deprecated and its logic moved to /book/elaboraciones/[[...id]]/page.tsx
export default function ElaboracionFormIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/book/elaboraciones/${params.id}`);
    }, [router, params.id]);
    return null;
}
