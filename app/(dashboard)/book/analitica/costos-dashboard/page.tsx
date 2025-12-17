'use client';

import { CostosRecetasDashboard } from '@/components/book/analitica/costos-recetas-dashboard';

export default function CostosDashboardPage() {
  return <CostosRecetasDashboard autoRefresh={true} refreshIntervalMs={30000} />;
}
