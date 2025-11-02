
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
  'Gestionado': 'bg-green-100/60 hover:bg-green-100/80',
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
    const { impersonatedUser } = useImpersonatedUser();
    const [proveedorNombre, setProveedorNombre] = useState('');
    const router = useRouter();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

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
```