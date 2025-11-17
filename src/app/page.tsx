
'use client';

import { DashboardPage } from '@/app/dashboard-page';
import { LoadingScreen } from '@/components/layout/loading-screen';
import { useDataStore } from '@/hooks/use-data-store';

export default function HomePage() {
  const { isLoaded } = useDataStore();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return <DashboardPage />;
}
