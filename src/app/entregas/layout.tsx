'use client';

import Link from 'next/link';
import { Package, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function EntregasHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-orange-500 text-white">
      <div className="container flex h-16 items-center">
        <Link href="/entregas" className="flex items-center gap-3">
          <Package className="h-7 w-7" />
          <h1 className="text-2xl font-headline font-bold tracking-tight">
            Entregas MICE
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="ghost" className="hover:bg-orange-600 hover:text-white">
                <Link href="/">
                    <ChevronLeft /> Volver a MICE Catering
                </Link>
            </Button>
        </nav>
      </div>
    </header>
  );
}


export default function EntregasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-orange">
        <EntregasHeader />
        {children}
    </div>
  );
}
