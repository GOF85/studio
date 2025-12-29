'use client';

import Link from 'next/link';
import { UtensilsCrossed, Leaf, Package, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { RoleSwitcher } from '@/components/auth/role-switcher';
import { useAuth } from '@/providers/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { Menu } from 'lucide-react';
import { allNavSections } from '@/lib/nav-config';

export function Header() {
  const pathname = usePathname() ?? '';
  const { user, profile, signOut, isLoading } = useAuth();

  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');

  const UserMenu = () => {
    if (isLoading) return <div className="h-8 w-8 animate-pulse bg-slate-200 rounded-full" />;
    if (!user) return (
      <Button asChild variant="ghost">
        <Link href="/login">Iniciar Sesión</Link>
      </Button>
    );

    return (
      <div className="flex items-center gap-2">
        <RoleSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <UserIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.nombre_completo || 'Usuario'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (isPortalModule) {
    return (
      <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
        <div className="container flex h-11 md:h-12 items-center px-3 md:px-4">
          <Link href="/portal" className="flex items-center gap-2 md:gap-3 -ml-1">
            <Leaf className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            <h1 className="text-base md:text-xl font-headline font-bold tracking-tight">
              Colaboradores MiceCatering
            </h1>
          </Link>
          <nav className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
            <UserMenu />
          </nav>
        </div>
      </header>
    )
  }

  const getEntregasHeader = () => (
    <header className="sticky top-0 z-40 w-full border-b bg-orange-500 text-white">
      <div className="container flex h-11 md:h-12 items-center px-3 md:px-4">
        <Link href="/entregas" className="flex items-center gap-2 md:gap-3 -ml-1">
          <Package className="h-5 w-5 md:h-6 md:w-6" />
          <h1 className="text-base md:text-xl font-headline font-bold tracking-tight">
            Entregas MICE
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
          <Button asChild className="bg-emerald-700 text-white hover:bg-emerald-800 h-8 text-xs md:text-sm md:h-9">
            <Link href="/">
              <UtensilsCrossed className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Catering</span>
            </Link>
          </Button>
          <UserMenu />
        </nav>
      </div>
    </header>
  );

  const getDefaultHeader = () => (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b",
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className="container flex h-11 md:h-12 items-center px-3 md:px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2 -ml-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left font-headline font-bold text-primary flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                MICE Catering
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navegación principal del sistema
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-6 mt-6">
              {allNavSections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h4>
                  <div className="flex flex-col space-y-1">
                    {section.items.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                            pathname === item.href && "bg-accent/50 text-accent-foreground"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4", item.className?.includes('theme-orange') ? 'text-orange-500' : 'text-primary')} />
                          {item.title}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <UtensilsCrossed className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h1 className="text-base md:text-xl font-headline font-bold text-primary tracking-tight">
            MICE Catering
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
          <UserMenu />
        </nav>
      </div>
    </header>
  );

  return isEntregasModule ? getEntregasHeader() : getDefaultHeader();
}
