
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AreaChart, ChevronRight, Factory, Users, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbNameMap: Record<string, { name: string; icon: React.ElementType }> = {
    'cpr': { name: 'CPR', icon: Factory },
    'ventaGastronomia': { name: 'Venta Gastronomía', icon: Euro },
    'costeMP': { name: 'Coste Materia Prima', icon: Euro },
    'cesionIngreso': { name: 'Ingreso por Cesión', icon: Users },
    'cesionGasto': { name: 'Gasto por Cesión', icon: Users },
    'personalApoyo': { name: 'Personal de Apoyo', icon: Users },
}

function Breadcrumbs() {
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams() ?? new URLSearchParams();

    const pathSegments = pathname.split('/').filter(Boolean);
    const cprIndex = pathSegments.indexOf('cpr');
    const hasCpr = cprIndex !== -1;
    const detailSegment = hasCpr && pathSegments.length > cprIndex + 1 ? pathSegments[cprIndex + 1] : null;

    const detailInfo = detailSegment ? breadcrumbNameMap[detailSegment] : null;

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const cprHref = `/control-explotacion/cpr${from && to ? `?from=${from}&to=${to}` : ''}`;

    return (
        <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                    <Link href="/control-explotacion" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <AreaChart className="h-5 w-5" />
                        <span>Control de Explotación</span>
                    </Link>
                    {hasCpr && (
                        <>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Link href={cprHref} className={cn("flex items-center gap-2", detailInfo ? "text-muted-foreground hover:text-primary" : "text-primary font-bold")}>
                                <Factory className="h-5 w-5" />
                                <span>CPR</span>
                            </Link>
                        </>
                    )}
                    {detailInfo && (
                        <>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="flex items-center gap-2 font-bold text-primary">
                                <detailInfo.icon className="h-5 w-5" />
                                <span>{detailInfo.name}</span>
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ControlExplotacionLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Suspense fallback={
                <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                            <AreaChart className="h-5 w-5 text-muted-foreground" />
                            <span className="text-muted-foreground">Control de Explotación</span>
                        </div>
                    </div>
                </div>
            }>
                <Breadcrumbs />
            </Suspense>
            <div className="container mx-auto px-4 pt-0 pb-8">
                {children}
            </div>
        </>
    );
}
