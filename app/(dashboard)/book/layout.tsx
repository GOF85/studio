'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { BookHeart, ChevronRight } from 'lucide-react';
import { bookNavLinks } from '@/lib/cpr-nav';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';

export default function BookLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Detectar la sección actual para el breadcrumb dinámico
    const currentSection = useMemo(() => {
        if (!pathname) return null;
        return bookNavLinks.find(link => pathname.startsWith(link.path) && link.path !== '/book');
    }, [pathname]);

    return (
        <ImpersonatedUserProvider>
            <div className="flex flex-col min-h-screen bg-background">
                
                {/* BARRA DE NAVEGACIÓN SUPERIOR (BREADCRUMBS) */}
                <header className="sticky top-12 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {/* Alineación corregida: max-w-7xl igual que el contenido de las páginas */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-12 items-center">
                        
                        {/* BREADCRUMBS */}
                        <div className="flex items-center text-sm font-medium overflow-hidden whitespace-nowrap">
                            <Link 
                                href="/book" 
                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <BookHeart className="h-5 w-5 text-primary"/>
                                {/* CAMBIO AQUI: Texto actualizado */}
                                <span className="font-bold">Book Gastronómico</span>
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
                                        {currentSection.icon && <currentSection.icon className="h-4 w-4 hidden sm:block"/>}
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
        </ImpersonatedUserProvider>
    );
}