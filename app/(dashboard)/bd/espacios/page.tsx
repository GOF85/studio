import { createClient } from '@/lib/supabase-server';
import { getEspaciosPaginated } from '@/services/espacios-service';
import { EspaciosClient } from './components/EspaciosClient';

export default async function EspaciosPage() {
  const supabase = await createClient();
  
  const initialData = await getEspaciosPaginated(supabase, {
    page: 1,
    pageSize: 20
  });

  return <EspaciosClient initialData={initialData} />;
}
