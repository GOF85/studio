
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Search, Calendar as CalendarIcon } from 'lucide-react';
import type { ServiceOrder, PersonalExterno, EstadoPersonalExterno } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type PedidoConPersonal = {
  os: ServiceOrder;
  totalTurnos: number;
  costePersonal: number;
  status: EstadoPersonalExterno;
};

const statusVariant: { [key in EstadoPersonalExterno]: 'success' | 'warning' | 'destructive' | 'outline' } = {
  'Pendiente': 'warning',
  'Solicitado': 'outline',
  'Asignado': 'success',
  'Cerrado': 'default',
};

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) { return 0; }
};

export default function SolicitudesPersonalPage() {
  const [pedidos, setPedidos] = useState<PedidoConPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[])
      .filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');
    const allPersonal = (JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[]);
    
    const pedidosConDatos: PedidoConPersonal[] = allServiceOrders.map(os => {
        const personalAsignado = allPersonal.find(p => p.osId === os.id);
        const totalTurnos = personalAsignado?.turnos.length || 0;
        const costePersonal = personalAsignado?.turnos.reduce((sum, turno) => {
            const horas = calculateHours(turno.horaEntrada, turno.horaSalida);
            return sum + (horas * (turno.precioHora || 0));
        }, 0) || 0;

        return { os, totalTurnos, costePersonal, status: personalAsignado?.status || 'Pendiente' };
    }).filter(p => p.totalTurnos > 0); // Only show OS with staff requests

    setPedidos(pedidosConDatos);
    setIsMounted(true);
  }, []);

  const filteredPedidos = useMemo(() => {
    const today = startOfDay(new Date());
    return pedidos.filter(p => {
      const searchMatch = 
        p.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.os.client.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const osDate = new Date(p.os.startDate);
        if (dateRange.to) {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        }
      }

      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(p.os.endDate), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }
      
      const statusMatch = statusFilter === 'all' || p.status === statusFilter;

      return searchMatch && dateMatch && pastEventMatch && statusMatch;
    });
  }, [pedidos, searchTerm, dateRange, showPastEvents, statusFilter]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <main>
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal Externo (Eventos)</h1>
        </div>

       <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
              <Input
                  placeholder="Buscar por nº OS, cliente..."
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
              <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                    <Label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mostrar pasados
                    </label>
            </div>
              <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setStatusFilter('all'); setShowPastEvents(false); }}>Limpiar Filtros</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Estado:</span>
                <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todos</Button>
                <Button size="sm" variant={statusFilter === 'Pendiente' ? 'default' : 'outline'} onClick={() => setStatusFilter('Pendiente')}>Pendiente</Button>
                <Button size="sm" variant={statusFilter === 'Solicitado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Solicitado')}>Solicitado</Button>
                <Button size="sm" variant={statusFilter === 'Asignado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Asignado')}>Asignado</Button>
                <Button size="sm" variant={statusFilter === 'Cerrado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Cerrado')}>Cerrado</Button>
            </div>
       </div>

        <Card>
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nº Servicio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Evento</TableHead>
                    <TableHead>Nº de Turnos</TableHead>
                    <TableHead>Coste Estimado</TableHead>
                    <TableHead>Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPedidos.length > 0 ? (
                    filteredPedidos.map(p => (
                        <TableRow key={p.os.id} className="cursor-pointer" onClick={() => router.push(`/os/${p.os.id}/personal-externo`)}>
                            <TableCell className="font-medium">
                                <Badge variant="outline">{p.os.serviceNumber}</Badge>
                            </TableCell>
                            <TableCell>{p.os.client}</TableCell>
                            <TableCell>{format(new Date(p.os.startDate), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{p.totalTurnos}</TableCell>
                            <TableCell className="font-semibold">{p.costePersonal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                            <TableCell><Badge variant={statusVariant[p.status]}>{p.status}</Badge></TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                        No hay solicitudes de personal que coincidan con los filtros.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </main>
  );
}
