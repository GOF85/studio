'use server';

import { createClient } from '@/lib/supabase-server';
import { getObjetivosGastoPlantillas } from '@/services/objetivos-gasto-service';
import { ObjetivosGastoClient } from './components/ObjetivosGastoClient';

export default async function ObjetivosGastoPage() {
  const supabase = await createClient();
  const initialData = await getObjetivosGastoPlantillas(supabase);

  return <ObjetivosGastoClient initialData={initialData} />;
}
