'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { BookHeart, ChevronRight } from 'lucide-react'; // Eliminado import de Menu
// Eliminados imports de Sheet, etc. porque ya no se usarán
import { bookNavLinks } from '@/lib/cpr-nav';

export default function BookLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Eliminado estado isSheetOpen ya que no hay menú lateral desplegable

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
                    
                    {/* BREADCRUMBS (Sin botón de menú hamburguesa a la izquierda) */}
                    <div className="flex items-center text-sm font-medium overflow-hidden whitespace-nowrap">
                        <Link 
                            href="/book" 
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <BookHeart className="h-5 w-5 text-primary"/> {/* Icono un pelín más grande y con color */}
                            <span className="font-bold">Book</span>
                        </Link>

                        {currentSection && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0"/>
                                <Link 
                                    href={currentSection.path} 
                                    className={cn(
                                        "flex items-center gap-2 transition-colors hover:text-primary",
                                        pathname === currentSection.path ? "text-foreground font-semibold" : "text-muted-foreground"
                                    )}
                                >
                                    {/* Icono de la sección opcional, si quieres mantenerlo limpio quítalo */}
                                    {currentSection.icon && <currentSection.icon className="h-4 w-4"/>}
                                    <span>{currentSection.title}</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 w-full">
                {children}
            </div>
        </div>
    );
}