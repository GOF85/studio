

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { Database, Users, Package, Building, ChevronRight, Layers, FilePlus2, Box } from 'lucide-react';

const bdNavLinks = [
    { title: 'Gestión de Personal', path: '/bd/personal', icon: Users },
    { title: 'Gestión de Espacios', path: '/bd/espacios', icon: Building },
    { title: 'Gestión de Artículos MICE', path: '/bd/articulos', icon: Package },
    { title: 'Gestión de Familias ERP', path: '/bd/familiasERP', icon: Layers },
    { title: 'Formatos de Expedición', path: '/bd/formatos-expedicion', icon: Box },
];

export default function BdLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, [])

    const currentPage = useMemo(() => {
        return bdNavLinks.find(link => pathname.startsWith(link.path));
    }, [pathname]);

    if (!isMounted) {
        return <div className="h-screen w-full bg-background" />;
    }

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Link href="/bd" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                <Database className="h-5 w-5"/>
                                <span>Bases de datos</span>
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
            </div>
             <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </>
    );
}
