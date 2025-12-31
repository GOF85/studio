

'use client';

import { useState, useEffect, useMemo, memo, Suspense, Fragment } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday, startOfWeek, endOfWeek, isWithinInterval, addWeeks, isSameWeek, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  PlusCircle, Package, ClipboardList, Search, Filter, 
  Eye, EyeOff, Plus, Truck, Clock, User, MapPin, 
  CalendarDays, Star, AlertTriangle, Phone, ChevronRight
} from 'lucide-react';
import type { Entrega } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { useEntregas } from '@/hooks/use-data-queries';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

// --- HELPERS & TYPES ---

type TimeFilter = 'all' | 'today' | 'this_week' | 'next_week' | 'future';

const STATUS_CONFIG: Record<string, { color: string, label: string, border: string, bg: string }> = {
    'CONFIRMADO': { color: 'text-emerald-700', label: 'Confirmado', border: 'border-emerald-500', bg: 'bg-emerald-50' },
    'PENDIENTE': { color: 'text-amber-700', label: 'Pendiente', border: 'border-amber-500', bg: 'bg-amber-50' },
    'BORRADOR': { color: 'text-slate-600', label: 'Borrador', border: 'border-slate-300', bg: 'bg-slate-50' },
    'CANCELADO': { color: 'text-red-700', label: 'Cancelado', border: 'border-red-500', bg: 'bg-red-50' },
    'EJECUTADO': { color: 'text-blue-700', label: 'Entregado', border: 'border-blue-500', bg: 'bg-blue-50' },
};

// --- COMPONENTES LOCALES ---

const DeliveryMobileCard = memo(({ hito }: { hito: any }) => {
    const status = (hito.estado || hito.status || 'BORRADOR').toUpperCase();
    const displayStatus = status === 'EJECUTADO' ? 'EJECUTADO' : status;
    const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG['BORRADOR'];
    const date = hito.fecha_inicio ? parseISO(hito.fecha_inicio) : new Date();

    return (
        <Link href={`/entregas/pedido/${hito.parentExpediente || hito.serviceNumber}`} className="block">
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
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{hito.serviceNumber}</span>
                                <span className="text-xs font-bold text-muted-foreground">{hito.deliveryTime}</span>
                            </div>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusConfig.color, statusConfig.bg)}>
                            {statusConfig.label}
                        </Badge>
                    </div>

                    <div className="mb-3">
                        <h3 className="text-base font-bold leading-tight mb-1 text-foreground">
                            {hito.nombre_evento}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{hito.lugarEntrega || 'Sin dirección'}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-dashed">
                        <div className="flex gap-3 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Package className="w-4 h-4" />
                                <span className="font-medium text-foreground">
                                    {hito.briefing_items?.length || 0} bultos
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
});
DeliveryMobileCard.displayName = 'DeliveryMobileCard';

const DayHeader = memo(({ dateKey, eventsCount }: { 
    dateKey: string, 
    eventsCount: number
}) => (
    <TableRow className="bg-muted/30 hover:bg-muted/30 border-y">
        <TableCell colSpan={5} className="py-2 px-4">
            <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">
                    {dateKey !== 'unknown' ? format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es }) : 'Fecha desconocida'}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 ml-2">{eventsCount} pedidos</Badge>
            </div>
        </TableCell>
    </TableRow>
));
DayHeader.displayName = 'DayHeader';

const DeliveryRow = memo(({ hito, onClick }: { 
    hito: any, 
    onClick: () => void 
}) => {
    const status = (hito.estado || hito.status || 'BORRADOR').toUpperCase();
    const displayStatus = status === 'EJECUTADO' ? 'EJECUTADO' : status;
    const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG['BORRADOR'];

    return (
        <TableRow
            className="group cursor-pointer hover:bg-muted/50"
            onClick={onClick}
        >
            <TableCell className="font-black text-sm text-foreground tracking-tight">
                {hito.serviceNumber}
            </TableCell>
            <TableCell>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{hito.nombre_evento}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {hito.lugarEntrega || 'Sin dirección'}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="w-80 p-0 overflow-hidden shadow-xl border-muted-foreground/20">
                        <div className="bg-muted/50 p-3 border-b">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-sm">{hito.nombre_evento}</h4>
                                <Badge variant="outline" className="text-[10px]">{hito.serviceNumber}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {hito.lugarEntrega}
                            </p>
                        </div>
                        <div className="p-3 space-y-3">
                            {hito.briefing_items && hito.briefing_items.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Contenido del Pedido</p>
                                    {hito.briefing_items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-2 py-0.5">
                                            <span className="font-bold text-primary">{item.quantity}x</span>
                                            <span>{item.nombre}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic py-2">No hay detalles disponibles.</p>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                {hito.deliveryTime}
            </TableCell>
            <TableCell className="text-center font-medium">
                {hito.briefing_items?.length || 0}
            </TableCell>
            <TableCell className="text-right">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        statusConfig.bg,
                        statusConfig.color
                    )}
                >
                    {statusConfig.label}
                </Badge>
            </TableCell>
        </TableRow>
    );
});
DeliveryRow.displayName = 'DeliveryRow';

