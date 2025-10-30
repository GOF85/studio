

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion } from '@/types';
import { BookHeart, ChefHat, Component, Package, Sprout, CheckSquare, ChevronRight, Menu, FilePenLine, BarChart3 } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const bookNavLinks = [
    { title: 'Panel de Control', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Información de Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

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
    const [pageTitle, setPageTitle] = useState('');
    
     const { currentPage, isDetailPage, detailId } = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['book', 'recetas', '12345']
        
        if (pathSegments.length > 2 && (pathSegments[1] === 'recetas' || pathSegments[1] === 'elaboraciones')) {
            const moduleSegment = pathSegments[1];
            const page = bookNavLinks.find(link => link.path.includes(moduleSegment));
            return {
                currentPage: page,
                isDetailPage: true,
                detailId: pathSegments[2]
            };
        }

        const page = bookNavLinks.find(link => pathname.startsWith(link.path) && !(link.exact && pathname !== link.path));
        
        return {
            currentPage: page,
            isDetailPage: false,
            detailId: null,
        };
    }, [pathname]);

    useEffect(() => {
        if (isDetailPage && detailId) {
            if (currentPage?.path.includes('recetas')) {
                const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
                const recipe = allRecetas.find(r => r.id === detailId);
                setPageTitle(recipe?.nombre || '');
            } else if (currentPage?.path.includes('elaboraciones')) {
                const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
                const elaboracion = allElaboraciones.find(e => e.id === detailId);
                setPageTitle(elaboracion?.nombre || '');
            }
        } else {
            setPageTitle('');
        }
    }, [pathname, currentPage, isDetailPage, detailId]);

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
                        {currentPage && currentPage.path !== '/book' && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <Link href={currentPage.path} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                    <currentPage.icon className="h-5 w-5"/>
                                    <span>{currentPage.title}</span>
                                </Link>
                            </>
                        )}
                         {isDetailPage && pageTitle && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-primary font-bold">{pageTitle}</span>
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
