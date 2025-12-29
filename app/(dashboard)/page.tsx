import { Suspense } from 'react';
import DashboardPage from '@/app/(dashboard)/dashboard-page';
import { createClient } from '@/lib/supabase-server';
import { startOfWeek, endOfWeek } from 'date-fns';

export default async function HomePage() {
  const supabase = await createClient();
  
  const now = new Date();
  const sWeek = startOfWeek(now, { weekStartsOn: 1 });
  const eWeek = endOfWeek(now, { weekStartsOn: 1 });

  const { data: metrics } = await supabase.rpc('get_dashboard_metrics', {
    p_start_date: sWeek.toISOString(),
    p_end_date: eWeek.toISOString()
  });

  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <DashboardPage initialMetrics={metrics} />
    </Suspense>
  );
}
