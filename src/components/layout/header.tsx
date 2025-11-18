
'use client';

import Link from 'next/link';
import { UtensilsCrossed, Package, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserSwitcher } from '../portal/user-switcher';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Sidebar } from './sidebar';

export function Header() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');

   if (isPortalModule) {
      return (
        <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
          <div className="container flex h-12 items-center">
            <Link href="/portal" className="flex items-center gap-3">
              <Package className="h-6 w-6 text-orange-500" />
              <h1 className="text-xl font-headline font-bold tracking-tight">
                Portal de Colaboradores
              </h1>
            </Link>
             <nav className="flex flex-1 items-center justify-end space-x-4">
                <UserSwitcher />
             </nav>
          </div>
        </header>
      )
  }

  return (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b",
        isEntregasModule ? "theme-orange bg-background" : "bg-background"
      )}>
      <div className="container flex h-14 items-center">
        <div className="lg:hidden mr-4">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar onLinkClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <Link href="/" className="flex items-center gap-3">
            {isEntregasModule ? <Package className="h-6 w-6 text-primary" /> : <UtensilsCrossed className="h-6 w-6 text-primary" />}
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">
                {isEntregasModule ? "Entregas MICE" : "MICE Catering"}
            </h1>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <UserSwitcher />
        </div>
      </div>
    </header>
  );
}
