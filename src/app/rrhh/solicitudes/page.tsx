
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, MessageSquare } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, CategoriaPersonal, PartidaProduccion } from '@/types';
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
import { Dialog, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle, DialogDescription as ModalDescription } from '@/components/ui/dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
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

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-blue-100 text-blue-800',
    CALIENTE: 'bg-red-100 text-red-800',
    PASTELERIA: 'bg-purple-100 text-purple-800',
    EXPEDICION: 'bg-yellow-100 text-yellow-800'
};

function CommentModal({ comment, trigger }: { comment: string, trigger: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                 {trigger}
            </DialogTrigger>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Comentario de la Asignación</ModalTitle>
                </ModalHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{comment}</p>
                </div>
            </ModalContent>
        </Dialog>
    )
}

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [personalExternoDB, setPersonalExternoDB] = useState<Map<string, { nombre: string; proveedorId: string; }>>(new Map());
  const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
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

  const handleAction = (action: 'aprobar' | 'rechazar' | 'asignar', data?: any) => {
    if(!solicitudToManage) return;

    const updatedSolicitudes = solicitudes.map(s => {
        if (s.id === solicitudToManage.id) {
            switch(action) {
                case 'aprobar':
                    return {...s, estado: 'Aprobada' as const};
                case 'rechazar':
                    return {...s, estado: 'Rechazada' as const, observacionesRRHH: data.reason};
                case 'asignar':
                    const tipoPersonal = tiposPersonal.find(tp => tp.id === data.proveedorId);
                    const coste = calculateHours(s.horaInicio, s.horaFin) * (tipoPersonal?.precioHora || 0);
                    return {...s, estado: 'Asignada' as const, proveedorId: data.proveedorId, costeImputado: coste};
            }
        }
        return s;
    });

    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updatedSolicitudes));
    setSolicitudes(updatedSolicitudes);
    setSolicitudToManage(null);
    toast({title: 'Estado de la solicitud actualizado'});
  }

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
                        const personalInfo = asignado ? personalExternoDB.get(asignado.idPersonal) : null;
                        
                        return (
                        <TableRow key={s.id} onClick={() => handleOpenDialog(s)} className="cursor-pointer">
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge className={cn("text-black", partidaColorClasses[s.partida])}>{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
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
      
        <Dialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Gestionar Solicitud de Personal</ModalTitle>
                </ModalHeader>
                <div className="space-y-4 py-4">
                    <p><strong>Categoría:</strong> {solicitudToManage?.categoria}</p>
                    <p><strong>Fecha:</strong> {solicitudToManage?.fechaServicio ? format(new Date(solicitudToManage.fechaServicio), 'dd/MM/yyyy') : ''}</p>
                    <p><strong>Horario:</strong> {solicitudToManage?.horaInicio} - {solicitudToManage?.horaFin}</p>
                    <p><strong>Partida:</strong> {solicitudToManage?.partida}</p>
                    
                    {solicitudToManage?.estado === 'Solicitado' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold">Acciones de RRHH</h4>
                             <Button onClick={() => handleAction('aprobar')}>Aprobar Solicitud</Button>
                            <Button variant="destructive" className="ml-2" onClick={() => handleAction('rechazar', { reason: prompt('Motivo del rechazo:') })}>Rechazar</Button>
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
            </ModalContent>
        </Dialog>
    </div>
  )
}

    