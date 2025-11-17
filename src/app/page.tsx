
'use client';

import { useEffect } from 'react';
import { DashboardPage } from '@/app/dashboard-page';
import { LoadingScreen } from '@/components/layout/loading-screen';
import { useDataStore } from '@/hooks/use-data-store';

export default function HomePage() {
  const { isLoaded, loadAllData } = useDataStore();

  useEffect(() => {
    // This ensures loadAllData is called only once on the client side
    // after the component has mounted.
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return <DashboardPage />;
}
