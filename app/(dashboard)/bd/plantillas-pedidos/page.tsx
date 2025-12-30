'use server';

import { createClient } from '@/lib/supabase-server';
import { getPlantillasPedidos } from '@/services/plantillas-pedidos-service';
import { PlantillasPedidosClient } from './components/PlantillasPedidosClient';

export default async function PlantillasPedidosPage() {
  const supabase = await createClient();
  const initialData = await getPlantillasPedidos(supabase);

  return <PlantillasPedidosClient initialData={initialData} />;
}
