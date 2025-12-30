'use server';

import { createClient } from '@/lib/supabase-server';
import { getObjetivosCPR } from '@/services/objetivos-cpr-service';
import { ObjetivosCprClient } from './components/ObjetivosCprClient';

export default async function ObjetivosCprPage() {
  const supabase = await createClient();
  const initialData = await getObjetivosCPR(supabase);

  return <ObjetivosCprClient initialData={initialData} />;
}
