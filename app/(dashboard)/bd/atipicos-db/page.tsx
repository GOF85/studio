import { createClient } from '@/lib/supabase-server';
import { getAtipicosCatalogoPaginated } from '@/services/atipicos-service';
import { AtipicosClient } from './components/AtipicosClient';

export default async function AtipicosPage() {
  const supabase = await createClient();
  
  const initialData = await getAtipicosCatalogoPaginated(supabase, {
    page: 0,
    pageSize: 20
  });

  return <AtipicosClient initialData={initialData} />;
}
