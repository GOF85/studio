

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users, Menu, FileUp, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 20;

export default function PersonalMicePage() {
  const [orders, setOrders] = useState<PersonalMiceOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedOrders = localStorage.getItem('personalMiceOrders');
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);

    let storedServiceOrders = localStorage.getItem('serviceOrders');
    const osMap = new Map<string, ServiceOrder>();
    if (storedServiceOrders) {
        (JSON.parse(storedServiceOrders) as ServiceOrder[]).forEach(os => osMap.set(os.id, os));
    }
    setServiceOrders(osMap);

    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const os = serviceOrders.get(order.osId);
      const searchMatch =
        searchTerm === '' ||
        order.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      let dateMatch = true;
      if (dateRange?.from && os) {
          const osDate = new Date(os.startDate);
          if(dateRange.to) {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
      }

      return searchMatch && dateMatch;
    });
  }, [orders, searchTerm, serviceOrders, dateRange]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!orderToDelete) return;
    const updatedData = orders.filter(e => e.id !== orderToDelete);
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedData));
    setOrders(updatedData);
    toast({ title: 'Asignación eliminada', description: 'El registro se ha eliminado correctamente.' });
    setOrderToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal MICE..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal MICE</h1>
          <p className="text-muted-foreground">Esta página es de solo lectura. Para añadir o editar, accede desde la Orden de Servicio.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, DNI, OS..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Filtrar por fecha de evento...</span>)}
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
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Centro Coste</TableHead>
                <TableHead>Tipo Servicio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>€/hora</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map(item => {
                  const os = serviceOrders.get(item.osId);
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/personal-mice/${item.osId}`)}>
                        <TableCell><Badge variant="outline">{os?.serviceNumber}</Badge></TableCell>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell>{item.centroCoste}</TableCell>
                        <TableCell>{item.tipoServicio}</TableCell>
                        <TableCell>{item.horaEntrada} - {item.horaSalida}</TableCell>
                        <TableCell>{item.precioHora.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/personal-mice/${item.osId}`)}}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
