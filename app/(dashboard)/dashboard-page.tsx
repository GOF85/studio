'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    CalendarDays, ClipboardList, ChevronRight, 
    LayoutDashboard, Activity, Truck, FileBarChart, Settings,
    Clock, Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { GlobalLoadingIndicator } from '@/components/layout/global-loading-indicator';
import { cn } from '@/lib/utils';
import { commercialItems, planningItems, coreOpsItems, reportingItems, adminItems, type MenuItem } from '@/lib/nav-config';
import { ServiceOrderSearch } from '@/components/dashboard/service-order-search';

// --- COMPONENTES UI ---

interface BentoItemProps {
    className?: string;
    children: React.ReactNode;
    href?: string;
    gradient?: string;
}

function BentoItem({ className, children, href, gradient }: BentoItemProps) {
    const Content = (
        <div className={cn(
            "relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 group",
            gradient,
            className
        )}>
            {children}
        </div>
    );
    if (href) return <Link href={href} className={cn("block h-full w-full", className)}>{Content}</Link>;
    return Content;
}

function MiniNavItem({ item }: { item: MenuItem }) {
    return (
        <Link href={item.href} className="group/item flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all">
            <div className="flex items-center gap-2.5">
                <div className="text-muted-foreground group-hover/item:text-primary transition-colors">
                    <item.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-foreground/80 group-hover/item:text-foreground">
                    {item.title}
                </span>
            </div>
            {item.badge ? (
                <Badge variant={item.badge.variant || 'secondary'} className="text-[9px] h-4 px-1 ml-2">
                    {item.badge.label}
                </Badge>
            ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover/item:text-primary/50 opacity-0 group-hover/item:opacity-100 transition-all" />
            )}
        </Link>
    );
}

// --- TIPOS ---

interface DashboardMetrics {
    eventosHoy: number;
    serviciosHoy: number;
    paxHoy: number;
    eventosSemana: number;
    serviciosSemana: number;
    paxSemana: number;
}

