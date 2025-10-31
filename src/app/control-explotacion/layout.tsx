
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AreaChart, ChevronRight, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';


export default function ControlExplotacionLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isCprPage = pathname.startsWith('/control-explotacion/cpr');
    const isDetailPage = pathname.includes('/ventaGastronomia') || pathname.includes('/costeMP');

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                        <Link href="/control-explotacion" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <AreaChart className="h-5 w-5"/>
                            <span>Control de Explotación</span>
                        </Link>
                        {isCprPage && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <Link href="/control-explotacion/cpr" className={cn("flex items-center gap-2", isDetailPage ? "text-muted-foreground hover:text-primary" : "text-primary font-bold")}>
                                    <Factory className="h-5 w-5"/>
                                    <span>CPR</span>
                                </Link>
                            </>
                        )}
                         {isDetailPage && pathname.includes('/ventaGastronomia') && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-primary font-bold">Detalle de Venta</span>
                            </>
                         )}
                         {isDetailPage && pathname.includes('/costeMP') && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-primary font-bold">Detalle de Coste MP</span>
                            </>
                         )}
                    </div>
                </div>
            </div>
             <div className="py-8 container mx-auto">
                {children}
            </div>
        </>
    );
}
