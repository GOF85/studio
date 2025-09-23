'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ServiceOrder, GastronomyOrder } from '@/types';
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

const ITEMS_PER_PAGE = 20;

export default function PickingPage() {
  const [serviceOrdersWithGastro, setServiceOrdersWithGastro] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];

    const osIdsWithGastro = new Set(allGastroOrders.map(o => o.osId));
    
    const filteredOS = allServiceOrders
      .filter(os => osIdsWithGastro.has(os.id))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
    setServiceOrdersWithGastro(filteredOS);
    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return serviceOrdersWithGastro.filter(os => {
      const searchMatch = 
        os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const osDate = new Date(os.startDate);
        if (dateRange.to) {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        }
      }

      return searchMatch && dateMatch;
    });
  }, [serviceOrdersWithGastro, searchTerm, dateRange]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

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
            <p className="text-muted-foreground mt-1">Selecciona una Orden de Servicio para preparar el picking.</p>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por Nº Servicio, cliente..."
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
              <TableHead>Nº Servicio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Evento</TableHead>
              <TableHead>Estado Picking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map(os => (
                <TableRow
                  key={os.id}
                  onClick={() => router.push(`/cpr/picking/${os.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{os.serviceNumber}</TableCell>
                  <TableCell>{os.client}{os.finalClient && ` (${os.finalClient})`}</TableCell>
                  <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    {/* Placeholder for picking status */}
                    <Badge variant="secondary">Pendiente</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay Órdenes de Servicio con pedidos de gastronomía para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
