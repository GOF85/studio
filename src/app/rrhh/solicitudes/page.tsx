
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import type { ServiceOrder, PersonalExterno, EstadoPersonalExterno, PersonalExternoTurno, SolicitudPersonalCPR, Proveedor } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateHours, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

const ITEMS_PER_PAGE = 20;

type UnifiedRequest = {
    id: string; // turnoId o solicitudId
    osId: string;
    osNumber: string;
    cliente: string;
    fechaServicio: string;
    horario: string;
    horas: number;
    categoria: string;
    motivo: string;
    proveedorId?: string;
    costeEstimado: number;
    estado: EstadoPersonalExterno | SolicitudPersonalCPR['estado'];
    isCprRequest: boolean;
};

const statusVariant: { [key in UnifiedRequest['estado']]: 'success' | 'warning' | 'destructive' | 'outline' | 'default' } = {
  'Pendiente': 'warning',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Solicitado': 'outline',
  'Asignado': 'success',
  'Cerrado': 'default',
  'Solicitada Cancelacion': 'destructive'
};

export default function SolicitudesUnificadasPage() {
  const [requests, setRequests] = useState<UnifiedRequest[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allPersonalExterno = (JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[]);
    const allSolicitudesCPR = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[]);
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));

    const cateringRequests: UnifiedRequest[] = allPersonalExterno.flatMap(p => {
        const os = osMap.get(p.osId);
        if (!os) return [];
        return p.turnos.map(turno => ({
            id: turno.id,
            osId: p.osId,
            osNumber: os.serviceNumber,
            cliente: os.client,
            fechaServicio: turno.fecha,
            horario: `${turno.horaEntrada} - ${turno.horaSalida}`,
            horas: calculateHours(turno.horaEntrada, turno.horaSalida),
            categoria: turno.categoria,
            motivo: `Evento: ${os.serviceNumber}`,
            proveedorId: turno.proveedorId,
            costeEstimado: calculateHours(turno.horaEntrada, turno.horaSalida) * turno.precioHora * (turno.asignaciones?.length || 1),
            estado: p.status,
            isCprRequest: false,
        }));
    });

    const cprRequests: UnifiedRequest[] = allSolicitudesCPR.map(s => ({
        id: s.id,
        osId: 'CPR',
        osNumber: 'CPR',
        cliente: 'Producción Interna',
        fechaServicio: s.fechaServicio,
        horario: `${s.horaInicio} - ${s.horaFin}`,
        horas: calculateHours(s.horaInicio, s.horaFin),
        categoria: s.categoria,
        motivo: s.motivo,
        proveedorId: s.proveedorId,
        costeEstimado: s.costeImputado || 0,
        estado: s.estado,
        isCprRequest: true,
    }));
    
    setRequests([...cateringRequests, ...cprRequests]);
    setIsMounted(true);
  }, []);

  const filteredRequests = useMemo(() => {
    const today = startOfToday();
    return requests.filter(p => {
      const searchMatch = 
        p.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const reqDate = new Date(p.fechaServicio);
        if (dateRange.to) {
            dateMatch = isWithinInterval(reqDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isSameDay(reqDate, dateRange.from);
        }
      }

      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(p.fechaServicio), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }
      
      const statusMatch = statusFilter === 'all' || p.estado === statusFilter;

      return searchMatch && dateMatch && pastEventMatch && statusMatch;
    });
  }, [requests, searchTerm, dateRange, showPastEvents, statusFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);

  const handleRowClick = (req: UnifiedRequest) => {
    if (req.isCprRequest) {
      const allSolicitudesCPR = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
      const solicitud = allSolicitudesCPR.find(s => s.id === req.id);
      if (solicitud) setSolicitudToManage(solicitud);
    } else {
      router.push(`/os/${req.osId}/personal-externo`);
    }
  };

  const handleUpdateCprStatus = (solicitud: SolicitudPersonalCPR, estado: SolicitudPersonalCPR['estado']) => {
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === solicitud.id);
    if(index > -1) {
        allRequests[index].estado = estado;
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        
        const updatedRequests = requests.map(r => r.id === solicitud.id ? {...r, estado} : r);
        setRequests(updatedRequests);
        setSolicitudToManage({...solicitud, estado});
        toast({ title: 'Estado actualizado' });
    }
  }

  const handleDeleteRequest = () => {
    if (!solicitudToManage) return;
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const updated = allRequests.filter(r => r.id !== solicitudToManage.id);
    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updated));
    setRequests(requests.filter(r => r.id !== solicitudToManage.id));
    setSolicitudToManage(null);
    toast({ title: 'Solicitud eliminada' });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <>
      <main>
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión Unificada de Personal Externo</h1>
        </div>

       <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
              <Input
                  placeholder="Buscar por OS, cliente, categoría..."
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
                    <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mostrar pasados
                    </label>
            </div>
              <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setStatusFilter('all'); setShowPastEvents(false); }}>Limpiar</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Estado:</span>
                {['all', 'Pendiente', 'Solicitado', 'Asignado', 'Cerrado', 'Aprobada', 'Rechazada'].map(status => (
                    <Button key={status} size="sm" variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
                        {status === 'all' ? 'Todos' : status}
                    </Button>
                ))}
            </div>
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
                    <TableHead>Origen (OS/CPR)</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Servicio</TableHead>
                    <TableHead>Horario (Horas)</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead className="text-right">Coste Estimado</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedItems.length > 0 ? (
                paginatedItems.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => handleRowClick(p)}>
                        <TableCell className="font-medium">
                            <Badge variant="outline">{p.osNumber}</Badge>
                        </TableCell>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell>{format(new Date(p.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{p.horario} ({p.horas.toFixed(2)}h)</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell>{proveedoresMap.get(p.proveedorId || '') || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.costeEstimado)}</TableCell>
                        <TableCell className="text-right"><Badge variant={statusVariant[p.estado]}>{p.estado}</Badge></TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                    No hay solicitudes que coincidan con los filtros.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </main>

      <Dialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Gestionar Solicitud de CPR</DialogTitle>
                 {solicitudToManage && (
                    <DialogDescription asChild>
                       <div className="text-sm space-y-1 pt-2">
                            <div><strong>Solicitado por:</strong> {solicitudToManage.solicitadoPor} ({format(new Date(solicitudToManage.fechaSolicitud), 'dd/MM/yy HH:mm')})</div>
                            <div className="grid grid-cols-2 gap-x-4">
                                <div><strong>Fecha:</strong> {format(new Date(solicitudToManage.fechaServicio), 'PPP', {locale: es})}</div>
                                <div><strong>Horario:</strong> {solicitudToManage.horaInicio} - {solicitudToManage.horaFin}</div>
                            </div>
                            <div><strong>Categoría solicitada:</strong> {solicitudToManage.categoria}</div>
                            <div className="text-muted-foreground pt-1"><strong>Motivo:</strong> {solicitudToManage.motivo}</div>
                        </div>
                    </DialogDescription>
                 )}
            </DialogHeader>
            <div className="py-4 space-y-4">
                {solicitudToManage?.estado === 'Solicitada Cancelacion' ? (
                    <div className="text-center">
                        <p className="mb-4">El solicitante ha pedido cancelar esta asignación. ¿Confirmas la cancelación?</p>
                        <Button variant="destructive" onClick={() => {if(solicitudToManage) { /* Logic to fully cancel */ }}}>Sí, Cancelar Asignación</Button>
                    </div>
                ) : (
                <>
                    <div>
                        <h4 className="font-semibold">Actualizar Estado</h4>
                         <div className="flex gap-2 mt-2">
                            <Button variant={solicitudToManage?.estado === 'Aprobada' || solicitudToManage?.estado === 'Asignada' ? 'default' : 'outline'} size="sm" onClick={() => handleUpdateCprStatus(solicitudToManage!, 'Aprobada')}>Aprobar</Button>
                            <Button variant={solicitudToManage?.estado === 'Rechazada' ? 'destructive' : 'outline'} size="sm" onClick={() => handleUpdateCprStatus(solicitudToManage!, 'Rechazada')}>Rechazar</Button>
                        </div>
                    </div>
                </>
                )}
            </div>
            <DialogFooter>
                 <Button variant="destructive" className="mr-auto" onClick={handleDeleteRequest}>Eliminar Solicitud</Button>
                <DialogClose asChild><Button variant="secondary">Cerrar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
