'use client';

import { useState, useMemo, useEffect, Suspense, Fragment, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    format, isThisWeek, isSameWeek, addWeeks, isSameDay, parseISO, isAfter, isBefore, startOfToday, startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Search, Filter, Plus, FileText, Phone, MapPin,
    Users, AlertTriangle, CalendarDays, ArrowUpDown, Star, Clock, Info,
    History, Eye, EyeOff, ClipboardList
} from 'lucide-react';

import { useEventList } from '@/hooks/use-data-queries';
import { ServiceOrder, ComercialBriefing } from '@/types';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import SplashScreen from '@/components/layout/splash-screen';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// --- HELPERS & TYPES ---

type TimeFilter = 'all' | 'today' | 'this_week' | 'next_week' | 'future';
type StatusFilter = 'all' | 'CONFIRMADO' | 'PENDIENTE' | 'BORRADOR';

const STATUS_CONFIG: Record<string, { color: string, label: string, border: string, bg: string }> = {
    'CONFIRMADO': { color: 'text-emerald-700', label: 'Confirmado', border: 'border-emerald-500', bg: 'bg-emerald-50' },
    'PENDIENTE': { color: 'text-amber-700', label: 'Pendiente', border: 'border-amber-500', bg: 'bg-amber-50' },
    'BORRADOR': { color: 'text-slate-600', label: 'Borrador', border: 'border-slate-300', bg: 'bg-slate-50' },
    'CANCELADO': { color: 'text-red-700', label: 'Cancelado', border: 'border-red-500', bg: 'bg-red-50' },
};

const getHealthWarnings = (os: ServiceOrder) => {
    const warnings = [];
    if (!os.asistentes || os.asistentes === 0) warnings.push('Sin Pax');
    return warnings;
};

// --- COMPONENTES LOCALES ---

