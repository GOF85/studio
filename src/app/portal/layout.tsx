'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PortalHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
      <div className="container flex h-16 items-center">
        <Link href="/portal" className="flex items-center gap-3">
          <Package className="h-7 w-7 text-orange-500" />
          <h1 className="text-2xl font-headline font-bold tracking-tight">
            MICE Portales Externos
          </h1>
        </Link>
      </div>
    </header>
  );
}


export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
        <PortalHeader />
        {children}
    </div>
  );
}
