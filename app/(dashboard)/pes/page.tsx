'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    format, isThisWeek, isSameWeek, addWeeks, isSameDay, parseISO, isAfter, startOfToday 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Search, Filter, Plus, FileText, Phone, MapPin, 
    Users, AlertTriangle, CalendarDays, ArrowUpDown 
} from 'lucide-react';

import { useEventos } from '@/hooks/use-data-queries';
import { ServiceOrder } from '@/types';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- HELPERS & TYPES ---

type TimeFilter = 'all' | 'this_week' | 'next_week' | 'future';
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

function PESMobileCard({ os }: { os: ServiceOrder }) {
    const statusConfig = STATUS_CONFIG[os.status.toUpperCase()] || STATUS_CONFIG['BORRADOR'];
    const warnings = getHealthWarnings(os);
    const date = new Date(os.startDate);

    return (
        <Link href={`/os/${os.id}/info`} className="block">
            <Card className={cn(
                "overflow-hidden transition-all active:scale-[0.98] mb-3",
                "border-l-4 shadow-sm", 
                statusConfig.border
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold leading-none text-foreground">
                                {format(date, 'd')}
                            </span>
                            <span className="text-xs uppercase font-bold text-muted-foreground">
                                {format(date, 'MMM', { locale: es })}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusConfig.color, statusConfig.bg)}>
                                {statusConfig.label}
                            </Badge>
                            {os.isVip && (
                                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                                    ⭐ VIP
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
                                <span className="font-medium text-foreground">{os.asistentes}</span>
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
}

// --- PÁGINA PRINCIPAL ---

function PESPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams() ?? new URLSearchParams();
    
    const query = searchParams.get('q') || '';
    const timeFilter = (searchParams.get('time') as TimeFilter) || 'all';
    const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

    const { data: eventos = [], isLoading } = useEventos();

    const filteredEvents = useMemo(() => {
        if (!eventos) return [];
        
        return eventos.filter(os => {
            const matchesSearch = !query || 
                os.client.toLowerCase().includes(query.toLowerCase()) || 
                os.serviceNumber.toLowerCase().includes(query.toLowerCase()) ||
                os.space.toLowerCase().includes(query.toLowerCase());

            const matchesStatus = statusFilter === 'all' || os.status?.toUpperCase() === statusFilter;

            let matchesTime = true;
            const date = new Date(os.startDate);
            
            if (timeFilter === 'this_week') {
                matchesTime = isThisWeek(date, { weekStartsOn: 1 });
            }
            if (timeFilter === 'next_week') {
                matchesTime = isSameWeek(date, addWeeks(new Date(), 1), { weekStartsOn: 1 });
            }
            if (timeFilter === 'future') {
                matchesTime = isAfter(date, startOfToday());
            }

            return matchesSearch && matchesStatus && matchesTime;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [eventos, query, statusFilter, timeFilter]);

    const groupedEvents = useMemo(() => {
        const groups: Record<string, ServiceOrder[]> = {};
        filteredEvents.forEach(os => {
            const dateKey = format(new Date(os.startDate), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(os);
        });
        return groups;
    }, [filteredEvents]);

    const updateFilter = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== 'all') {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    if (isLoading) return <LoadingSkeleton title="Cargando PES..." />;

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 hidden sm:block">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight">Plan Estratégico</h1>
                                <p className="text-xs text-muted-foreground font-medium hidden sm:block">
                                    {filteredEvents.length} servicios encontrados
                                </p>
                            </div>
                        </div>
                        <Button size="sm" asChild className="font-bold shadow-sm">
                            <Link href="/os/nuevo/info">
                                <Plus className="w-4 h-4 mr-1.5" />
                                Nueva OS
                            </Link>
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar cliente, ref, espacio..." 
                                className="pl-9 h-9 bg-muted/30 border-muted-foreground/20"
                                value={query}
                                onChange={(e) => updateFilter('q', e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            <Tabs 
                                value={timeFilter} 
                                onValueChange={(v) => updateFilter('time', v)} 
                                className="w-auto"
                            >
                                <TabsList className="h-9">
                                    <TabsTrigger value="all" className="text-xs">Todo</TabsTrigger>
                                    <TabsTrigger value="this_week" className="text-xs">Esta Sem.</TabsTrigger>
                                    <TabsTrigger value="next_week" className="text-xs">Próxima</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className={cn("h-9 border-dashed", statusFilter !== 'all' && "bg-primary/5 border-primary text-primary")}>
                                        <Filter className="w-3.5 h-3.5 mr-2" />
                                        {statusFilter === 'all' ? 'Estado' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateFilter('status', 'all')}>
                                        Todos
                                    </DropdownMenuItem>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <DropdownMenuItem key={key} onClick={() => updateFilter('status', key)}>
                                            <span className={cn("w-2 h-2 rounded-full mr-2", config.bg.replace('bg-', 'bg-').replace('/50', ''))} style={{ backgroundColor: 'currentColor' }} />
                                            {config.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
                <div className="md:hidden space-y-6">
                    {Object.entries(groupedEvents).map(([date, items]) => (
                        <div key={date}>
                            <div className="sticky top-[130px] z-10 bg-background/95 backdrop-blur py-2 mb-2 border-b flex items-center justify-between text-sm">
                                <span className="font-bold text-foreground">
                                    {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                                </span>
                                <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                            </div>
                            {items.map(os => <PESMobileCard key={os.id} os={os} />)}
                        </div>
                    ))}
                    {filteredEvents.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron servicios</p>
                        </div>
                    )}
                </div>

                <div className="hidden md:block border rounded-lg bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead className="w-[120px]">Ref</TableHead>
                                <TableHead className="w-[30%]">Cliente / Evento</TableHead>
                                <TableHead>Espacio</TableHead>
                                <TableHead className="text-center">Pax</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEvents.length > 0 ? (
                                filteredEvents.map((os) => {
                                    const status = STATUS_CONFIG[os.status?.toUpperCase()] || STATUS_CONFIG['BORRADOR'];
                                    const warnings = getHealthWarnings(os);

                                    return (
                                        <TableRow 
                                            key={os.id} 
                                            className="group cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/os/${os.id}/info`)}
                                        >
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {format(new Date(os.startDate), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {os.serviceNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{os.client}</span>
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
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {os.space}
                                            </TableCell>
                                            <TableCell className="text-center font-medium">
                                                {os.asistentes}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className={cn("font-medium", status.color, status.bg, status.border)}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No hay servicios que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
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
