
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';

import { GlobalLoadingIndicator } from '@/components/layout/global-loading-indicator';
import { QueryProvider } from '@/providers/query-provider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MICE Catering',
  description: 'Soluciones de alquiler para tus eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://zyrqdqpbrsevuygjrhvk.supabase.co" />
        
        {/* Optimize font loading */}
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <QueryProvider>
          <AuthProvider>
            <ImpersonatedUserProvider>
              <NProgressProvider>
                <GlobalLoadingIndicator />
                {children}
              </NProgressProvider>
            </ImpersonatedUserProvider>
          </AuthProvider>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </QueryProvider>
      </body>
    </html >
  );
}
