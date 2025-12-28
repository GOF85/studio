
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ChevronRight, ClipboardList, Package, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const analiticaNav = [
    { title: 'Panel de Analítica', href: '/analitica', exact: true, icon: BarChart3 },
    { title: 'Analítica de Catering', href: '/analitica/catering', exact: true, icon: ClipboardList },
    { title: 'Analítica de Entregas', href: '/analitica/entregas', exact: true, icon: Package },
    { title: 'Variación de Precios', href: '/analitica/variacion-precios', exact: true, icon: TrendingUp },
];

export default function AnaliticaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';

    const currentPage = useMemo(() => {
        return analiticaNav.find(item => item.href === (pathname || '/analitica'));
    }, [pathname]);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                        <Link href="/analitica" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <BarChart3 className="h-5 w-5" />
                            <span>Análisis de negocio</span>
                        </Link>
                        {currentPage && currentPage.href !== '/analitica' && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <currentPage.icon className="h-5 w-5 text-muted-foreground" />
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="container mx-auto px-4 pt-0 pb-8">
                {children}
            </div>
        </div>
    );
}
