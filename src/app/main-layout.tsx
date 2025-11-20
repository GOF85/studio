
'use client';

import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useDataStore, ALL_DATA_KEYS, defaultValuesMap } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PerformanceMonitor } from '@/components/debug/performance-monitor';

export function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoaded, setData } = useDataStore();

  useEffect(() => {
    // This effect runs once on initial client-side mount and triggers the global data load.
    const loadedData: { [key: string]: any } = {};
    ALL_DATA_KEYS.forEach(key => {
        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue) {
                loadedData[key] = JSON.parse(storedValue);
            } else {
                loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
            }
        } catch(e) {
            console.warn(`Could not parse key: ${key}. Setting to default.`, e);
            loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
        }
    });
    setData(loadedData);
  }, [setData]);

  return (
    <>
      {!isLoaded ? (
        <LoadingSkeleton title="Cargando datos de la aplicación..." />
      ) : (
        <div className="flex-1">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
              <aside className="hidden w-[250px] flex-col lg:flex sticky top-14 h-[calc(100vh-3.5rem)]">
                <Sidebar />
              </aside>
              <main className="py-6">
                <Suspense>
                  {children}
                </Suspense>
              </main>
            </div>
          </div>
        </div>
      )}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
    </>
  );
}
