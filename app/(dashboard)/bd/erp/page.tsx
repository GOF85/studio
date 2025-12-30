'use server';

import { createClient } from '@/lib/supabase-server';
import { getArticulosERPPaginated } from '@/services/erp-service';
import { ArticulosERPClient } from './components/ArticulosERPClient';
import { Suspense } from 'react';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

export default async function ArticulosERPPage() {
    const supabase = await createClient();
    
    // Fetch initial data for the first page
    const initialData = await getArticulosERPPaginated(supabase, {
        page: 0,
        pageSize: 20,
    });

    return (
        <Suspense fallback={<TableLoadingSplash isLoading={true} />}>
            <ArticulosERPClient initialData={initialData} />
        </Suspense>
    );
}
