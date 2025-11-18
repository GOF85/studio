

'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { Suspense, useEffect } from 'react';
import { PerformanceMonitor } from '@/components/debug/performance-monitor';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

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
                  <Suspense>
                    {children}
                  </Suspense>
              </div>
            </NProgressProvider>
          </ImpersonatedUserProvider>
        <Toaster />
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </body>
    </html>
  );
}
