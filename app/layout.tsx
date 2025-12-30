import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 1. IMPORTAMOS AMBOS PROVEEDORES
import QueryProvider from '@/providers/query-provider'; 
import { AuthProvider } from '@/providers/auth-provider'; // Asumiendo exportación nombrada
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Mice Catering',
  description: 'Gestión de eventos',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/mc.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={inter.className}>
        {/* 2. ENVOLVEMOS: AuthProvider (primero) -> QueryProvider -> App */}
        <AuthProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}