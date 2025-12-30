'use server';

import { createClient } from '@/lib/supabase-server';
import { getFormatosExpedicion } from '@/services/formatos-expedicion-service';
import { FormatosExpedicionClient } from './components/FormatosExpedicionClient';

export default async function FormatosExpedicionPage() {
  const supabase = await createClient();
  const initialData = await getFormatosExpedicion(supabase);

  return <FormatosExpedicionClient initialData={initialData} />;
}
