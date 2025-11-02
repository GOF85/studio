'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, Factory } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Personal, Proveedor, CategoriaPersonal } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency, calculateHours } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Pendiente': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Solicitada Cancelacion': 'destructive'
};

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState('all');
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [proveedorFilter, setProveedorFilter] = useState('all');
  const [showPastEvents, setShowPastEvents] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const storedSolicitudes = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedSolicitudes);
    const storedPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonal(storedPersonal);
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedores(storedProveedores.filter(p => p.tipos.includes('Personal')));
    const storedTiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setTiposPersonal(storedTiposPersonal);
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (solicitudToManage) {
        const categoriaDelProveedor = tiposPersonal.find(t => t.proveedorId === solicitudToManage.proveedorId && t.categoria === solicitudToManage.categoria);
        setSelectedProvider(solicitudToManage.proveedorId || null);
        setSelectedCategoria(categoriaDelProveedor?.id || '');
    }
  }, [solicitudToManage, tiposPersonal]);


  const filteredSolicitudes = useMemo(() => {
    const today = startOfToday();
    return solicitudes.filter(s => {
      const searchMatch = searchTerm === '' ||
        s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.solicitadoPor.toLowerCase().includes(searchTerm.toLowerCase());

      const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);
      const statusMatch = statusFilter === 'all' || s.estado === statusFilter;
      const proveedorMatch = proveedorFilter === 'all' || s.proveedorId === proveedorFilter;
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(s.fechaServicio), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }

      return searchMatch && dateMatch && statusMatch && proveedorMatch && pastEventMatch;
    }).sort((a,b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  }, [solicitudes, searchTerm, dateFilter, statusFilter, proveedorFilter, showPastEvents]);

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
    let updates: Partial<SolicitudPersonalCPR> = { estado };
    if (estado === 'Rechazada') {
        updates.proveedorId = undefined;
        updates.costeImputado = undefined;
        updates.personalAsignado = undefined;
    }
    const updated = updateSolicitud(solicitud.id, updates);
    if (updated) {
        setSolicitudToManage(updated);
    }
    toast({ title: 'Estado actualizado', description: `La solicitud ${solicitud.id} se ha marcado como ${estado}.` });
  }

  const handleGuardarAsignacion = () => {
    if (!solicitudToManage) return;

    if (!selectedProvider || !selectedCategoria) {
        const updated = updateSolicitud(solicitudToManage.id, { 
            proveedorId: undefined, 
            costeImputado: undefined,
            estado: 'Aprobada'
        });
        if(updated) {
            setSolicitudToManage(updated);
            toast({ title: 'Asignación eliminada', description: `Se ha quitado el proveedor de la solicitud.` });
        }
        return;
    }

    const tarifa = tiposPersonal.find(t => t.id === selectedCategoria);

    if (!tarifa) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró una tarifa para esta categoría. Por favor, configúrala en la base de datos de "Catálogo de Personal Externo".'});
        return;
    }

    const horas = calculateHours(solicitudToManage.horaInicio, solicitudToManage.horaFin);
    const costeTotal = horas * tarifa.precioHora;

    const updated = updateSolicitud(solicitudToManage.id, { 
        proveedorId: selectedProvider,
        categoria: tarifa.categoria, // Actualiza la categoría a la del proveedor
        estado: 'Asignada', 
        costeImputado: costeTotal 
    });

    if(updated) {
        setSolicitudToManage(updated);
        toast({ title: 'Proveedor Asignado', description: `Se ha asignado el proveedor y calculado el coste para la solicitud.` });
    }
  }
  
  const handleDeleteRequest = () => {
    if (!solicitudToManage) return;
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const updatedRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updatedRequests));
    setSolicitudes(updatedRequests);
    toast({ title: 'Solicitud Eliminada' });
    setSolicitudToManage(null); // Ensure dialog closes
  }
  
  const categoriasDelProveedor = useMemo(() => {
    if (!selectedProvider) return [];
    return tiposPersonal.filter(t => t.proveedorId === selectedProvider);
  }, [selectedProvider, tiposPersonal]);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
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
         <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los estados"/></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Aprobada">Aprobada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
                <SelectItem value="Asignada">Asignada</SelectItem>
                <SelectItem value="Solicitada Cancelacion">Solicita Cancelación</SelectItem>
            </SelectContent>
        </Select>
        <Select value={proveedorFilter} onValueChange={setProveedorFilter}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filtrar por ETT"/></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Proveedores</SelectItem>
                {proveedores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
            <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
            <Label htmlFor="show-past" className="text-sm font-medium">Mostrar pasados</Label>
        </div>
        <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); setStatusFilter('all'); setProveedorFilter('all'); setShowPastEvents(false); }}>Limpiar Filtros</Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Servicio</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Proveedor (ETT) - Categoría Asignada</TableHead>
                        <TableHead className="text-right">Coste Presupuestado</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => (
                        <TableRow key={s.id} onClick={() => setSolicitudToManage(s)} className="cursor-pointer">
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>
                                {s.estado === 'Asignada' && s.proveedorId ? (
                                    <span>
                                        {proveedores.find(p => p.id === s.proveedorId)?.nombreComercial || 'Desconocido'} - <strong>{s.categoria}</strong>
                                    </span>
                                ) : s.estado === 'Solicitada Cancelacion' ? (
                                    <Badge variant="destructive">Pendiente RRHH</Badge>
                                ) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(s.costeImputado || 0)}</TableCell>
                            <TableCell className="text-right"><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No hay solicitudes que coincidan con los filtros.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Dialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>Gestionar Solicitud</DialogTitle>
                 {solicitudToManage && (
                    <DialogDescription asChild>
                        <div className="text-sm space-y-1 border-b pb-4 pt-2">
                            <div className="grid grid-cols-2 gap-x-4">
                                <div><strong>Fecha:</strong> {format(new Date(solicitudToManage.fechaServicio), 'PPP', {locale: es})}</div>
                                <div><strong>Horario:</strong> {solicitudToManage.horaInicio} - {solicitudToManage.horaFin}</div>
                            </div>
                             <div className="grid grid-cols-2 gap-x-4">
                                 <div><strong>Partida:</strong> <Badge variant="outline">{solicitudToManage.partida}</Badge></div>
                                <div><strong>Categoría solicitada:</strong> {solicitudToManage.categoria}</div>
                            </div>
                            <div className="text-muted-foreground pt-1"><strong>Motivo:</strong> {solicitudToManage.motivo}</div>
                        </div>
                    </DialogDescription>
                 )}
            </DialogHeader>
            <div className="py-4 space-y-4">
                {solicitudToManage?.estado === 'Solicitada Cancelacion' ? (
                    <div className="text-center">
                        <p className="mb-4">El solicitante ha pedido cancelar esta asignación. ¿Confirmas la cancelación?</p>
                        <Button variant="destructive" onClick={handleDeleteRequest}>Sí, Cancelar Asignación</Button>
                    </div>
                ) : (
                <>
                    <div>
                        <h4 className="font-semibold">Estado</h4>
                         <div className="flex gap-2 mt-2">
                            <Button variant={solicitudToManage?.estado === 'Aprobada' || solicitudToManage?.estado === 'Asignada' ? 'default' : 'outline'} size="sm" onClick={() => handleUpdateStatus(solicitudToManage!, 'Aprobada')}>Aprobar</Button>
                            <Button variant={solicitudToManage?.estado === 'Rechazada' ? 'destructive' : 'outline'} size="sm" onClick={() => handleUpdateStatus(solicitudToManage!, 'Rechazada')}>Rechazar</Button>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <h4 className="font-semibold">Asignar Proveedor</h4>
                         <div className="space-y-2">
                            <Label>Proveedor (ETT)</Label>
                            <Select value={selectedProvider || 'none'} onValueChange={(value) => setSelectedProvider(value === 'none' ? null : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un proveedor..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Sin asignar --</SelectItem>
                                    {proveedores.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedProvider && (
                            <div className="space-y-2">
                                <Label>Categoría Profesional del Proveedor</Label>
                                <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoriasDelProveedor.length > 0 ? (
                                            categoriasDelProveedor.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.categoria} ({formatCurrency(c.precioHora)}/h)</SelectItem>
                                        ))
                                        ) : (
                                            <div className="text-center text-sm text-muted-foreground p-4">No hay categorías para este proveedor.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </>
                )}
            </div>
            {solicitudToManage?.estado !== 'Solicitada Cancelacion' && (
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Cerrar</Button></DialogClose>
                    <Button onClick={handleGuardarAsignacion}>Guardar Asignación</Button>
                </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
