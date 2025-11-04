
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, MessageSquare } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, CategoriaPersonal } from '@/types';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateHours, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'success' | 'secondary' | 'warning' | 'destructive' | 'outline' | 'default'} = {
  'Solicitado': 'warning',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

const partidaColorClasses = {
  FRIO: 'bg-blue-100 text-blue-800',
  CALIENTE: 'bg-red-100 text-red-800',
  PASTELERIA: 'bg-purple-100 text-purple-800',
  EXPEDICION: 'bg-yellow-100 text-yellow-800',
};

function CommentModal({ comment, trigger }: { comment: string, trigger: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                 {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentario de la Asignación</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{comment}</p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [personalExternoDB, setPersonalExternoDB] = useState<Map<string, { nombre: string; proveedorId: string; }>>(new Map());
  const [personalInternoDB, setPersonalInternoDB] = useState<Map<string, { nombre: string }>>(new Map());
  const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedData);
    
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(storedProveedores.map(p => [p.id, p.nombreComercial])));
    
    const storedTiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setTiposPersonal(storedTiposPersonal);

    const storedPersonalExterno = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as {id: string, nombreCompleto: string, proveedorId: string}[];
    setPersonalExternoDB(new Map(storedPersonalExterno.map(p => [p.id, {nombre: p.nombreCompleto, proveedorId: p.proveedorId}])));

    const storedPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalInternoDB(new Map(storedPersonalInterno.map(p => [p.id, {nombre: `${p.nombre} ${p.apellidos}`}])));

    setIsMounted(true);
  }, []);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(s => {
      const searchMatch = searchTerm === '' ||
        s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.solicitadoPor.toLowerCase().includes(searchTerm.toLowerCase());

      const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);

      return searchMatch && dateMatch;
    }).sort((a,b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  }, [solicitudes, searchTerm, dateFilter]);

  const handleOpenDialog = (solicitud: SolicitudPersonalCPR) => {
    setSolicitudToManage(solicitud);
  };
  
  const handleAction = (action: 'aprobar' | 'rechazar' | 'asignar' | 'delete' | 'cancel', data?: any) => {
    if(!solicitudToManage) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === solicitudToManage.id);

    if(index === -1) return;

    switch(action) {
        case 'aprobar':
            allRequests[index].estado = 'Aprobada';
            toast({ title: 'Solicitud Aprobada' });
            break;
        case 'rechazar':
            allRequests[index].estado = 'Rechazada';
            allRequests[index].observacionesRRHH = data.reason;
            toast({ title: 'Solicitud Rechazada' });
            break;
        case 'asignar':
            const tipoPersonal = tiposPersonal.find(tp => tp.id === data.proveedorId);
            const coste = calculateHours(solicitudToManage.horaInicio, solicitudToManage.horaFin) * (tipoPersonal?.precioHora || 0);
            allRequests[index].estado = 'Asignada';
            allRequests[index].proveedorId = data.proveedorId;
            allRequests[index].costeImputado = coste;
            toast({ title: 'Proveedor Asignado' });
            break;
        case 'delete':
            allRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
            toast({ title: 'Solicitud Eliminada' });
            break;
        case 'cancel':
            allRequests[index].estado = 'Solicitada Cancelacion';
            toast({ title: 'Cancelación Solicitada' });
            break;
    }

    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
    setSolicitudes(allRequests);
    setSolicitudToManage(null);
    setManagementAction(null);
    setIsRejectionModalOpen(false);
    setRejectionReason('');
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Mis Solicitudes de Personal</h1>
            <Button onClick={() => router.push('/cpr/solicitud-personal/nueva')}>
                <PlusCircle className="mr-2" /> Nueva Solicitud
            </Button>
        </div>

      <div className="flex gap-4 mb-4">
        <Input 
          placeholder="Buscar por motivo, categoría..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : <span>Filtrar por fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); }}>Limpiar Filtros</Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Servicio</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Comentario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                        const tipoPersonalAsignado = tiposPersonal.find(t => t.id === s.proveedorId);
                        const proveedorNombre = tipoPersonalAsignado ? proveedoresMap.get(tipoPersonalAsignado.proveedorId) : null;
                        const asignado = s.personalAsignado?.[0];
                        
                        let personalInfo = null;
                        if(asignado?.idPersonal) {
                            personalInfo = personalExternoDB.get(asignado.idPersonal) || personalInternoDB.get(asignado.idPersonal);
                        }

                        return (
                        <TableRow key={s.id} onClick={() => handleOpenDialog(s)} className="cursor-pointer">
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge className={cn("text-black", partidaColorClasses[s.partida])}>{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado] || 'secondary'}>{s.estado}</Badge></TableCell>
                            <TableCell>
                                {proveedorNombre && (
                                    <div className="flex items-center">
                                        <span>{proveedorNombre}</span>
                                        {personalInfo && <span className="text-muted-foreground ml-1">({personalInfo.nombre})</span>}
                                        {asignado?.comentarios && (
                                            <CommentModal
                                                comment={asignado.comentarios}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                                                        <MessageSquare className="h-4 w-4 text-primary" />
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    )}) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">No has realizado ninguna solicitud.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!solicitudToManage && !!managementAction} onOpenChange={() => { setSolicitudToManage(null); setManagementAction(null); }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    {managementAction === 'delete' && 'Esta acción eliminará la solicitud permanentemente.'}
                    {managementAction === 'cancel' && 'Se enviará una petición a RRHH para cancelar esta asignación. ¿Continuar?'}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={() => managementAction && handleAction(managementAction)}>Sí, continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Dialog open={!!solicitudToManage && !managementAction} onOpenChange={() => setSolicitudToManage(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gestionar Solicitud de Personal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p><strong>Categoría:</strong> {solicitudToManage?.categoria}</p>
                    <p><strong>Fecha:</strong> {solicitudToManage?.fechaServicio ? format(new Date(solicitudToManage.fechaServicio), 'dd/MM/yyyy') : ''}</p>
                    <p><strong>Horario:</strong> {solicitudToManage?.horaInicio} - {solicitudToManage?.horaFin}</p>
                    <p><strong>Partida:</strong> {solicitudToManage?.partida}</p>
                    
                    {solicitudToManage?.estado === 'Solicitado' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold">Acciones de RRHH</h4>
                             <Button onClick={() => handleAction('aprobar')}>Aprobar Solicitud</Button>
                            <Button variant="destructive" className="ml-2" onClick={() => setIsRejectionModalOpen(true)}>Rechazar</Button>
                        </div>
                    )}
                    
                    {solicitudToManage?.estado === 'Aprobada' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold">Asignar Proveedor</h4>
                            <Select onValueChange={(value) => handleAction('asignar', { proveedorId: value })}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar ETT y categoría..." /></SelectTrigger>
                                <SelectContent>
                                    {tiposPersonal.map(tp => (
                                        <SelectItem key={tp.id} value={tp.id}>
                                            {proveedoresMap.get(tp.proveedorId)} - {tp.categoria} ({formatCurrency(tp.precioHora)}/h)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                 <AlertDialogFooter>
                    {solicitudToManage && (solicitudToManage.estado === 'Pendiente' || solicitudToManage.estado === 'Aprobada') && (
                        <Button variant="destructive" onClick={() => handleAction('delete')}>Borrar Solicitud</Button>
                    )}
                </AlertDialogFooter>
            </DialogContent>
        </Dialog>
        
         <AlertDialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Motivo del Rechazo</AlertDialogTitle>
                    <AlertDialogDescription>Por favor, indica por qué se rechaza esta solicitud.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('rechazar', { reason: rejectionReason })}>Confirmar Rechazo</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

    