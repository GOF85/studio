

'use client';

import Link from 'next/link';
import { Leaf, Truck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSwitcher } from '@/components/portal/user-switcher';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';

function PortalHeader() {
  return (
    <Header />
  );
}


export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ImpersonatedUserProvider>
      <div className="no-print">
          <PortalHeader />
          {children}
      </div>
    </ImpersonatedUserProvider>
  );
}
