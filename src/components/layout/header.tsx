
'use client';

import Link from 'next/link';
import { UtensilsCrossed, Leaf, Users, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserSwitcher } from '../portal/user-switcher';

export function Header({ user, onLogout }: { user?: User | null, onLogout?: () => void }) {
  const pathname = usePathname();
  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');

  if (isPortalModule) {
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
      )
  }
  
  const getEntregasHeader = () => (
    <header className="sticky top-0 z-40 w-full border-b bg-orange-500 text-white">
      <div className="container flex h-16 items-center">
        <Link href="/entregas" className="flex items-center gap-3">
          <Leaf className="h-7 w-7" />
          <h1 className="text-2xl font-headline font-bold tracking-tight">
            Entregas MICE
          </h1>
        </Link>
         <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="outline" className="border-white/50 text-white hover:bg-white/20 hover:text-white">
              <Link href="/">
                <UtensilsCrossed className="mr-2 h-5 w-5"/>
                Catering
              </Link>
            </Button>
            <UserSwitcher />
        </nav>
      </div>
    </header>
  );

  const getDefaultHeader = () => (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}>
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
            MICE Catering
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
              <Link href="/entregas">
                <Leaf className="mr-2 h-5 w-5"/>
                Entregas MICE
              </Link>
            </Button>
            <UserSwitcher />
        </nav>
      </div>
    </header>
  );
  
  return isEntregasModule ? getEntregasHeader() : getDefaultHeader();
}
