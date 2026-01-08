'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    CalendarDays, ClipboardList,
    LayoutDashboard, Activity, Truck, FileBarChart, Settings,
    Clock, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { commercialItems, planningItems, coreOpsItems, reportingItems, adminItems } from '@/lib/nav-config';
import { ServiceOrderSearch } from '@/components/dashboard/service-order-search';
import { useDashboardMetrics, type DashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

// --- COMPONENTES OPTIMIZADOS ---
import { BentoItem } from '@/components/dashboard/bento-item';
import { MiniNavItem } from '@/components/dashboard/mini-nav-item';

const EventsModal = dynamic(() => import('@/components/dashboard/events-modal').then(m => m.EventsModal), { ssr: false });
const ServicesModal = dynamic(() => import('@/components/dashboard/services-modal').then(m => m.ServicesModal), { ssr: false });

// --- PÁGINA PRINCIPAL ---

interface DashboardPageProps {
    initialMetrics?: DashboardMetrics;
}

export default function DashboardPage({ initialMetrics }: DashboardPageProps) {
    // --- HOOKS ---
    const router = useRouter();
    const { data: metrics, isLoading, refetch } = useDashboardMetrics(initialMetrics);
    
    // Estado consolidado para modales (reduce re-renders)
    const [modal, setModal] = useState<{
        type: 'events' | 'services' | null;
        data: any[];
        title: string;
    }>({ type: null, data: [], title: '' });

    const refreshData = useCallback(async () => {
        await refetch();
    }, [refetch]);

    usePullToRefresh({ onRefresh: refreshData });

    const openEventsModal = (data: any[], title: string) => {
        setModal({ type: 'events', data, title });
    };

    const openServicesModal = (data: any[], title: string) => {
        setModal({ type: 'services', data, title });
    };

    const closePortal = () => setModal(prev => ({ ...prev, type: null }));

    return (
        <main className="flex-1 w-full bg-background/30 min-h-screen flex flex-col">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                        <div className="relative group">
                            <ServiceOrderSearch />
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
                        href="/entregas"
                        className="flex-shrink-0 h-10 group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center px-5"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <Truck className="h-4 w-4 text-white" />
                            <span className="font-bold text-xs tracking-tight text-white whitespace-nowrap">Entregas</span>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-0 pb-6 sm:pb-8 w-full flex-grow space-y-6 sm:space-y-8">

                {/* 2. BENTO ROW COMPACTA */}
                <section className="flex flex-col lg:flex-row gap-4 sm:gap-5 w-full lg:h-36">

                    {/* A. PES (Verde) */}
                    <div className="flex-1 h-36 lg:h-full w-full">
                        <BentoItem
                            onClick={() => router.push('/pes')}
                            className="bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/10 dark:to-background"
                        >
                            <div className="p-4 sm:p-5 h-full flex flex-col relative justify-between overflow-hidden">
                                <ClipboardList className="absolute -right-8 -bottom-8 w-48 h-48 text-emerald-500/10 dark:text-emerald-400/5 -rotate-12 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0" />

                                <div className="flex items-center gap-2.5 mb-1 relative z-10">
                                    <div className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm">
                                        <ClipboardList className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-400 tracking-tight">PES previsión de la semana</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-auto relative z-10">
                                    <div 
                                        className="space-y-0.5 cursor-pointer hover:bg-emerald-500/5 rounded-lg p-1 -m-1 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEventsModal(metrics?.eventosSemanaList || [], 'Eventos de la Semana');
                                        }}
                                    >
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-emerald-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground tabular-nums">{metrics?.eventosSemana || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Eventos</p>
                                    </div>
                                    <div 
                                        className="border-l pl-4 border-border/40 space-y-0.5 cursor-pointer hover:bg-emerald-500/5 rounded-lg p-1 -m-1 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openServicesModal(metrics?.serviciosSemanaList || [], 'Servicios de la Semana');
                                        }}
                                    >
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-emerald-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground/90 tabular-nums">{metrics?.serviciosSemana || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Servicios</p>
                                    </div>
                                    <div className="border-l pl-4 border-border/40 space-y-0.5">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-emerald-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground/90 tabular-nums">{metrics?.paxSemana || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Asistentes</p>
                                    </div>
                                </div>
                            </div>
                        </BentoItem>
                    </div>

                    {/* B. OPERATIVA DE HOY */}
                    <div className="flex-1 h-36 lg:h-full w-full">
                        <BentoItem
                            onClick={() => router.push('/pes?time=today')}
                            className="bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/10 dark:to-background"
                        >
                            <div className="p-4 sm:p-5 h-full flex flex-col relative justify-between overflow-hidden">
                                <Clock className="absolute -right-10 -bottom-10 w-52 h-52 text-blue-500/10 dark:text-blue-400/5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12" />

                                <div className="flex items-center gap-2.5 mb-1 relative z-10">
                                    <div className="p-1.5 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-xs sm:text-sm text-blue-900 dark:text-blue-400 tracking-tight">Operativa de hoy</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-auto relative z-10">
                                    <div 
                                        className="space-y-0.5 cursor-pointer hover:bg-blue-500/5 rounded-lg p-1 -m-1 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEventsModal(metrics?.eventosHoyList || [], 'Eventos de Hoy');
                                        }}
                                    >
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-blue-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground tabular-nums">{metrics?.eventosHoy || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Eventos</p>
                                    </div>
                                    <div 
                                        className="border-l pl-4 border-border/40 space-y-0.5 cursor-pointer hover:bg-blue-500/5 rounded-lg p-1 -m-1 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openServicesModal(metrics?.serviciosHoyList || [], 'Servicios de Hoy');
                                        }}
                                    >
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-blue-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground/90 tabular-nums">{metrics?.serviciosHoy || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Servicios</p>
                                    </div>
                                    <div className="border-l pl-4 border-border/40 space-y-0.5">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 rounded-md bg-blue-500/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground/90 tabular-nums">{metrics?.paxHoy || 0}</span>
                                        )}
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Asistentes</p>
                                    </div>
                                </div>
                            </div>
                        </BentoItem>
                    </div>

                    {/* C. CALENDARIO */}
                    <div className="flex-none lg:w-36 h-36 lg:h-full">
                        <BentoItem
                            href="/calendario"
                            className="bg-card/40 hover:bg-muted/20 transition-colors flex flex-col items-center justify-center text-center p-0 overflow-hidden"
                        >
                            <div className="flex flex-col items-center justify-center h-full w-full p-4 relative">
                                <CalendarDays className="absolute inset-0 m-auto w-32 h-32 text-primary/5 pointer-events-none transition-transform duration-500 group-hover:scale-125" />
                                <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl mb-2 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                                    <CalendarDays className="w-8 h-8 text-primary" />
                                </div>
                                <span className="font-bold text-xs text-foreground/80 relative z-10 tracking-tight">Calendario</span>
                            </div>
                        </BentoItem>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent w-full mx-auto my-2" />

                {/* 3. NAVEGACIÓN SECUNDARIA */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto">

                    {/* Comercial */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/80">Comercial</h2>
                        </div>
                        <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-1.5 space-y-1">
                            {commercialItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Operaciones */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700/80">Operaciones</h2>
                        </div>
                        <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-1.5 space-y-1">
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

                    {/* Reportes - Estilo Distinto */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
                            <FileBarChart className="w-3.5 h-3.5 text-blue-600" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700/80">Reportes</h2>
                        </div>
                        <div className="bg-gradient-to-b from-blue-500/[0.03] to-transparent backdrop-blur-sm rounded-2xl border border-blue-500/10 shadow-sm p-1.5 space-y-1">
                            {reportingItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Sistema */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/5 border border-slate-500/10">
                            <Settings className="w-3.5 h-3.5 text-slate-600" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700/80">Sistema</h2>
                        </div>
                        <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-1.5 space-y-1">
                            {adminItems.map((item) => (
                                <MiniNavItem key={item.href} item={item} />
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* MODALS OPTIMIZADOS (CARGA DINÁMICA) */}
            {modal.type === 'events' && (
                <EventsModal 
                    isOpen={true} 
                    onClose={closePortal} 
                    data={modal.data} 
                    title={modal.title} 
                />
            )}
            {modal.type === 'services' && (
                <ServicesModal 
                    isOpen={true} 
                    onClose={closePortal} 
                    data={modal.data} 
                    title={modal.title} 
                />
            )}

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