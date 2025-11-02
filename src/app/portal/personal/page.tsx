
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Calendar as CalendarIcon, MessageSquare, Edit, Users, PlusCircle, Trash2, MapPin, Clock, Phone, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit, formatNumber, calculateHours } from '@/lib/utils';
import type { PedidoPartner, PedidoEntrega, ProductoVenta, Entrega, Proveedor, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExternoDB, PersonalExterno, SolicitudPersonalCPR, PersonalExternoTurno, AsignacionPersonal } from '@/types';
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


type SimplifiedPedidoPartnerStatus = 'Pendiente' | 'Aceptado';

type TurnoConDetalles = PersonalExternoTurno & {
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEvento: string;
    lugarEntrega: string;
    isCprRequest?: boolean;
    solicitudMotivo?: string;
};

const statusVariant: { [key in PersonalExternoTurno['statusPartner']]: 'success' | 'secondary' } = {
  'Pendiente Asignación': 'secondary',
  'Gestionado': 'success',
};

const statusRowClass: { [key in PersonalExternoTurno['statusPartner']]?: string } = {
  'Gestionado': 'bg-green-50 hover:bg-green-100/80',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type DayDetails = {
    day: Date;
    events: TurnoConDetalles[];
} | null;


function AsignacionDialog({ turno, onSave, children }: { turno: TurnoConDetalles; onSave: (turnoId: string, asignaciones: AsignacionPersonal[]) => void; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [personalExternoDB, setPersonalExternoDB] = useState<PersonalExternoDB[]>([]);
    const { impersonatedUser } = useImpersonatedUser();
    
    const [asignacion, setAsignacion] = useState<AsignacionPersonal>({ id: '1', nombre: '', dni: '', telefono: '', comentarios: '', horaEntradaReal: '', horaSalidaReal: '' });
    
    useEffect(() => {
        const storedDB = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        setPersonalExternoDB(storedDB.filter(p => p.proveedorId === impersonatedUser?.proveedorId));

        if(isOpen) {
             setAsignacion(turno.asignaciones?.[0] || { id: '1', nombre: '', dni: '', telefono: '', comentarios: '', horaEntradaReal: '', horaSalidaReal: '' });
        }
    }, [isOpen, turno.asignaciones, impersonatedUser?.proveedorId]);

    const updateAsignacion = (field: keyof Omit<AsignacionPersonal, 'id'>, value: string) => {
        setAsignacion(prev => ({ ...prev, [field]: value }));
    };

    const handleSelectPersonal = (personalId: string) => {
        const personal = personalExternoDB.find(p => p.id === personalId);
        if (personal) {
            setAsignacion(prev => ({
                ...prev,
                nombre: personal.nombreCompleto,
                dni: personal.id,
            }));
        }
    }

    const handleSave = () => {
        if (!asignacion.nombre) {
            alert("El nombre es obligatorio.");
            return;
        }
        onSave(turno.id, [asignacion]);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Asignar Personal: {turno.categoria}</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-sm text-muted-foreground pt-2 space-y-1">
                            <div className="flex items-center gap-2"><MapPin size={14}/> <strong>Dirección:</strong> {turno.lugarEntrega}</div>
                            <div className="flex items-center gap-2"><Clock size={14}/> <strong>Horario:</strong> {turno.horaEntrada} - {turno.horaSalida}</div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-1">
                        <Label>Buscar Personal Existente</Label>
                        <Combobox
                            options={personalExternoDB.map(p => ({ label: p.nombreCompleto, value: p.id }))}
                            value={asignacion.dni || ''}
                            onChange={(value) => handleSelectPersonal(value)}
                            placeholder="Buscar por nombre o DNI..."
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor={`nombre-${asignacion.id}`}>Nombre y Apellidos</Label><Input id={`nombre-${asignacion.id}`} placeholder="Nombre completo" value={asignacion.nombre} onChange={e => updateAsignacion('nombre', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`dni-${asignacion.id}`}>DNI</Label><Input id={`dni-${asignacion.id}`} placeholder="DNI" value={asignacion.dni} onChange={e => updateAsignacion('dni', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`tel-${asignacion.id}`}>Teléfono</Label><Input id={`tel-${asignacion.id}`} placeholder="Teléfono de contacto" value={asignacion.telefono} onChange={e => updateAsignacion('telefono', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`com-${asignacion.id}`}>Comentarios</Label><Input id={`com-${asignacion.id}`} placeholder="Notas (opcional)" value={asignacion.comentarios} onChange={e => updateAsignacion('comentarios', e.target.value)} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Asignación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PartnerPersonalPortalPage() {
    const [turnos, setTurnos] = useState<TurnoConDetalles[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();
    const [showCompleted, setShowCompleted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();
    const [proveedorNombre, setProveedorNombre] = useState('');
    const router = useRouter();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const isAdminOrComercial = useMemo(() => {
        if (!impersonatedUser) return false;
        const roles = impersonatedUser.roles || [];
        return roles.includes('Admin') || roles.includes('Comercial');
    }, [impersonatedUser]);

    const loadData = useCallback(() => {
        const partnerShouldBeDefined = impersonatedUser?.roles?.includes('Partner Personal');
        if (partnerShouldBeDefined && !impersonatedUser?.proveedorId) {
            setTurnos([]);
            setIsMounted(true);
            return;
        }

        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        if (impersonatedUser?.proveedorId) {
            const proveedor = allProveedores.find(p => p.id === impersonatedUser.proveedorId);
            setProveedorNombre(proveedor?.nombreComercial || '');
        }

        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
        const allPersonalExterno = (JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[]);
        const allSolicitudesCPR = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[]);
        const allBriefings = (JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[]);

        const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
        const briefingsMap = new Map(allBriefings.map(b => [b.osId, b]));
        
        const partnerTurnos: TurnoConDetalles[] = [];

        allPersonalExterno.forEach(pedido => {
            if(pedido.status !== 'Solicitado') return;
            const os = osMap.get(pedido.osId);
            if (!os) return; 
            const briefing = briefingsMap.get(pedido.osId);
            (pedido.turnos || []).forEach(turno => {
                if (isAdminOrComercial || turno.proveedorId === impersonatedUser?.proveedorId) {
                    const hito = briefing?.items.find(h => new Date(h.fecha).toISOString().slice(0,10) === new Date(turno.fecha).toISOString().slice(0,10));
                    partnerTurnos.push({
                        ...turno, osId: pedido.osId, serviceNumber: os.serviceNumber, cliente: os.client,
                        fechaEvento: turno.fecha, lugarEntrega: hito?.sala || os.spaceAddress || 'No especificado'
                    });
                }
            });
        });
        
        allSolicitudesCPR.forEach(solicitud => {
             if (solicitud.estado !== 'Aprobada') return;
             if (isAdminOrComercial || solicitud.proveedorId === impersonatedUser?.proveedorId) {
                 partnerTurnos.push({
                    id: solicitud.id,
                    proveedorId: solicitud.proveedorId || '',
                    categoria: solicitud.categoria,
                    precioHora: solicitud.costeImputado ? solicitud.costeImputado / calculateHours(solicitud.horaInicio, solicitud.horaFin) : 0,
                    fecha: solicitud.fechaServicio,
                    horaEntrada: solicitud.horaInicio,
                    horaSalida: solicitud.horaFin,
                    solicitadoPor: 'Otro',
                    tipoServicio: 'Producción',
                    observaciones: solicitud.motivo,
                    statusPartner: 'Pendiente Asignación',
                    asignaciones: [],
                    osId: 'CPR',
                    serviceNumber: 'CPR',
                    cliente: 'Producción Interna',
                    fechaEvento: solicitud.fechaServicio,
                    lugarEntrega: 'CPR',
                    isCprRequest: true,
                    solicitudMotivo: solicitud.motivo,
                 });
             }
        });
        
        setTurnos(partnerTurnos);
        setIsMounted(true);
    }, [impersonatedUser, isAdminOrComercial]);
    
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
    
    const handleSaveAsignaciones = (turnoId: string, asignaciones: AsignacionPersonal[]) => {
        if(!impersonatedUser) return;
        
        let allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        let allSolicitudesCPR = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];

        let updated = false;

        for (let pedido of allPersonalExterno) {
            const turnoIndex = pedido.turnos.findIndex(t => t.id === turnoId);
            if (turnoIndex !== -1) {
                pedido.turnos[turnoIndex].asignaciones = asignaciones;
                if (asignaciones.length > 0 && asignaciones[0].nombre) {
                    pedido.turnos[turnoIndex].statusPartner = 'Gestionado';
                }
                updated = true;
                break;
            }
        }
        
        if (!updated) {
            const cprIndex = allSolicitudesCPR.findIndex(s => s.id === turnoId);
            if (cprIndex !== -1) {
                allSolicitudesCPR[cprIndex].personalAsignado = asignaciones.map(a => ({ idPersonal: a.dni || a.id, nombre: a.nombre }));
                allSolicitudesCPR[cprIndex].estado = 'Asignada';
                updated = true;
            }
        }

        if (updated) {
            localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
            localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allSolicitudesCPR));
            
            const turno = turnos.find(t => t.id === turnoId);
            if(turno) {
                 logActivity(impersonatedUser, 'Asignación de Personal', `Asignado ${asignaciones[0].nombre} a turno ${turno.categoria}`, turno.id);
            }
            
            loadData();
            toast({ title: 'Asignaciones guardadas' });
        }
    }

    const filteredTurnos = useMemo(() => {
        const today = startOfToday();
        return turnos.filter(t => {
            const statusMatch = showCompleted || t.statusPartner !== 'Gestionado';
            const deliveryDate = new Date(t.fechaEvento);

            const isPast = isBefore(deliveryDate, today);
            if (!showCompleted && isPast) {
                return false;
            }

            let dateMatch = true;
            if (dateRange?.from) {
                if (dateRange.to) {
                    dateMatch = isWithinInterval(deliveryDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                } else {
                    dateMatch = isSameDay(deliveryDate, dateRange.from);
                }
            }
            
            return statusMatch && dateMatch;
        });
    }, [turnos, showCompleted, dateRange]);


    const turnosAgrupadosPorDia = useMemo(() => {
        const groupedByDay: { [date: string]: { [location: string]: TurnoConDetalles[] } } = {};
        
        filteredTurnos.forEach(turno => {
            const dateKey = format(new Date(turno.fechaEvento), 'yyyy-MM-dd');
            if (!groupedByDay[dateKey]) {
                groupedByDay[dateKey] = {};
            }
            const locationKey = turno.lugarEntrega;
            if (!groupedByDay[dateKey][locationKey]) {
                groupedByDay[dateKey][locationKey] = [];
            }
            groupedByDay[dateKey][locationKey].push(turno);
        });

        return Object.entries(groupedByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, locations]) => {
                const allAccepted = Object.values(locations).flat().every(p => p.statusPartner === 'Gestionado');
                const earliestTime = Object.values(locations).flat().reduce((earliest, p) => p.horaEntrada < earliest ? p.horaEntrada : earliest, '23:59');
                
                const groupedByOS: { [key: string]: TurnoConDetalles[] } = {};
                Object.values(locations).flat().forEach(turno => {
                    const osKey = `${turno.osId}-${turno.serviceNumber}-${turno.cliente}`;
                    if(!groupedByOS[osKey]) {
                        groupedByOS[osKey] = [];
                    }
                    groupedByOS[osKey].push(turno);
                });

                const expediciones = Object.entries(groupedByOS).map(([key, turnos]) => ({
                    numero: turnos[0].serviceNumber,
                    cliente: turnos[0].cliente,
                    turnos: turnos.sort((a,b) => a.categoria.localeCompare(b.categoria)),
                })).sort((a,b) => a.numero.localeCompare(b.numero));


                return { date, expediciones, allAccepted, earliestTime };
            });
    }, [filteredTurnos]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

     const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: TurnoConDetalles[] } = {};
        turnos.forEach(event => {
            const dayKey = format(new Date(event.fechaEvento), 'yyyy-MM-dd');
            if (!grouped[dayKey]) grouped[dayKey] = [];
            grouped[dayKey].push(event);
        });
        return grouped;
    }, [turnos]);

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Partner de Personal..." />;
    }
    
    if(impersonatedUser?.roles?.includes('Partner Personal') && !impersonatedUser?.proveedorId) {
        return (
             <main className="container mx-auto px-4 py-16">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
                    <CardContent><p>Este usuario no está asociado a ningún partner de personal. Por favor, contacta con el administrador.</p></CardContent>
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
                    <TabsTrigger value="lista">Lista de Turnos</TabsTrigger>
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
                            <Label htmlFor="show-completed">Mostrar turnos gestionados</Label>
                        </div>
                    </div>
                    {turnosAgrupadosPorDia.length > 0 ? (
                         <Accordion type="multiple" className="w-full space-y-4">
                            {turnosAgrupadosPorDia.map(({ date, expediciones, allAccepted, earliestTime }) => (
                               <AccordionItem value={date} key={date} className="border-none">
                                <Card className={cn(allAccepted && 'bg-green-100/60')}>
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex items-center gap-3 w-full">
                                                {allAccepted ? <CheckCircle className="h-6 w-6 text-green-600"/> : <CalendarIcon className="h-6 w-6"/>}
                                                <div className="text-left">
                                                    <h3 className="text-xl font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                                    <p className="text-sm text-muted-foreground">{expediciones.flatMap(e => e.turnos).length} turnos requeridos</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="border-t px-4 pb-4 space-y-4">
                                                {expediciones.map(({numero, cliente, turnos}) => (
                                                    <div key={numero} className="pt-4">
                                                        <h4 className="font-bold mb-2">Pedido: <Badge>{numero}</Badge> <span className="text-muted-foreground">({cliente})</span></h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Categoría</TableHead>
                                                                    <TableHead>Horario</TableHead>
                                                                    <TableHead>Observaciones MICE</TableHead>
                                                                    <TableHead>Personal Asignado</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {turnos.map(turno => (
                                                                    <TableRow key={turno.id} className={cn("transition-colors", statusRowClass[turno.statusPartner])}>
                                                                        <TableCell className="font-semibold">{turno.categoria}</TableCell>
                                                                        <TableCell>{turno.horaEntrada} - {turno.horaSalida}</TableCell>
                                                                        <TableCell className="text-sm text-muted-foreground max-w-xs">{turno.observaciones}</TableCell>
                                                                        <TableCell>
                                                                            <AsignacionDialog turno={turno} onSave={handleSaveAsignaciones}>
                                                                                {turno.asignaciones && turno.asignaciones.length > 0 && turno.asignaciones[0].nombre ? (
                                                                                    <Button variant="link" className="p-0 h-auto font-semibold">
                                                                                        {turno.asignaciones[0].nombre}
                                                                                    </Button>
                                                                                ) : (
                                                                                    <Button variant="default" size="sm" disabled={isReadOnly}>
                                                                                        Gestionar
                                                                                    </Button>
                                                                                )}
                                                                            </AsignacionDialog>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
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
                                <p className="mt-1 text-sm text-muted-foreground">No hay turnos de personal pendientes que coincidan con los filtros.</p>
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
                                        onClick={() => dayEvents.length > 0 && setDayDetails({ day, events: dayEvents })}
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
                    <DialogTitle>Turnos para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                    {dayDetails && dayDetails.events.map((event) => (
                        <div key={event.id} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{event.categoria}</p>
                            <p>Pedido: {event.serviceNumber} ({event.cliente})</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span><span className="font-semibold">Horario:</span> {event.horaEntrada} - {event.horaSalida}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
        </TooltipProvider>
    );
}

```
- src/lib/fonts.ts:
```ts
import { Open_Sans, Roboto } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});
```
- src/app/layout.tsx:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { openSans, roboto } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'MICE Catering',
  description: 'Soluciones de alquiler para tus eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          openSans.variable,
          roboto.variable
        )}
      >
        <ImpersonatedUserProvider>
          <NProgressProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              {children}
            </div>
          </NProgressProvider>
        </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
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
import { formatCurrency, calculateHours } from '@/lib/utils';


const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  centroCoste: z.enum(centroCosteOptions),
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

export default function PersonalMicePage() {
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
        centroCoste: 'SALA',
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
            <div className="flex items-start justify-end mb-4">
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
                    <AccordionTrigger className="p-4">
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
- src/lib/fonts.ts:
```ts
import { Open_Sans, Roboto } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});
```
- src/app/layout.tsx:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { openSans, roboto } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'MICE Catering',
  description: 'Soluciones de alquiler para tus eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          openSans.variable,
          roboto.variable
        )}
      >
        <ImpersonatedUserProvider>
          <NProgressProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              {children}
            </div>
          </NProgressProvider>
        </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
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
import { calculateHours, formatCurrency } from '@/lib/utils';


const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  centroCoste: z.enum(centroCosteOptions),
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

export default function PersonalMicePage() {
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
        centroCoste: 'SALA',
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
            <div className="flex items-start justify-end mb-4">
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
                    <AccordionTrigger className="p-4">
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
- src/app/pes/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ClipboardList, Package, Star } from 'lucide-react';
import type { ServiceOrder } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PrevisionServiciosPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    let storedOrders = localStorage.getItem('serviceOrders');
    setServiceOrders(storedOrders ? JSON.parse(storedOrders) : []);
    setIsMounted(true);
  }, []);

  const availableMonths = useMemo(() => {
    if (!serviceOrders) return ['all'];
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return ['all', ...Array.from(months).sort().reverse()];
  }, [serviceOrders]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const cateringOrders = serviceOrders.filter(os => os.vertical !== 'Entregas');

    const filtered = cateringOrders.filter(os => {
      const searchMatch = searchTerm.trim() === '' || os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || os.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const osMonth = format(new Date(os.startDate), 'yyyy-MM');
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(os.endDate), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }

      const statusMatch = statusFilter === 'all' || os.status === statusFilter;

      return searchMatch && monthMatch && pastEventMatch && statusMatch;
    });

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents, statusFilter]);
  
  const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
    Borrador: 'secondary',
    Pendiente: 'destructive',
    Confirmado: 'default',
    Anulado: 'destructive'
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Previsión de Servicios..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ClipboardList />Previsión de Servicios de Catering</h1>
        <Button asChild>
          <Link href="/os/nuevo/info">
            <PlusCircle className="mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

       <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <Input
                    placeholder="Buscar por Nº de Servicio o Cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filtrar por mes" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                        {month === 'all' ? 'Todos' : format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                    <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mostrar eventos finalizados
                    </label>
            </div>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado:</span>
                <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todos</Button>
                <Button size="sm" variant={statusFilter === 'Borrador' ? 'default' : 'outline'} onClick={() => setStatusFilter('Borrador')}>Borrador</Button>
                <Button size="sm" variant={statusFilter === 'Pendiente' ? 'default' : 'outline'} onClick={() => setStatusFilter('Pendiente')}>Pendiente</Button>
                <Button size="sm" variant={statusFilter === 'Confirmado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Confirmado')}>Confirmado</Button>
                <Button size="sm" variant={statusFilter === 'Anulado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Anulado')}>Anulado</Button>
            </div>
      </div>

       <div className="border rounded-lg">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Nº Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Espacio</TableHead>
                  <TableHead>Asistentes</TableHead>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Estado</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {filteredAndSortedOrders.length > 0 ? (
                  filteredAndSortedOrders.map(os => (
                  <TableRow key={os.id} onClick={() => router.push(`/os/${os.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium flex items-center gap-2">
                        {os.isVip && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Star className="h-4 w-4 text-amber-500 fill-amber-500"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Evento VIP</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {os.serviceNumber}
                      </TableCell>
                      <TableCell>{os.client}</TableCell>
                      <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{os.space}</TableCell>
                      <TableCell>{os.asistentes}</TableCell>
                      <TableCell>{os.comercial}</TableCell>
                      <TableCell>
                      <Badge variant={statusVariant[os.status]}>
                          {os.status}
                      </Badge>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                      No hay órdenes de servicio que coincidan con los filtros.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
    </main>
  );
}
```
- src/app/rrhh/layout.tsx:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Users, Menu, ChevronRight } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { rrhhNav } from '@/lib/rrhh-nav';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Users/>Recursos Humanos</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {rrhhNav.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function RrhhLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const currentPage = rrhhNav.find(item => pathname.startsWith(item.href));

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/rrhh" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <Users className="h-5 w-5"/>
                            <span>Recursos Humanos</span>
                        </Link>
                        {currentPage && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="py-8 container mx-auto">
                {children}
            </div>
        </>
    );
}
```
- src/app/rrhh/page.tsx:
```tsx
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { rrhhNav } from '@/lib/rrhh-nav';

export default function RrhhDashboardPage() {
  return (
    <main>
        <div className="mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-lg text-muted-foreground mt-2">Gestiona las necesidades de personal, las bases de datos de trabajadores y analiza la productividad.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rrhhNav.map(item => (
                <Link href={item.href} key={item.href}>
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><item.icon />{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </main>
  );
}
```
- src/app/rrhh/solicitudes-cpr/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the unified requests page.
export default function SolicitudesCprRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/rrhh/solicitudes');
    }, [router]);
    return null;
}
```
- src/lib/rrhh-nav.ts:
```ts
'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
```
- src/app/cpr/solicitud-personal/nueva/page.tsx:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { SolicitudPersonalCPR } from '@/types';
import { PARTIDAS_PRODUCCION } from '@/types';
import { Save, ArrowLeft, Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fechaServicio: z.date({ required_error: "La fecha es obligatoria." }),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  partida: z.enum(PARTIDAS_PRODUCCION),
  categoria: z.string().min(1, "La categoría es obligatoria."),
  cantidad: z.coerce.number().min(1, "Debe solicitar al menos 1 persona."),
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

const categoriasComunes = ["Cocinero/a", "Ayudante de Cocina", "Pastelero/a", "Mozo/a Almacén"];

export default function NuevaSolicitudPersonalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            horaInicio: '08:00',
            horaFin: '16:00',
            partida: 'FRIO',
            cantidad: 1,
            fechaServicio: new Date(),
        }
    });

    const onSubmit = (data: FormValues) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear la solicitud sin un usuario identificado.' });
            return;
        }

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        
        for (let i = 0; i < data.cantidad; i++) {
            const newRequest: SolicitudPersonalCPR = {
                id: `REQ-CPR-${Date.now()}-${i}`,
                fechaSolicitud: new Date().toISOString(),
                solicitadoPor: impersonatedUser.nombre,
                ...data,
                cantidad: 1, // Each request is for 1 person
                fechaServicio: format(data.fechaServicio, 'yyyy-MM-dd'),
                estado: 'Pendiente',
            };
            allRequests.push(newRequest);
        }

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));

        toast({ title: "Solicitud Enviada", description: `${data.cantidad} solicitud(es) de personal han sido enviadas a RRHH.`});
        router.push('/cpr/solicitud-personal');
    };

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                 <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2" /> Volver
                </Button>
                <h1 className="text-xl font-headline font-bold flex items-center gap-3"><UserPlus />Nueva Solicitud de Personal de Apoyo para CPR</h1>
                <div></div>
            </div>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Necesidad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="fechaServicio" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Fecha del Servicio</FormLabel>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={field.value} 
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setIsCalendarOpen(false);
                                                    }} 
                                                    initialFocus 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="horaInicio" render={({ field }) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                                <FormField control={form.control} name="horaFin" render={({ field }) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                            </div>
                             <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="partida" render={({ field }) => (
                                    <FormItem><FormLabel>Partida</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{PARTIDAS_PRODUCCION.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="categoria" render={({ field }) => (
                                    <FormItem><FormLabel>Categoría/Puesto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{categoriasComunes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="cantidad" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Personas</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage/></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="motivo" render={({ field }) => (
                                <FormItem><FormLabel>Motivo de la Solicitud</FormLabel><FormControl><Textarea {...field} placeholder="Ej: Apoyo para producción evento OS-2024-123..."/></FormControl><FormMessage/></FormItem>
                            )} />
                             <div className="flex justify-end pt-4">
                                <Button type="submit"><Save className="mr-2"/> Enviar Solicitud a RRHH</Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
```
- src/app/cpr/solicitud-personal/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor } from '@/types';
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
import { calculateHours, formatNumber } from '@/lib/utils';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Pendiente': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Solicitada Cancelacion': 'destructive'
};

export default function SolicitudPersonalCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedData);
    
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(storedProveedores.map(p => [p.id, p.nombreComercial])));

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

  const handleActionClick = (solicitud: SolicitudPersonalCPR, action: 'delete' | 'cancel') => {
    setSolicitudToManage(solicitud);
    setManagementAction(action);
  };
  
  const confirmAction = () => {
    if (!solicitudToManage || !managementAction) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];

    if (managementAction === 'delete') {
        const updatedRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updatedRequests));
        setSolicitudes(updatedRequests);
        toast({ title: 'Solicitud Eliminada' });
    } else if (managementAction === 'cancel') {
        const index = allRequests.findIndex(r => r.id === solicitudToManage.id);
        if (index > -1) {
            allRequests[index].estado = 'Solicitada Cancelacion';
            localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
            setSolicitudes(allRequests);
            toast({ title: 'Cancelación Solicitada', description: 'RRHH ha sido notificado para confirmar la cancelación.' });
        }
    }
    setSolicitudToManage(null);
    setManagementAction(null);
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
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                        const canCancel = s.estado === 'Asignada' && !isBefore(new Date(s.fechaServicio), startOfToday());
                        const canDelete = s.estado === 'Pendiente' || s.estado === 'Aprobada';
                        
                        return (
                        <TableRow key={s.id}>
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge variant="outline">{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
                            <TableCell>{proveedoresMap.get(s.proveedorId || '') || '-'}</TableCell>
                            <TableCell className="text-right">
                                {canDelete && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'delete')}><Trash2 className="mr-2 h-4 w-4"/>Borrar</Button>}
                                {canCancel && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'cancel')}><Trash2 className="mr-2 h-4 w-4"/>Solicitar Cancelación</Button>}
                                {s.estado === 'Solicitada Cancelacion' && <Badge variant="destructive">Pendiente RRHH</Badge>}
                            </TableCell>
                        </TableRow>
                    )}) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">No has realizado ninguna solicitud.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
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
                <AlertDialogAction onClick={confirmAction}>Sí, continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```
- src/lib/rrhh-nav.ts:
```ts
'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
```
- src/app/cpr/solicitud-personal/nueva/page.tsx:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { SolicitudPersonalCPR } from '@/types';
import { PARTIDAS_PRODUCCION } from '@/types';
import { Save, ArrowLeft, Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fechaServicio: z.date({ required_error: "La fecha es obligatoria." }),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  partida: z.enum(PARTIDAS_PRODUCCION),
  categoria: z.string().min(1, "La categoría es obligatoria."),
  cantidad: z.coerce.number().min(1, "Debe solicitar al menos 1 persona."),
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

const categoriasComunes = ["Cocinero/a", "Ayudante de Cocina", "Pastelero/a", "Mozo/a Almacén"];

export default function NuevaSolicitudPersonalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            horaInicio: '08:00',
            horaFin: '16:00',
            partida: 'FRIO',
            cantidad: 1,
            fechaServicio: new Date(),
        }
    });

    const onSubmit = (data: FormValues) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear la solicitud sin un usuario identificado.' });
            return;
        }

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        
        for (let i = 0; i < data.cantidad; i++) {
            const newRequest: SolicitudPersonalCPR = {
                id: `REQ-CPR-${Date.now()}-${i}`,
                fechaSolicitud: new Date().toISOString(),
                solicitadoPor: impersonatedUser.nombre,
                ...data,
                cantidad: 1, // Each request is for 1 person
                fechaServicio: format(data.fechaServicio, 'yyyy-MM-dd'),
                estado: 'Pendiente',
            };
            allRequests.push(newRequest);
        }

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));

        toast({ title: "Solicitud Enviada", description: `${data.cantidad} solicitud(es) de personal han sido enviadas a RRHH.`});
        router.push('/cpr/solicitud-personal');
    };

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                 <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2" /> Volver
                </Button>
                <h1 className="text-xl font-headline font-bold flex items-center gap-3"><UserPlus />Nueva Solicitud de Personal de Apoyo para CPR</h1>
                <div></div>
            </div>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Necesidad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="fechaServicio" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Fecha del Servicio</FormLabel>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={field.value} 
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setIsCalendarOpen(false);
                                                    }} 
                                                    initialFocus 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="horaInicio" render={({ field }) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                                <FormField control={form.control} name="horaFin" render={({ field }) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                            </div>
                             <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="partida" render={({ field }) => (
                                    <FormItem><FormLabel>Partida</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{PARTIDAS_PRODUCCION.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="categoria" render={({ field }) => (
                                    <FormItem><FormLabel>Categoría/Puesto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{categoriasComunes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="cantidad" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Personas</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage/></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="motivo" render={({ field }) => (
                                <FormItem><FormLabel>Motivo de la Solicitud</FormLabel><FormControl><Textarea {...field} placeholder="Ej: Apoyo para producción evento OS-2024-123..."/></FormControl><FormMessage/></FormItem>
                            )} />
                             <div className="flex justify-end pt-4">
                                <Button type="submit"><Save className="mr-2"/> Enviar Solicitud a RRHH</Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
```
- src/app/cpr/solicitud-personal/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor } from '@/types';
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
import { calculateHours, formatNumber } from '@/lib/utils';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Pendiente': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Solicitada Cancelacion': 'destructive'
};

