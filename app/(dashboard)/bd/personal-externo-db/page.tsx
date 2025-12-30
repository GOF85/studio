
import { createClient } from '@/lib/supabase-server';
import { getPersonalExternoPaginated } from '@/services/personal-externo-service';
import { PersonalExternoClient } from './components/PersonalExternoClient';

export default async function PersonalExternoPage() {
  const supabase = await createClient();
  
  const initialData = await getPersonalExternoPaginated(supabase, {
    page: 0,
    pageSize: 20
  });

  return <PersonalExternoClient initialData={initialData} />;
}
