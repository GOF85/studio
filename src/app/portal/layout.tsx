
'use client';

import Link from 'next/link';
import { Leaf, Truck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSwitcher } from '@/components/portal/user-switcher';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';

function PortalHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
      <div className="container flex h-16 items-center">
        <Link href="/portal" className="flex items-center gap-3">
          <Leaf className="h-7 w-7 text-green-500" />
          <h1 className="text-2xl font-headline font-bold tracking-tight">
            Colaboradores MiceCatering
          </h1>
        </Link>
         <nav className="flex flex-1 items-center justify-end space-x-4">
            <UserSwitcher />
         </nav>
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
      <div className="no-print">
          <PortalHeader />
          {children}
      </div>
  );
}
