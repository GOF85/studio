

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { Database, Menu, ChevronRight, Settings } from 'lucide-react';
import { bdNavLinks } from '@/lib/bd-nav';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScrollTop } from '@/hooks/useScrollTop';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname() ?? '';
    return (
        <div className="w-full h-full flex flex-col bg-background/95 backdrop-blur-md">
            <SheetHeader className="p-6 border-b border-border/40">
                <SheetTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                        <Database className="h-5 w-5" />
                    </div>
                    Bases de Datos
                </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
                <nav className="grid items-start gap-1.5 p-4">
                    {bdNavLinks.map((item, index) => {
                        const isActive = pathname.startsWith(item.path);
                        return (
                            <Link
                                key={index}
                                href={item.path}
                                onClick={closeSheet}
                                className={cn(
                                    "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center">
                                    <item.icon className={cn(
                                        "mr-3 h-4 w-4 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                    <span>{item.title}</span>
                                </div>
                                {isActive && <ChevronRight className="h-4 w-4" />}
                            </Link>
                        )
                    })}
                </nav>
            </ScrollArea>
        </div>
    );
}


export default function BdLayout({ children }: { children: React.ReactNode }) {
    useScrollTop();
    const pathname = usePathname() ?? '';
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
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
            <div className="sticky top-11 md:top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="mr-2 rounded-xl border-border/40 bg-background/40 backdrop-blur-sm hover:bg-primary/5 transition-all active:scale-95">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[300px] p-0 border-r border-border/40">
                                    <NavContent closeSheet={() => setIsSheetOpen(false)} />
                                </SheetContent>
                            </Sheet>

                            <Link href="/bd" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-300 group">
                                <div className="p-1.5 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                    <Database className="h-4 w-4" />
                                </div>
                                <span className="hidden sm:inline tracking-tight">Bases de datos</span>
                            </Link>

                            {currentPage && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                                    <Link href={currentPage.path} className={cn(
                                        "flex items-center gap-2 transition-all duration-300 px-2 py-1 rounded-lg",
                                        thirdLevelBreadcrumb
                                            ? "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                            : "font-black text-primary bg-primary/5"
                                    )}>
                                        <currentPage.icon className="h-4 w-4" />
                                        <span className="tracking-tight">{currentPage.title}</span>
                                    </Link>
                                </>
                            )}

                            {thirdLevelBreadcrumb && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                                    <div className="px-2 py-1 rounded-lg bg-primary/10 font-black text-primary tracking-tight">
                                        {thirdLevelBreadcrumb}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-0 pb-8">
                {children}
            </main>
        </div>
    );
}
