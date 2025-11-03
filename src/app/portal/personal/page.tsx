
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, Users, ArrowLeft, ChevronLeft, ChevronRight, Edit, MessageSquare, Pencil, PlusCircle, RefreshCw, Send, Trash2, AlertTriangle, Printer, FileText, Upload, Phone, Save, Loader2, MapPin } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, FormProvider } from 'react-hook-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { calculateHours, formatCurrency, formatDuration, formatNumber } from '@/lib/utils';
import type { PersonalExterno, SolicitudPersonalCPR, AsignacionPersonal, EstadoSolicitudPersonalCPR, ComercialBriefingItem, Personal, PersonalExternoDB, Proveedor, PersonalExternoTurno, ServiceOrder, CategoriaPersonal } from '@/types';
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
import { useAssignablePersonal } from '@/hooks/use-assignable-personal';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from '@/components/ui/separator';

type UnifiedTurno = (PersonalExternoTurno & { type: 'EVENTO'; osId: string; estado: PersonalExterno['status']; osNumber?: string; cliente?: string; costeEstimado: number; horario: string; horas: number; isCprRequest: false; }) | (SolicitudPersonalCPR & { type: 'CPR'; osNumber?: string; cliente?: string; costeEstimado: number; horario: string; horas: number; isCprRequest: true; });


type DayDetails = {
    day: Date;
    events: UnifiedTurno[];
} | null;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const statusVariant: { [key in UnifiedTurno['estado']]: 'success' | 'secondary' | 'warning' | 'destructive' | 'outline' | 'default'} = {
  'Pendiente': 'warning',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Solicitado': 'outline',
  'Asignado': 'default',
  'Cerrado': 'default',
  'Solicitada Cancelacion': 'destructive',
  'Confirmado': 'success',
  'Gestionado': 'success',
};

const nuevoTrabajadorSchema = z.object({
  id: z.string().min(1, 'El DNI/ID es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatororio'),
  apellido2: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
});
type NuevoTrabajadorFormValues = z.infer<typeof nuevoTrabajadorSchema>;


