
'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PerformanceMonitor } from '@/components/debug/performance-monitor';

export default function RootLayout({
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>MICE Catering</title>
        <meta name="description" content="Soluciones de alquiler para tus eventos" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
          <ImpersonatedUserProvider>
            <NProgressProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
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
              </div>
              {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
            </NProgressProvider>
          </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
}