// --- PÁGINA PRINCIPAL ---

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        setLoading(true);
        setTimeout(() => window.location.reload(), 500);
    };

    usePullToRefresh({ onRefresh: refreshData });

    useEffect(() => {
        const loadMetrics = () => {
            try {
                setMetrics({
                    eventosHoy: 2,
                    serviciosHoy: 5,
                    paxHoy: 120,
                    eventosSemana: 8,
                    serviciosSemana: 24,
                    paxSemana: 1250,
                });
            } finally {
                setLoading(false);
            }
        };
        loadMetrics();
    }, []);

    if (loading || !metrics) {
        return <GlobalLoadingIndicator />;
    }

    return (
        <main className="flex-1 w-full bg-background/50 min-h-screen flex flex-col">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full flex-grow space-y-5">
                
                {/* 1. TOP SECTION: ALINEACIÓN ROBUSTA */}
                {/* Usamos Flex con items-stretch y una altura fija md:h-14 (56px) */}
                <section className="flex flex-col md:flex-row gap-3 w-full mx-auto md:h-14 items-stretch">
                    
                    {/* A. Buscador */}
                    {/* Los selectores [&_...] fuerzan a los elementos internos de Shadcn (cmdk) a ocupar el 100% de la altura */}
                    <div className="flex-grow relative z-20 shadow-sm rounded-lg h-14 md:h-auto [&_[cmdk-root]]:h-full [&_[cmdk-input-wrapper]]:h-full [&_[cmdk-input-wrapper]]:flex [&_[cmdk-input-wrapper]]:items-center">
                        <ServiceOrderSearch />
                    </div>

                    {/* B. Botón Entregas */}
                    {/* h-auto junto con items-stretch del padre hará que coincida exactamente con la altura del buscador */}
                    <Link 
                        href="/entregas" 
                        className="flex-shrink-0 h-14 md:h-auto w-full md:w-auto group relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md hover:shadow-lg hover:to-amber-500 transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        <div className="flex items-center justify-center gap-2 px-6 backdrop-blur-[1px]">
                            <Truck className="h-6 w-6 text-white drop-shadow-sm" />
                            <span className="font-bold text-sm tracking-wide text-white text-shadow-sm whitespace-nowrap pt-0.5">Entregas</span>
                        </div>
                    </Link>
                </section>

                {/* 2. BENTO ROW COMPACTA (Altura reducida a h-32 / 128px) */}
                <section className="flex flex-col lg:flex-row gap-4 w-full lg:h-32">
                    
                    {/* A. PES (Verde) - Compacto */}
                    <div className="flex-[2] h-32 lg:h-full w-full">
                        <BentoItem 
                            href="/pes" 
                            className="bg-gradient-to-br from-emerald-50/80 via-background to-background dark:from-emerald-950/20 dark:to-background border-l-4 border-l-emerald-600"
                        >
                            <div className="p-4 h-full flex flex-col relative justify-between"> {/* Padding reducido a p-4 */}
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 rounded-md bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                        <ClipboardList className="w-3.5 h-3.5" /> {/* Icono más pequeño */}
                                    </div>
                                    <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-400">PES Semanal</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-auto">
                                    <div>
                                        <span className="text-2xl font-bold tracking-tight text-foreground">{metrics.eventosSemana}</span> {/* Texto reducido a 2xl */}
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-0.5">Eventos</p>
                                    </div>
                                    <div className="border-l pl-3 border-border/50">
                                        <span className="text-2xl font-bold tracking-tight text-foreground/80">{metrics.serviciosSemana}</span>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-0.5">Servicios</p>
                                    </div>
                                    <div className="border-l pl-3 border-border/50">
                                        <span className="text-2xl font-bold tracking-tight text-foreground/80">{metrics.paxSemana}</span>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-0.5">Asistentes</p>
                                    </div>
                                </div>
                            </div>
                        </BentoItem>
                    </div>

                    {/* B. CALENDARIO - Cuadrado Perfecto Compacto */}
                    <div className="h-32 lg:h-full aspect-square flex-none mx-auto lg:mx-0">
                        <BentoItem 
                            href="/calendario" 
                            className="bg-card hover:bg-muted/30 transition-colors flex flex-col items-center justify-center text-center p-0"
                        >
                             <div className="flex flex-col items-center justify-center h-full w-full p-3">
                                <div className="p-2.5 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl mb-1 group-hover:scale-110 transition-transform duration-300">
                                    <CalendarDays className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="font-semibold text-xs text-foreground/90">Calendario</span>
                            </div>
                        </BentoItem>
                    </div>

                    {/* C. OPERATIVA DE HOY - Compacto */}
                    <div className="flex-1 h-32 lg:h-full w-full">
                        <BentoItem className="bg-card">
                            <div className="p-4 h-full flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-sm font-semibold text-blue-600">Hoy</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 mt-auto text-center">
                                    <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/30">
                                        <span className="text-lg font-bold">{metrics.eventosHoy}</span>
                                        <span className="text-[9px] uppercase text-muted-foreground font-bold">Eventos</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/30">
                                        <span className="text-lg font-bold">{metrics.serviciosHoy}</span>
                                        <span className="text-[9px] uppercase text-muted-foreground font-bold">Servicios</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-1 rounded bg-muted/30">
                                        <span className="text-lg font-bold">{metrics.paxHoy}</span>
                                        <span className="text-[9px] uppercase text-muted-foreground font-bold">Pax</span>
                                    </div>
                                </div>
                            </div>
                        </BentoItem>
                    </div>
                </section>

                <div className="h-px bg-border/40 w-full mx-auto my-2" />

                {/* 3. NAVEGACIÓN SECUNDARIA (Más compacta) */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mx-auto">
                    
                    {/* Comercial */}
                    <div className="space-y-2">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Comercial
                        </h2>
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            {commercialItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Operaciones */}
                    <div className="space-y-2">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                            <LayoutDashboard className="w-3 h-3" /> Operaciones
                        </h2>
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            {planningItems
                                .filter(i => 
                                    i.title !== 'Entregas MICE' && 
                                    i.title !== 'Previsión de Servicios' &&
                                    i.title !== 'Calendario de Servicios'
                                ) 
                                .map((item) => <MiniNavItem key={item.href} item={item} />)
                            }
                            {coreOpsItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>

                     {/* Reportes */}
                     <div className="space-y-2">
                         <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                            <FileBarChart className="w-3 h-3" /> Reportes
                        </h2>
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            {reportingItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Sistema */}
                    <div className="space-y-2">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                            <Settings className="w-3 h-3" /> Sistema
                        </h2>
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            {adminItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* FOOTER */}
            <footer className="mt-auto py-4">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="h-px bg-border/40 w-full mb-2" />
                    <p className="text-center text-[10px] text-muted-foreground opacity-60">
                        {new Date().getFullYear()} Mice Catering
                    </p>
                </div>
            </footer>
        </main>
    );
}