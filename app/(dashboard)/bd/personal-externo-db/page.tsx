
import { createClient } from '@/lib/supabase-server';
import { getPersonalExternoPaginated } from '@/services/personal-externo-service';
import { PersonalExternoClient } from './components/PersonalExternoClient';

export default async function PersonalExternoPage() {
  const supabase = await createClient();
  
  let initialData: { items: any[]; totalCount: number } = { items: [], totalCount: 0 };
  
  try {
    initialData = await getPersonalExternoPaginated(supabase, {
      page: 0,
      pageSize: 20
    });
  } catch (error) {
    console.error('Error fetching initial external personnel data:', error);
    // Continue with empty data to avoid crash
  }

  return <PersonalExternoClient initialData={initialData} />;
}