const PESMobileCard = memo(({ os, date, gastronomyCount, dayPax }: { os: ServiceOrder, date: Date, gastronomyCount?: number, dayPax?: number }) => {
    const statusConfig = STATUS_CONFIG[(os.status || 'BORRADOR').toUpperCase()] || STATUS_CONFIG['BORRADOR'];
    const warnings = getHealthWarnings(os);

    return (
        <Link href={`/os/${os.id}/info`} className="block">
            <Card className={cn(
                "overflow-hidden transition-all active:scale-[0.98] mb-3",
                "border-l-4 shadow-sm",
                statusConfig.border
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold leading-none text-foreground">
                                    {format(date, 'd')}
                                </span>
                                <span className="text-xs uppercase font-bold text-muted-foreground">
                                    {format(date, 'MMM', { locale: es })}
                                </span>
                            </div>
                            {os.isVip && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusConfig.color, statusConfig.bg)}>
                                {statusConfig.label}
                            </Badge>
                            {gastronomyCount !== undefined && gastronomyCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                    🍴 {gastronomyCount} Gastro
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="mb-3">
                        <h3 className="text-base font-bold leading-tight mb-1 text-foreground">
                            {os.client}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{os.space}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-dashed">
                        <div className="flex gap-3 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span className="font-medium text-foreground">
                                    {dayPax !== undefined ? dayPax : os.asistentes}
                                </span>
                            </div>
                            {warnings.length > 0 && (
                                <div className="flex items-center gap-1.5 text-amber-600">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs font-medium">{warnings[0]}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                                <Phone className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
});

PESMobileCard.displayName = 'PESMobileCard';

const DayHeader = memo(({ dateKey, eventsCount, gastroServices, gastroPax }: { 
    dateKey: string, 
    eventsCount: number, 
    gastroServices: number, 
    gastroPax: number 
}) => (
    <TableRow className="bg-muted/30 hover:bg-muted/30 border-y">
        <TableCell colSpan={7} className="py-2 px-4">
            <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">
                    {dateKey !== 'unknown' ? format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es }) : 'Fecha desconocida'}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-2">{eventsCount} eventos</Badge>
                {gastroServices > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-orange-50 text-orange-700 border-orange-200 font-bold">
                        {gastroServices} servicios gastro
                    </Badge>
                )}
                {gastroPax > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200 font-bold">
                        {gastroPax} PAX
                    </Badge>
                )}
            </div>
        </TableCell>
    </TableRow>
));
DayHeader.displayName = 'DayHeader';

const EventRow = memo(({ os, dateKey, onClick }: { 
    os: any, 
    dateKey: string, 
    onClick: () => void 
}) => {
    const status = STATUS_CONFIG[os.status?.toUpperCase()] || STATUS_CONFIG['BORRADOR'];
    const warnings = getHealthWarnings(os);
    const { gastroCount, gastroPax, itemsForThisDate } = os.dayStats;
    
    // Calculate day pax: max of any item this day, or OS total if no items
    const dayPax = itemsForThisDate.length > 0 
        ? Math.max(0, ...itemsForThisDate.map((i: any) => Number(i.asistentes) || 0))
        : os.asistentes;

    return (
        <TableRow
            className={cn(
                "group cursor-pointer hover:bg-muted/50",
                os.isVip && "bg-amber-50/50 hover:bg-amber-100/50"
            )}
            onClick={onClick}
        >
            <TableCell className="text-center">
                {os.isVip && <Star className="w-4 h-4 fill-amber-400 text-amber-400 mx-auto" />}
            </TableCell>
            <TableCell className="font-black text-sm text-foreground tracking-tight">
                {os.serviceNumber}
            </TableCell>
            <TableCell>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">{os.client}</span>
                            {warnings.length > 0 && (
                                <div className="flex gap-2 mt-1">
                                    {warnings.map(w => (
                                        <Badge key={w} variant="destructive" className="text-[10px] h-4 px-1 py-0 font-normal">
                                            {w}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="w-80 p-0 overflow-hidden shadow-xl border-muted-foreground/20">
                        <div className="bg-muted/50 p-3 border-b">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-sm">{os.client}</h4>
                                <Badge variant="outline" className="text-[10px]">{os.serviceNumber}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {os.space}
                            </p>
                        </div>
                        <div className="p-3 space-y-3">
                            {itemsForThisDate.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Servicios del día</p>
                                    {itemsForThisDate.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-2 py-0.5">
                                            <div className="flex flex-col min-w-[45px]">
                                                <span className="font-bold">{item.horaInicio}</span>
                                                <span className="text-[10px] text-muted-foreground">{item.horaFin}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium">{item.descripcion}</span>
                                                    {item.conGastronomia && <Badge className="h-3 px-1 text-[8px] bg-blue-100 text-blue-700 border-none">GASTRO</Badge>}
                                                </div>
                                                {(item.comentario || item.comentarios) && (
                                                    <p className="text-[10px] text-muted-foreground italic mt-0.5 line-clamp-2">
                                                        "{item.comentario || item.comentarios}"
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {item.asistentes} pax</span>
                                                    {item.sala && <span className="flex items-center gap-0.5"><Info className="w-2.5 h-2.5" /> {item.sala}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic py-2">No hay detalles del briefing disponibles para esta fecha.</p>
                            )}

                            <div className="pt-2 border-t flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground">Comercial</span>
                                    <span className="text-xs font-medium">{os.comercial || 'No asignado'}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-muted-foreground">Pax Gastro</span>
                                    <span className="text-xs font-bold">{gastroPax || 0}</span>
                                </div>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                {os.space}
            </TableCell>
            <TableCell className="text-center font-medium">
                {dayPax}
            </TableCell>
            <TableCell className="text-center">
                {gastroCount > 0 ? (
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 font-bold">
                        {gastroCount}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        status.bg || "bg-gray-100",
                        status.color || "text-gray-700"
                    )}
                >
                    {status.label}
                </Badge>
            </TableCell>
        </TableRow>
    );
});
EventRow.displayName = 'EventRow';

// --- PÁGINA PRINCIPAL ---

function PESPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams() ?? new URLSearchParams();

    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) {
            params.set('q', debouncedSearch);
        } else {
            params.delete('q');
        }
        const newSearch = params.toString();
        if (newSearch !== searchParams.toString()) {
            router.replace(`?${newSearch}`, { scroll: false });
        }
    }, [debouncedSearch, router, searchParams]);

    const timeFilter = (searchParams.get('time') as TimeFilter) || 'all';
    const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';
    const showPast = searchParams.get('past') === 'true';

    const { data: eventListData, isLoading } = useEventList({
        search: debouncedSearch,
        status: statusFilter,
        timeFilter: timeFilter,
        showPast: showPast,
        limit: 100
    });

    const eventos = eventListData?.events || [];

    const groupedEvents = useMemo(() => {
        const groups: Record<string, { 
            items: (ServiceOrder & { 
                dayStats: { 
                    gastroCount: number, 
                    gastroPax: number,
                    itemsForThisDate: any[]
                } 
            })[], 
            stats: { gastroServices: number, gastroPax: number } 
        }> = {};

        const today = startOfToday();
        const nextWeek = addWeeks(today, 1);

        eventos.forEach(os => {
            const briefing = (os as any).briefing;
            const dates = new Set<string>();

            if (briefing?.items?.length > 0) {
                briefing.items.forEach((item: any) => {
                    if (item.fecha) dates.add(item.fecha);
                });
            }

            if (dates.size === 0) {
                const dateKey = os.startDate ? (typeof os.startDate === 'string' ? os.startDate.split('T')[0] : format(new Date(os.startDate), 'yyyy-MM-dd')) : 'unknown';
                dates.add(dateKey);
            }

            dates.forEach(dateKey => {
                // Frontend filtering to match the selected time filter
                if (dateKey !== 'unknown' && timeFilter !== 'all') {
                    const date = parseISO(dateKey);
                    const sDate = startOfDay(date);
                    
                    if (timeFilter === 'today' && !isSameDay(sDate, today)) return;
                    if (timeFilter === 'this_week' && !isSameWeek(sDate, today, { weekStartsOn: 1 })) return;
                    if (timeFilter === 'next_week' && !isSameWeek(sDate, nextWeek, { weekStartsOn: 1 })) return;
                }

                if (!groups[dateKey]) {
                    groups[dateKey] = { items: [], stats: { gastroServices: 0, gastroPax: 0 } };
                }
                
                // Calculate stats for this OS on this specific date
                let gastroCount = 0;
                let gastroPax = 0;
                const itemsForThisDate: any[] = [];
                
                if (briefing?.items) {
                    briefing.items.forEach((item: any) => {
                        if (item.fecha === dateKey) {
                            itemsForThisDate.push(item);
                            if (item.conGastronomia) {
                                gastroCount++;
                                // Use Max to avoid double counting same people in different services
                                gastroPax = Math.max(gastroPax, Number(item.asistentes) || 0);
                            }
                        }
                    });
                }

                groups[dateKey].items.push({
                    ...os,
                    dayStats: { gastroCount, gastroPax, itemsForThisDate }
                } as any);
                
                groups[dateKey].stats.gastroServices += gastroCount;
                groups[dateKey].stats.gastroPax += gastroPax;
            });
        });

        const sortedKeys = Object.keys(groups).sort();
        const sortedGroups: typeof groups = {};
        sortedKeys.forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [eventos, timeFilter]);

    const updateFilter = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== 'all') {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    if (isLoading) return <SplashScreen />;

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <ClipboardList className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Listado</span>
                            <span className="text-xs font-bold text-foreground leading-none mt-1">
                                Órdenes de Servicio
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 hidden md:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="Buscar cliente, ref, espacio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-emerald-500/20 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        <Tabs
                            value={timeFilter}
                            onValueChange={(v) => updateFilter('time', v)}
                            className="w-full lg:w-auto"
                        >
                            <TabsList className="h-8 bg-muted/50 border border-border/40 rounded-lg p-1 w-full lg:w-auto overflow-x-auto no-scrollbar flex justify-start lg:justify-center">
                                <TabsTrigger value="all" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Todo</TabsTrigger>
                                <TabsTrigger value="today" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Hoy</TabsTrigger>
                                <TabsTrigger value="this_week" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Semana</TabsTrigger>
                                <TabsTrigger value="next_week" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Próxima</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50", statusFilter !== 'all' && "border-emerald-500/50 bg-emerald-500/5 text-emerald-700")}>
                                    <Filter className="w-3.5 h-3.5 mr-2" />
                                    {statusFilter === 'all' ? 'Estado' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-border/40 p-2 shadow-2xl backdrop-blur-xl bg-background/80">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Filtrar por Estado</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border/40" />
                                <DropdownMenuItem onClick={() => updateFilter('status', 'all')} className="rounded-lg p-2 font-bold text-xs">
                                    Todos
                                </DropdownMenuItem>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <DropdownMenuItem key={key} onClick={() => updateFilter('status', key)} className="rounded-lg p-2 font-bold text-xs">
                                        <span className={cn("w-2 h-2 rounded-full mr-2", config.bg.replace('bg-', 'bg-').replace('/50', ''))} style={{ backgroundColor: 'currentColor' }} />
                                        {config.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateFilter('past', showPast ? null : 'true')}
                            className={cn(
                                "h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50",
                                showPast ? "border-amber-500/50 bg-amber-500/5 text-amber-700" : "text-muted-foreground"
                            )}
                        >
                            {showPast ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
                            {showPast ? "Celebrados" : "Ver celebrados"}
                        </Button>

                        <div className="h-4 w-[1px] bg-border/40 mx-1" />

                        <Button size="sm" asChild className="h-8 rounded-lg font-black px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                            <Link href="/os/nuevo/info">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Nueva OS
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
                <div className="md:hidden space-y-6">
                    {Object.entries(groupedEvents).map(([date, group]) => {
                        const { items, stats } = group;
                        const { gastroServices, gastroPax } = stats;

                        return (
                            <div key={date}>
                                <div className="sticky top-[112px] z-10 bg-background/95 backdrop-blur py-2 mb-2 border-b space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-foreground">
                                            {date !== 'unknown' ? format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }) : 'Fecha desconocida'}
                                        </span>
                                        <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                                    </div>
                                    {(gastroServices > 0 || gastroPax > 0) && (
                                        <div className="flex gap-1.5">
                                            {gastroServices > 0 && (
                                                <Badge variant="outline" className="text-[9px] h-4 bg-orange-50 text-orange-700 border-orange-200 font-bold px-1.5">
                                                    {gastroServices} serv. gastro
                                                </Badge>
                                            )}
                                            {gastroPax > 0 && (
                                                <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200 font-bold px-1.5">
                                                    {gastroPax} PAX
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {items.map(os => {
                                    const dayPax = os.dayStats.itemsForThisDate.length > 0 
                                        ? Math.max(0, ...os.dayStats.itemsForThisDate.map((i: any) => Number(i.asistentes) || 0))
                                        : os.asistentes;
                                    
                                    return (
                                        <PESMobileCard
                                            key={`${os.id}-${date}`}
                                            os={os}
                                            date={date !== 'unknown' ? parseISO(date) : new Date()}
                                            gastronomyCount={os.dayStats.gastroCount}
                                            dayPax={dayPax}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                    {eventos.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron eventos</p>
                        </div>
                    )}
                </div>

                <div className="hidden md:block border rounded-lg bg-card shadow-sm overflow-hidden">
                    <TooltipProvider>
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[40px] text-center"></TableHead>
                                    <TableHead className="w-[120px]">Ref</TableHead>
                                    <TableHead className="min-w-[200px]">Cliente / Evento</TableHead>
                                    <TableHead className="min-w-[150px]">Espacio</TableHead>
                                    <TableHead className="w-[80px] text-center">Pax</TableHead>
                                    <TableHead className="w-[100px] text-center">Serv. Gastro</TableHead>
                                    <TableHead className="w-[120px] text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedEvents).length > 0 ? (
                                    Object.entries(groupedEvents).map(([dateKey, group]) => {
                                        const { items: events, stats } = group;

                                        return (
                                            <Fragment key={dateKey}>
                                                <DayHeader 
                                                    dateKey={dateKey} 
                                                    eventsCount={events.length} 
                                                    gastroServices={stats.gastroServices} 
                                                    gastroPax={stats.gastroPax} 
                                                />
                                                {events.map((os) => (
                                                    <EventRow 
                                                        key={`${os.id}-${dateKey}`} 
                                                        os={os} 
                                                        dateKey={dateKey} 
                                                        onClick={() => router.push(`/os/${os.id}/info`)} 
                                                    />
                                                ))}
                                            </Fragment>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            No hay eventos que coincidan con los filtros.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TooltipProvider>
                </div>
            </div>
        </main>
    );
}
export default function PESPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <PESPageInner />
        </Suspense>
    );
}
