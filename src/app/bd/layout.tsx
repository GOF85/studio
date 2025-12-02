

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { Database, Menu, ChevronRight, Settings } from 'lucide-react';
import { bdNavLinks } from '@/lib/bd-nav';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Database />Bases de Datos</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {bdNavLinks.map((item, index) => {
                    const isActive = pathname.startsWith(item.path);
                    return (
                        <Link
                            key={index}
                            href={item.path}
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
                    )
                })}
            </nav>
        </div>
    );
}


export default function BdLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, [])

    const currentPage = useMemo(() => {
        return bdNavLinks.find(link => pathname.startsWith(link.path));
    }, [pathname]);

    const thirdLevelBreadcrumb = useMemo(() => {
        if (!currentPage) return null;

        // Check if we're in a sub-route (not just the base path)
        if (pathname === currentPage.path) return null;

        const pathAfterBase = pathname.replace(currentPage.path, '');

        if (pathAfterBase === '/nuevo') {
            // Determine label based on the section
            if (currentPage.path.includes('personal')) return 'Nuevo Empleado';
            if (currentPage.path.includes('categorias-recetas')) return 'Nueva Categoría';
            if (currentPage.path.includes('espacios')) return 'Nuevo Espacio';
            return 'Nuevo';
        } else if (pathAfterBase.match(/^\/[^/]+$/)) {
            // It's an ID route like /[id]
            return 'Editar';
        }

        return null;
    }, [pathname, currentPage]);

    if (!isMounted) {
        return <div className="h-screen w-full bg-background" />;
    }

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="mr-2">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[280px] p-0">
                                    <NavContent closeSheet={() => setIsSheetOpen(false)} />
                                </SheetContent>
                            </Sheet>
                            <Link href="/bd" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                <Database className="h-5 w-5" />
                                <span>Bases de datos</span>
                            </Link>
                            {currentPage && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    <Link href={currentPage.path} className={cn(
                                        "flex items-center gap-2 transition-colors",
                                        thirdLevelBreadcrumb ? "text-muted-foreground hover:text-primary" : "font-bold text-primary"
                                    )}>
                                        <currentPage.icon className="h-5 w-5" />
                                        <span>{currentPage.title}</span>
                                    </Link>
                                </>
                            )}
                            {thirdLevelBreadcrumb && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold text-primary">
                                        {thirdLevelBreadcrumb}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <main className="container mx-auto px-4 py-4">
                {children}
            </main>
        </>
    );
}
