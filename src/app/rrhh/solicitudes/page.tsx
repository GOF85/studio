
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, Briefcase, Factory, MapPin, Clock, Phone } from 'lucide-react';
import type { ServiceOrder, PersonalExterno, EstadoPersonalExterno, PersonalExternoTurno, SolicitudPersonalCPR, Proveedor, EstadoSolicitudPersonalCPR, CategoriaPersonal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

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
    estado: EstadoPersonalExterno | EstadoSolicitudPersonalCPR;
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

function GestionSolicitudDialog({ solicitud, isOpen, onClose, onUpdateStatus, onDeleteRequest, proveedoresMap, allTiposPersonal }: { solicitud: UnifiedRequest | null, isOpen: boolean, onClose: () => void, onUpdateStatus: (isCpr: boolean, id: string, status: UnifiedRequest['estado'], proveedorId?: string, coste?: number, categoria?: string) => void, onDeleteRequest: (req: UnifiedRequest) => void, proveedoresMap: Map<string, string>, allTiposPersonal: CategoriaPersonal[] }) {
    const [selectedTipoPersonal, setSelectedTipoPersonal] = useState<string | undefined>(solicitud?.proveedorId);

    useEffect(() => {
        setSelectedTipoPersonal(solicitud?.proveedorId);
    }, [solicitud]);

    if (!solicitud) return null;

    const isCpr = solicitud.isCprRequest;
    
    // Corrected Logic: If it's a CPR request, approved, and has a provider, it's 'Asignada'.
    const displayStatus = (isCpr && solicitud.estado === 'Aprobada' && solicitud.proveedorId) ? 'Asignada' : solicitud.estado;
    
    const canManageCpr = isCpr && displayStatus === 'Pendiente';
    const canDelete = isCpr && (['Pendiente', 'Rechazada'].includes(displayStatus) || displayStatus === 'Solicitada Cancelacion');
    const canAssignCpr = isCpr && displayStatus === 'Aprobada';

    const handleAsignar = () => {
        if (selectedTipoPersonal) {
            const tipo = allTiposPersonal.find(t => t.id === selectedTipoPersonal);
            if (tipo) {
                const coste = solicitud.horas * tipo.precioHora;
                onUpdateStatus(true, solicitud.id, 'Asignada', tipo.id, coste, tipo.categoria);
            }
        }
    };
    

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        Gestionar Solicitud
                    </DialogTitle>
                     <DialogDescription asChild>
                        <div className="flex items-center gap-2 pt-2">
                          <strong>Origen:</strong>
                          <Badge variant={isCpr ? "default" : "secondary"} className={cn(isCpr && "bg-slate-700")}>
                            {isCpr ? <Factory className="mr-2 h-4 w-4"/> : <Briefcase className="mr-2 h-4 w-4"/>}
                            {solicitud.osNumber}
                          </Badge>
                          <Badge variant={statusVariant[displayStatus]}>{displayStatus}</Badge>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                 <div className="py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div><strong className="text-muted-foreground block">Fecha Servicio:</strong> {format(new Date(solicitud.fechaServicio), 'PPP', {locale: es})}</div>
                        <div><strong className="text-muted-foreground block">Horario:</strong> {solicitud.horario} ({solicitud.horas.toFixed(2)}h)</div>
                        <div><strong className="text-muted-foreground block">Categoría:</strong> {solicitud.categoria}</div>
                        <div><strong className="text-muted-foreground block">Coste Estimado:</strong> {formatCurrency(solicitud.costeEstimado)}</div>
                        <div className="col-span-2"><strong className="text-muted-foreground block">Proveedor Asignado:</strong> {solicitud.proveedorId ? proveedoresMap.get(allTiposPersonal.find(t => t.id === solicitud.proveedorId)?.proveedorId || '') || 'N/A' : 'N/A'}</div>
                        <div className="col-span-2 pt-1 "><strong className="text-muted-foreground block">Motivo:</strong> {solicitud.motivo}</div>
                    </div>
                </div>
                 
                <Separator />

                {canManageCpr && (
                    <div className="py-4 space-y-4">
                        <h4 className="font-semibold">Acciones de RRHH (CPR)</h4>
                        <div className="flex gap-2 mt-2">
                            <Button variant={'default'} className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => onUpdateStatus(true, solicitud.id, 'Aprobada')}>Aprobar</Button>
                            <Button variant={'destructive'} size="sm" onClick={() => onUpdateStatus(true, solicitud.id, 'Rechazada')}>Rechazar</Button>
                        </div>
                    </div>
                )}
                
                {canAssignCpr && (
                    <div className="py-4 space-y-4">
                        <h4 className="font-semibold">Asignar Proveedor (CPR)</h4>
                         <div className="flex gap-2 items-end">
                             <div className="flex-grow space-y-1">
                                <Label>Proveedor / ETT</Label>
                                <Select value={selectedTipoPersonal} onValueChange={setSelectedTipoPersonal}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar proveedor y categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allTiposPersonal.map(tipo => (
                                            <SelectItem key={tipo.id} value={tipo.id}>
                                                {proveedoresMap.get(tipo.proveedorId)} - {tipo.categoria} ({formatCurrency(tipo.precioHora)}/h)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             </div>
                            <Button size="sm" onClick={handleAsignar} disabled={!selectedTipoPersonal}>Asignar</Button>
                         </div>
                    </div>
                )}
                
                {!solicitud.isCprRequest && (
                    <div className="py-4">
                        <Button className="w-full" asChild>
                           <Link href={`/os/${solicitud.osId}/personal-externo`}>Ir a la gestión del evento</Link>
                        </Button>
                    </div>
                )}

                {canDelete && (
                    <div className="pt-4 border-t">
                        <Button variant="destructive" size="sm" onClick={() => onDeleteRequest(solicitud)}>Eliminar Solicitud</Button>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    );
}

export default function SolicitudesUnificadasPage() {
  const [solicitudes, setSolicitudes] = useState<UnifiedRequest[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [allTiposPersonal, setAllTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [solicitudToManage, setSolicitudToManage] = useState<UnifiedRequest | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allPersonalExterno = (JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[]);
    const allSolicitudesCPR = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[]);
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
    
    const tiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setAllTiposPersonal(tiposPersonal);

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
            horario: `${turno.horaInicio} - ${turno.horaSalida}`,
            horas: calculateHours(turno.horaInicio, turno.horaSalida),
            categoria: turno.categoria,
            motivo: `Evento: ${os.serviceNumber}`,
            proveedorId: turno.proveedorId,
            costeEstimado: calculateHours(turno.horaEntrada, turno.horaSalida) * turno.precioHora * (turno.asignaciones?.length || 1),
            estado: p.status,
            isCprRequest: false,
        }));
    });

    const cprRequests: UnifiedRequest[] = allSolicitudesCPR.map(s => {
        const tipo = tiposPersonal.find(t => t.id === s.proveedorId);
        return {
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
        costeEstimado: s.costeImputado || ((calculateHours(s.horaInicio, s.horaFin) * (tipo?.precioHora || 0)) * s.cantidad),
        estado: s.estado,
        isCprRequest: true,
    }});
    
    setSolicitudes([...cateringRequests, ...cprRequests]);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredRequests = useMemo(() => {
    const today = startOfToday();
    return solicitudes.filter(p => {
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
    }).sort((a, b) => new Date(b.fechaServicio).getTime() - new Date(a.fechaServicio).getTime());
  }, [solicitudes, searchTerm, dateRange, showPastEvents, statusFilter]);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);

  const handleUpdateCprStatus = (isCpr: boolean, id: string, status: UnifiedRequest['estado'], proveedorId?: string, coste?: number, categoria?: string) => {
    if (!isCpr) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El estado de solicitudes de eventos se gestiona desde la propia OS.' });
      return;
    }
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === id);
    if(index > -1) {
        allRequests[index].estado = status as EstadoSolicitudPersonalCPR;
        if (status === 'Asignada' && proveedorId && coste !== undefined && categoria) {
            allRequests[index].proveedorId = proveedorId;
            allRequests[index].costeImputado = coste;
            allRequests[index].categoria = categoria; // Update category if needed
        }
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        
        loadData(); // Recargar todos los datos para reflejar el cambio
        setSolicitudToManage(null); // Cerrar el modal
        toast({ title: 'Estado actualizado' });
    }
  }

  const handleDeleteRequest = (req: UnifiedRequest) => {
    if (!req.isCprRequest) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El borrado de turnos de eventos se debe hacer desde la OS.' });
      return;
    }
    
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const updated = allRequests.filter(r => r.id !== req.id);
    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updated));
    
    loadData();
    setSolicitudToManage(null);
    toast({ title: 'Solicitud eliminada' });
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <>
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
                paginatedItems.map(p => {
                    const displayStatus = (p.isCprRequest && p.estado === 'Aprobada' && p.proveedorId) ? 'Asignada' : p.estado;
                    return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setSolicitudToManage(p)}>
                        <TableCell className="font-medium">
                            <Badge variant={p.isCprRequest ? "default" : "outline"} className={cn(p.isCprRequest && "bg-slate-700")}>{p.osNumber}</Badge>
                        </TableCell>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell>{format(new Date(p.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{p.horario} ({p.horas.toFixed(2)}h)</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell>{proveedoresMap.get(p.proveedorId || '') || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.costeEstimado)}</TableCell>
                        <TableCell className="text-right"><Badge variant={statusVariant[displayStatus]}>{displayStatus}</Badge></TableCell>
                    </TableRow>
                )})
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
      
      <GestionSolicitudDialog
        solicitud={solicitudToManage}
        isOpen={!!solicitudToManage}
        onClose={() => setSolicitudToManage(null)}
        onUpdateStatus={handleUpdateCprStatus}
        onDeleteRequest={handleDeleteRequest}
        proveedoresMap={proveedoresMap}
        allTiposPersonal={allTiposPersonal}
      />
    </>
  );
}
