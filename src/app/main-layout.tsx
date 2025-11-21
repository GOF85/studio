
'use client';

import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Header } from '@/components/layout/header';
import { useDataStore } from '@/hooks/use-data-store';

export function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoaded, loadAllData } = useDataStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);


  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando datos de la aplicación..." />;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
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
    </div>
  );
}
