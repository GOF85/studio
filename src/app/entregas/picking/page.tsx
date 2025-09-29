
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

const ITEMS_PER_PAGE = 20;

type HitoDePicking = EntregaHito & {
    serviceOrder: Entrega;
    expedicion: string;
};

export default function PickingEntregasPage() {
  const [hitos, setHitos] = useState<HitoDePicking[]>([]);
  const [pickingStates, setPickingStates] = useState<Record<string, PickingEntregaState>>({});
  const [productosVentaMap, setProductosVentaMap] = useState<Map<string, ProductoVenta>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[])
      .filter(os => os.status === 'Confirmado');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}') as Record<string, PickingEntregaState>;
    setPickingStates(allPickingStates);
    
    const allPedidos = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[]);
    const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    setProductosVentaMap(new Map(allProductosVenta.map(p => [p.id, p])));
    
    const osMap = new Map(allEntregas.map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    allPedidos.forEach(pedido => {
        const serviceOrder = osMap.get(pedido.osId);
        if (serviceOrder && pedido.hitos) {
            pedido.hitos.forEach((hito, index) => {
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                });
            });
        }
    });
    
    setHitos(hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    setIsMounted(true);
  }, []);

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
        const producto = productosVentaMap.get(item.id);
        if (producto) {
            if (producto.producidoPorPartner || producto.recetaId) {
                allItemsToPick.add(`prod_${producto.id}`);
            } else {
                 (producto.componentes || []).forEach(comp => allItemsToPick.add(comp.erpId));
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
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ListChecks />Picking y Logística</h1>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
              placeholder="Buscar por expedición, cliente o lugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}>Limpiar Filtros</Button>
       </div>

        <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>

      <div className="border rounded-lg">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Nº Expedición</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Lugar de Entrega</TableHead>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Estado del Picking</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedHitos.length > 0 ? (
                  paginatedHitos.map(hito => {
                    const progress = getPickingProgress(hito);
                    return (
                        <TableRow key={hito.id} onClick={() => router.push(`/entregas/picking/${hito.id}?osId=${hito.serviceOrder.id}`)} className="cursor-pointer">
                            <TableCell><Badge variant="outline">{hito.expedicion}</Badge></TableCell>
                            <TableCell className="font-medium">{hito.serviceOrder.client}</TableCell>
                            <TableCell>{hito.lugarEntrega}</TableCell>
                            <TableCell>{format(new Date(hito.fecha), 'dd/MM/yyyy')} {hito.hora || ''}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={progress.percentage} className="w-40" />
                                    <span className="text-sm text-muted-foreground">{progress.checked} / {progress.total}</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                  })
              ) : (
                  <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      No hay entregas confirmadas para preparar.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
    </main>
  );
}
