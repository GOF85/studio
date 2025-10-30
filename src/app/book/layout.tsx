

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion } from '@/types';
import { BookHeart, ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { bookNavLinks } from '@/lib/cpr-nav';
import { Skeleton } from '@/components/ui/skeleton';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><BookHeart/>Book Gastronómico</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {bookNavLinks.map((item, index) => {
                    const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
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
                )})}
            </nav>
        </div>
    );
}


export default function BookLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [pageTitle, setPageTitle] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const currentPage = useMemo(() => {
        if (!pathname) return null;
        return bookNavLinks.find(link => pathname.startsWith(link.path) && link.path !== '/book');
    }, [pathname]);

    useEffect(() => {
        if (!isClient || !pathname) return;

        const pathSegments = pathname.split('/').filter(Boolean);
        const hasId = pathSegments.length > 2;

        if (hasId) {
            const moduleSegment = pathSegments[1];
            const idSegment = pathSegments[2];
            const isNew = idSegment === 'nueva';
            const searchParams = new URLSearchParams(window.location.search);
            const cloneId = searchParams.get('cloneId');
            
            let title = '';

            if (isNew) {
                if (cloneId) {
                     title = `Clonando ${moduleSegment === 'recetas' ? 'Receta' : 'Elaboración'}`;
                } else {
                    title = `Nueva ${moduleSegment === 'recetas' ? 'Receta' : 'Elaboración'}`;
                }
            } else {
                 try {
                    if (moduleSegment === 'recetas') {
                        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
                        const recipe = allRecetas.find(r => r.id === idSegment);
                        title = recipe?.nombre || '...';
                    } else if (moduleSegment === 'elaboraciones') {
                        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
                        const elaboracion = allElaboraciones.find(e => e.id === idSegment);
                        title = elaboracion?.nombre || '...';
                    }
                } catch (e) {
                    console.error("Failed to parse from localStorage:", e);
                    title = '...';
                }
            }
             setPageTitle(title);
        } else {
            setPageTitle(null);
        }
    }, [pathname, isClient]);

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
                        <Link href="/book" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <BookHeart className="h-5 w-5"/>
                            <span>Book Gastronómico</span>
                        </Link>
                        {currentPage && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <Link href={currentPage.path} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                    {currentPage.icon && <currentPage.icon className="h-5 w-5"/>}
                                    <span>{currentPage.title}</span>
                                </Link>
                            </>
                        )}
                         {pageTitle && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-primary font-bold">{pageTitle}</span>
                            </>
                         )}
                         {/* Skeleton for initial client render */}
                         {!pageTitle && isClient && pathname.split('/').filter(Boolean).length > 2 && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <Skeleton className="h-5 w-32" />
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
