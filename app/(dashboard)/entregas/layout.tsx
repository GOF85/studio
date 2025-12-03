

'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';

export default function EntregasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-orange">
        <div className="bg-background text-foreground min-h-[calc(100vh-3rem)]">
          {children}
        </div>
    </div>
  );
}