function NuevoTrabajadorDialog({ onWorkerCreated }: { onWorkerCreated: (worker: PersonalExternoDB) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();

    const form = useForm<NuevoTrabajadorFormValues>({
        resolver: zodResolver(nuevoTrabajadorSchema),
        defaultValues: { id: '', nombre: '', apellido1: '', apellido2: '', telefono: '', email: '' }
    });

    const onSubmit = (data: NuevoTrabajadorFormValues) => {
        const allWorkers = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        if (allWorkers.some(w => w.id.toLowerCase() === data.id.toLowerCase())) {
            form.setError('id', { message: 'Este DNI/ID ya existe.'});
            return;
        }

        const newWorker: PersonalExternoDB = {
            ...data,
            proveedorId: impersonatedUser?.proveedorId || '',
            nombreCompleto: `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim(),
            nombreCompacto: `${data.nombre} ${data.apellido1}`,
        };
        
        allWorkers.push(newWorker);
        localStorage.setItem('personalExternoDB', JSON.stringify(allWorkers));
        onWorkerCreated(newWorker);
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start mt-2"><PlusCircle className="mr-2"/>Crear Nuevo Trabajador</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Trabajador</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="id" render={({field}) => <FormItem><FormLabel>DNI / ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="nombre" render={({field}) => <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                            <FormField control={form.control} name="apellido1" render={({field}) => <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        </div>
                         <FormField control={form.control} name="apellido2" render={({field}) => <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        <FormField control={form.control} name="telefono" render={({field}) => <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>}/>
                        <FormField control={form.control} name="email" render={({field}) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button type="submit">Crear y Seleccionar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function AsignacionDialog({ turno, onSave, isReadOnly }: { turno: UnifiedTurno, onSave: (turnoId: string, asignacion: AsignacionPersonal, isCpr: boolean) => void, isReadOnly: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const { assignableWorkers, isLoading: isLoadingWorkers, refresh } = useAssignablePersonal(turno);
    
    const initialAsignacion = useMemo(() => {
        if (!turno) return null;
        const asignaciones = turno.isCprRequest ? (turno as SolicitudPersonalCPR).personalAsignado : (turno as PersonalExternoTurno).asignaciones;
        if (asignaciones && asignaciones.length > 0) {
            const firstAsignacion = asignaciones[0];
            return {
                id: 'idPersonal' in firstAsignacion ? firstAsignacion.idPersonal : firstAsignacion.id,
                label: firstAsignacion.nombre
            };
        }
        return null;
    }, [turno]);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>(initialAsignacion?.id || '');

    useEffect(() => {
        if (isOpen) {
            refresh();
            setSelectedWorkerId(initialAsignacion?.id || '');
        }
    }, [isOpen, refresh, initialAsignacion]);

    const handleSave = () => {
        const worker = assignableWorkers.find(w => w.value === selectedWorkerId);
        if (worker) {
            const asignacionData = {
                id: worker.value,
                nombre: worker.label,
            };
            onSave(turno.id, asignacionData, turno.type === 'CPR');
            setIsOpen(false);
        }
    };
    
    const handleWorkerCreated = (newWorker: PersonalExternoDB) => {
        refresh();
        setSelectedWorkerId(newWorker.id);
    };

    const workerDetails = useMemo(() => {
        const allPersonalExternoDB = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        return allPersonalExternoDB.find(w => w.id === selectedWorkerId);
    }, [selectedWorkerId]);

    const buttonLabel = selectedWorkerId ? (assignableWorkers.find(w => w.value === selectedWorkerId)?.label || initialAsignacion?.label || "Asignar Personal") : "Asignar Personal";
    const buttonIcon = selectedWorkerId ? <Pencil className="mr-2 h-4 w-4"/> : <Users className="mr-2 h-4 w-4"/>;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant={selectedWorkerId ? "outline" : "secondary"} size="sm" className="w-full justify-start font-semibold">
                {buttonIcon}
                <span className="truncate">{buttonLabel}</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Asignar Personal para {turno.categoria}</DialogTitle>
          </DialogHeader>
          {isLoadingWorkers ? <p>Cargando trabajadores...</p> : (
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Trabajador</Label>
                     <Combobox 
                        options={assignableWorkers}
                        value={selectedWorkerId}
                        onChange={setSelectedWorkerId}
                        placeholder="Buscar por nombre o DNI..."
                     />
                     {!isReadOnly && <NuevoTrabajadorDialog onWorkerCreated={handleWorkerCreated}/>}
                </div>
                {workerDetails && (
                    <Card className="bg-secondary/50">
                        <CardContent className="p-3 text-sm">
                            <div className="flex justify-between">
                                <p className="font-bold">{workerDetails.nombreCompleto}</p>
                                <p className="text-muted-foreground">{workerDetails.id}</p>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <p className="flex items-center gap-2"><Phone className="h-3 w-3"/>{workerDetails.telefono || '-'}</p>
                                <p>{workerDetails.email || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!selectedWorkerId || isReadOnly}>Guardar Asignación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
}

export default function PortalPersonalPage() {
    const [pedidos, setPedidos] = useState<UnifiedTurno[]>([]);
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
        
        const allTiposPersonal = (JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]);

        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const filteredPedidosEventos = allPersonalExterno.map(p => ({
            ...p,
            turnos: p.turnos.filter(t => {
                const tipo = allTiposPersonal.find(tp => tp.id === t.proveedorId);
                return isAdminOrComercial || tipo?.proveedorId === proveedorId;
            })
        })).filter(p => p.turnos.length > 0);

        const allSolicitudesCPR = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[]);
        const filteredSolicitudesCPR = allSolicitudesCPR.filter(s => {
            if (s.estado === 'Rechazada') return false;
            const tipo = allTiposPersonal.find(t => t.id === s.proveedorId);
            return isAdminOrComercial || tipo?.proveedorId === proveedorId;
        });

        const cprTurnos: UnifiedTurno[] = filteredSolicitudesCPR.map(s => {
            const tipo = allTiposPersonal.find(t => t.id === s.proveedorId);
            return { ...s, type: 'CPR', costeEstimado: s.costeImputado || ((calculateHours(s.horaInicio, s.horaFin) * (tipo?.precioHora || 0)) * s.cantidad), horario: `${s.horaInicio} - ${s.horaFin}`, horas: calculateHours(s.horaInicio, s.horaFin), isCprRequest: true, osNumber: 'CPR', cliente: 'Producción Interna' };
        });
        
        const allServiceOrdersData = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const serviceOrdersMap = new Map(allServiceOrdersData.map(os => [os.id, os]));
        setServiceOrders(serviceOrdersMap);

        const eventoTurnos: UnifiedTurno[] = filteredPedidosEventos.flatMap(p => {
            const os = serviceOrdersMap.get(p.osId);
            return p.turnos.map(t => {
                const coste = calculateHours(t.horaEntrada, t.horaSalida) * t.precioHora * (t.asignaciones?.length || 1);
                return { ...t, osId: p.osId, type: 'EVENTO', estado: p.status, osNumber: os?.serviceNumber || '', cliente: os?.client || '', costeEstimado: coste, horario: `${t.horaInicio} - ${t.horaSalida}`, horas: calculateHours(t.horaInicio, t.horaSalida), isCprRequest: false };
            });
        });

        setPedidos([...cprTurnos, ...eventoTurnos]);

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as { osId: string; items: ComercialBriefingItem[] }[];
        setBriefings(new Map(allBriefings.map(b => [b.osId, b])));

        setIsMounted(true);
    }, [proveedorId, impersonatedUser, isAdminOrComercial]);

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
    
    const handleSaveAsignacion = (turnoId: string, asignacion: AsignacionPersonal, isCpr: boolean) => {
        if (!impersonatedUser) return;
    
        if (isCpr) {
            let allSolicitudesCPR = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
            const index = allSolicitudesCPR.findIndex(s => s.id === turnoId);
            if (index > -1) {
                allSolicitudesCPR[index].personalAsignado = [{ idPersonal: asignacion.id, nombre: asignacion.label }];
                allSolicitudesCPR[index].estado = 'Confirmado';
                localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allSolicitudesCPR));
            }
        } else {
            let allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
            allPersonalExterno = allPersonalExterno.map(pedido => ({
                ...pedido,
                turnos: pedido.turnos.map(turno => {
                    if (turno.id === turnoId) {
                        return { ...turno, asignaciones: [asignacion], statusPartner: 'Gestionado' };
                    }
                    return turno;
                })
            }));
            localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
        }

        loadData();
        const turno = pedidos.find(p => p.id === turnoId);
        if(turno) {
            logActivity(impersonatedUser, 'Asignar Personal', `Asignado ${asignacion.label} a ${turno.categoria}`, turno.type === 'EVENTO' ? turno.osId : 'CPR');
        }
        toast({ title: 'Asignación guardada' });
    };
    
    const filteredPedidos = useMemo(() => {
        const today = startOfToday();
        return pedidos.filter(p => {
            const fechaServicio = 'fecha' in p ? p.fecha : p.fechaServicio;
             if (!fechaServicio) return false;
             
             const isPast = isBefore(new Date(fechaServicio), today);
             if (!showCompleted && (isPast || p.estado === 'Cerrado' || p.estado === 'Rechazada')) {
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
        const grouped: { [date: string]: { [osId: string]: { os: ServiceOrder | { id: string; serviceNumber: string; client: string; space: string; }; briefing: ComercialBriefingItem | undefined; turnos: UnifiedTurno[] } } } = {};
        
        filteredPedidos.forEach(turno => {
            const fechaServicio = 'fecha' in turno ? turno.fecha : ('fechaServicio' in turno ? turno.fechaServicio : new Date().toISOString());

            const dateKey = format(new Date(fechaServicio), 'yyyy-MM-dd');
            if (!grouped[dateKey]) grouped[dateKey] = {};

            const osId = 'osId' in turno ? turno.osId : 'CPR';
            if (!grouped[dateKey][osId]) {
                const os = osId !== 'CPR' ? serviceOrders.get(osId) : { id: 'CPR', serviceNumber: 'CPR', client: 'Producción Interna', space: 'CPR' };
                const briefing = osId !== 'CPR' ? briefings.get(osId) : undefined;
                const hito = briefing?.items.find(item => 'fecha' in turno && isSameDay(new Date(item.fecha), new Date(turno.fecha)));
                grouped[dateKey][osId] = { os: os!, briefing: hito, turnos: [] };
            }
            grouped[dateKey][osId].turnos.push(turno);
        });

        return Object.entries(grouped)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, osData]) => {
                const allAccepted = Object.values(osData).flatMap(os => os.turnos).every(t => ('statusPartner' in t && t.statusPartner === 'Gestionado') || ('estado' in t && t.estado === 'Confirmado'));
                const earliestTime = Object.values(osData).flatMap(os => os.turnos).reduce((earliest, p) => ('horaInicio' in p && p.horaInicio < earliest ? p.horaInicio : earliest), '23:59');
                
                const groupedByOS = Object.values(osData).map(osEntry => ({
                    ...osEntry,
                    turnos: osEntry.turnos.sort((a, b) => ('horaInicio' in a && 'horaInicio' in b) ? a.horaInicio.localeCompare(b.horaInicio) : 0)
                })).sort((a,b) => a.os.serviceNumber.localeCompare(b.os.serviceNumber));

                return { date, osEntries: groupedByOS, allAccepted, earliestTime };
            });
    }, [filteredPedidos, serviceOrders, briefings]);

    const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: UnifiedTurno[] } = {};
        pedidos.forEach(p => {
            const fechaServicio = 'fecha' in p ? p.fecha : p.fechaServicio;
            const dateKey = format(new Date(fechaServicio), 'yyyy-MM-dd');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(p);
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
    
    if(impersonatedUser?.roles?.includes('Partner Personal') && !impersonatedUser?.proveedorId) {
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
                            <Label htmlFor="show-completed">Mostrar completados/pasados</Label>
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
                                                        <h4 className="font-bold mb-2 mt-2">
                                                            {os.id === 'CPR' ? <Badge>CPR</Badge> : <Badge variant="outline">{os.serviceNumber}</Badge>} - {os.client}
                                                            <span className="text-sm font-normal text-muted-foreground ml-2">{briefing?.descripcion || 'Producción Interna'} ({os.space})</span>
                                                        </h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Categoría</TableHead>
                                                                    <TableHead>Horario (Horas)</TableHead>
                                                                    <TableHead>Coste Est.</TableHead>
                                                                    <TableHead>Estado</TableHead>
                                                                    <TableHead className="w-56">Asignado a</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {turnos.map(turno => {
                                                                    const displayStatus = ('statusPartner' in turno) ? turno.statusPartner : (('estado' in turno && turno.estado === 'Aprobada' && turno.proveedorId) ? 'Asignada' : ('estado' in turno ? turno.estado : 'Pendiente'));
                                                                    return (
                                                                    <TableRow key={turno.id} className={cn((('statusPartner' in turno && turno.statusPartner === 'Gestionado') || ('estado' in turno && turno.estado === 'Confirmado')) && 'bg-green-50/50')}>
                                                                        <TableCell className="font-semibold">{turno.categoria}</TableCell>
                                                                        <TableCell>{turno.horario} ({turno.horas.toFixed(2)}h)</TableCell>
                                                                        <TableCell>{formatCurrency(turno.costeEstimado)}</TableCell>
                                                                        <TableCell><Badge variant={statusVariant[displayStatus]}>{displayStatus}</Badge></TableCell>
                                                                        <TableCell>
                                                                            <AsignacionDialog turno={turno} onSave={handleSaveAsignacion} isReadOnly={isReadOnly} />
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
                    <DialogTitle>Turnos para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                    {dayDetails && dayDetails.events.map((event) => {
                        return (
                        <div key={event.id} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{event.osNumber} - {event.cliente}</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span><span className="font-semibold">Categoría:</span> {event.categoria}</span>
                                <span><span className="font-semibold">Horario:</span> {event.horario}</span>
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
- src/app/produccion/[id]/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, CheckCircle, Info, ChefHat, Package, Timer, Camera } from 'lucide-react';
import Image from 'next/image';
import type { OrdenFabricacion, Elaboracion, ComponenteElaboracion, IngredienteInterno, ArticuloERP } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatUnit } from '@/lib/utils';
import { cn } from '@/lib/utils';


type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

type ConsumoReal = {
    componenteId: string;
    cantidadReal: number;
}

export default function ProduccionDetallePage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [cantidadReal, setCantidadReal] = useState<number | string>('');
    const [elapsedTime, setElapsedTime] = useState<string | null>(null);
    const [consumosReales, setConsumosReales] = useState<ConsumoReal[]>([]);


    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    useEffect(() => {
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const currentOF = allOFs.find(of => of.id === id);
        setOrden(currentOF || null);
        
        if (currentOF) {
            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            const currentElab = allElaboraciones.find(e => e.id === currentOF.elaboracionId);
            setElaboracion(currentElab || null);

            const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
            const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
            const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
            const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
            setIngredientesData(new Map(combinedIngredientes.map(i => [i.id, i])));

            // Load saved consumosReales
            if(currentOF.consumosReales) {
                setConsumosReales(currentOF.consumosReales);
            } else if (currentElab) {
                 // Initialize with theoretical values if not present
                const initialConsumos = currentElab.componentes.map(comp => ({
                    componenteId: comp.id,
                    cantidadReal: comp.cantidad * (currentOF.cantidadTotal / currentElab.produccionTotal),
                }));
                setConsumosReales(initialConsumos);
            }
        }
        setIsMounted(true);
    }, [id]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (orden?.estado === 'En Proceso' && orden.fechaInicioProduccion) {
            const updateElapsedTime = () => {
                const startTime = new Date(orden.fechaInicioProduccion!);
                setElapsedTime(formatDistanceToNowStrict(startTime, { locale: es }));
            }
            updateElapsedTime();
            timer = setInterval(updateElapsedTime, 1000);
        } else if (orden?.estado === 'Finalizado' && orden.fechaInicioProduccion && orden.fechaFinalizacion) {
             const startTime = new Date(orden.fechaInicioProduccion!);
             const endTime = new Date(orden.fechaFinalizacion!);
             setElapsedTime(formatDistanceToNowStrict(startTime, { locale: es, unit: 'minute', roundingMethod: 'ceil' }).replace('aproximadamente', ''));
        }

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [orden]);

    const handleUpdateStatus = (newStatus: 'En Proceso' | 'Finalizado') => {
        if (!orden) return;
        
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === id);

        if (index > -1) {
            let updatedOF = { ...allOFs[index], estado: newStatus };
            if (newStatus === 'En Proceso') {
                updatedOF.fechaInicioProduccion = new Date().toISOString();
                toast({ title: 'Producción Iniciada', description: 'El cronómetro ha comenzado.' });
                 setOrden(updatedOF); // Optimistically update state to show timer
            }
            if (newStatus === 'Finalizado') {
                const finalQuantity = typeof cantidadReal === 'string' ? parseFloat(cantidadReal) : cantidadReal;
                if (!finalQuantity || finalQuantity <= 0) {
                    toast({ variant: 'destructive', title: 'Error', description: 'La cantidad real producida debe ser mayor que cero.' });
                    return;
                }
                updatedOF.fechaFinalizacion = new Date().toISOString();
                updatedOF.cantidadReal = finalQuantity;
                updatedOF.consumosReales = consumosReales;
                setShowFinalizeDialog(false);
                router.push('/cpr/produccion');
            }

            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
        }
    };
    
    const barquetas = useMemo(() => {
      if (!elaboracion?.ratioExpedicion || elaboracion.ratioExpedicion === 0) {
        return 0;
      }
      
      const cantidad = orden?.estado === 'Finalizado' ? orden.cantidadReal : orden?.cantidadTotal;
      if (!cantidad) return 0;
      
      return Math.ceil(cantidad / elaboracion.ratioExpedicion);
    }, [orden, elaboracion]);
    
    const ratioProduccion = useMemo(() => {
        if (!orden || !elaboracion || !elaboracion.produccionTotal) return 1;
        return orden.cantidadTotal / elaboracion.produccionTotal;
    }, [orden, elaboracion]);

    const handleConsumoChange = (componenteId: string, cantidad: number) => {
        setConsumosReales(prev => {
            const newConsumos = prev.map(c => 
                c.componenteId === componenteId ? { ...c, cantidadReal: cantidad } : c
            );
            // Auto-save to localStorage
            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const index = allOFs.findIndex(of => of.id === id);
            if (index > -1) {
                allOFs[index].consumosReales = newConsumos;
                localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            }
            return newConsumos;
        });
    }

    const ceilToTwoDecimals = (num?: number | null) => {
        if (num === null || num === undefined) return '0,00';
        return formatNumber(num, 2);
    }


    if (!isMounted || !orden) {
        return <LoadingSkeleton title="Cargando Orden de Fabricación..." />;
    }

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Badge variant="secondary" className="w-fit mb-2">{orden.id}</Badge>
                        <CardTitle className="text-4xl font-headline">{orden.elaboracionNombre}</CardTitle>
                        <div className="flex justify-between items-baseline">
                            <CardDescription className="text-lg">Cantidad a producir: <span className="font-bold text-primary">{ceilToTwoDecimals(orden.cantidadTotal)} {orden.unidad}</span></CardDescription>
                            {elapsedTime && (
                                <div className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                                    <Timer />
                                    <span>{elapsedTime}</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                 <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ChefHat/> Escandallo Interactivo</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <div className="p-0 border rounded-lg bg-white">
                                {elaboracion ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead className="text-right">Cant. Teórica</TableHead><TableHead className="w-32 text-right">Cant. Real</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {elaboracion.componentes.map(comp => {
                                                const ingrediente = ingredientesData.get(comp.componenteId);
                                                const unidad = ingrediente?.erp?.unidad || 'UD';
                                                const cantNecesaria = comp.cantidad * ratioProduccion;
                                                const consumo = consumosReales.find(c => c.componenteId === comp.id);
                                                const desviacion = consumo ? consumo.cantidadReal - cantNecesaria : 0;

                                                return (
                                                    <TableRow key={comp.id} className={cn(desviacion !== 0 && "bg-amber-50")}>
                                                        <TableCell>{comp.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{ceilToTwoDecimals(cantNecesaria)} {formatUnit(unidad)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Input 
                                                              type="number" 
                                                              step="0.01" 
                                                              placeholder={ceilToTwoDecimals(cantNecesaria)}
                                                              className="h-8 text-right"
                                                              defaultValue={consumo?.cantidadReal?.toFixed(2)}
                                                              onBlur={(e) => handleConsumoChange(comp.id, parseFloat(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-muted-foreground text-center p-4">No se encontró la elaboración en el Book.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     {elaboracion?.instruccionesPreparacion && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Info /> Instrucciones de Preparación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none whitespace-pre-wrap">{elaboracion.instruccionesPreparacion}</div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                 {(elaboracion?.fotosProduccionURLs && elaboracion.fotosProduccionURLs.length > 0) || elaboracion?.videoProduccionURL ? (
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Camera/> Guía Multimedia</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {elaboracion.fotosProduccionURLs.map((foto, index) => (
                                <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                                    <Image src={foto.value} alt={`Foto de producción ${index + 1}`} fill className="object-cover" />
                                </div>
                            ))}
                            {elaboracion.videoProduccionURL && (
                                <div className="aspect-video">
                                    <iframe 
                                        className="w-full h-full rounded-lg"
                                        src={elaboracion.videoProduccionURL.replace("watch?v=", "embed/")} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen>
                                    </iframe>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : null}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package/> Información de Expedición</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Formato</h4>
                            <p className="text-lg font-bold">{elaboracion?.formatoExpedicion || 'No definido'}</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Ratio</h4>
                            <p className="text-lg font-bold">{elaboracion?.ratioExpedicion || 'N/A'} {orden.unidad} / formato</p>
                        </div>
                         <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Barquetas Necesarias</h4>
                            <p className="text-lg font-bold">{barquetas > 0 ? barquetas : 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="mt-8">
                {orden.estado === 'Asignada' && (
                    <Button size="lg" className="w-full h-16 text-xl" onClick={() => handleUpdateStatus('En Proceso')}>
                        <Play className="mr-3 h-8 w-8"/> Iniciar Producción
                    </Button>
                )}
                {orden.estado === 'En Proceso' && (
                    <Button size="lg" className="w-full h-16 text-xl" onClick={() => setShowFinalizeDialog(true)}>
                        <CheckCircle className="mr-3 h-8 w-8"/> Finalizar Producción
                    </Button>
                )}
            </div>

            <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Orden de Fabricación</AlertDialogTitle>
                        <AlertDialogDescription>
                            Introduce la cantidad real que has producido. Esta cifra se utilizará para el control de calidad y el stock.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Cantidad Planificada</p>
                                <p className="text-xl font-bold">{ceilToTwoDecimals(orden.cantidadTotal)} {orden.unidad}</p>
                            </div>
                             <div>
                                <Label htmlFor="cantidad-real" className="text-sm text-muted-foreground">Cantidad Real Producida ({orden.unidad})</Label>
                                <Input 
                                    id="cantidad-real" 
                                    type="number"
                                    step="0.01"
                                    value={cantidadReal}
                                    onChange={(e) => setCantidadReal(e.target.value)}
                                    className="mt-1 text-2xl h-12 text-center font-bold"
                                />
                            </div>
                        </div>

                         <div>
                            <h4 className="font-semibold mb-2">Resumen de Consumo de Componentes</h4>
                            <div className="border rounded-md max-h-48 overflow-y-auto">
                               <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Componente</TableHead>
                                        <TableHead className="text-right">Teórico</TableHead>
                                        <TableHead className="text-right">Real</TableHead>
                                        <TableHead className="text-right">Desviación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elaboracion?.componentes.map(comp => {
                                        const cantNecesaria = comp.cantidad * ratioProduccion;
                                        const consumo = consumosReales.find(c => c.componenteId === comp.id);
                                        const cantReal = consumo?.cantidadReal ?? cantNecesaria; // Use real if available, otherwise theoretical
                                        const desviacion = cantReal - cantNecesaria;
                                        const unidad = (ingredientesData.get(comp.componenteId) as IngredienteConERP)?.erp?.unidad || 'UD';
                                        
                                        return (
                                            <TableRow key={comp.id}>
                                                <TableCell className="text-xs">{comp.nombre}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{ceilToTwoDecimals(cantNecesaria)} {formatUnit(unidad)}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{ceilToTwoDecimals(cantReal)} {formatUnit(unidad)}</TableCell>
                                                <TableCell className={cn("text-right text-xs font-mono", desviacion > 0 ? 'text-destructive' : 'text-green-600')}>
                                                    {desviacion.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                               </Table>
                            </div>
                        </div>

                        <div>
                             <Label htmlFor="observaciones-final">Observaciones</Label>
                             <Textarea id="observaciones-final" placeholder="Añade aquí cualquier comentario sobre la producción (opcional)..." />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUpdateStatus('Finalizado')}>Confirmar y Finalizar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
```
```

