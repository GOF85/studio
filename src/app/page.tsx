'use client';

import { useEffect } from 'react';
import { DashboardPage } from '@/app/dashboard-page';
import { useDataStore } from '@/hooks/use-data-store';

export default function HomePage() {
  const { loadKeys } = useDataStore();

  useEffect(() => {
    // Pre-load some basic data for the dashboard if needed in the future
    // For now, it's just links, so no pre-loading is necessary.
    // Example: loadKeys(['serviceOrders', 'entregas']);
  }, [loadKeys]);
  
  return <DashboardPage />;
}