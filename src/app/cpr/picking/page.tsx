
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ServiceOrder, GastronomyOrder, PickingState, ComercialBriefingItem, ComercialBriefing } from '@/types';
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
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { statusVariant } from '@/app/cpr/picking/[id]/page';

const ITEMS_PER_PAGE = 20;

type HitoDePicking = ComercialBriefingItem & {
    serviceOrder: ServiceOrder;
    pickingStatus: PickingState['status'];
};

export default function PickingPage() {
  const [hitos, setHitos] = useState<HitoDePicking[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};

    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    
    const hitosDePicking: HitoDePicking[] = [];

    allBriefings.forEach(briefing => {
        const serviceOrder = osMap.get(briefing.osId);
        if (serviceOrder && briefing.items) {
            briefing.items.forEach(hito => {
                if (hito.conGastronomia) {
                    const pickingState = allPickingStates[serviceOrder.id];
                    const status = pickingState?.status || 'Pendiente';
                    hitosDePicking.push({
                        ...hito,
                        serviceOrder,
                        pickingStatus: status
                    });
                }
            });
        }
    });
      
    setHitos(hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    setIsMounted(true);
  }, []);

  const filteredHitos = useMemo(() => {
    return hitos.filter(hito => {
      const searchMatch = 
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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Picking y Logística..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Package />
            Picking y Logística
            </h1>
            <p className="text-muted-foreground mt-1">Selecciona un evento para preparar su picking.</p>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por servicio, cliente, OS..."
                  className="pl-8 sm:w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
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
              paginatedHitos.map(hito => (
                <TableRow
                  key={hito.id}
                  onClick={() => router.push(`/cpr/picking/${hito.serviceOrder.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{hito.descripcion}</TableCell>
                  <TableCell><Badge variant="outline">{hito.serviceOrder.serviceNumber}</Badge></TableCell>
                  <TableCell>{hito.serviceOrder.space}{hito.serviceOrder.finalClient && ` (${hito.serviceOrder.finalClient})`}</TableCell>
                  <TableCell>{format(new Date(hito.fecha), 'dd/MM/yyyy')} {hito.horaInicio}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[hito.pickingStatus]}>{hito.pickingStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay servicios con gastronomía para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
