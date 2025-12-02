
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Warehouse, ClipboardList, ListChecks, History, AlertTriangle, Menu, ChevronRight } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const almacenNav = [
    { title: 'Planificación', href: '/almacen/planificacion', icon: ClipboardList, exact: false },
    { title: 'Gestión de Picking', href: '/almacen/picking', icon: ListChecks, exact: false },
    { title: 'Incidencias de Picking', href: '/almacen/incidencias', icon: AlertTriangle, exact: true },
    { title: 'Gestión de Retornos', href: '/almacen/retornos', icon: History, exact: false },
    { title: 'Incidencias de Retorno', href: '/almacen/incidencias-retorno', icon: AlertTriangle, exact: true },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Warehouse/>Panel de Almacen</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {almacenNav.map((item, index) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function AlmacenLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const currentPage = useMemo(() => {
      if (pathname.startsWith('/almacen/picking/')) return { title: 'Hoja de Picking', icon: ListChecks };
      if (pathname.startsWith('/almacen/retornos/')) return { title: 'Hoja de Retorno', icon: History };
      return almacenNav.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href));
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/almacen" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <Warehouse className="h-5 w-5"/>
                            <span>Panel de Almacen</span>
                        </Link>
                        {currentPage && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="py-8">
                    {children}
                </div>
            </div>
        </>
    );
}
