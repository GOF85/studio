'use server';

import { createClient } from '@/lib/supabase-server';
import { getPersonalPaginated } from '@/services/personal-service';
import { PersonalClient } from './components/PersonalClient';
import { Suspense } from 'react';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

export default async function PersonalPage() {
    const supabase = await createClient();
    
    // Fetch initial data for the first page
    const initialData = await getPersonalPaginated(supabase, {
        page: 1,
        pageSize: 20,
    });

    return (
        <Suspense fallback={<TableLoadingSplash isLoading={true} />}>
            <PersonalClient initialData={initialData} />
        </Suspense>
    );
}
