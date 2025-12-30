'use server';

import { createClient } from '@/lib/supabase-server';
import { getProveedoresTipos } from '@/services/proveedores-tipos-service';
import { ProveedoresTiposClient } from './components/ProveedoresTiposClient';

export default async function ProveedoresTiposPage() {
  const supabase = await createClient();
  const initialData = await getProveedoresTipos(supabase);

  return <ProveedoresTiposClient initialData={initialData} />;
}
