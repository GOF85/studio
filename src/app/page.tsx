
'use client';

import { useEffect } from 'react';
import { DashboardPage } from '@/app/dashboard-page';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingScreen } from '@/components/layout/loading-screen';


export default function HomePage() {
  const { isLoaded, loadAllData } = useDataStore();

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);
  
  if (!isLoaded) {
    return <LoadingScreen/>
  }

  return <DashboardPage />;
}
