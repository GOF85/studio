import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import { getCostesFijosCPR } from '@/services/costes-fijos-cpr-service';
import { CostesFijosCprClient } from './components/CostesFijosCprClient';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default async function CostesFijosCprPage() {
    const supabase = await createClient();
    const initialData = await getCostesFijosCPR(supabase);

    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <CostesFijosCprClient initialData={initialData} />
        </Suspense>
    );
}
