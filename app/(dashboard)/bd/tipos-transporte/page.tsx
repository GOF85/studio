import { createClient } from '@/lib/supabase-server';
import { getTiposTransporte } from '@/services/tipos-transporte-service';
import { TiposTransporteClient } from './components/TiposTransporteClient';

export const dynamic = 'force-dynamic';

export default async function TiposTransportePage() {
  const supabase = await createClient();
  const initialData = await getTiposTransporte(supabase);

  return <TiposTransporteClient initialData={initialData} />;
}
