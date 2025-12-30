import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import { getArticulosPaginated } from '@/services/articulos-service';
import { ArticulosEntregasClient } from './components/ArticulosEntregasClient';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

export default async function ArticulosEntregasPage() {
  const supabase = await createClient();
  
  // Fetch initial data for the first page
  const initialData = await getArticulosPaginated(supabase, {
    page: 0,
    pageSize: 20,
    tipoArticulo: 'entregas'
  });

  return (
    <Suspense fallback={<TableLoadingSplash isLoading={true} />}>
      <ArticulosEntregasClient initialData={initialData} />
    </Suspense>
  );
}
