
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the unified requests page.
export default function SolicitudesCprRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/rrhh/solicitudes');
    }, [router]);
    return null;
}
