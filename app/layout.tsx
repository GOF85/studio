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
});

export const metadata: Metadata = {
  title: 'Studio App',
  description: 'Gestión de eventos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
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