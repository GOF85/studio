
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Warehouse, ClipboardList, ListChecks, History, AlertTriangle, Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const almacenNav = [
    { title: 'Planificación', href: '/almacen/planificacion', icon: ClipboardList, exact: false },
    { title: 'Gestión de Picking', href: '/almacen/picking', icon: ListChecks, exact: false },
    { title: 'Incidencias de Picking', href: '/almacen/incidencias', icon: AlertTriangle, exact: true },
    { title: 'Gestión de Retornos', href: '/almacen/retornos', icon: History, exact: false },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="pb-4 mb-4 border-b text-left">
                <SheetTitle className="text-xl font-headline font-bold flex items-center gap-3"><Warehouse size={24}/>Panel de Almacen</SheetTitle>
                <p className="text-sm text-muted-foreground pl-[36px]">
                    Logística de material y expediciones.
                </p>
            </SheetHeader>
            <nav className="grid items-start gap-1">
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
    
    const currentPage = almacenNav.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href)) || { title: 'Panel de Almacen', icon: Warehouse };
    const PageIcon = currentPage.icon;

    return (
        <div className="container mx-auto">
            <div className="flex items-center justify-between mb-4 lg:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5"/>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px]">
                         <NavContent closeSheet={() => setIsSheetOpen(false)} />
                    </SheetContent>
                </Sheet>
                 <h1 className="text-xl font-headline font-bold flex items-center gap-2">
                    <PageIcon className="h-6 w-6"/> {currentPage.title}
                </h1>
            </div>

            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="pb-4 mb-4 border-b">
                        <h2 className="text-xl font-headline font-bold flex items-center gap-3"><Warehouse size={24}/>Panel de Almacen</h2>
                        <p className="text-sm text-muted-foreground">
                            Logística de material y expediciones.
                        </p>
                    </div>
                    <nav className="grid items-start gap-1">
                        {almacenNav.map((item, index) => {
                            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                            return (
                            <Link
                                key={index}
                                href={item.href}
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
                </aside>
                <main className="py-8 pt-0 lg:pt-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
