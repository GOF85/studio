import { createClient } from '@/lib/supabase-server';
import { getEventosPaginated } from '@/services/os-service';
import { OSClient } from './components/OSClient';

export default async function ServiceOrdersPage() {
  const supabase = await createClient();
  
  const initialData = await getEventosPaginated(supabase, {
    page: 0,
    pageSize: 20
  });

  return <OSClient initialData={initialData as any} />;
}
