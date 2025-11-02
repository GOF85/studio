
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, Users, ArrowLeft, ChevronLeft, ChevronRight, Edit, MessageSquare, Pencil, PlusCircle, RefreshCw, Send, Trash2, AlertTriangle, Printer, FileText, Upload } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday, isWithinInterval, endOfDay, add, sub, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit, calculateHours } from '@/lib/utils';
import type { PedidoPartner, PedidoEntrega, ProductoVenta, Entrega, Proveedor, PersonalExterno, SolicitudPersonalCPR, AsignacionPersonal, EstadoPersonalExterno, EstadoSolicitudPersonalCPR, ComercialBriefingItem } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { logActivity } from '../activity-log/utils';
import { Combobox } from '@/components/ui/combobox';
import type { ServiceOrder } from '@/types';


type SimplifiedPedidoPartnerStatus = 'Pendiente' | 'Aceptado';

type PedidoPartnerConEstado = PedidoPartner & {
    expedicionNumero: string;
    status: SimplifiedPedidoPartnerStatus;
    comentarios?: string;
}

const statusVariant: { [key in SimplifiedPedidoPartnerStatus]: 'success' | 'secondary' } = {
  'Pendiente': 'secondary',
  'Aceptado': 'success',
};

const statusRowClass: { [key in SimplifiedPedidoPartnerStatus]?: string } = {
  'Aceptado': 'bg-green-100/60 hover:bg-green-100/80',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type UnifiedTurno = (PersonalExternoTurno & { osId: string; type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });

type DayDetails = {
    day: Date;
    events: UnifiedTurno[];
} | null;


function CommentDialog({ pedido, onSave, isReadOnly }: { pedido: PedidoPartnerConEstado; onSave: (id: string, comment: string) => void; isReadOnly: boolean; }) {
    const [comment, setComment] = useState(pedido.comentarios || '');
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        onSave(pedido.id, comment);
        setIsOpen(false);
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isReadOnly}>
                   <Edit className="h-4 w-4"/>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentarios para: {pedido.elaboracionNombre}</DialogTitle>
                </DialogHeader>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="Añade aquí cualquier nota relevante sobre la producción o entrega de este artículo..."/>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Comentario</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AsignacionDialog({ turno, onSave, isCprRequest }: { turno: PersonalExternoTurno | SolicitudPersonalCPR, onSave: (turnoId: string, asignaciones: AsignacionPersonal[], isCpr: boolean) => void, isCprRequest: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignaciones, setAsignaciones] = useState<Partial<AsignacionPersonal>[]>([]);
    const [trabajadoresDB, setTrabajadoresDB] = useState<{label: string, value: string, id:string}[]>([]);
    
    useEffect(() => {
        if(isOpen) {
            const initialAsignaciones = 'asignaciones' in turno ? (turno.asignaciones || []) : ('personalAsignado' in turno ? turno.personalAsignado?.map(p => ({ id: p.idPersonal, nombre: p.nombre})) || [] : []);
            setAsignaciones(initialAsignaciones);
            
            const allPersonalExterno = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as {id: string, proveedorId: string, nombreCompleto: string}[];
            const allPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as {id: string, nombre: string, apellidos: string}[];

            const combined = isCprRequest
              ? allPersonalInterno.map(p => ({ label: `${p.nombre} ${p.apellidos}`, value: p.nombre, id: p.id }))
              : allPersonalExterno
                  .filter(p => p.proveedorId === (turno as PersonalExternoTurno).proveedorId)
                  .map(p => ({ label: p.nombreCompleto, value: p.nombreCompleto, id: p.id }));
              
            setTrabajadoresDB(combined);
        }
    }, [isOpen, turno, isCprRequest]);

    const handleSave = () => {
        onSave(turno.id, asignaciones.filter(a => a.id && a.nombre) as AsignacionPersonal[], isCprRequest);
        setIsOpen(false);
    }
    
    const updateAsignacion = (index: number, field: keyof AsignacionPersonal, value: string) => {
        const newAsignaciones = [...asignaciones];
        const updatedAsignacion = { ...newAsignaciones[index], [field]: value };

        if (field === 'id') {
            const trabajador = trabajadoresDB.find(t => t.id === value);
            if (trabajador) {
                updatedAsignacion.nombre = trabajador.label;
            }
        }
        newAsignaciones[index] = updatedAsignacion;
        setAsignaciones(newAsignaciones);
    }
    
    const addAsignacionRow = () => {
        setAsignaciones(prev => [...prev, { id: `new-${Date.now()}` }]);
    }
    
    const removeAsignacionRow = (index: number) => {
        setAsignaciones(prev => prev.filter((_, i) => i !== index));
    }

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Users className="mr-2 h-4 w-4" /> Asignar Personal
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Personal para {turno.categoria}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {asignaciones.map((asig, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                   <div className="flex-grow">
                     <Combobox 
                        options={trabajadoresDB}
                        value={asig.id || ''}
                        onChange={(val) => updateAsignacion(index, 'id', val)}
                        placeholder="Buscar trabajador..."
                     />
                   </div>
                   <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAsignacionRow(index)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={addAsignacionRow}>
                <PlusCircle className="mr-2 h-4 w-4"/> Añadir Fila
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Asignaciones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
}

export default function PortalPersonalPage() {
    const [pedidos, setPedidos] = useState<(PersonalExterno | SolicitudPersonalCPR)[]>([]);
    const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
    const [briefings, setBriefings] = useState<Map<string, { items: ComercialBriefingItem[] }>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();
    const router = useRouter();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [proveedorNombre, setProveedorNombre] = useState('');

    const isAdminOrComercial = useMemo(() => {
        if (!impersonatedUser) return false;
        const roles = impersonatedUser.roles || [];
        return roles.includes('Admin') || roles.includes('Comercial');
    }, [impersonatedUser]);

    const isReadOnly = useMemo(() => {
        if (!impersonatedUser) return true;
        return isAdminOrComercial;
    }, [impersonatedUser, isAdminOrComercial]);
    
    const proveedorId = useMemo(() => impersonatedUser?.proveedorId, [impersonatedUser]);

    const loadData = useCallback(() => {
        const partnerShouldBeDefined = impersonatedUser?.roles?.includes('Partner Personal');
        if (partnerShouldBeDefined && !impersonatedUser?.proveedorId) {
            setPedidos([]);
            setIsMounted(true);
            return;
        }

        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        if (impersonatedUser?.proveedorId) {
            const proveedor = allProveedores.find(p => p.id === impersonatedUser.proveedorId);
            setProveedorNombre(proveedor?.nombreComercial || '');
        }

        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const allSolicitudesCPR = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        
        const filteredPedidos = proveedorId
            ? allPersonalExterno.filter(p => p.turnos.some(t => t.proveedorId === proveedorId))
            : allPersonalExterno;
        
        const filteredSolicitudesCPR = proveedorId 
            ? allSolicitudesCPR.filter(s => s.proveedorId === proveedorId) 
            : allSolicitudesCPR;
        
        setPedidos([...filteredPedidos, ...filteredSolicitudesCPR]);

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        setServiceOrders(new Map(allServiceOrders.map(os => [os.id, os])));

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as { osId: string; items: ComercialBriefingItem[] }[];
        setBriefings(new Map(allBriefings.map(b => [b.osId, b])));

        setIsMounted(true);
    }, [proveedorId, impersonatedUser]);

    useEffect(() => {
        if (impersonatedUser) {
            const userRoles = impersonatedUser.roles || [];
            const canAccess = userRoles.includes('Partner Personal') || isAdminOrComercial;
            if (!canAccess) {
                router.push('/portal');
            }
        }
    }, [impersonatedUser, router, isAdminOrComercial]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSaveAsignaciones = (turnoId: string, nuevasAsignaciones: AsignacionPersonal[], isCpr: boolean) => {
        if (!impersonatedUser) return;
    
        if (isCpr) {
            let allSolicitudesCPR = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
            const index = allSolicitudesCPR.findIndex(s => s.id === turnoId);
            if (index > -1) {
                allSolicitudesCPR[index].personalAsignado = nuevasAsignaciones.map(a => ({ idPersonal: a.id, nombre: a.nombre }));
                allSolicitudesCPR[index].estado = 'Asignada';
                localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allSolicitudesCPR));
            }
        } else {
            let allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
            allPersonalExterno = allPersonalExterno.map(pedido => ({
                ...pedido,
                turnos: pedido.turnos.map(turno => {
                    if (turno.id === turnoId) {
                        return { ...turno, asignaciones: nuevasAsignaciones, statusPartner: 'Gestionado' };
                    }
                    return turno;
                })
            }));
            localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
        }

        loadData();
        const osNumber = isCpr ? 'CPR' : serviceOrders.get(pedidos.find(p => 'turnos' in p && p.turnos.some(t => t.id === turnoId))!.osId)?.serviceNumber;
        logActivity(impersonatedUser, 'Asignar Personal', `Asignados ${nuevasAsignaciones.length} trabajador(es)`, osNumber || 'N/A');
        toast({ title: 'Asignación guardada' });
    };

    
    const filteredPedidos = useMemo(() => {
        const today = startOfToday();
        return pedidos.filter(p => {
             const fechaServicio = 'turnos' in p ? p.turnos[0]?.fecha : p.fechaServicio;
             if (!fechaServicio) return false;
             
             const isPast = isBefore(new Date(fechaServicio), today);
             if (!showCompleted && isPast) {
                 return false;
             }

             let dateMatch = true;
             if (dateRange?.from) {
                 if (dateRange.to) {
                     dateMatch = isWithinInterval(new Date(fechaServicio), { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                 } else {
                     dateMatch = isSameDay(new Date(fechaServicio), dateRange.from);
                 }
             }
             
             return dateMatch;
        });
    }, [pedidos, showCompleted, dateRange]);


    const turnosAgrupados = useMemo(() => {
        const grouped: { [date: string]: { [osId: string]: { os: ServiceOrder | { id: string; serviceNumber: string; client: string; space: string; }; briefing: ComercialBriefingItem | undefined; turnos: (PersonalExternoTurno | SolicitudPersonalCPR)[] } } } = {};
        
        filteredPedidos.forEach(pedido => {
            const turnosSource = 'turnos' in pedido ? pedido.turnos : [pedido];

            turnosSource.forEach(turno => {
                const fechaServicio = 'fecha' in turno ? turno.fecha : ('fechaServicio' in turno ? turno.fechaServicio : new Date().toISOString());

                const dateKey = format(new Date(fechaServicio), 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = {};

                const osId = 'osId' in pedido ? pedido.osId : 'CPR';
                if (!grouped[dateKey][osId]) {
                    const os = osId !== 'CPR' ? serviceOrders.get(osId) : { id: 'CPR', serviceNumber: 'CPR', client: 'Producción Interna', space: 'CPR' };
                    const briefing = osId !== 'CPR' ? briefings.get(osId) : undefined;
                    const hito = briefing?.items.find(item => 'fecha' in turno && isSameDay(new Date(item.fecha), new Date(turno.fecha)));
                    grouped[dateKey][osId] = { os: os!, briefing: hito, turnos: [] };
                }
                grouped[dateKey][osId].turnos.push(turno);
            });
        });

        return Object.entries(grouped)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, osData]) => {
                const allAccepted = Object.values(osData).flatMap(os => os.turnos).every(t => ('statusPartner' in t && t.statusPartner === 'Gestionado') || ('estado' in t && t.estado === 'Asignada'));
                const earliestTime = Object.values(osData).flatMap(os => os.turnos).reduce((earliest, p) => p.horaInicio < earliest ? p.horaInicio : earliest, '23:59');
                
                const groupedByOS = Object.values(osData).map(osEntry => ({
                    ...osEntry,
                    turnos: osEntry.turnos.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                })).sort((a,b) => a.os.serviceNumber.localeCompare(b.os.serviceNumber));

                return { date, osEntries: groupedByOS, allAccepted, earliestTime };
            });
    }, [filteredPedidos, serviceOrders, briefings]);

    const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: UnifiedTurno[] } = {};
        pedidos.forEach(p => {
            const turnosSource = 'turnos' in p ? p.turnos.map(t => ({ ...t, osId: p.osId, type: 'EVENTO' as const })) : [{ ...p, type: 'CPR' as const }];
            turnosSource.forEach(turno => {
                const dateKey = format(new Date('fecha' in turno ? turno.fecha : turno.fechaServicio), 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(turno);
            });
        });
        return grouped;
    }, [pedidos]);
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Personal..." />;
    }
    
    if(impersonatedUser?.roles?.includes('Partner Personal') && !proveedorId) {
        return (
             <main className="container mx-auto px-4 py-16">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
                    <CardContent><p>Este usuario no está asociado a ningún proveedor de personal. Por favor, contacta con el administrador.</p></CardContent>
                </Card>
            </main>
        )
    }

    return (
        <TooltipProvider>
         <main className="container mx-auto px-4 py-8">
             <div className="flex items-center justify-between border-b pb-4 mb-8">
                <div className="flex items-center gap-4">
                    <Users className="w-10 h-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Partner de Personal</h1>
                        <p className="text-muted-foreground">Gestiona los turnos y asigna a tu personal a los eventos.</p>
                    </div>
                </div>
                {proveedorNombre && (
                    <Badge variant="secondary" className="px-4 py-2 text-lg">
                        <Building2 className="mr-2 h-5 w-5" />
                        {proveedorNombre}
                    </Badge>
                )}
                 {isAdminOrComercial && (
                     <Badge variant="outline" className="px-4 py-2 text-lg border-primary text-primary">
                        Vista de Administrador
                    </Badge>
                )}
            </div>

            <Tabs defaultValue="lista">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="lista">Lista de Solicitudes</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="lista" className="mt-6">
                     <div className="flex items-center space-x-4 mb-4">
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false) }}} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(Boolean(checked))} />
                            <Label htmlFor="show-completed">Mostrar pasados</Label>
                        </div>
                    </div>
                    {turnosAgrupados.length > 0 ? (
                         <Accordion type="multiple" className="w-full space-y-4">
                            {turnosAgrupados.map(({ date, osEntries, allAccepted, earliestTime }) => (
                               <AccordionItem value={date} key={date} className="border-none">
                                <Card className={cn(allAccepted && 'bg-green-100/60')}>
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex items-center gap-3 w-full">
                                                {allAccepted ? <CheckCircle className="h-6 w-6 text-green-600"/> : <CalendarIcon className="h-6 w-6"/>}
                                                <div className="text-left">
                                                    <h3 className="text-xl font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="border-t px-4 pb-4 space-y-4">
                                                {osEntries.map(({ os, briefing, turnos }) => (
                                                    <div key={os.id}>
                                                        <h4 className="font-bold mb-2">
                                                            {os.id === 'CPR' ? <Badge>CPR</Badge> : <Badge variant="outline">{os.serviceNumber}</Badge>} - {os.client}
                                                            <span className="text-sm font-normal text-muted-foreground ml-2">{briefing?.descripcion || 'Producción Interna'} ({os.space})</span>
                                                        </h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Categoría</TableHead>
                                                                    <TableHead>Horario</TableHead>
                                                                    <TableHead>Observaciones</TableHead>
                                                                    <TableHead className="text-center">Estado</TableHead>
                                                                    <TableHead className="text-right w-12"></TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {turnos.map(turno => {
                                                                    const isCpr = 'partida' in turno;
                                                                    const status = isCpr ? turno.estado : ('statusPartner' in turno ? turno.statusPartner : 'Pendiente');
                                                                    
                                                                    return (
                                                                    <TableRow key={turno.id} className={cn(status === 'Gestionado' && 'bg-green-50/50', status === 'Asignada' && 'bg-green-50/50')}>
                                                                        <TableCell className="font-semibold">{('cantidad' in turno ? turno.cantidad : 1)} x {turno.categoria}</TableCell>
                                                                        <TableCell>{turno.horaInicio} - {turno.horaFin}</TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground">{'observaciones' in turno ? turno.observaciones : turno.motivo}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant={status === 'Gestionado' || status === 'Asignada' ? 'success' : 'secondary'}>{status}</Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <AsignacionDialog turno={turno} onSave={handleSaveAsignaciones} isCprRequest={isCpr} />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )})}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                </Card>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                                <p className="mt-1 text-sm text-muted-foreground">No hay solicitudes de personal pendientes que coincidan con los filtros.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="calendario" className="mt-6">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                        <h2 className="text-xl font-semibold w-40 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                     <div className="border rounded-lg">
                        <div className="grid grid-cols-7 border-b">
                            {WEEKDAYS.map(day => (
                            <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">
                                {day}
                            </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {calendarDays.map((day) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dayEvents = eventsByDay[dayKey] || [];
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toString()}
                                        className={cn(
                                            'h-20 border-r border-b p-1 flex flex-col',
                                            !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
                                            'last:border-r-0',
                                            dayEvents.length > 0 && 'cursor-pointer hover:bg-secondary'
                                        )}
                                        onClick={() => dayEvents.length > 0 && setDayDetails({ day, events: dayEvents as any })}
                                    >
                                        <span className={cn('font-semibold text-xs', isToday && 'text-primary font-bold flex items-center justify-center h-5 w-5 rounded-full bg-primary/20')}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <div className="mt-1 flex justify-center">
                                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
         </main>

        <Dialog open={!!dayDetails} onOpenChange={(open) => !open && setDayDetails(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Personal para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                    {dayDetails && dayDetails.events.map((event) => {
                        const os = 'osId' in event ? serviceOrders.get(event.osId) : { id: 'CPR', serviceNumber: 'CPR', client: 'Producción Interna' };
                        return (
                        <div key={event.id} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{os?.serviceNumber} - {os?.client}</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span><span className="font-semibold">Categoría:</span> {event.categoria}</span>
                                <span><span className="font-semibold">Horario:</span> {event.horaInicio} - {event.horaFin}</span>
                            </div>
                        </div>
                    )})}
                </div>
            </DialogContent>
        </Dialog>
        </TooltipProvider>
    );
}

```
- tailwind.config.ts:
```ts
/** @type {import('tailwindcss').Config} */
import {fontFamily} from 'tailwindcss/defaultTheme';

module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
       fontFamily: {
        body: ['var(--font-body)', ...fontFamily.sans],
        headline: ['var(--font-headline)', ...fontFamily.sans],
        code: ['monospace'],
      },
       typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: {
              fontFamily: theme('fontFamily.headline'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
            },
            '--tw-prose-bullets': theme('colors.primary.DEFAULT'),
          },
        },
      }),
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('@tailwindcss/typography')],
}

```
- src/app/os/personal-mice/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-mice`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/personal-mice/page.tsx:
```tsx


'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Espacio, ComercialBriefing, ComercialBriefingItem, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { differenceInMinutes, parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
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


const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());
        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        return 0;
    }
}

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  solicitadoPor: z.enum(solicitadoPorOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

const formSchema = z.object({
    personal: z.array(personalMiceSchema)
})

type PersonalMiceFormValues = z.infer<typeof formSchema>;

export default function PersonalMiceFormPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [personalDB, setPersonalDB] = useState<Personal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue } = form;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "personal",
  });
  
 const handlePersonalChange = useCallback((index: number, name: string) => {
    if (!name) return;
    const person = personalDB.find(p => p.nombre.toLowerCase() === name.toLowerCase());
    if (person) {
      setValue(`personal.${index}.nombre`, person.nombre, { shouldDirty: true });
      setValue(`personal.${index}.dni`, person.dni || '', { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true });
    } else {
       setValue(`personal.${index}.nombre`, name, { shouldDirty: true });
    }
  }, [personalDB, setValue]);
  
  const watchedFields = useWatch({ control, name: 'personal' });

 const { totalPlanned, totalReal } = useMemo(() => {
    if (!watchedFields) return { totalPlanned: 0, totalReal: 0 };
    
    const totals = watchedFields.reduce((acc, order) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
        acc.planned += plannedHours * (order.precioHora || 0);
        
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        acc.real += realHours * (order.precioHora || 0);
        
        return acc;
    }, { planned: 0, real: 0 });

    return { totalPlanned: totals.planned, totalReal: totals.real };
  }, [watchedFields]);

  const loadData = useCallback(() => {
     if (!osId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
        return;
    }
    
    try {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        if (currentOS?.space) {
            const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
            const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
            setSpaceAddress(currentSpace?.identificacion.calle || '');
        }

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);

        const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
        const relatedOrders = allOrders.filter(order => order.osId === osId);
        form.reset({ personal: relatedOrders });

        const dbPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalDB(dbPersonal);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: PersonalMiceFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const otherOsOrders = allOrders.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalMiceOrder[] = data.personal.map(p => ({ ...p, osId }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal MICE guardado', description: 'Todos los cambios han sido guardados.' });
        setIsLoading(false);
        form.reset(data); // Resets form with new values, marking it as not dirty
    }, 500);
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        solicitadoPor: 'Sala',
        nombre: '',
        dni: '',
        tipoServicio: 'Servicio',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        precioHora: 0,
        horaEntradaReal: '',
        horaSalidaReal: '',
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Asignación eliminada' });
    }
  };

  const personalOptions = useMemo(() => {
    return personalDB.map(p => ({ label: p.nombre, value: p.nombre.toLowerCase() }));
  }, [personalDB]);

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />;
  }

  return (
    <>
      <main>
       <FormProvider {...form}>
        <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}`)} className="mb-2">
                        <ArrowLeft className="mr-2" />
                        Volver a la OS
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
                    <div className="text-muted-foreground mt-2 space-y-1">
                    <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                    {serviceOrder.space && (
                        <p className="flex items-center gap-2">
                        <Building className="h-3 w-3" /> {serviceOrder.space} {spaceAddress && `(${spaceAddress})`}
                        </p>
                    )}
                    {serviceOrder.respMetre && (
                        <p className="flex items-center gap-2">
                            Resp. Metre: {serviceOrder.respMetre} 
                            {serviceOrder.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {serviceOrder.respMetrePhone}</span>}
                        </p>
                    )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
            </div>
            
             <Accordion type="single" collapsible className="w-full mb-8" >
                <AccordionItem value="item-1">
                <Card>
                    <AccordionTrigger className="p-6">
                        <h3 className="text-xl font-semibold">Servicios del Evento</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                    <CardContent className="pt-0">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="py-2 px-3">Fecha</TableHead>
                            <TableHead className="py-2 px-3">Descripción</TableHead>
                            <TableHead className="py-2 px-3">Asistentes</TableHead>
                            <TableHead className="py-2 px-3">Duración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.horaInicio}</TableCell>
                                <TableCell className="py-2 px-3">{item.descripcion}</TableCell>
                                <TableCell className="py-2 px-3">{item.asistentes}</TableCell>
                                <TableCell className="py-2 px-3">{calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h</TableCell>
                            </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </AccordionContent>
                </Card>
                </AccordionItem>
            </Accordion>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Personal Asignado</CardTitle>
                    <Button type="button" onClick={addRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Personal
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-2">Centro Coste</TableHead>
                                    <TableHead className="px-2 py-2">Nombre</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead colSpan={2} className="text-center border-r px-2 py-2">Real</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-2 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-2 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                    <TableHead className="w-24">H. Entrada</TableHead>
                                    <TableHead className="border-r w-24">H. Salida</TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.centroCoste`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 min-w-40">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.nombre`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={personalOptions}
                                                        value={field.value}
                                                        onChange={(value) => handlePersonalChange(index, value)}
                                                        placeholder="Nombre..."
                                                    />
                                                </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.tipoServicio`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="border-l px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntrada`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalida`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.precioHora`}
                                                render={({ field }) => <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-20 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntradaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalidaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right px-2 py-1">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {fields.length > 0 && (
                    <CardFooter>
                         <Card className="w-full md:w-1/2 ml-auto">
                            <CardHeader><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Planificado:</span>
                                    <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Real:</span>
                                    <span className="font-bold">{formatCurrency(totalReal)}</span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación:</span>
                                    <span className={totalReal - totalPlanned > 0 ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(totalReal - totalPlanned)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </CardFooter>
                )}
            </Card>
        </form>
       </FormProvider>

        <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará la asignación de personal de la tabla.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteRow}
                >
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
```
- src/app/os/prueba-menu/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PruebaMenuIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/prueba-menu`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/transporte/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TransporteIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/transporte`);
    }, [router, params.id]);
    return null;
}

```
- src/components/layout/main-nav.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import * as React from 'react';
import { bookNavLinks } from '@/lib/book-nav';
import { cprNav } from '@/lib/cpr-nav';
import { rrhhNav } from '@/lib/rrhh-nav';
import { ClipboardList, Package } from 'lucide-react';


const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"


export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden md:flex">
      <NavigationMenu>
        <NavigationMenuList>
             <NavigationMenuItem>
                <Link href="/pes" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname.startsWith('/os') || pathname.startsWith('/pes') ? "bg-accent" : "")}>
                       <ClipboardList className="mr-2"/> Órdenes de Servicio
                    </NavigationMenuLink>
                </Link>
            </NavigationMenuItem>
             <NavigationMenuItem>
                <Link href="/entregas" legacyBehavior passHref>
                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname.startsWith('/entregas') ? "bg-accent" : "")}>
                       <Package className="mr-2"/> Entregas MICE
                    </NavigationMenuLink>
                </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(pathname.startsWith('/book') && "bg-accent")}>Book Gastronómico</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                    {bookNavLinks.map((component) => (
                    <ListItem
                        key={component.title}
                        title={component.title}
                        href={component.path}
                    >
                       
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
             <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(pathname.startsWith('/cpr') && "bg-accent")}>Producción (CPR)</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                    {cprNav.map((component) => (
                    <ListItem
                        key={component.title}
                        title={component.title}
                        href={component.href}
                    >
                       {component.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
             <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(pathname.startsWith('/rrhh') && "bg-accent")}>RRHH</NavigationMenuTrigger>
                <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                    {rrhhNav.map((component) => (
                    <ListItem
                        key={component.title}
                        title={component.title}
                        href={component.href}
                    >
                       {component.description}
                    </ListItem>
                    ))}
                </ul>
                </NavigationMenuContent>
            </NavigationMenuItem>
        </NavigationMenuList>
        </NavigationMenu>
    </div>
  );
}

```
- src/lib/book-nav.ts:
```ts


'use client';

import { BarChart3, BookHeart, CheckSquare, ChefHat, Component, Sprout, Shield } from 'lucide-react';

export const bookNavLinks = [
    { title: 'Panel de Control', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Verificación de Ingredientes', path: '/book/verificacionIngredientes', icon: Shield },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Información de Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

```
- src/components/ui/navigation-menu.tsx:
```tsx
"use client"

import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}

```
- src/app/os/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```