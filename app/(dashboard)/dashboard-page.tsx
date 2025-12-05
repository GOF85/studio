
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardMetricCard } from '@/components/dashboard/metric-card';
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
];

const commercialItems: MenuItem[] = [
    {
        title: 'Catálogo de Espacios',
        href: '/bd/espacios',
        icon: Building2,
        description: 'Gestión de venues y espacios para eventos',
        badge: { label: 'Nuevo', variant: 'default' }
    },
];

export function Section({ title, items }: { title: string, items: MenuItem[] }) {
    if (items.length === 0) return null;
    return (
        <section>
            <h2 className="text-xl font-headline font-semibold tracking-tight mb-3">{title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {items.map(item => (
                    <Link href={item.href} key={item.href}>
                        <Card className={`hover:border-primary/80 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 h-full ${item.className || ''}`}>
                            <CardHeader className="p-3 md:p-4 space-y-0">
                                <div className="flex items-center md:items-start gap-2 md:gap-3 mb-1 md:mb-2">
                                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                                        <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm md:text-base leading-tight">{item.title}</CardTitle>
                                    </div>
                                    {item.badge && (
                                        <Badge variant={item.badge.variant || 'secondary'} className="text-[10px] md:text-xs shrink-0 px-1.5 py-0 h-5">
                                            {item.badge.label}
                                        </Badge>
                                    )}
                                </div>
                                {item.description && (
                                    <CardDescription className="text-xs line-clamp-2 pl-9 md:pl-12">
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
        paxHoy: 0,
        serviciosSemana: 0,
        paxSemana: 0,
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

            // Helper to get pax for an OS
            const getPaxForOS = (osId: string) => {
                const briefing = comercialBriefings.find((b: any) => b.osId === osId);
                if (!briefing) return 0;
                return (briefing.items || []).reduce((acc: number, item: any) => {
                    return acc + (item.conGastronomia ? (item.asistentes || 0) : 0);
                }, 0);
            };

            // Servicios hoy
            let serviciosHoy = 0;
            let paxHoy = 0;
            serviceOrders.forEach((os: any) => {
                const startDate = new Date(os.startDate);
                startDate.setHours(0, 0, 0, 0);
                if (startDate.getTime() === today.getTime() && os.status === 'Confirmado') {
                    serviciosHoy++;
                    paxHoy += getPaxForOS(os.id);
                }
            });

            // Servicios esta semana
            let serviciosSemana = 0;
            let paxSemana = 0;
            serviceOrders.forEach((os: any) => {
                const startDate = new Date(os.startDate);
                if (startDate >= today && startDate < nextWeek && os.status === 'Confirmado') {
                    serviciosSemana++;
                    paxSemana += getPaxForOS(os.id);
                }
            });

            // Hitos con gastronomía y total asistentes (Global)
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
                paxHoy,
                serviciosSemana,
                paxSemana,
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <DashboardMetricCard
                        icon={Calendar}
                        label="Eventos Hoy"
                        value={metrics.serviciosHoy}
                        secondaryValue={`${metrics.paxHoy} pax`}
                        compact
                    />
                    <DashboardMetricCard
                        icon={Clock}
                        label="Esta Semana"
                        value={metrics.serviciosSemana}
                        secondaryValue={`${metrics.paxSemana} pax`}
                        compact
                    />
                    <DashboardMetricCard
                        icon={CheckCircle2}
                        label="Servicios Totales"
                        value={metrics.hitosConGastronomia}
                        compact
                    />
                    <DashboardMetricCard
                        icon={Users}
                        label="Total Histórico"
                        value={metrics.totalAsistentes}
                        secondaryValue="pax"
                        compact
                    />
                </div>


                {/* Main Navigation Sections */}
                <div className="space-y-8">
                    <Section title="Comercial y Ventas" items={commercialItems} />
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
