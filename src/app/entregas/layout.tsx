

'use client';

import Link from 'next/link';
import { Package, ChevronLeft, Truck, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';

export default function EntregasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-orange">
        <Header />
        <div className="bg-background text-foreground min-h-[calc(100vh-4rem)]">
          {children}
        </div>
    </div>
  );
}
