import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import { getArticulosPaginated } from '@/services/articulos-service';
import { ArticulosClient } from './components/ArticulosClient';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

export default async function ArticulosPage() {
  const supabase = await createClient();
  
  // Fetch initial data for the first page
  const initialData = await getArticulosPaginated(supabase, {
    page: 0,
    pageSize: 20,
    tipoArticulo: 'micecatering'
  });

  return (
    <Suspense fallback={<TableLoadingSplash isLoading={true} />}>
      <ArticulosClient initialData={initialData} />
    </Suspense>
  );
}
