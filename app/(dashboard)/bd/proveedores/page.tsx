'use server';

import { createClient } from '@/lib/supabase-server';
import { getProveedoresPaginated } from '@/services/proveedores-service';
import { ProveedoresClient } from './components/ProveedoresClient';
import { Suspense } from 'react';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

export default async function ProveedoresPage() {
    const supabase = await createClient();
    
    // Fetch initial data for the first page
    const initialData = await getProveedoresPaginated(supabase, {
        page: 1,
        pageSize: 20,
    });

    return (
        <Suspense fallback={<TableLoadingSplash isLoading={true} />}>
            <ProveedoresClient initialData={initialData} />
        </Suspense>
    );
}