export default function SolicitudPersonalCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedData);
    
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(storedProveedores.map(p => [p.id, p.nombreComercial])));

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

  const handleActionClick = (solicitud: SolicitudPersonalCPR, action: 'delete' | 'cancel') => {
    setSolicitudToManage(solicitud);
    setManagementAction(action);
  };
  
  const confirmAction = () => {
    if (!solicitudToManage || !managementAction) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];

    if (managementAction === 'delete') {
        const updatedRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updatedRequests));
        setSolicitudes(updatedRequests);
        toast({ title: 'Solicitud Eliminada' });
    } else if (managementAction === 'cancel') {
        const index = allRequests.findIndex(r => r.id === solicitudToManage.id);
        if (index > -1) {
            allRequests[index].estado = 'Solicitada Cancelacion';
            localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
            setSolicitudes(allRequests);
            toast({ title: 'Cancelación Solicitada', description: 'RRHH ha sido notificado para confirmar la cancelación.' });
        }
    }
    setSolicitudToManage(null);
    setManagementAction(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div></div>
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
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                        const canCancel = s.estado === 'Asignada' && !isBefore(new Date(s.fechaServicio), startOfToday());
                        const canDelete = s.estado === 'Pendiente' || s.estado === 'Aprobada';
                        
                        return (
                        <TableRow key={s.id}>
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge variant="outline">{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
                            <TableCell>{proveedoresMap.get(s.proveedorId || '') || '-'}</TableCell>
                            <TableCell className="text-right">
                                {canDelete && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'delete')}><Trash2 className="mr-2 h-4 w-4"/>Borrar</Button>}
                                {canCancel && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'cancel')}><Trash2 className="mr-2 h-4 w-4"/>Solicitar Cancelación</Button>}
                                {s.estado === 'Solicitada Cancelacion' && <Badge variant="destructive">Pendiente RRHH</Badge>}
                            </TableCell>
                        </TableRow>
                    )}) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">No has realizado ninguna solicitud.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
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
                <AlertDialogAction onClick={confirmAction}>Sí, continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```
- src/lib/rrhh-nav.ts:
```ts
'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
```
- src/app/cpr/solicitud-personal/nueva/page.tsx:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { SolicitudPersonalCPR } from '@/types';
import { PARTIDAS_PRODUCCION } from '@/types';
import { Save, ArrowLeft, Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fechaServicio: z.date({ required_error: "La fecha es obligatoria." }),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  partida: z.enum(PARTIDAS_PRODUCCION),
  categoria: z.string().min(1, "La categoría es obligatoria."),
  cantidad: z.coerce.number().min(1, "Debe solicitar al menos 1 persona."),
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

const categoriasComunes = ["Cocinero/a", "Ayudante de Cocina", "Pastelero/a", "Mozo/a Almacén"];

export default function NuevaSolicitudPersonalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            horaInicio: '08:00',
            horaFin: '16:00',
            partida: 'FRIO',
            cantidad: 1,
            fechaServicio: new Date(),
        }
    });

    const onSubmit = (data: FormValues) => {
        if (!impersonatedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear la solicitud sin un usuario identificado.' });
            return;
        }

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        
        for (let i = 0; i < data.cantidad; i++) {
            const newRequest: SolicitudPersonalCPR = {
                id: `REQ-CPR-${Date.now()}-${i}`,
                fechaSolicitud: new Date().toISOString(),
                solicitadoPor: impersonatedUser.nombre,
                ...data,
                cantidad: 1, // Each request is for 1 person
                fechaServicio: format(data.fechaServicio, 'yyyy-MM-dd'),
                estado: 'Pendiente',
            };
            allRequests.push(newRequest);
        }

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));

        toast({ title: "Solicitud Enviada", description: `${data.cantidad} solicitud(es) de personal han sido enviadas a RRHH.`});
        router.push('/cpr/solicitud-personal');
    };

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                 <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2" /> Volver
                </Button>
                <h1 className="text-xl font-headline font-bold flex items-center gap-3"><UserPlus />Nueva Solicitud de Personal de Apoyo para CPR</h1>
                <div></div>
            </div>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Necesidad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="fechaServicio" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Fecha del Servicio</FormLabel>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={field.value} 
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setIsCalendarOpen(false);
                                                    }} 
                                                    initialFocus 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="horaInicio" render={({ field }) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                                <FormField control={form.control} name="horaFin" render={({ field }) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                            </div>
                             <div className="grid md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="partida" render={({ field }) => (
                                    <FormItem><FormLabel>Partida</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{PARTIDAS_PRODUCCION.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="categoria" render={({ field }) => (
                                    <FormItem><FormLabel>Categoría/Puesto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent>{categoriasComunes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                )} />
                                <FormField control={form.control} name="cantidad" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Personas</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage/></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="motivo" render={({ field }) => (
                                <FormItem><FormLabel>Motivo de la Solicitud</FormLabel><FormControl><Textarea {...field} placeholder="Ej: Apoyo para producción evento OS-2024-123..."/></FormControl><FormMessage/></FormItem>
                            )} />
                             <div className="flex justify-end pt-4">
                                <Button type="submit"><Save className="mr-2"/> Enviar Solicitud a RRHH</Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
```
- src/app/cpr/solicitud-personal/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor } from '@/types';
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
import { calculateHours, formatNumber } from '@/lib/utils';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Pendiente': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Solicitada Cancelacion': 'destructive'
};

