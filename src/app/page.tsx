
'use client';

import { useEffect, useState } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { DashboardPage } from '@/app/dashboard-page';
import { useDataStore } from '@/hooks/use-data-store';

export default function HomePage() {
  const { isLoaded, loadAllData } = useDataStore();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // This effect ensures that data loading is triggered only once on the client side.
    if (!dataLoaded) {
        loadAllData();
        setDataLoaded(true);
    }
  }, [loadAllData, dataLoaded]);

  // We use `dataLoaded` to show a skeleton, preventing flashes of unloaded content.
  // `isLoaded` from the store will trigger a re-render once the data is actually in the store.
  if (!isLoaded['serviceOrders']) { // Check a key to see if data is loaded
    return <LoadingSkeleton title="Cargando Módulos..." />;
  }

  return <DashboardPage />;
}
