

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PersonalEntrega, Entrega, EstadoPersonalEntrega } from '@/types';
import { Header } from '@/components/layout/header';
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
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 20;

type PedidoConPersonal = {
  os: Entrega;
  totalPersonal: number;
  costePersonal: number;
  status: EstadoPersonalEntrega;
  statusPartner: 'Sin Asignar' | 'Parcialmente Gestionado' | 'Todo Gestionado';
};

const statusVariant: { [key in EstadoPersonalEntrega]: "success" | "warning" | "destructive" } = {
  Pendiente: 'destructive',
  Asignado: 'warning',
  Confirmado: 'success',
};


export default function GestionPersonalEntregasPage() {
  const [pedidos, setPedidos] = useState<PedidoConPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[])
      .filter(os => os.vertical === 'Entregas' && os.status === 'Confirmado');
    const allPersonal = (JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[]);
    
    const pedidosConDatos: PedidoConPersonal[] = allEntregas.map(os => {
        const personalAsignado = allPersonal.find(p => p.osId === os.id);
        const totalPersonal = personalAsignado?.turnos.reduce((sum, turno) => sum + turno.cantidad, 0) || 0;
        const costePersonal = personalAsignado?.turnos.reduce((sum, turno) => {
            const horas = calculateHours(turno.horaEntrada, turno.horaSalida);
            return sum + (horas * (turno.precioHora || 0) * turno.cantidad);
        }, 0) || 0;
        
        let statusPartner: PedidoConPersonal['statusPartner'] = 'Sin Asignar';
        if (personalAsignado && personalAsignado.turnos.length > 0) {
            const gestionados = personalAsignado.turnos.filter(t => t.statusPartner === 'Gestionado').length;
            if (gestionados === 0) {
                statusPartner = 'Sin Asignar';
            } else if (gestionados < personalAsignado.turnos.length) {
                statusPartner = 'Parcialmente Gestionado';
            } else {
                statusPartner = 'Todo Gestionado';
            }
        }

        return { os, totalPersonal, costePersonal, status: personalAsignado?.status || 'Pendiente', statusPartner };
    });

    setPedidos(pedidosConDatos);
    setIsMounted(true);
  }, []);
  
  const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
  }


  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => {
      const searchMatch = 
        p.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.os.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.os.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const osDate = new Date(p.os.startDate);
        if (dateRange.to) {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(osDate), end: endOfDay(osDate) });
        }
      }

      return searchMatch && dateMatch;
    });
  }, [pedidos, searchTerm, dateRange]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPedidos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPedidos, currentPage]);

  const totalPages = Math.ceil(filteredPedidos.length / ITEMS_PER_PAGE);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Gestión de Personal..." />;
  }

  return (
    <>
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal de Entregas</h1>
        <p className="text-muted-foreground">Selecciona un pedido para asignar o revisar el personal.</p>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por nº pedido, cliente..."
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
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Evento</TableHead>
              <TableHead>Nº Personal</TableHead>
              <TableHead>Coste Personal</TableHead>
              <TableHead>Estado Gestión</TableHead>
              <TableHead>Estado Partner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map(p => (
                <TableRow
                  key={p.os.id}
                  onClick={() => router.push(`/entregas/gestion-personal/${p.os.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell><Badge variant="outline">{p.os.serviceNumber}</Badge></TableCell>
                  <TableCell className="font-medium">{p.os.client}</TableCell>
                  <TableCell>{format(new Date(p.os.startDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{p.totalPersonal}</TableCell>
                  <TableCell className="font-semibold">{p.costePersonal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                  <TableCell><Badge variant={statusVariant[p.status]}>{p.status}</Badge></TableCell>
                   <TableCell>
                        {p.statusPartner === 'Todo Gestionado' && <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Gestionado</Badge>}
                        {p.statusPartner === 'Parcialmente Gestionado' && <Badge variant="warning">Parcial</Badge>}
                        {p.statusPartner === 'Sin Asignar' && <Badge variant="destructive">Pendiente</Badge>}
                    </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No hay pedidos de entrega que requieran personal o coincidan con los filtros.
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
