import { createClient } from '@/lib/supabase-server';
import { getIngredientesData } from '@/services/ingredientes-service';
import { IngredientesClient } from './components/IngredientesClient';
import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export const dynamic = 'force-dynamic';

export default async function IngredientesPage() {
  const supabase = await createClient();
  const initialData = await getIngredientesData(supabase);

  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Ingredientes..." />}>
      <IngredientesClient initialData={initialData} />
    </Suspense>
  );
}
