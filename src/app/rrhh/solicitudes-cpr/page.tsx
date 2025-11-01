
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, UserCheck, AlertTriangle, CheckCircle, Search, Calendar, UserPlus } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Pendiente': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default'
};

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('all');
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [asignaciones, setAsignaciones] = useState<string[]>([]);
  
  const { impersonatedUser } = useImpersonatedUser();
  const { toast } = useToast();

  useEffect(() => {
    const storedSolicitudes = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedSolicitudes);
    const storedPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonal(storedPersonal);
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if(solicitudToManage) {
        const initialAsignaciones = solicitudToManage.personalAsignado?.map(p => p.idPersonal) || [];
        // Ensure the array has the correct length based on 'cantidad'
        const correctLengthArray = Array.from({ length: solicitudToManage.cantidad }, (_, i) => initialAsignaciones[i] || '');
        setAsignaciones(correctLengthArray);
    }
  }, [solicitudToManage]);


  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(s => {
      const searchMatch = searchTerm === '' ||
        s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.solicitadoPor.toLowerCase().includes(searchTerm.toLowerCase());

      const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);
      const statusMatch = statusFilter === 'all' || s.estado === statusFilter;

      return searchMatch && dateMatch && statusMatch;
    }).sort((a,b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  }, [solicitudes, searchTerm, dateFilter, statusFilter]);
  
  const updateSolicitud = (solicitudId: string, updates: Partial<SolicitudPersonalCPR>) => {
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === solicitudId);
    if(index > -1) {
        allRequests[index] = { ...allRequests[index], ...updates };
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        setSolicitudes(allRequests);
        return allRequests[index];
    }
    return null;
  }

  const handleUpdateStatus = (solicitud: SolicitudPersonalCPR, estado: SolicitudPersonalCPR['estado']) => {
    updateSolicitud(solicitud.id, { estado });
    toast({ title: 'Estado actualizado', description: `La solicitud ${solicitud.id} se ha marcado como ${estado}.` });
  }
  
  const handleGuardarAsignacion = () => {
    if (!solicitudToManage) return;

    const assignedPersonal = asignaciones
        .map(id => personal.find(p => p.id === id))
        .filter((p): p is Personal => !!p)
        .map(p => ({ idPersonal: p.id, nombre: `${p.nombre} ${p.apellidos}` }));
    
    if (assignedPersonal.length !== solicitudToManage.cantidad) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes asignar el número exacto de personas solicitadas.'});
        return;
    }
    
    // Calcular coste
    const horas = (new Date(`1970-01-01T${solicitudToManage.horaFin}:00`).getTime() - new Date(`1970-01-01T${solicitudToManage.horaInicio}:00`).getTime()) / (1000 * 60 * 60);
    const costeTotal = assignedPersonal.reduce((sum, p) => {
        const data = personal.find(pd => pd.id === p.idPersonal);
        return sum + (horas * (data?.precioHora || 0));
    }, 0);

    const updated = updateSolicitud(solicitudToManage.id, { personalAsignado: assignedPersonal, estado: 'Asignada', costeImputado: costeTotal });
    if(updated) {
        setSolicitudToManage(updated);
        toast({ title: 'Personal Asignado', description: `Se ha asignado el personal y calculado el coste para la solicitud.` });
    }
    setSolicitudToManage(null);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Factory />Solicitudes de Personal (CPR)</h1>
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
              <Calendar className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : <span>Filtrar por fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarUI
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
         <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Aprobada">Aprobada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
                <SelectItem value="Asignada">Asignada</SelectItem>
            </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); setStatusFilter('all'); }}>Limpiar Filtros</Button>
      </div>

      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Servicio</TableHead>
                        <TableHead>Solicitud</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-semibold">{s.cantidad} x {s.categoria}</TableCell>
                            <TableCell><Badge variant="outline">{s.partida}</Badge></TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
                            <TableCell>{s.personalAsignado?.map(p => p.nombre).join(', ') || '-'}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => setSolicitudToManage(s)}><UserCheck className="mr-2"/>Gestionar</Button>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">No hay solicitudes que coincidan con los filtros.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Dialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Gestionar Solicitud: {solicitudToManage?.id}</DialogTitle>
                <DialogDescription>
                    {solicitudToManage?.motivo}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <h4 className="font-semibold">Estado</h4>
                     <div className="flex gap-2 mt-2">
                        <Button variant={solicitudToManage?.estado === 'Aprobada' ? 'default' : 'outline'} size="sm" onClick={() => handleUpdateStatus(solicitudToManage!, 'Aprobada')}>Aprobar</Button>
                        <Button variant={solicitudToManage?.estado === 'Rechazada' ? 'destructive' : 'outline'} size="sm" onClick={() => handleUpdateStatus(solicitudToManage!, 'Rechazada')}>Rechazar</Button>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold">Asignar Personal</h4>
                    <div className="space-y-2 mt-2">
                        {Array.from({ length: solicitudToManage?.cantidad || 0 }).map((_, index) => (
                            <Select 
                                key={index}
                                value={asignaciones[index]} 
                                onValueChange={(value) => {
                                    const newAsignaciones = [...asignaciones];
                                    newAsignaciones[index] = value;
                                    setAsignaciones(newAsignaciones);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={`Selecciona persona ${index + 1}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {personal.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nombre} {p.apellidos}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Cerrar</Button></DialogClose>
                <Button onClick={handleGuardarAsignacion} disabled={asignaciones.some(a => a === '')}>Guardar Asignación</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

    