
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardMetricCard } from '@/components/dashboard/metric-card';
import { QuickActionsCard } from '@/components/dashboard/quick-actions-card';
import { Badge } from '@/components/ui/badge';

type MenuItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    className?: string;
    description?: string;
    badge?: {
        label: string;
        variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    };
}

const planningItems: MenuItem[] = [
    {
        title: 'Previsión de Servicios',
        href: '/pes',
        icon: ClipboardList,
        description: 'Planifica y gestiona servicios futuros',
        badge: { label: '3 activos', variant: 'secondary' }
    },
    {
        title: 'Calendario de Servicios',
        href: '/calendario',
        icon: Calendar,
        description: 'Vista temporal de todos los eventos',
        badge: { label: 'Hoy: 2', variant: 'default' }
    },
    {
        title: 'Entregas MICE',
        href: '/entregas',
        icon: Truck,
        className: "theme-orange",
        description: 'Gestión de entregas y logística',
        badge: { label: '1 pendiente', variant: 'destructive' }
    },
];

const coreOpsItems: MenuItem[] = [
    {
        title: 'Book Gastronómico',
        href: '/book',
        icon: BookHeart,
        description: 'Recetas, ingredientes y elaboraciones',
    },
    {
        title: 'Producción (CPR)',
        href: '/cpr',
        icon: Factory,
        description: 'Centro de producción y costes',
    },
    {
        title: 'Almacén',
        href: '/almacen',
        icon: Warehouse,
        description: 'Control de stock e inventario',
    },
];

const reportingItems: MenuItem[] = [
    {
        title: 'Analítica',
        href: '/analitica',
        icon: BarChart3,
        description: 'Métricas y KPIs del negocio',
    },
    {
        title: 'Control de Explotación',
        href: '/control-explotacion',
        icon: AreaChart,
        description: 'Seguimiento financiero operativo',
    },
];

const adminItems: MenuItem[] = [
    {
        title: 'Recursos Humanos',
        href: '/rrhh',
        icon: Users,
        description: 'Gestión de personal y equipos',
    },
    {
        title: 'Portales Externos',
        href: '/portal',
        icon: Users,
        description: 'Acceso para clientes y colaboradores',
    },
    {
        title: 'Bases de Datos',
        href: '/bd',
        icon: Package,
        description: 'Proveedores, artículos y configuración',
    },
    {
        title: 'Configuración',
        href: '/configuracion',
        icon: Settings,
        description: 'Ajustes del sistema',
    },
];

export function Section({ title, items }: { title: string, items: MenuItem[] }) {
    if (items.length === 0) return null;
    return (
        <section>
            <h2 className="text-xl font-headline font-semibold tracking-tight mb-3">{title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(item => (
                    <Link href={item.href} key={item.href}>
                        <Card className={`hover:border-primary/80 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 h-full ${item.className || ''}`}>
                            <CardHeader className="p-4 space-y-0">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                        <item.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                                    </div>
                                    {item.badge && (
                                        <Badge variant={item.badge.variant || 'secondary'} className="text-xs shrink-0">
                                            {item.badge.label}
                                        </Badge>
                                    )}
                                </div>
                                {item.description && (
                                    <CardDescription className="text-xs line-clamp-2 pl-11">
                                        {item.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export function DashboardPage() {
    const [metrics, setMetrics] = useState({
        serviciosHoy: 0,
        serviciosSemana: 0,
        hitosConGastronomia: 0,
        totalAsistentes: 0,
    });

    useEffect(() => {
        const calculateMetrics = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            const serviceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
            const comercialBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]');

            // Servicios hoy
            const serviciosHoy = serviceOrders.filter((os: any) => {
                const startDate = new Date(os.startDate);
                startDate.setHours(0, 0, 0, 0);
                return startDate.getTime() === today.getTime() && os.status === 'Confirmado';
            }).length;

            // Servicios esta semana
            const serviciosSemana = serviceOrders.filter((os: any) => {
                const startDate = new Date(os.startDate);
                return startDate >= today && startDate < nextWeek && os.status === 'Confirmado';
            }).length;

            // Hitos con gastronomía y total asistentes
            let hitosConGastronomia = 0;
            let totalAsistentes = 0;

            comercialBriefings.forEach((briefing: any) => {
                const os = serviceOrders.find((s: any) => s.id === briefing.osId);
                if (os && os.status === 'Confirmado') {
                    (briefing.items || []).forEach((item: any) => {
                        if (item.conGastronomia) {
                            hitosConGastronomia++;
                            totalAsistentes += item.asistentes || 0;
                        }
                    });
                }
            });

            setMetrics({
                serviciosHoy,
                serviciosSemana,
                hitosConGastronomia,
                totalAsistentes,
            });
        };

        calculateMetrics();
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow container mx-auto px-4 py-6">
                <DashboardHeader />

                {/* Metrics Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <DashboardMetricCard
                        icon={Calendar}
                        label="Eventos hoy"
                        value={metrics.serviciosHoy}
                    />
                    <DashboardMetricCard
                        icon={Clock}
                        label="Eventos esta semana"
                        value={metrics.serviciosSemana}
                    />
                    <DashboardMetricCard
                        icon={CheckCircle2}
                        label="Servicios"
                        value={metrics.hitosConGastronomia}
                    />
                    <DashboardMetricCard
                        icon={Users}
                        label="Total Asistentes"
                        value={metrics.totalAsistentes}
                    />
                </div>


                {/* Main Navigation Sections */}
                <div className="space-y-8">
                    <Section title="Planificación" items={planningItems} />
                    <Section title="Operaciones Centrales" items={coreOpsItems} />
                    <Section title="Análisis y Reportes" items={reportingItems} />
                    <Section title="Administración y Colaboradores" items={adminItems} />
                </div>
            </main>
            <footer className="py-4 border-t mt-auto">
                <div className="container mx-auto px-4 flex justify-between items-center text-sm text-muted-foreground">
                    <div>
                        © {new Date().getFullYear()} MICE Catering. Todos los derechos reservados.
                    </div>
                    <div className="text-xs">
                        Última sincronización: hace 5 min
                    </div>
                </div>
            </footer>
        </div>
    );
}
