
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BarChart3, Euro, TrendingUp, TrendingDown, ClipboardList, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Entrega, ServiceOrder } from '@/types';

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description: string;
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

export default function AnaliticaDashboardPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [totalFacturacion, setTotalFacturacion] = useState(0);
    const [totalCoste, setTotalCoste] = useState(0);

    useEffect(() => {
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]);
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]);
        
        let facturacion = 0;
        allServiceOrders.forEach(os => facturacion += os.facturacion || 0);
        allEntregas.forEach(e => facturacion += e.facturacion || 0);
        setTotalFacturacion(facturacion);
        
        // Note: coste calculation is complex and would require fetching all related orders.
        // This is a placeholder. A full implementation would calculate this properly.
        setTotalCoste(facturacion * 0.7); // Placeholder for aggregated cost
        
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Panel de Analítica..." />;
    }

    const rentabilidad = totalFacturacion - totalCoste;
    const margen = totalFacturacion > 0 ? (rentabilidad / totalFacturacion) * 100 : 0;

    return (
        <div className="space-y-8">
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Facturación Neta Total" value={formatCurrency(totalFacturacion)} icon={Euro} description="Suma de Catering y Entregas" />
                <KpiCard title="Coste Total Estimado" value={formatCurrency(totalCoste)} icon={TrendingDown} description="Estimación de todos los costes directos" />
                <KpiCard title="Rentabilidad Bruta" value={formatCurrency(rentabilidad)} icon={TrendingUp} description="Facturación neta menos costes" />
                <KpiCard title="Margen Bruto" value={`${margen.toFixed(2)}%`} icon={TrendingUp} description="Porcentaje de rentabilidad" />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Link href="/analitica/catering">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><ClipboardList />Analítica de Catering</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Analiza en profundidad la rentabilidad, costes y rendimiento de tus eventos de catering.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/analitica/entregas">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Package />Analítica de Entregas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Explora los KPIs, ventas y márgenes de la vertical de negocio de Entregas MICE.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
