

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { BookHeart, ChefHat, Component, Package, Sprout, CheckSquare, ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const bookNavLinks = [
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Revisión de Ingredientes', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Información de Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Materia Prima (ERP)', path: '/bd/erp', icon: Package },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
         <nav className="grid items-start gap-1 p-4">
            {bookNavLinks.map((item, index) => (
                <Link
                    key={index}
                    href={item.path}
                    onClick={closeSheet}
                >
                    <span
                        className={cn(
                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                            pathname.startsWith(item.path) ? "bg-accent" : "transparent"
                        )}
                    >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                    </span>
                </Link>
            ))}
        </nav>
    );
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const currentPage = useMemo(() => {
        if (pathname === '/book') {
            return { title: 'Dashboard', icon: BookHeart };
        }
        return bookNavLinks.find(link => pathname.startsWith(link.path));
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
                                <SheetHeader>
                                    <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                                </SheetHeader>
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