export default function SolicitudPersonalCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedData);
    
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(storedProveedores.map(p => [p.id, p.nombreComercial])));

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

  const handleActionClick = (solicitud: SolicitudPersonalCPR, action: 'delete' | 'cancel') => {
    setSolicitudToManage(solicitud);
    setManagementAction(action);
  };
  
  const confirmAction = () => {
    if (!solicitudToManage || !managementAction) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];

    if (managementAction === 'delete') {
        const updatedRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updatedRequests));
        setSolicitudes(updatedRequests);
        toast({ title: 'Solicitud Eliminada' });
    } else if (managementAction === 'cancel') {
        const index = allRequests.findIndex(r => r.id === solicitudToManage.id);
        if (index > -1) {
            allRequests[index].estado = 'Solicitada Cancelacion';
            localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
            setSolicitudes(allRequests);
            toast({ title: 'Cancelación Solicitada', description: 'RRHH ha sido notificado para confirmar la cancelación.' });
        }
    }
    setSolicitudToManage(null);
    setManagementAction(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <div></div>
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
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado a</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                        const canCancel = s.estado === 'Asignada' && !isBefore(new Date(s.fechaServicio), startOfToday());
                        const canDelete = s.estado === 'Pendiente' || s.estado === 'Aprobada';
                        
                        return (
                        <TableRow key={s.id}>
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge variant="outline">{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado]}>{s.estado}</Badge></TableCell>
                            <TableCell>{proveedoresMap.get(s.proveedorId || '') || '-'}</TableCell>
                            <TableCell className="text-right">
                                {canDelete && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'delete')}><Trash2 className="mr-2 h-4 w-4"/>Borrar</Button>}
                                {canCancel && <Button variant="destructive" size="sm" onClick={() => handleActionClick(s, 'cancel')}><Trash2 className="mr-2 h-4 w-4"/>Solicitar Cancelación</Button>}
                                {s.estado === 'Solicitada Cancelacion' && <Badge variant="destructive">Pendiente RRHH</Badge>}
                            </TableCell>
                        </TableRow>
                    )}) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">No has realizado ninguna solicitud.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!solicitudToManage} onOpenChange={() => setSolicitudToManage(null)}>
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
                <AlertDialogAction onClick={confirmAction}>Sí, continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```
- src/lib/rrhh-nav.ts:
```ts
'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
```
- src/app/rrhh/solicitudes-cpr/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the unified requests page.
export default function SolicitudesCprRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/rrhh/solicitudes');
    }, [router]);
    return null;
}
```