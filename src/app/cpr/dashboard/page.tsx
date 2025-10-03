

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Factory, CheckCircle, AlertTriangle, PackagePlus, LayoutDashboard } from 'lucide-react';
import type { OrdenFabricacion } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cprNav } from '@/lib/cpr-nav';
import { cn } from '@/lib/utils';


type StatusCounts = {
    Pendiente: number;
    Asignada: number;
    'En Proceso': number;
    Finalizado: number;
    Incidencia: number;
    Validado: number;
    [key: string]: number;
};

export default function CprDashboardPage() {
    const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        let storedData = localStorage.getItem('ordenesFabricacion');
        if (storedData) {
            setOrdenes(JSON.parse(storedData));
        }
        setIsMounted(true);
    }, []);

    const statusCounts = useMemo(() => {
        const counts: StatusCounts = {
            'Pendiente': 0,
            'Asignada': 0,
            'En Proceso': 0,
            'Finalizado': 0,
            'Incidencia': 0,
            'Validado': 0,
        };
        ordenes.forEach(of => {
            counts[of.estado]++;
        });
        return counts;
    }, [ordenes]);
    
    const lotesPendientesCalidad = useMemo(() => {
        return ordenes.filter(of => of.estado === 'Finalizado' && !of.okCalidad && !of.incidencia).length;
    }, [ordenes]);

    const statsCards = [
        { title: 'OF Pendientes', value: statusCounts.Pendiente, icon: Factory, color: 'text-gray-500', href: '/cpr/of' },
        { title: 'OF En Proceso', value: statusCounts['En Proceso'], icon: Factory, color: 'text-blue-500', href: '/cpr/of' },
        { title: 'Pendiente Calidad', value: lotesPendientesCalidad, icon: CheckCircle, color: 'text-yellow-500', href: '/cpr/calidad' },
        { title: 'Incidencias', value: statusCounts.Incidencia, icon: AlertTriangle, color: 'text-red-500', href: '/cpr/incidencias' },
    ];


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Dashboard de Producción..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <LayoutDashboard />
                    Dashboard de Producción
                </h1>
                <p className="text-muted-foreground mt-1">Visión general del estado actual del taller de producción.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {statsCards.map(card => (
                    <Link href={card.href} key={card.title}>
                        <Card className="hover:bg-accent transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={cn("h-4 w-4", card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Módulos de Producción</CardTitle>
                    <CardDescription>Accesos directos a las principales funcionalidades del CPR.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {cprNav.filter(item => item.href !== '/cpr/dashboard').map((item) => (
                        <Link href={item.href} key={item.href}>
                            <div className="p-4 border rounded-lg hover:bg-accent transition-colors h-full">
                                <item.icon className="h-6 w-6 mb-2 text-primary" />
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                        </Link>
                    ))}
                </CardContent>
            </Card>

        </div>
    );
}
