'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { BookHeart, ChevronRight, Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { bookNavLinks } from '@/lib/cpr-nav';

// Componente del contenido del menú lateral (Sheet)
function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b text-left">
                <SheetTitle className="flex items-center gap-2 text-lg">
                    <BookHeart className="h-5 w-5"/>
                    Book Gastronómico
                </SheetTitle>
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
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                                isActive ? "bg-accent text-accent-foreground" : "transparent"
                            )}
                        >
                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
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

    // Detectar la sección actual para el breadcrumb
    const currentSection = useMemo(() => {
        if (!pathname) return null;
        // Busca el link que coincida con el inicio del path actual (ej: /book/recetas)
        return bookNavLinks.find(link => pathname.startsWith(link.path) && link.path !== '/book');
    }, [pathname]);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            
            {/* BARRA DE NAVEGACIÓN SUPERIOR (BREADCRUMBS) */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-12 items-center px-4">
                    
                    {/* Menú Móvil (Hamburger) */}
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                                <Menu className="h-5 w-5"/>
                                <span className="sr-only">Menú</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0">
                            <NavContent closeSheet={() => setIsSheetOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    {/* Breadcrumbs */}
                    <div className="flex items-center text-sm font-medium overflow-hidden whitespace-nowrap">
                        <Link 
                            href="/book" 
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <BookHeart className="h-4 w-4"/>
                            <span className="hidden xs:inline">Book</span>
                        </Link>

                        {currentSection && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0"/>
                                <Link 
                                    href={currentSection.path} 
                                    className={cn(
                                        "flex items-center gap-2 transition-colors hover:text-primary",
                                        // Si estamos en la raíz de la sección, color activo, si no, muted
                                        pathname === currentSection.path ? "text-foreground font-semibold" : "text-muted-foreground"
                                    )}
                                >
                                    {currentSection.icon && <currentSection.icon className="h-4 w-4 hidden sm:block"/>}
                                    <span>{currentSection.title}</span>
                                </Link>
                            </>
                        )}
                        
                        {/* NOTA: Hemos eliminado el título dinámico de la receta aquí.
                           Razón: Las páginas nuevas ya tienen su propio header con título.
                           Esto evita redundancia y limpia la interfaz móvil.
                        */}
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL 
                Importante: Eliminado padding extra (py-8) y container.
                Dejamos que las páginas controlen sus propios márgenes.
            */}
            <div className="flex-1 w-full">
                {children}
            </div>
        </div>
    );
}