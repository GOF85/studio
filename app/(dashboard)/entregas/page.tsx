'use client';

import React, { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ClipboardList, Package, ChevronRight, 
    BarChart3, Truck, Factory, ListChecks, Users, 
    CalendarDays, LayoutDashboard, Activity, Clock,
    UtensilsCrossed
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DeliverySearch } from '@/components/entregas/delivery-search';
import { useEntregas } from '@/hooks/use-data-queries';
import { startOfToday, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

// --- COMPONENTES UI ---

interface BentoItemProps {
    className?: string;
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    gradient?: string;
}

function BentoItem({ className, children, href, onClick, gradient }: BentoItemProps) {
    const Content = (
        <div 
            onClick={onClick}
            className={cn(
                "relative h-full w-full overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md text-card-foreground shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-primary/30 hover:-translate-y-1 group",
                href || onClick ? "cursor-pointer" : "",
                gradient,
                className
            )}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
            {children}
        </div>
    );
    if (href) return <Link href={href} className={cn("block h-full w-full transition-transform active:scale-[0.98]", className)}>{Content}</Link>;
    return Content;
}

function MiniNavItem({ href, title, icon: Icon }: { href: string, title: string, icon: any }) {
    return (
        <Link href={href} className="group/item flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-transparent hover:border-border/40 hover:bg-background/80 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all duration-300">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground/70 group-hover/item:text-foreground truncate tracking-tight">
                    {title}
                </span>
            </div>
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-muted/30 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all duration-300">
                <ChevronRight className="w-3 h-3 text-primary" />
            </div>
        </Link>
    );
}

export default function EntregasDashboardPage() {
    const router = useRouter();
    const { data: entregas, isLoading, refetch } = useEntregas();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    usePullToRefresh({ onRefresh: async () => { await refetch(); } });

    const metrics = useMemo(() => {
        if (!entregas) return { today: 0, week: 0, todayContracts: 0, weekContracts: 0 };

        const today = startOfToday();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

        let todayCount = 0;
        let weekCount = 0;
        const todayContracts = new Set();
        const weekContracts = new Set();

        entregas.forEach((entrega: any) => {
            const hitos = entrega.hitos || [];
            hitos.forEach((hito: any) => {
                if (!hito.fecha) return;
                const hitoDate = startOfDay(parseISO(hito.fecha));
                
                if (hitoDate.getTime() === today.getTime()) {
                    todayCount++;
                    todayContracts.add(entrega.numero_expediente);
                }
                
                if (isWithinInterval(hitoDate, { start: weekStart, end: weekEnd })) {
                    weekCount++;
                    weekContracts.add(entrega.numero_expediente);
                }
            });
        });

        return { 
            today: todayCount, 
            week: weekCount,
            todayContracts: todayContracts.size,
            weekContracts: weekContracts.size
        };
    }, [entregas]);

    return (
        <TooltipProvider>
            <main className="min-h-screen bg-background/30 pb-20">
                {/* Header Premium Sticky */}
                <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                        <div className="flex-1">
                            <div className="relative group">
                                <DeliverySearch />
                            </div>
                        </div>

                        <Link
                            href="/portal"
                            className="flex-shrink-0 h-10 group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center px-5"
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                <Users className="h-4 w-4 text-white" />
                                <span className="font-bold text-xs tracking-tight text-white whitespace-nowrap">Portal Externo</span>
                            </div>
                        </Link>

                        <Link
                            href="/"
                            className="flex-shrink-0 h-10 group relative overflow-hidden rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center px-5"
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                <UtensilsCrossed className="h-4 w-4 text-white" />
                                <span className="font-bold text-xs tracking-tight text-white whitespace-nowrap">Catering</span>
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                    {/* 1. BENTO ROW */}
                    <section className="flex flex-col lg:flex-row gap-4 sm:gap-5 w-full lg:h-40">
                        {/* A. Previsión de Entregas (Semana) */}
                        <div className="flex-1 h-40 lg:h-full w-full">
                            <BentoItem
                                onClick={() => router.push('/entregas/pes?time=this_week')}
                                className="bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/10 dark:to-background"
                            >
                                <div className="p-4 sm:p-5 h-full flex flex-col relative justify-between overflow-hidden">
                                    <ClipboardList className="absolute -right-8 -bottom-8 w-48 h-48 text-amber-500/10 dark:text-amber-400/5 -rotate-12 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0" />

                                    <div className="flex items-center gap-2.5 mb-1 relative z-10">
                                        <div className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm">
                                            <ClipboardList className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-400 tracking-tight uppercase">Previsión de la Semana</h3>
                                    </div>

                                    <div className="mt-auto relative z-10 flex items-end justify-between">
                                        <div className="flex items-end gap-4">
                                            <div className="space-y-0.5">
                                                {isLoading ? (
                                                    <Skeleton className="h-8 w-12 rounded-md bg-amber-500/10" />
                                                ) : (
                                                    <span className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground tabular-nums">{metrics.weekContracts}</span>
                                                )}
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Contratos</p>
                                            </div>
                                            <div className="space-y-0.5 pb-0.5">
                                                {isLoading ? (
                                                    <Skeleton className="h-6 w-8 rounded-md bg-amber-500/10" />
                                                ) : (
                                                    <span className="text-xl sm:text-2xl font-bold tracking-tighter text-muted-foreground tabular-nums">{metrics.week}</span>
                                                )}
                                                <p className="text-[8px] sm:text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">Pedidos</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px] font-medium max-w-[180px] text-right mb-1">
                                            Entregas programadas para los próximos 7 días.
                                        </p>
                                    </div>
                                </div>
                            </BentoItem>
                        </div>

                        {/* B. Operativa de Hoy */}
                        <div className="flex-1 h-40 lg:h-full w-full">
                            <BentoItem
                                onClick={() => router.push('/entregas/pes?time=today')}
                                className="bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/10 dark:to-background"
                            >
                                <div className="p-4 sm:p-5 h-full flex flex-col relative justify-between overflow-hidden">
                                    <Clock className="absolute -right-10 -bottom-10 w-52 h-52 text-blue-500/10 dark:text-blue-400/5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12" />

                                    <div className="flex items-center gap-2.5 mb-1 relative z-10">
                                        <div className="p-1.5 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-xs sm:text-sm text-blue-900 dark:text-blue-400 tracking-tight uppercase">Operativa de Hoy</h3>
                                    </div>

                                    <div className="mt-auto relative z-10 flex items-end justify-between">
                                        <div className="flex items-end gap-4">
                                            <div className="space-y-0.5">
                                                {isLoading ? (
                                                    <Skeleton className="h-8 w-12 rounded-md bg-blue-500/10" />
                                                ) : (
                                                    <span className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground tabular-nums">{metrics.todayContracts}</span>
                                                )}
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Contratos</p>
                                            </div>
                                            <div className="space-y-0.5 pb-0.5">
                                                {isLoading ? (
                                                    <Skeleton className="h-6 w-8 rounded-md bg-blue-500/10" />
                                                ) : (
                                                    <span className="text-xl sm:text-2xl font-bold tracking-tighter text-muted-foreground tabular-nums">{metrics.today}</span>
                                                )}
                                                <p className="text-[8px] sm:text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">Pedidos</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px] font-medium max-w-[180px] text-right mb-1">
                                            Pedidos que deben salir o entregarse hoy.
                                        </p>
                                    </div>
                                </div>
                            </BentoItem>
                        </div>

                        {/* C. Calendario de Entregas */}
                        <div className="flex-none lg:w-40 h-40 lg:h-full">
                            <BentoItem
                                href="/entregas/calendario"
                                className="bg-card/40 hover:bg-muted/20 transition-colors flex flex-col items-center justify-center text-center p-0 overflow-hidden"
                            >
                                <div className="flex flex-col items-center justify-center h-full w-full p-4 relative">
                                    <CalendarDays className="absolute inset-0 m-auto w-32 h-32 text-primary/5 pointer-events-none transition-transform duration-500 group-hover:scale-125" />
                                    <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl mb-2 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                                        <CalendarDays className="w-8 h-8 text-primary" />
                                    </div>
                                    <span className="font-bold text-xs text-foreground/80 relative z-10 tracking-tight uppercase">Calendario</span>
                                </div>
                            </BentoItem>
                        </div>
                    </section>

                    <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent w-full mx-auto my-2" />

                    {/* 2. NAVEGACIÓN SECUNDARIA */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto">
                        {/* Operativa */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/5 border border-amber-500/10">
                                <Activity className="w-3.5 h-3.5 text-amber-600" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700/80">Operativa</h2>
                            </div>
                            <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-1.5 space-y-1">
                                <MiniNavItem href="/cpr" title="Producción CPR" icon={Factory} />
                                <MiniNavItem href="/entregas/picking" title="Picking Almacén" icon={ListChecks} />
                            </div>
                        </div>

                        {/* Logística */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700/80">Logística</h2>
                            </div>
                            <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-1.5 space-y-1">
                                <MiniNavItem href="/entregas/gestion-transporte" title="Transporte" icon={Truck} />
                                <MiniNavItem href="/entregas/gestion-personal" title="Gestión de Personal" icon={Users} />
                            </div>
                        </div>

                        {/* Reportes */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700/80">Reportes</h2>
                            </div>
                            <div className="bg-gradient-to-b from-emerald-500/[0.03] to-transparent backdrop-blur-sm rounded-2xl border border-emerald-500/10 shadow-sm p-1.5 space-y-1">
                                <MiniNavItem href="/analitica/entregas" title="Analítica de Entregas" icon={BarChart3} />
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </TooltipProvider>
    );
}
