import { createClient } from '@/lib/supabase-server';
import { getTiposPersonal } from '@/services/tipos-personal-service';
import { TiposPersonalClient } from './components/TiposPersonalClient';

export const dynamic = 'force-dynamic';

export default async function TiposPersonalPage() {
  const supabase = await createClient();
  const initialData = await getTiposPersonal(supabase);

  return <TiposPersonalClient initialData={initialData} />;
}
