
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, Users, ArrowLeft, ChevronLeft, ChevronRight, Edit, MessageSquare, Pencil, PlusCircle, RefreshCw, Send, Trash2, AlertTriangle, Printer, FileText, Upload } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday, isWithinInterval, endOfDay, add, sub, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

import type { PersonalExterno, PersonalExternoTurno, AsignacionPersonal, ServiceOrder, ComercialBriefing, PersonalExternoDB, PortalUser, Proveedor, SolicitudPersonalCPR, EstadoPersonalExterno, EstadoSolicitudPersonalCPR, ComercialBriefingItem } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '../activity-log/utils';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Helper Components ---

function AsignacionDialog({ turno, onSave, isCprRequest }: { turno: PersonalExternoTurno | SolicitudPersonalCPR; onSave: (turnoId: string, asignaciones: AsignacionPersonal[], isCpr: boolean) => void; isCprRequest: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignaciones, setAsignaciones] = useState<Partial<AsignacionPersonal>[]>([]);
    const [personalOptions, setPersonalOptions] = useState<{ label: string, value: string }[]>([]);

    const { impersonatedUser } = useImpersonatedUser();
    
    const turnoProveedorId = isCprRequest ? (turno as SolicitudPersonalCPR).proveedorId : (turno as PersonalExternoTurno).proveedorId;

    useEffect(() => {
        if (isOpen) {
            const allPersonalDB = (JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[])
                .filter(p => p.proveedorId === turnoProveedorId);

            setPersonalOptions(allPersonalDB.map(p => ({ label: p.nombreCompleto, value: p.id })));
            
            const existingAsignaciones = 'asignaciones' in turno ? turno.asignaciones : ('personalAsignado' in turno ? turno.personalAsignado : []);
            const cantidad = (turno as any).cantidad || 1;

            const initialAsignaciones = Array.from({ length: cantidad }).map((_, i) => {
                const existing = existingAsignaciones?.[i];
                if (existing) {
                    if ('idPersonal' in existing) { // CPR request structure
                        const personalInfo = allPersonalDB.find(p => p.id === existing.idPersonal);
                        return { id: existing.idPersonal, nombre: existing.nombre, dni: personalInfo?.id, telefono: personalInfo?.telefono, email: personalInfo?.email };
                    }
                    return { ...existing }; // Event request structure
                }
                return { id: `${turno.id}-${i}-${Date.now()}` };
            });
            setAsignaciones(initialAsignaciones);
        }
    }, [isOpen, turno, turnoProveedorId]);

    const handleSelectPersonal = (index: number, personalId: string) => {
        const allPersonalDB = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        const personal = allPersonalDB.find(p => p.id === personalId);
        if (personal) {
            const newAsignaciones = [...asignaciones];
            newAsignaciones[index] = {
                ...newAsignaciones[index],
                id: personal.id,
                idPersonal: personal.id, // For CPR compatibility
                nombre: personal.nombreCompleto,
                dni: personal.id,
                telefono: personal.telefono || '',
                email: personal.email || ''
            };
            setAsignaciones(newAsignaciones);
        }
    };
    
    const handleSave = () => {
        const fullAsignaciones = asignaciones.filter(a => a.id && a.nombre) as AsignacionPersonal[];
        onSave(turno.id, fullAsignaciones, isCprRequest);
        setIsOpen(false);
    };

    const numRequired = (turno as any).cantidad || 1;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    {('statusPartner' in turno && turno.statusPartner === 'Gestionado') || ('estado' in turno && (turno as SolicitudPersonalCPR).estado === 'Asignada') ? 'Ver/Editar' : 'Asignar Personal'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Asignar Personal para Turno</DialogTitle>
                    <DialogDescription>
                        {turno.categoria} - {format(new Date('fecha' in turno ? turno.fecha : turno.fechaServicio), 'PPP', { locale: es })} de {turno.horaInicio} a {turno.horaFin}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº</TableHead>
                                <TableHead className="w-1/3">Trabajador</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Comentarios</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: numRequired }).map((_, index) => {
                                const asignacion = asignaciones[index] || {};
                                return (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Combobox
                                            options={personalOptions}
                                            value={asignacion.id || ''}
                                            onChange={(value) => handleSelectPersonal(index, value)}
                                            placeholder="Buscar trabajador..."
                                        />
                                    </TableCell>
                                    <TableCell>{asignacion.dni || '-'}</TableCell>
                                    <TableCell>{asignacion.telefono || '-'}</TableCell>
                                    <TableCell>
                                        <Textarea
                                            value={asignacion.comentarios || ''}
                                            onChange={(e) => {
                                                const newAsignaciones = [...asignaciones];
                                                if (!newAsignaciones[index]) newAsignaciones[index] = {};
                                                newAsignaciones[index].comentarios = e.target.value;
                                                setAsignaciones(newAsignaciones);
                                            }}
                                            rows={1}
                                            className="text-xs"
                                        />
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Asignaciones</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Page Component ---
type UnifiedRequest = (PersonalExternoTurno & { osId: string; type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });
type DayDetails = { day: Date; events: (UnifiedRequest & { os?: ServiceOrder | { id: string; serviceNumber: string; client: string; space: string; } })[] } | null;

export default function PortalPersonalPage() {
    const [pedidos, setPedidos] = useState<(PersonalExterno | SolicitudPersonalCPR)[]>([]);
    const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
    const [briefings, setBriefings] = useState<Map<string, ComercialBriefing>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();
    const router = useRouter();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
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
            ? allPersonalExterno.map(p => ({
                ...p,
                turnos: p.turnos.filter(t => t.proveedorId === proveedorId)
              })).filter(p => p.turnos.length > 0)
            : allPersonalExterno;
        
        const filteredSolicitudesCPR = proveedorId 
            ? allSolicitudesCPR.filter(s => s.proveedorId === proveedorId) 
            : allSolicitudesCPR;
        
        setPedidos([...filteredPedidos, ...filteredSolicitudesCPR]);

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        setServiceOrders(new Map(allServiceOrders.map(os => [os.id, os])));

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
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
             const fechaServicio = new Date('turnos' in p ? p.turnos[0]?.fecha : p.fechaServicio);
             const isPast = isBefore(fechaServicio, today);
             if (!showCompleted && isPast) {
                 return false;
             }

             let dateMatch = true;
             if (dateRange?.from) {
                 if (dateRange.to) {
                     dateMatch = isWithinInterval(fechaServicio, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                 } else {
                     dateMatch = isSameDay(fechaServicio, dateRange.from);
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
                const fechaServicio = new Date('fecha' in turno ? turno.fecha : turno.fechaServicio);

                const dateKey = format(fechaServicio, 'yyyy-MM-dd');
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

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

     const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: UnifiedRequest[] } = {};
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

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Personal..." />;
    }
    
     if (impersonatedUser?.roles.includes('Partner Personal') && !proveedorId) {
        return (
             <main className="container mx-auto px-4 py-16">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
                    <CardContent><p>Este usuario no está asociado a ningún proveedor de personal. Por favor, contacta con el administrador.</p></CardContent>
                </Card>
            </main>
        );
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
                    <TabsTrigger value="lista">Lista de Turnos</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="lista" className="mt-6">
                     <div className="flex items-center space-x-4 mb-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
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
                                            <div className="px-4 pb-4 space-y-4">
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
