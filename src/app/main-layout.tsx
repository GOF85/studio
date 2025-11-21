
'use client';

import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoaded, loadAllData } = useDataStore();

  useEffect(() => {
    // This effect runs once on initial client-side mount and triggers the global data load.
    loadAllData();
  }, [loadAllData]);

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
    </>
  );
}
