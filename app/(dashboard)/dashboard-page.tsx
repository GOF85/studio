'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    CalendarDays, ClipboardList, ChevronRight,
    LayoutDashboard, Activity, Truck, FileBarChart, Settings,
    Clock, Utensils, Users, Calendar, MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { cn } from '@/lib/utils';
import { commercialItems, planningItems, coreOpsItems, reportingItems, adminItems, type MenuItem } from '@/lib/nav-config';
import { ServiceOrderSearch } from '@/components/dashboard/service-order-search';
import { useDashboardMetrics, type DashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

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

function MiniNavItem({ item }: { item: MenuItem }) {
    return (
        <Link href={item.href} className="group/item flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-transparent hover:border-border/40 hover:bg-background/80 hover:shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all duration-300">
                    <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-foreground/70 group-hover/item:text-foreground truncate tracking-tight">
                    {item.title}
                </span>
            </div>
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-muted/30 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all duration-300">
                <ChevronRight className="w-3 h-3 text-primary" />
            </div>
        </Link>
    );
}

// --- TIPOS ---

// --- PÁGINA PRINCIPAL ---

interface DashboardPageProps {
    initialMetrics?: DashboardMetrics;
}

export default function DashboardPage({ initialMetrics }: DashboardPageProps) {
    // --- HOOKS ---
    const router = useRouter();
    const { data: metrics, isLoading, refetch } = useDashboardMetrics(initialMetrics);
    const [modalType, setModalType] = useState<'events' | 'services' | null>(null);
    const [modalData, setModalData] = useState<any[]>([]);
    const [modalTitle, setModalTitle] = useState('');

    const refreshData = async () => {
        await refetch();
    };

    usePullToRefresh({ onRefresh: refreshData });

    const openEventsModal = (data: any[], title: string) => {
        setModalType('events');
        setModalData(data);
        setModalTitle(title);
    };

    const openServicesModal = (data: any[], title: string) => {
        setModalType('services');
        setModalData(data);
        setModalTitle(title);
    };

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

            {/* MODALS */}
            <EventsModal 
                isOpen={modalType === 'events'} 
                onClose={() => setModalType(null)} 
                data={modalData} 
                title={modalTitle} 
            />
            <ServicesModal 
                isOpen={modalType === 'services'} 
                onClose={() => setModalType(null)} 
                data={modalData} 
                title={modalTitle} 
            />

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

function EventsModal({ isOpen, onClose, data, title }: { isOpen: boolean, onClose: () => void, data: any[], title: string }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground">
                        Listado detallado de los eventos programados para este periodo.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                    {data.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground font-medium">No hay eventos registrados.</p>
                    ) : (
                        data.map((event, i) => (
                            <div key={i} className="p-2 px-3 rounded-lg border border-border/30 bg-muted/20 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Link 
                                        href={`/os/${event.id}`}
                                        className="font-mono text-[8px] h-3.5 px-1 bg-primary/5 text-primary border border-primary/10 rounded shrink-0 hover:underline flex items-center justify-center"
                                    >
                                        {event.numero_expediente}
                                    </Link>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-[11px] uppercase tracking-tight truncate text-foreground">{event.space || 'Sin espacio'}</h4>
                                            <span className="text-[9px] text-muted-foreground/70">•</span>
                                            <span className="text-[9px] font-medium text-muted-foreground truncate">
                                                {event.start_date ? format(new Date(event.start_date), "eee d MMM", { locale: es }) : 'Sin fecha'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/80 truncate">{event.client}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/40 border border-border/20 shrink-0">
                                    <Users className="w-3 h-3 text-primary/70" />
                                    <span className="font-bold text-[11px]">{event.asistentes}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ServicesModal({ isOpen, onClose, data, title }: { isOpen: boolean, onClose: () => void, data: any[], title: string }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground">
                        Desglose de los servicios operativos y logísticos del día.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                    {data.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground font-medium">No hay servicios registrados.</p>
                    ) : (
                        data.map((service, i) => (
                            <div key={i} className="p-2 px-3 rounded-lg border border-border/30 bg-muted/20 flex flex-col gap-1 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex flex-col shrink-0">
                                            <span className="text-[7px] font-black text-muted-foreground uppercase leading-none mb-0.5">
                                                {service.fecha ? format(new Date(service.fecha), "eee d MMM", { locale: es }) : 'Sin fecha'}
                                            </span>
                                            <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1.5 bg-primary/10 text-primary border-none">
                                                {service.horaInicio || '??'} - {service.horaFin || '??'}
                                            </Badge>
                                        </div>
                                        {service.numero_expediente && (
                                            <Link 
                                                href={`/os/${service.os_id}`}
                                                className="text-[9px] font-mono font-bold text-primary hover:underline shrink-0 bg-primary/5 px-1 rounded border border-primary/10"
                                            >
                                                {service.numero_expediente}
                                            </Link>
                                        )}
                                        <h4 className="font-bold text-[11px] uppercase tracking-tight truncate text-foreground">
                                            {service.descripcion || service.tipo || 'Servicio'}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/40 border border-border/20 shrink-0">
                                        <Users className="w-3 h-3 text-primary/70" />
                                        <span className="font-bold text-[11px]">{service.asistentes}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                                    <div className="flex items-center gap-1 truncate max-w-[150px]">
                                        <MapPin className="w-2.5 h-2.5" />
                                        <span className="truncate font-bold text-foreground/70">{service.nombreEspacio || 'Sin espacio'}</span>
                                    </div>
                                    {service.sala && (
                                        <>
                                            <span>•</span>
                                            <span className="truncate font-medium">{service.sala}</span>
                                        </>
                                    )}
                                    {service.conGastronomia && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-bold uppercase text-[8px]">Gastro</span>
                                        </>
                                    )}
                                </div>

                                { (service.comentario || service.comentarios) && (
                                    <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1 border-l-2 border-primary/20 pl-2 mt-0.5">
                                        {service.comentario || service.comentarios}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}