function PrevisionEntregasClient() {
  const { data: entregasData, isLoading, refetch } = useEntregas();
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [searchParams]);

  usePullToRefresh({ onRefresh: async () => { await refetch(); } });

  // URL-driven state
  const searchTerm = searchParams.get('q') || '';
  const timeFilter = (searchParams.get('time') as TimeFilter) || 'all';
  const showPastEvents = searchParams.get('past') === 'true';
  const statusFilter = searchParams.get('status') || 'all';

  const updateFilters = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '' || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allHitos = useMemo(() => {
    const flattened: any[] = [];
    (entregasData || []).forEach((entrega: any) => {
      const hitos = entrega.hitos || [];
      if (hitos.length === 0) return;
      
      hitos.forEach((hito: any, index: number) => {
        const hitoIndex = (index + 1).toString().padStart(2, '0');
        flattened.push({
          ...entrega,
          ...hito,
          id: `${entrega.id}-${hito.id || index}`,
          serviceNumber: `${entrega.numero_expediente}.${hitoIndex}`,
          parentExpediente: entrega.numero_expediente,
          fecha_inicio: hito.fecha,
          deliveryTime: hito.hora,
          briefing_items: hito.items || []
        });
      });
    });
    return flattened;
  }, [entregasData]);

  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(weekStart, 1);
    const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });

    const filtered = allHitos.filter(os => {
      const serviceNumber = os.serviceNumber || '';
      const client = os.nombre_evento || os.client || '';
      const searchMatch = searchTerm.trim() === '' || 
                         serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let timeMatch = true;
      if (os.fecha_inicio) {
          const date = parseISO(os.fecha_inicio);
          if (timeFilter === 'today') {
              timeMatch = date.getTime() === today.getTime();
          } else if (timeFilter === 'this_week') {
              timeMatch = isWithinInterval(date, { start: weekStart, end: weekEnd });
          } else if (timeFilter === 'next_week') {
              timeMatch = isWithinInterval(date, { start: nextWeekStart, end: nextWeekEnd });
          } else if (timeFilter === 'future') {
              timeMatch = !isBefore(date, today);
          }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents && timeFilter === 'all') {
          try {
              const date = os.fecha_inicio ? parseISO(os.fecha_inicio) : null;
              pastEventMatch = date ? !isBefore(date, today) : true;
          } catch (e) {
              pastEventMatch = true;
          }
      }

      const status = (os.estado || os.status || '').toUpperCase();
      const displayStatus = status === 'EJECUTADO' ? 'EJECUTADO' : status;
      const statusMatch = statusFilter === 'all' || displayStatus === statusFilter.toUpperCase();

      return searchMatch && timeMatch && pastEventMatch && statusMatch;
    });

    return filtered.sort((a, b) => {
        const dateA = a.fecha_inicio || '';
        const dateB = b.fecha_inicio || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.deliveryTime || '').localeCompare(b.deliveryTime || '');
    });

  }, [allHitos, searchTerm, timeFilter, showPastEvents, statusFilter]);

  const groupedOrders = useMemo(() => {
      const groups: Record<string, any[]> = {};
      filteredAndSortedOrders.forEach(order => {
          const dateKey = order.fecha_inicio || 'unknown';
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(order);
      });
      return groups;
  }, [filteredAndSortedOrders]);

  if (!isMounted || isLoading) {
    return <LoadingSkeleton title="Cargando Previsión de Entregas..." />;
  }

  return (
    <main className="min-h-screen bg-background/30 pb-20">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <ClipboardList className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Listado</span>
                      <span className="text-xs font-bold text-foreground leading-none mt-1">Previsión de Entregas</span>
                  </div>
              </div>

              <div className="flex-1 hidden md:block">
                  <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <Input
                          placeholder="Buscar pedido o cliente..."
                          value={searchTerm}
                          onChange={(e) => updateFilters({ q: e.target.value })}
                          className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                      />
                  </div>
              </div>

              <div className="flex items-center gap-3">
                  <Tabs
                      value={timeFilter}
                      onValueChange={(v) => updateFilters({ time: v })}
                      className="w-full lg:w-auto"
                  >
                      <TabsList className="h-8 bg-muted/50 border border-border/40 rounded-lg p-1 w-full lg:w-auto overflow-x-auto no-scrollbar flex justify-start lg:justify-center">
                          <TabsTrigger value="all" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-amber-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Todo</TabsTrigger>
                          <TabsTrigger value="today" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-amber-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Hoy</TabsTrigger>
                          <TabsTrigger value="this_week" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-amber-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Semana</TabsTrigger>
                          <TabsTrigger value="next_week" className="text-[9px] font-black uppercase tracking-widest px-3 rounded-md data-[state=active]:bg-amber-600 data-[state=active]:text-white h-6 flex-1 lg:flex-none">Próxima</TabsTrigger>
                      </TabsList>
                  </Tabs>

                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50", statusFilter !== 'all' && "border-amber-500/50 bg-amber-500/5 text-amber-700")}>
                              <Filter className="w-3.5 h-3.5 mr-2" />
                              {statusFilter === 'all' ? 'Estado' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-border/40 p-2 shadow-2xl backdrop-blur-xl bg-background/80">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Filtrar por Estado</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-border/40" />
                          <DropdownMenuItem onClick={() => updateFilters({ status: 'all' })} className="rounded-lg p-2 font-bold text-xs">
                              Todos
                          </DropdownMenuItem>
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <DropdownMenuItem key={key} onClick={() => updateFilters({ status: key })} className="rounded-lg p-2 font-bold text-xs">
                                  <span className={cn("w-2 h-2 rounded-full mr-2", config.bg.replace('bg-', 'bg-').replace('/50', ''))} style={{ backgroundColor: 'currentColor' }} />
                                  {config.label}
                              </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFilters({ past: !showPastEvents })}
                      className={cn(
                          "h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50",
                          showPastEvents ? "border-amber-500/50 bg-amber-500/5 text-amber-700" : "text-muted-foreground"
                      )}
                  >
                      {showPastEvents ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
                      {showPastEvents ? "Finalizados" : "Ver finalizados"}
                  </Button>

                  <div className="h-4 w-[1px] bg-border/40 mx-1" />

                  <Button size="sm" asChild className="h-8 rounded-lg font-black px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                      <Link href="/entregas/pedido/nuevo">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Nuevo Pedido
                      </Link>
                  </Button>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Mobile View */}
        <div className="md:hidden space-y-6">
            {Object.entries(groupedOrders).map(([date, orders]) => (
                <div key={date}>
                    <div className="sticky top-[112px] z-10 bg-background/95 backdrop-blur py-2 mb-2 border-b flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                            {date !== 'unknown' ? format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }) : 'Fecha desconocida'}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">{orders.length}</Badge>
                    </div>
                    {orders.map(order => (
                        <DeliveryMobileCard key={order.id} hito={order} />
                    ))}
                </div>
            ))}
            {filteredAndSortedOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No se encontraron pedidos</p>
                </div>
            )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block border rounded-xl bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
          <TooltipProvider>
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        <TableHead className="w-[150px]">Nº Pedido</TableHead>
                        <TableHead>Evento / Cliente</TableHead>
                        <TableHead className="w-[120px]">Hora</TableHead>
                        <TableHead className="w-[100px] text-center">Bultos</TableHead>
                        <TableHead className="w-[150px] text-right">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {Object.entries(groupedOrders).length > 0 ? (
                    Object.entries(groupedOrders).map(([dateKey, orders]) => (
                        <Fragment key={dateKey}>
                            <DayHeader dateKey={dateKey} eventsCount={orders.length} />
                            {orders.map(order => (
                                <DeliveryRow 
                                    key={order.id} 
                                    hito={order} 
                                    onClick={() => router.push(`/entregas/pedido/${order.parentExpediente || order.serviceNumber}`)} 
                                />
                            ))}
                        </Fragment>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No hay pedidos de entrega que coincidan con los filtros.
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

export default function PrevisionEntregasPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Previsión de Entregas..." />}>
      <PrevisionEntregasClient />
    </Suspense>
  );
}
