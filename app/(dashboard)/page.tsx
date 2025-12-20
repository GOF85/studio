import { Suspense } from 'react';
import DashboardPage from '@/app/(dashboard)/dashboard-page';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <DashboardPage />
    </Suspense>
  );
}
