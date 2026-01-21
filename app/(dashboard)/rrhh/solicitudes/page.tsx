
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

const partidaColorClasses: Record<string, string> = {
    FRIO: 'bg-green-100 text-green-800 border-green-200',
    CALIENTE: 'bg-red-100 text-red-800 border-red-200',
    PASTELERIA: 'bg-blue-100 text-blue-800 border-blue-200',
    EXPEDICION: 'bg-yellow-100 text-yellow-800 border-yellow-200'
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

import { useCprSolicitudesPersonal } from '@/hooks/use-cpr-data';
import { useProveedores, useTiposPersonal } from '@/hooks/use-data-queries';
import { supabase } from '@/lib/supabase';

export default function SolicitudesCprPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const router = useRouter();
  const { toast } = useToast();

  const { data: solicitudes = [], isLoading: loadingSolicitudes, refetch: refetchSolicitudes } = useCprSolicitudesPersonal();
  const { data: allProveedores = [], isLoading: loadingProveedores } = useProveedores();
  const { data: tiposPersonal = [], isLoading: loadingTipos } = useTiposPersonal();

  const isLoaded = !loadingSolicitudes && !loadingProveedores && !loadingTipos;

  const proveedoresMap = useMemo(() => {
    return new Map(allProveedores.map(p => [p.id, p.nombreComercial]));
  }, [allProveedores]);

  useEffect(() => {
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
  
  const handleAction = async (action: 'aprobar' | 'rechazar' | 'asignar' | 'delete' | 'cancel', data?: any) => {
    if(!solicitudToManage) return;

    try {
        switch(action) {
            case 'aprobar':
                await supabase.from('cpr_solicitudes_personal').update({ estado: 'Aprobada' }).eq('id', solicitudToManage.id);
                toast({ title: 'Solicitud Aprobada' });
                break;
            case 'rechazar':
                await supabase.from('cpr_solicitudes_personal').update({ 
                    estado: 'Rechazada',
                    observaciones_rrhh: data.reason
                }).eq('id', solicitudToManage.id);
                toast({ title: 'Solicitud Rechazada' });
                break;
            case 'asignar':
                const tipoPersonal = tiposPersonal.find((tp: any) => tp.id === data.proveedorId);
                const coste = calculateHours(solicitudToManage.horaInicio, solicitudToManage.horaFin) * (tipoPersonal?.precioHora || 0);
                await supabase.from('cpr_solicitudes_personal').update({ 
                    estado: 'Asignada',
                    proveedor_id: data.proveedorId,
                    coste_imputado: coste
                }).eq('id', solicitudToManage.id);
                toast({ title: 'Proveedor Asignado' });
                break;
            case 'delete':
                await supabase.from('cpr_solicitudes_personal').delete().eq('id', solicitudToManage.id);
                toast({ title: 'Solicitud Eliminada' });
                break;
            case 'cancel':
                await supabase.from('cpr_solicitudes_personal').update({ estado: 'Solicitada Cancelacion' }).eq('id', solicitudToManage.id);
                toast({ title: 'Cancelación Solicitada' });
                break;
        }

        refetchSolicitudes();
        setSolicitudToManage(null);
        setManagementAction(null);
        setIsRejectionModalOpen(false);
        setRejectionReason('');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message
        });
    }
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Solicitudes de Personal de Apoyo</h1>
            <Button onClick={() => router.push('/cpr/solicitud-personal/nueva')}>
                <PlusCircle className="mr-2" /> Nueva Solicitud (CPR)
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
                        <TableHead>Horario (Horas)</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                        const tipoPersonalAsignado = tiposPersonal.find((t: any) => t.id === s.proveedorId);
                        const proveedorNombre = tipoPersonalAsignado ? proveedoresMap.get(tipoPersonalAsignado.proveedorId) : null;
                        const horas = calculateHours(s.horaInicio, s.horaFin);

                        return (
                        <TableRow key={s.id} onClick={() => handleOpenDialog(s)} className="cursor-pointer">
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin} ({formatNumber(horas, 2)}h)</TableCell>
                            <TableCell><Badge variant="outline" className={cn(partidaColorClasses[s.partida])}>{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.solicitadoPor}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado] || 'secondary'}>{s.estado}</Badge></TableCell>
                            <TableCell>{proveedorNombre || '-'}</TableCell>
                            <TableCell className="text-right">
                                {(s.estado === 'Solicitado' || s.estado === 'Aprobada') && <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setManagementAction('delete'); setSolicitudToManage(s); }}><Trash2 className="mr-2 h-4 w-4"/>Borrar</Button>}
                                {s.estado === 'Asignada' && !isBefore(new Date(s.fechaServicio), startOfToday()) && <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setManagementAction('cancel'); setSolicitudToManage(s); }}><Trash2 className="mr-2 h-4 w-4"/>Solicitar Cancelación</Button>}
                                {s.estado === 'Solicitada Cancelacion' && <Badge variant="destructive">Pendiente RRHH</Badge>}
                            </TableCell>
                        </TableRow>
                    )}) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">No hay solicitudes que coincidan con los filtros.</TableCell>
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
                                    {tiposPersonal.map((tp: any) => (
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
                    {solicitudToManage && (solicitudToManage.estado === 'Solicitado' || solicitudToManage.estado === 'Aprobada') && (
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
