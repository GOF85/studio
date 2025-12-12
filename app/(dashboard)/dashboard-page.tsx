'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Calendar, Clock, 
    Activity, Truck, 
    LayoutDashboard, FileBarChart, Settings,
    CalendarDays, ClipboardList, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { commercialItems, planningItems, coreOpsItems, reportingItems, adminItems, type MenuItem } from '@/lib/nav-config';
import { ServiceOrderSearch } from '@/components/dashboard/service-order-search';

// --- COMPONENTES UI INTERNOS ---

// Tarjeta para métricas puras (No clickeables, informativas)
function KPICard({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string | number, subtext: string, icon: any, colorClass: string }) {
    return (
        <Card className="shadow-sm border border-border/60 overflow-hidden relative">
            <div className={cn("absolute top-0 right-0 p-3 opacity-[0.08]", colorClass)}>
                <Icon className="w-16 h-16" />
            </div>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", colorClass)} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{subtext}</p>
            </CardContent>
        </Card>
    );
}

// Tarjeta de Acción Principal (PES y Calendario)
function ActionCard({ title, value, subtext, icon: Icon, href, colorClass }: { title: string, value: string, subtext: string, icon: any, href: string, colorClass: string }) {
    return (
        <Link href={href} className="block h-full">
            <Card className="h-full shadow-sm border border-border/60 overflow-hidden relative group hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                <div className={cn("absolute top-0 right-0 p-3 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity", colorClass)}>
                    <Icon className="w-16 h-16" />
                </div>
                
                {/* Indicador visual de acción */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                </div>

                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                        <Icon className={cn("w-4 h-4", colorClass)} />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-xl font-bold text-foreground group-hover:text-primary/90 transition-colors">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{subtext}</p>
                </CardContent>
            </Card>
        </Link>
    );
}

function NavCard({ item }: { item: MenuItem }) {
    return (
        <Link href={item.href} className="block h-full">
            <Card className="h-full border border-border/60 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]">
                <CardHeader className="p-4 pb-2 space-y-0">
                    <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                            <item.icon className="w-5 h-5" />
                        </div>
                        {item.badge && (
                            <Badge variant={item.badge.variant || 'secondary'} className="text-[10px] h-5 px-1.5">
                                {item.badge.label}
                            </Badge>
                        )}
                    </div>
                    <CardTitle className="text-sm font-bold mt-3 leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                    {item.description && (
                        <CardDescription className="text-xs line-clamp-2">
                            {item.description}
                        </CardDescription>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}

function NavSection({ title, items, icon: Icon }: { title: string, items: MenuItem[], icon: any }) {
    if (!items || items.length === 0) return null;
    
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 py-2 border-b border-border/40 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {items.map((item) => (
                    <NavCard key={item.href} item={item} />
                ))}
            </div>
        </section>
    );
}

// --- PÁGINA PRINCIPAL ---

interface DashboardMetrics {
    serviciosHoy: number;
    paxHoy: number;
    serviciosSemana: number;
    paxSemana: number;
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        setLoading(true);
        window.location.reload();
    };

    usePullToRefresh({ onRefresh: refreshData });

    useEffect(() => {
        const calculateMetrics = () => {
            try {
                // TODO: Conectar con Supabase real cuando existan datos
                // Por ahora simulamos la carga para evitar layout shifts
                setMetrics({
                    serviciosHoy: 3,
                    paxHoy: 120,
                    serviciosSemana: 15,
                    paxSemana: 450,
                });
            } catch (error) {
                console.error("Error calculating metrics", error);
            } finally {
                setLoading(false);
            }
        };

        calculateMetrics();
    }, []);

    if (loading || !metrics) {
        return <LoadingSkeleton title="Cargando Panel de Control..." />;
    }

    return (
        <main className="min-h-screen bg-background pb-20">
        {/* HEADER STICKY MINIMALISTA (SOLO BUSCADOR) */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center w-full">
                        <div className="flex-1 w-full">
                            <ServiceOrderSearch />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-10">
                
                {/* 1. SECCIÓN PRINCIPAL: KPI + ACCESOS DIRECTOS (PES & CALENDARIO) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {/* Métricas de Pulso (Izquierda) */}
                    <KPICard 
                        title="Hoy" 
                        value={metrics.serviciosHoy} 
                        subtext={`${metrics.paxHoy} pax`}
                        icon={Clock}
                        colorClass="text-blue-600"
                    />
                    <KPICard 
                        title="Esta Semana" 
                        value={metrics.serviciosSemana} 
                        subtext={`${metrics.paxSemana} pax previstos`}
                        icon={Activity}
                        colorClass="text-indigo-600"
                    />

                    {/* Herramientas Principales (Derecha - Destacadas) */}
                    <ActionCard 
                        title="PES" 
                        value="Plan Semanal" 
                        subtext="Gestión Táctica"
                        icon={ClipboardList}
                        href="/pes"
                        colorClass="text-amber-600"
                    />
                    <ActionCard 
                        title="Calendario" 
                        value="Vista Global" 
                        subtext="Planificación Mensual"                    
                        icon={CalendarDays}
                        href="/calendario"
                        colorClass="text-emerald-600"
                    />
                </div>

                {/* 2. SECCIONES DE NAVEGACIÓN */}
                <div className="space-y-10">
                    <NavSection title="Comercial y Ventas" items={commercialItems} icon={Activity} />
                    
                    {/* Filtramos para mostrar SOLO Entregas MICE, eliminando la redundancia de PES y Calendario */}
                    <NavSection 
                        title="Planificación Operativa" 
                        items={planningItems.filter(item => item.title === 'Entregas MICE')} 
                        icon={LayoutDashboard} 
                    />
                    
                    <NavSection title="Operaciones Centrales" items={coreOpsItems} icon={Truck} />
                    <NavSection title="Análisis y Reportes" items={reportingItems} icon={FileBarChart} />
                    <NavSection title="Administración" items={adminItems} icon={Settings} />
                </div>
            </div>
            
            {/* FOOTER */}
            <footer className="border-t py-8 mt-8 bg-muted/5">
                <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} MICE Catering. Sistema de Gestión Integral.</p>
                </div>
            </footer>
        </main>
    );
}