'use server';

import { createClient } from '@/lib/supabase-server';
import { getFamiliasERP } from '@/services/familias-erp-service';
import { FamiliasERPClient } from './components/FamiliasERPClient';

export default async function FamiliasERPPage() {
  const supabase = await createClient();
  const initialData = await getFamiliasERP(supabase);

  return <FamiliasERPClient initialData={initialData} />;
}
