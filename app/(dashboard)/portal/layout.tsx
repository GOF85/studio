
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ChevronRight, Activity, UserCog, Factory, Users, Truck } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import type { Proveedor } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const breadcrumbNameMap: { [key: string]: { name: string; icon: React.ElementType } } = {
    'portal': { name: 'Portal', icon: Home },
    'activity-log': { name: 'Registro de Actividad', icon: Activity },
    'gestion-accesos': { name: 'Gestión de Accesos', icon: UserCog },
    'nuevo': { name: 'Nuevo Usuario', icon: UserCog },
    'partner': { name: 'Partner de Producción', icon: Factory },
    'personal': { name: 'Partner de Personal', icon: Users },
    'transporte': { name: 'Transporte', icon: Truck },
};


import { useProveedores } from '@/hooks/use-data-queries';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, profile, isProvider, isLoading } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    const { data: allProveedores = [] } = useProveedores();

    const proveedor = useMemo(() => {
        if (!profile?.proveedor_id) return null;
        return allProveedores.find(p => p.id === profile.proveedor_id) || null;
    }, [profile?.proveedor_id, allProveedores]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const pathSegments = useMemo(() => {
        const safePath = pathname ?? '';
        const segments = safePath.split('/').filter(Boolean);
        const portalIndex = segments.indexOf('portal');
        return segments.slice(portalIndex);
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-2 text-sm font-semibold">
                        <div className="flex items-center gap-2">
                            {isMounted ? pathSegments.map((segment, index) => {
                                const segmentInfo = breadcrumbNameMap[segment];
                                const isLast = index === pathSegments.length - 1;
                                const href = `/${pathSegments.slice(0, index + 1).join('/')}`;

                                if (!segmentInfo) return null;

                                const Icon = segmentInfo.icon;

                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        <Link href={href} className={cn("flex items-center gap-2", isLast ? "text-primary font-bold" : "text-muted-foreground hover:text-primary transition-colors")}>
                                            <Icon className="h-4 w-4" />
                                            <span>{segmentInfo.name}</span>
                                        </Link>
                                        {!isLast && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                );
                            }) : <Skeleton className="h-5 w-64" />}
                        </div>
                        {isMounted && proveedor && (
                            <Badge variant="outline">{proveedor.nombreComercial}</Badge>
                        )}
                    </div>
                </div>
            </div>
            <div className="container mx-auto pt-0 pb-8">
                {children}
            </div>
        </>
    );
}
