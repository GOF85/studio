

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { BookHeart, ChefHat, Component, Package, GlassWater, Sprout, CheckSquare } from 'lucide-react';

const bookNavLinks = [
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Revisión de Ingredientes', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Información de Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Materia Prima (ERP)', path: '/bd/erp', icon: Package },
];

export default function BookLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, [])

    const currentPage = useMemo(() => {
        return bookNavLinks.find(link => pathname.startsWith(link.path));
    }, [pathname]);

    if (!isMounted) {
        return <div className="h-screen w-full bg-background" />;
    }

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-4 py-2">
                         <Link href="/book" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <BookHeart className="h-5 w-5"/>
                            <span className="font-semibold">Book Gastronómico</span>
                        </Link>
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                    <aside className="lg:sticky top-28 self-start h-[calc(100vh-8rem)] hidden lg:block">
                         <nav className="grid items-start gap-1">
                            {bookNavLinks.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.path}
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
                    </aside>
                    <main>
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
