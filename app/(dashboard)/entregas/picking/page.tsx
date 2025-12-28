

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, X, ArrowRight, Package } from 'lucide-react';
import type { Entrega, PickingEntregaState, PedidoEntrega, ProductoVenta, EntregaHito } from '@/types';
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
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

import { useEntregas, usePedidosEntrega, useArticulos } from '@/hooks/use-data-queries';
import { useCprPickingStates } from '@/hooks/use-cpr-data';

const ITEMS_PER_PAGE = 20;

type HitoDePicking = EntregaHito & {
    serviceOrder: Entrega;
    expedicion: string;
    pickingStatus: PickingEntregaState['status'];
};

export default function PickingEntregasPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  // Supabase Hooks
  const { data: entregasData, isLoading: loadingEntregas } = useEntregas();
  const { data: pedidosData, isLoading: loadingPedidos } = usePedidosEntrega();
  const { data: articulosData } = useArticulos();
  const { data: pickingStatesArray = [] } = useCprPickingStates();

  const pickingStates = useMemo(() => {
    const map: Record<string, any> = {};
    pickingStatesArray.forEach(ps => { map[ps.osId] = ps; });
    return map;
  }, [pickingStatesArray]);

  const articulosMap = useMemo(() => {
    const map = new Map();
    (articulosData || []).forEach(art => map.set(art.id, art));
    return map;
  }, [articulosData]);

  const hitos = useMemo(() => {
    if (!entregasData || !pedidosData) return [];

    const osMap = new Map(entregasData.filter(os => os.status === 'Confirmado').map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    pedidosData.forEach(pedido => {
        const serviceOrder = osMap.get(pedido.osId);
        if (serviceOrder && pedido.hitos) {
            pedido.hitos.forEach((hito, index) => {
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                    pickingStatus: hito.pickingState?.status || 'Pendiente',
                });
            });
        }
    });
    
    return hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [entregasData, pedidosData]);

  useEffect(() => {
    if (!loadingEntregas && !loadingPedidos) {
        setIsMounted(true);
    }
  }, [loadingEntregas, loadingPedidos]);

  const filteredHitos = useMemo(() => {
    return hitos.filter(hito => {
      const searchMatch = 
        hito.expedicion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.lugarEntrega.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const hitoDate = new Date(hito.fecha);
        if (dateRange.to) {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        }
      }

      return searchMatch && dateMatch;
    });
  }, [hitos, searchTerm, dateRange]);

  const paginatedHitos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHitos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHitos, currentPage]);

  const totalPages = Math.ceil(filteredHitos.length / ITEMS_PER_PAGE);

  const getPickingProgress = (hito: HitoDePicking) => {
    const state = pickingStates[hito.id];
    if (!hito.items) return { checked: 0, total: 0, percentage: 0 };
    
    const allItemsToPick = new Set<string>();
    hito.items.forEach(item => {
        const producto = articulosMap.get(item.id);
        if (producto) {
            if (producto.producidoPorPartner || producto.recetaId) {
                allItemsToPick.add(`prod_${producto.id}`);
            } else {
                 (producto.componentes || []).forEach((comp: any) => allItemsToPick.add(comp.erpId));
            }
        }
    });

    const totalItems = allItemsToPick.size;
    if (totalItems === 0) return { checked: 0, total: 0, percentage: 0 };

    const checkedItems = state?.checkedItems?.size || 0;
    
    return {
      checked: checkedItems,
      total: totalItems,
      percentage: (checkedItems / totalItems) * 100
    };
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Picking y Logística..." />;
  }

  return (
    <main className="min-h-screen bg-background/30 pb-20">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
              <div className="flex items-center">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <ListChecks className="h-5 w-5 text-amber-500" />
                  </div>
              </div>

              <div className="flex-1 hidden md:block">
                  <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <Input
                          placeholder="Buscar expedición o cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                      />
                  </div>
              </div>

              <div className="flex items-center gap-3">

              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50", dateRange?.from && "border-amber-500/50 bg-amber-500/5 text-amber-700")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM", { locale: es })}</>
                            ) : format(dateRange.from, "dd MMM", { locale: es })
                        ) : "Filtrar Fecha"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border-border/40 shadow-2xl" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                </PopoverContent>
              </Popover>

              {(searchTerm || dateRange) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-amber-600"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpiar
                  </Button>
              )}

              <div className="h-4 w-[1px] bg-border/40 mx-1" />

              <div className="flex items-center gap-1 bg-background/50 border border-border/40 rounded-lg p-0.5">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 w-7">
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] font-black px-2 min-w-[60px] text-center">
                      {currentPage} / {totalPages || 1}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 w-7">
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </div>
      </div>
  </div>

      <div className="max-w-[1600px] mx-auto px-4">
        <div className="bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <Table>
              <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Nº Expedición</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Lugar de Entrega</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Fecha y Hora</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Estado del Picking</TableHead>
                  <TableHead className="w-10 h-10"></TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedHitos.length > 0 ? (
                  paginatedHitos.map(hito => {
                    const progress = getPickingProgress(hito);
                    return (
                        <TableRow 
                            key={hito.id} 
                            onClick={() => router.push(`/entregas/picking/${hito.id}?osId=${hito.serviceOrder.id}`)} 
                            className="cursor-pointer hover:bg-amber-500/[0.02] border-border/40 transition-colors group"
                        >
                            <TableCell>
                                <Badge variant="outline" className="font-black text-[10px] border-amber-500/20 bg-amber-500/5 text-amber-700">
                                    {hito.expedicion}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">{hito.serviceOrder.client}</span>
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">{hito.serviceOrder.serviceNumber}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-[11px] text-muted-foreground line-clamp-1">{hito.lugarEntrega}</span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-3 w-3 text-amber-500" />
                                    <span className="text-[11px] font-medium">{format(new Date(hito.fecha), 'dd/MM/yyyy')}</span>
                                    <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1 bg-muted/50">
                                        {hito.hora || '--:--'}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell>
                                {progress.total > 0 ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-grow max-w-[120px]">
                                            <Progress value={progress.percentage} className="h-1.5 bg-amber-500/10" />
                                        </div>
                                        <span className="text-[10px] font-black text-muted-foreground tabular-nums">
                                            {progress.checked} / {progress.total}
                                        </span>
                                        {progress.percentage === 100 && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] font-black uppercase h-4 px-1">Listo</Badge>
                                        )}
                                    </div>
                                ) : (
                                    <Badge variant="secondary" className="text-[9px] font-bold opacity-50">Sin items</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                            </TableCell>
                        </TableRow>
                    )
                  })
              ) : (
                  <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Package className="h-8 w-8 opacity-20" />
                          <p className="text-[11px] font-medium uppercase tracking-widest">No hay entregas confirmadas para preparar</p>
                      </div>
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
