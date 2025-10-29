
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, UtensilsCrossed, ListChecks } from 'lucide-react';
import type { ServiceOrder, PickingEntregaState, PedidoEntrega, ProductoVenta, EntregaHito, ComercialBriefing, ComercialBriefingItem } from '@/types';
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
import { statusVariant } from '@/app/cpr/picking/[id]/page';

const ITEMS_PER_PAGE = 20;

type HitoDePicking = ComercialBriefingItem & {
    serviceOrder: ServiceOrder;
    expedicion: string;
    pickingStatus: PickingEntregaState['status'];
};

export default function PickingPage() {
  const [hitos, setHitos] = useState<HitoDePicking[]>([]);
  const [pickingStates, setPickingStates] = useState<Record<string, PickingEntregaState>>({});
  const [productosVentaMap, setProductosVentaMap] = useState<Map<string, ProductoVenta>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}') as Record<string, PickingEntregaState>;
    setPickingStates(allPickingStates);
    
    const allBriefings = (JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[]);
    const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    setProductosVentaMap(new Map(allProductosVenta.map(p => [p.id, p])));
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    allBriefings.forEach(briefing => {
        const serviceOrder = osMap.get(briefing.osId);
        if (serviceOrder && briefing.items) {
            briefing.items.forEach((hito, index) => {
                const pickingState = allPickingStates[hito.id];
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                    pickingStatus: pickingState?.status || 'Pendiente',
                });
            });
        }
    });
      
    setHitos(hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    setIsMounted(true);

    const handleStorageChange = () => {
        const updatedStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}');
        setPickingStates(updatedStates);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

  const filteredHitos = useMemo(() => {
    return hitos.filter(hito => {
      const searchMatch = 
        hito.expedicion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hito.serviceOrder.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

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
    if (!hito.conGastronomia) {
        return { checked: 0, total: 0, percentage: 0, noAplica: true };
    }
    const state = pickingStates[hito.id];
    if (!hito.gastro_items) return { checked: 0, total: 0, percentage: 0 };
    
    // This logic may need refinement based on how 'items to pick' are determined
    const totalItems = hito.gastro_items.filter(item => item.type === 'item').length;
    if (totalItems === 0) return { checked: 0, total: 0, percentage: 0 };

    const checkedItems = state?.checkedItems?.length || 0;
    
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
            <p className="text-muted-foreground mt-1">Selecciona un servicio para preparar su expedición.</p>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
              placeholder="Buscar por expedición, cliente, OS..."
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
              <TableHead>Servicio (Hito)</TableHead>
              <TableHead>Nº Servicio (OS)</TableHead>
              <TableHead>Espacio - Cliente</TableHead>
              <TableHead>Fecha Servicio</TableHead>
              <TableHead>Estado Picking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHitos.length > 0 ? (
              paginatedHitos.map(hito => {
                const progress = getPickingProgress(hito);
                const isDisabled = !hito.conGastronomia;
                return (
                    <TableRow 
                        key={hito.id} 
                        onClick={() => !isDisabled && router.push(`/cpr/picking/${hito.serviceOrder.id}?hitoId=${hito.id}`)}
                        className={cn(isDisabled ? 'bg-secondary/50 text-muted-foreground pointer-events-none' : 'cursor-pointer')}
                    >
                        <TableCell className="font-medium flex items-center gap-2">
                             {!hito.conGastronomia && <UtensilsCrossed className="h-4 w-4" />}
                            {hito.descripcion}
                        </TableCell>
                        <TableCell><Badge variant="outline">{hito.serviceOrder.serviceNumber}</Badge></TableCell>
                        <TableCell>{hito.serviceOrder.space}{hito.serviceOrder.finalClient && ` (${hito.serviceOrder.finalClient})`}</TableCell>
                        <TableCell>{format(new Date(hito.fecha), 'dd/MM/yyyy')} {hito.horaInicio}</TableCell>
                        <TableCell>
                           {isDisabled ? (
                                <Badge variant="secondary">No Aplica</Badge>
                           ) : progress.total > 0 ? (
                                <div className="flex items-center gap-2">
                                    <Progress value={progress.percentage} className="w-40" />
                                    <span className="text-sm text-muted-foreground">{progress.checked} / {progress.total}</span>
                                </div>
                            ) : (
                                <Badge variant="secondary">Vacío</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay servicios que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
