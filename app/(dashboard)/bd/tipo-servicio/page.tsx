'use server';

import { createClient } from '@/lib/supabase-server';
import { getTiposServicio } from '@/services/tipo-servicio-service';
import { TipoServicioClient } from './components/TipoServicioClient';

export default async function TipoServicioPage() {
  const supabase = await createClient();
  const initialData = await getTiposServicio(supabase);

  return <TipoServicioClient initialData={initialData} />;
}
