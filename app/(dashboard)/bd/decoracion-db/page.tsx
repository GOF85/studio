import { createClient } from '@/lib/supabase-server';
import { getDecoracionCatalogoPaginated } from '@/services/decoracion-service';
import { DecoracionClient } from './components/DecoracionClient';

export default async function DecoracionPage() {
  const supabase = await createClient();
  
  const initialData = await getDecoracionCatalogoPaginated(supabase, {
    page: 0,
    pageSize: 20
  });

  return <DecoracionClient initialData={initialData} />;
}
