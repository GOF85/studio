
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

// This is a placeholder for a future detail view of an inventory item.
// For now, it redirects to the main inventory page.
export default function InventarioDetailPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/inventario');
    }, [router]);
    return null;
}
