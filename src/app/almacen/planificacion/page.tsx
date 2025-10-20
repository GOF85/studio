

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main warehouse page.
export default function RedirectToWarehousePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/almacen');
    }, [router]);
    return null;
}
    
    

    

    


