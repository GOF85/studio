

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
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const { assignableWorkers, isLoading: isLoadingWorkers, refresh } = useAssignablePersonal(turno);
    
    const initialAsignacion = turno.isCprRequest ? (turno.personalAsignado?.[0] ? { id: turno.personalAsignado[0].idPersonal, label: turno.personalAsignado[0].nombre } : null) : (turno as PersonalExternoTurno).asignaciones?.[0];


    useEffect(() => {
        if (isOpen) {
            refresh();
        }
    }, [isOpen, refresh]);

    useEffect(() => {
        if (isOpen && initialAsignacion) {
            setSelectedWorkerId(initialAsignacion.id);
        } else if (isOpen) {
            setSelectedWorkerId('');
        }
    }, [isOpen, initialAsignacion]);

    const handleSave = () => {
        const worker = assignableWorkers.find(w => w.value === selectedWorkerId);
        if (worker) {
            onSave(turno.id, worker as AsignacionPersonal, turno.type === 'CPR');
            setIsOpen(false);
        }
    }
    
    const handleWorkerCreated = (newWorker: PersonalExternoDB) => {
        refresh();
        setSelectedWorkerId(newWorker.id);
    }

    const workerDetails = useMemo(() => {
        const allPersonalExternoDB = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        return allPersonalExternoDB.find(w => w.id === selectedWorkerId);
    }, [selectedWorkerId]);

    const buttonLabel = initialAsignacion?.nombre || "Asignar Personal";
    const buttonIcon = initialAsignacion ? <Pencil className="mr-2 h-4 w-4"/> : <Users className="mr-2 h-4 w-4"/>;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant={initialAsignacion ? "outline" : "secondary"} size="sm" className="w-full justify-start font-semibold">
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
                            <Label htmlFor="show-completed">Mostrar pasados</Label>
                        </div>
                    </div>
                    {turnosAgrupados.length > 0 ? (
                         <Accordion type="multiple" className="w-full space-y-4">
                            {turnosAgrupados.map(({ date, osEntries, allAccepted }) => (
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
- src/hooks/use-loading-store.ts:
```ts
import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

```
- src/hooks/use-sidebar-store.ts:
```ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SidebarState = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      toggleSidebar: () => set({ isCollapsed: !get().isCollapsed }),
    }),
    {
      name: 'sidebar-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

```
- src/hooks/use-toast.ts:
```ts
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 2000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  
  // Auto-dismiss after a delay
  setTimeout(() => {
    dismiss()
  }, props.duration || TOAST_REMOVE_DELAY);


  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```
- src/lib/bd-nav.ts:
```ts

'use client';

import { Database, Users, Package, Building, Layers, Box, Percent, Target, Factory, CreditCard, Banknote, Trash2, UserPlus } from 'lucide-react';

export const bdNavLinks = [
    { title: 'Personal Interno', path: '/bd/personal', icon: Users },
    { title: 'Personal Externo', path: '/bd/personal-externo-db', icon: UserPlus },
    { title: 'Proveedores', path: '/bd/proveedores', icon: Building },
    { title: 'Catálogo Personal Externo', path: '/bd/tipos-personal', icon: Users },
    { title: 'Espacios', path: '/bd/espacios', icon: Building },
    { title: 'Artículos MICE', path: '/bd/articulos', icon: Package },
    { title: 'Base de Datos ERP', path: '/bd/erp', icon: Database },
    { title: 'Familias ERP', path: '/bd/familiasERP', icon: Layers },
    { title: 'Formatos de Expedición', path: '/bd/formatos-expedicion', icon: Box },
    { title: 'Objetivos de Gasto', path: '/bd/objetivos-gasto', icon: Target },
    { title: 'Objetivos CPR', path: '/bd/objetivos-cpr', icon: CreditCard },
    { title: 'Costes Fijos CPR', path: '/bd/costes-fijos-cpr', icon: Banknote },
    { title: 'Administración', path: '/bd/borrar', icon: Trash2 },
];

```
- src/lib/cpr-nav.ts:
```ts


'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, Shield, Users } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Visión general del taller de producción.' },
    { title: 'Planificación y OFs', href: '/cpr/of', icon: Factory, description: 'Agrega necesidades y gestiona las O.F.' },
    { title: 'Taller de Producción', href: '/cpr/produccion', icon: ChefHat, description: 'Interfaz para cocineros en tablets.' },
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Solicitudes de Personal', href: '/cpr/solicitud-personal', icon: Users, description: 'Pide personal de apoyo para picos de trabajo.' },
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];

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
- src/lib/data.ts:
```ts
import type { CateringItem } from '@/types';

export const CATERING_ITEMS: CateringItem[] = [
  { itemCode: 'PLT01', description: 'Plato de cena', price: 0.5, stock: 500, imageUrl: 'https://picsum.photos/seed/plates/400/300', imageHint: 'white plates', category: 'BODEGA' },
  { itemCode: 'GLS01', description: 'Copa de vino', price: 0.4, stock: 450, imageUrl: 'https://picsum.photos/seed/glasses/400/300', imageHint: 'wine glasses', category: 'BODEGA' },
  { itemCode: 'CUT01', description: 'Juego de cubiertos', price: 0.75, stock: 400, imageUrl: 'https://picsum.photos/seed/cutlery/400/300', imageHint: 'silver cutlery', category: 'BODEGA' },
  { itemCode: 'TBL01', description: 'Mesa redonda (8p)', price: 10, stock: 50, imageUrl: 'https://picsum.photos/seed/tables/400/300', imageHint: 'banquet table', category: 'BODEGA' },
  { itemCode: 'CHR01', description: 'Silla plegable blanca', price: 1.5, stock: 300, imageUrl: 'https://picsum.photos/seed/chairs/400/300', imageHint: 'white chair', category: 'BODEGA' },
  { itemCode: 'LIN01', description: 'Mantel blanco', price: 5, stock: 100, imageUrl: 'https://picsum.photos/seed/linens/400/300', imageHint: 'white linen', category: 'BODEGA' },
  { itemCode: 'SRV01', description: 'Bandeja para servir', price: 2, stock: 80, imageUrl: 'https://picsum.photos/seed/serving/400/300', imageHint: 'serving tray', category: 'BODEGA' },
  { itemCode: 'HTR01', description: 'Calentador de patio', price: 50, stock: 20, imageUrl: 'https://picsum.photos/seed/heater/400/300', imageHint: 'patio heater', category: 'BODEGA' },
  { itemCode: 'PLT02', description: 'Plato de postre', price: 0.4, stock: 500, imageUrl: 'https://picsum.photos/seed/dessertplate/400/300', imageHint: 'dessert plates', category: 'BODEGA' },
  { itemCode: 'GLS02', description: 'Vaso de agua', price: 0.3, stock: 600, imageUrl: 'https://picsum.photos/seed/waterglass/400/300', imageHint: 'water glasses', category: 'BODEGA' },
  { itemCode: 'TBL02', description: 'Mesa rectangular', price: 12, stock: 40, imageUrl: 'https://picsum.photos/seed/recttable/400/300', imageHint: 'long table', category: 'BODEGA' },
];

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
- src/lib/placeholder-images.json:
```json

{
  "placeholderImages": [
    { "id": "plates", "description": "Dinner plates", "imageUrl": "https://picsum.photos/seed/plates/400/300", "imageHint": "white plates", "category": "Vajilla" },
    { "id": "glasses", "description": "Wine glasses", "imageUrl": "https://picsum.photos/seed/glasses/400/300", "imageHint": "wine glasses", "category": "Cristalería" },
    { "id": "cutlery", "description": "Silverware set", "imageUrl": "https://picsum.photos/seed/cutlery/400/300", "imageHint": "silver cutlery", "category": "Cubertería" },
    { "id": "tables", "description": "Round banquet table", "imageUrl": "https://picsum.photos/seed/tables/400/300", "imageHint": "banquet table", "category": "Mobiliario" },
    { "id": "chairs", "description": "White folding chair", "imageUrl": "https://picsum.photos/seed/chairs/400/300", "imageHint": "white chair", "category": "Mobiliario" },
    { "id": "linens", "description": "White tablecloth", "imageUrl": "https://picsum.photos/seed/linens/400/300", "imageHint": "white linen", "category": "Mantelería" },
    { "id": "serving", "description": "Serving tray", "imageUrl": "https://picsum.photos/seed/serving/400/300", "imageHint": "serving tray", "category": "Servicio" },
    { "id": "heater", "description": "Patio heater", "imageUrl": "https://picsum.photos/seed/heater/400/300", "imageHint": "patio heater", "category": "Equipamiento" },
    { "id": "dessertplate", "description": "Dessert plates", "imageUrl": "https://picsum.photos/seed/dessertplate/400/300", "imageHint": "dessert plates", "category": "Vajilla" },
    { "id": "waterglass", "description": "Water glasses", "imageUrl": "https://picsum.photos/seed/waterglass/400/300", "imageHint": "water glasses", "category": "Cristalería" },
    { "id": "recttable", "description": "Long table", "imageUrl": "https://picsum.photos/seed/recttable/400/300", "imageHint": "long table", "category": "Mobiliario" }
  ]
}

```
- src/lib/placeholder-images.ts:
```ts
import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  category: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

```
- src/lib/rrhh-nav.ts:
```ts


'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo (ETT)', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];


```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number, decimals: number = 2) {
    return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnit(unit: string) {
    const unitMap: Record<string, string> = {
        'KG': 'kg',
        'L': 'l',
        'UD': 'ud',
    }
    return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function calculateHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.error('Invalid time format for calculating hours:', { start, end });
            return 0;
        }
        
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        console.error("Error calculating hours:", e);
        return 0;
    }
}

export function formatDuration(hours: number) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

```
- src/types/index.ts:
```ts
import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  category: string;
  tipo?: string;
  unidadVenta?: number;
};

export type OrderItem = CateringItem & {
  quantity: number;
  orderId?: string;
  tipo?: string;
  ajustes?: {
      tipo: 'merma' | 'exceso' | 'ajuste manual' | 'devolucion';
      cantidad: number;
      fecha: string;
      comentario: string;
  }[];
};

export type OrderCompletionAssistantInput = {
  eventDescription: string;
};

export type OrderCompletionAssistantOutput = {
  itemCode: string;
  description: string;
  price: number;
  quantity: number;
}[];

export const CATERING_VERTICALES = ['Recurrente', 'Grandes Eventos', 'Gran Cuenta'] as const;
export type CateringVertical = typeof CATERING_VERTICALES[number];

export type ServiceOrder = {
    id: string;
    serviceNumber: string;
    startDate: string;
    endDate: string;
    client: string;
    tipoCliente?: 'Empresa' | 'Agencia' | 'Particular';
    finalClient: string;
    contact: string;
    phone: string;
    asistentes: number;
    cateringVertical?: CateringVertical;
    space: string;
    spaceAddress: string;
    spaceContact: string;
    spacePhone: string;
    spaceMail: string;
    respMetre: string;
    respMetrePhone: string;
    respMetreMail: string;
    respCocinaCPR: string;
    respCocinaCPRPhone: string;
    respCocinaCPRMail: string;
    respPase: string;
    respPasePhone: string;
    respPaseMail: string;
    respCocinaPase: string;
    respCocinaPasePhone: string;
    respCocinaPaseMail: string;
    comercialAsiste: boolean;
    comercial: string;
    comercialPhone: string;
    comercialMail: string;
    rrhhAsiste: boolean;
    respRRHH: string;
    respRRHHPhone: string;
    respRRHHMail: string;
    agencyPercentage: number;
    agencyCommissionValue?: number;
    spacePercentage: number;
    spaceCommissionValue?: number;
    comisionesAgencia?: number;
    comisionesCanon?: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado' | 'Anulado';
    anulacionMotivo?: string;
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
    direccionPrincipal?: string;
    isVip?: boolean;
    email?: string;
    respProjectManager?: string;
    respProjectManagerPhone?: string;
    respProjectManagerMail?: string;
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
};


export const DEPARTAMENTOS_PERSONAL = ['Sala', 'Pase', 'CPR', 'RRHH', 'Almacén', 'Comercial', 'Operaciones', 'Marketing', 'HQ'] as const;
export type DepartamentoPersonal = typeof DEPARTAMENTOS_PERSONAL[number];

export type Personal = {
    id: string;
    nombre: string;
    apellidos: string;
    iniciales: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
    dni: string;
    precioHora: number;
}

export const TIPO_ESPACIO = ['Hotel', 'Espacio Singular', 'Finca', 'Restaurante', 'Auditorio', 'Corporativo', 'Centro de Congresos', 'Exterior'] as const;
export const ESTILOS_ESPACIO = ['Clásico', 'Industrial', 'Moderno', 'Rústico', 'Lujoso', 'Minimalista', 'Tecnológico', 'Exterior/Jardín'] as const;
export const TAGS_ESPACIO = ['Con Vistas', 'Terraza', 'Jardín', 'Piscina', 'Discoteca', 'Exclusividad Total', 'Pet-Friendly', 'Parking Propio', 'Luz Natural'] as const;
export const IDEAL_PARA = ['Bodas', 'Eventos Corporativos', 'Presentaciones de producto', 'Rodajes', 'Fiestas Privadas', 'Congresos', 'Ferias'] as const;
export type RelacionComercial = 'Exclusividad' | 'Homologado Preferente' | 'Homologado' | 'Puntual' | 'Sin Relación';


export type Sala = {
  id: string;
  nombreSala: string;
  m2?: number;
  dimensiones?: string;
  alturaMax?: number;
  alturaMin?: number;
  aforoTeatro?: number;
  aforoEscuela?: number;
  aforoCabaret?: number;
  aforoCocktailSala?: number;
  esDiafana: boolean;
  tieneLuzNatural: boolean;
};

export type ContactoEspacio = {
    id: string;
    nombre: string;
    cargo: string;
    telefono: string;
    email: string;
};

export type CuadroElectrico = {
    id: string;
    ubicacion: string;
    potencia: string;
};

export type ImagenEspacio = {
    id: string;
    url: string;
    isPrincipal: boolean;
}

export type MultimediaEspacio = {
    imagenes?: ImagenEspacio[];
    carpetaDRIVE?: string;
    visitaVirtual?: string;
}

export type MetricasOperativas = {
    dificultadMontaje: 1 | 2 | 3 | 4 | 5; // De Fácil a Muy Complejo
    penalizacionPersonalMontaje: number; // Porcentaje extra de personal estimado
    notasDificultadMontaje?: string;
    valoracionOperaciones: 1 | 2 | 3 | 4 | 5; // Calificación interna del equipo de operaciones
    factoresCriticosExito: string[]; // Qué debe salir bien sí o sí
    riesgosPotenciales: string[]; // Qué suele fallar o qué riesgos hay
    notasInternasOperaciones?: string;
};

export type FlowInvitado = {
    accesoPrincipal: string; // Ej: "Recepción principal del hotel", "Entrada directa desde la calle"
    recorridoInvitado: string; // Ej: "Subida en ascensor panorámico a planta 33"
    aparcamiento: string; // Ej: "Valet parking", "Parking público de pago a 200m", "Zona de fácil aparcamiento"
    transportePublico: string; // Paradas de metro/bus/tren cercanas
    accesibilidadAsistentes: string; // Ej: "Acceso y baños adaptados para sillas de ruedas"
    guardarropa: boolean;
    seguridadPropia: boolean;
};

export type Espacio = {
  id: string;
  
  identificacion: {
    nombreEspacio: string;
    tipoDeEspacio: (typeof TIPO_ESPACIO[number])[];
    descripcionCorta?: string;
    descripcionLarga?: string;
    ciudad: string;
    provincia: string;
    calle: string;
    codigoPostal: string;
    zona?: string; 
    estilos: (typeof ESTILOS_ESPACIO[number])[];
    tags: (typeof TAGS_ESPACIO[number])[];
    idealPara: (typeof IDEAL_PARA[number])[];
  };
  
  capacidades: {
    aforoMaximoCocktail: number;
    aforoMaximoBanquete: number;
    salas: Sala[];
  };

  logistica: {
    accesoVehiculos?: string;
    horarioMontajeDesmontaje?: string;
    montacargas: boolean;
    dimensionesMontacargas?: string;
    accesoServicioIndependiente: boolean;
    potenciaTotal?: string;
    cuadrosElectricos?: CuadroElectrico[];
    tomasAgua?: string[];
    desagues?: string[];
    tipoCocina: 'Cocina completa' | 'Office de regeneración' | 'Sin cocina';
    equipamientoCocina?: string[];
    potenciaElectricaCocina?: string;
    tomasAguaCocina: boolean;
    desaguesCocina: boolean;
    extraccionHumos: boolean;
    descripcionOffice?: string;
    zonaAlmacenaje?: string;
    limitadorSonido: boolean;
    permiteMusicaExterior: boolean;
    politicaDecoracion?: string;
    puntosAnclaje: boolean;
    metricasOperativas?: {
        dificultadMontaje: number;
        penalizacionPersonalMontaje: number;
        notasDificultadMontaje?: string;
    };
  };

  evaluacionMICE: {
    proveedorId?: string;
    relacionComercial: RelacionComercial;
    valoracionComercial: number; 
    puntosFuertes: string[];
    puntosDebiles: string[];
    perfilClienteIdeal?: string;
    argumentarioVentaRapido?: string[];
    exclusividadMusica: boolean;
    exclusividadAudiovisuales: boolean;
    otrosProveedoresExclusivos?: string;
    notasComerciales?: string;
    resumenEjecutivoIA?: string;
    valoracionOperaciones: number; 
    factoresCriticosExito: string[];
    riesgosPotenciales: string[];
  };

  experienciaInvitado: {
    flow: FlowInvitado;
    equipamientoAudiovisuales?: string;
    pantalla?: string;
    sistemaSonido?: string;
    escenario?: string;
    conexionWifi?: string;
  };

  contactos: ContactoEspacio[];
  multimedia?: MultimediaEspacio;
  
  espacio: string; 
  escaparateMICE?: string;
  carpetaDRIVE?: string;
  nombreContacto1?: string;
  telefonoContacto1?: string;
  emailContacto1?: string;
  canonEspacioPorcentaje?: number;
  canonEspacioFijo?: number;
  canonMcPorcentaje?: number;
  canonMcFijo?: number;
  comisionAlquilerMcPorcentaje?: number;
  precioOrientativoAlquiler?: string;
  horaLimiteCierre?: string;
  aforoCocktail?: number;
  aforoBanquete?: number;
  auditorio?: string;
  aforoAuditorio?: number;
  zonaExterior?: string;
  capacidadesPorSala?: string;
  directorio?: string;
  comentariosVarios?: string;
  cocina?: string;
  plato?: string; 
  homologacion?: string;
  comentariosMarketing?: string;
};


export const ARTICULO_CATERING_CATEGORIAS = ['Bodega', 'Almacen', 'Bio', 'Hielo', 'Alquiler', 'Menaje', 'Decoracion', 'Servicios', 'Otros'] as const;
export type ArticuloCateringCategoria = typeof ARTICULO_CATERING_CATEGORIAS[number];

export type ArticuloCatering = {
    id: string;
    erpId?: string;
    nombre: string;
    categoria: ArticuloCateringCategoria;
    esHabitual?: boolean;
    precioVenta: number;
    precioAlquiler: number;
    precioReposicion: number;
    unidadVenta?: number;
    stockSeguridad?: number;
    tipo?: string;
    loc?: string;
    imagen?: string;
    producidoPorPartner?: boolean;
    partnerId?: string;
    recetaId?: string; 
    subcategoria?: string;
}


export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    tipoTransporte: string; // Ej. "Furgoneta Isotermo"
    precio: number;
    tipo: 'Catering' | 'Entregas';
}

export type CategoriaPersonal = {
  id: string;
  proveedorId: string;
  nombreProveedor: string;
  categoria: string;
  precioHora: number;
};

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    precioVenta?: number;
    quantity?: number;
    comentarios?: string;
}
export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type ComercialBriefingItem = {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    conGastronomia: boolean;
    descripcion: string;
    comentarios: string;
    sala: string;
    asistentes: number;
    precioUnitario: number;
    importeFijo?: number;
    bebidas?: string;
    matBebida?: string;
    materialGastro?: string;
    manteleria?: string;
    gastro_items?: GastronomyOrderItem[];
    gastro_total?: number;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    items: GastronomyOrderItem[];
    total: number;
    fecha: string; // Add fecha to GastronomyOrder
}

export type TransporteOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoTransporte: string;
    precio: number;
    lugarRecogida: string;
    horaRecogida: string;
    lugarEntrega: string;
    horaEntrega: string;
    observaciones?: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string;
    firmadoPor?: string;
    dniReceptor?: string;
    fechaFirma?: string;
    hitosIds?: string[]; // For Entregas, to link multiple deliveries
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: { id: string; producto: string; precio: number; cantidad: number }[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
};

export type DecoracionDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type DecoracionOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  precio: number;
  observaciones?: string;
};

export type AtipicoDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type AtipicoOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  observaciones?: string;
  precio: number;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
};

export type PersonalMiceOrder = {
    id: string;
    osId: string;
    centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
    nombre: string;
    dni: string;
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal: string;
    horaSalidaReal: string;
}

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  email?: string;
  comentarios?: string;
  comentariosMice?: string;
  rating?: number;
  horaEntradaReal: string;
  horaSalidaReal: string;
};

export type PersonalExternoTurno = {
  id: string;
  proveedorId: string;
  categoria: string;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  solicitadoPor: 'Sala' | 'Pase' | 'Otro';
  tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
  observaciones?: string;
  statusPartner: 'Pendiente Asignación' | 'Gestionado';
  asignaciones?: AsignacionPersonal[];
  requiereActualizacion?: boolean;
};

export const ESTADO_PERSONAL_EXTERNO = ['Pendiente', 'Solicitado', 'Asignado', 'Cerrado'] as const;
export type EstadoPersonalExterno = typeof ESTADO_PERSONAL_EXTERNO[number];

export type PersonalExterno = {
    osId: string;
    turnos: PersonalExternoTurno[];
    status: EstadoPersonalExterno;
    observacionesGenerales?: string;
    hojaFirmadaUrl?: string;
};

export const AJUSTE_CONCEPTO_OPCIONES = ['Dietas', 'Transporte', 'Parking', 'Gastos Adicionales', 'Otros'] as const;
export type AjusteConcepto = typeof AJUSTE_CONCEPTO_OPCIONES[number];

export type PersonalExternoAjuste = {
    id: string;
    proveedorId: string;
    concepto: AjusteConcepto | string;
    importe: number;
};

export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
    referencia: string;
    observaciones?: string;
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales: string;
    costePruebaMenu?: number;
};

export type CtaExplotacionObjetivos = {
    gastronomia: number;
    bodega: number;
    consumibles: number;
    hielo: number;
    almacen: number;
    alquiler: number;
    transporte: number;
    decoracion: number;
    atipicos: number;
    personalMice: number;
    personalExterno: number;
    costePruebaMenu: number;
}

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
    personalSolicitadoCpr?: number;
};

export type ComercialAjuste = {
    id: string;
    concepto: string;
    importe: number;
}
export type Precio = {
    id: string;
    categoria: string;
    producto: string;
    precioUd: number;
    precioAlquilerUd: number;
    unidad: string;
    observaciones: string;
    loc: string;
    imagen: string;
    unidadVenta?: number;
}

export const UNIDADES_MEDIDA = ['KG', 'L', 'UD'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const articuloErpSchema = z.object({
  id: z.string(),
  idreferenciaerp: z.string().optional(),
  idProveedor: z.string().optional(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string().optional(),
  nombreProveedor: z.string().optional(),
  familiaCategoria: z.string().optional(),
  precioCompra: z.coerce.number().min(0, "Debe ser un valor positivo."),
  descuento: z.coerce.number().min(0).max(100).optional(),
  unidadConversion: z.coerce.number().min(1).default(1),
  precio: z.coerce.number().min(0),
  precioAlquiler: z.coerce.number().min(0).optional(),
  unidad: z.enum(UNIDADES_MEDIDA),
  tipo: z.string().optional(),
  categoriaMice: z.string().optional(),
  alquiler: z.boolean().default(false),
  observaciones: z.string().optional(),
});

export type ArticuloERP = z.infer<typeof articuloErpSchema>;

export type FamiliaERP = {
    id: string;
    familiaCategoria: string;
    Familia: string;
    Categoria: string;
}

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS DE CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
    historialRevisiones?: { fecha: string; responsable: string }[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
    merma: number;
}

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: { value: string }[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
    comentarioRevision?: string;
    fechaRevision?: string;
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: UnidadMedida;
  merma: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const TECNICAS_COCCION = ['Horneado / Asado', 'Fritura', 'Guiso / Estofado', 'Plancha / Salteado', 'Vapor / Hervido', 'Crudo / Marinado', 'Baja Temperatura / Sous-vide'] as const;
export type TecnicaCoccion = typeof TECNICAS_COCCION[number];

export type Receta = {
    id: string;
    numeroReceta?: string;
    nombre: string;
    nombre_en?: string;
    visibleParaComerciales: boolean;
    isArchived?: boolean;
    descripcionComercial: string;
    descripcionComercial_en?: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO', 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO', 'AMBOS', 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: { id: string; menajeId: string; descripcion: string; ratio: number }[];
    instruccionesMiseEnPlace: string;
    fotosMiseEnPlaceURLs?: { value: string }[];
    instruccionesRegeneracion: string;
    fotosRegeneracionURLs?: { value: string }[];
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: { value: string }[];
    fotosComercialesURLs?: { value: string }[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string[];
    recetaOrigen?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO';
    tecnicaCoccionPrincipal?: TecnicaCoccion;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL', 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA', 'DIFICIL';
    etiquetasTendencia?: string[];
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
    comentarioRevision?: string;
    fechaRevision?: string;
}

export type OrdenFabricacion = {
    id: string;
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadReal?: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    responsable?: string;
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    osIDs: string[];
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsableCalidad?: string;
    fechaValidacionCalidad?: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    consumosReales?: { componenteId: string; cantidadReal: number }[];
}

export type PickingItemState = {
    itemCode: string;
    checked: boolean;
    pickedQuantity: number;
    incidentComment?: string;
    resolved?: boolean;
};

export type MaterialOrderType = 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';

export type PickingSheet = {
    id: string; // Composite key: osId + fechaNecesidad
    osId: string;
    fechaNecesidad: string;
    items: (OrderItem & { type: MaterialOrderType })[];
    status: 'Pendiente' | 'En Proceso' | 'Listo';
    checkedItems?: string[];
    itemStates?: Record<string, Omit<PickingItemState, 'itemCode'>>;
    os?: ServiceOrder;
    solicita?: 'Sala' | 'Cocina';
};

export type ReturnItemState = {
    returnedQuantity: number;
    incidentComment?: string;
    isReviewed?: boolean;
};

export type ReturnSheet = {
    id: string; // osId
    osId: string;
    items: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrderType; })[];
    status: 'Pendiente' | 'Procesando' | 'Completado';
    itemStates: Record<string, ReturnItemState>; // Key is `${orderId}_${itemCode}`
    os?: ServiceOrder;
}

export type ContenedorIsotermo = {
    id: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type LoteAsignado = {
    allocationId: string;
    ofId: string;
    containerId: string;
    quantity: number;
    hitoId: string
}
export type ContenedorDinamico = {
    id: string;
    hitoId: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';
export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
};
export type PedidoPlantillaItem = {
    itemCode: string;
    quantity: number;
    description: string;
};
export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: PedidoPlantillaItem[];
};
export type FormatoExpedicion = {
  id: string;
  nombre: string;
};

export type StockLote = {
    ofId: string;
    cantidad: number;
    fechaCaducidad: string;
};

export type StockElaboracion = {
    elaboracionId: string;
    cantidadTotal: number;
    unidad: UnidadMedida;
    lotes: StockLote[];
}

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Packs', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ImagenProducto = {
  id: string;
  url: string;
  isPrincipal: boolean;
}

export type ProductoVentaComponente = {
    erpId: string;
    nombre: string;
    cantidad: number;
    coste?: number;
};

export type ProductoVenta = {
    id: string;
    nombre: string;
    nombre_en?: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    partnerId?: string;
    recetaId?: string;
    erpId?: string;
    exclusivoIfema?: boolean;
    componentes?: ProductoVentaComponente[];
}

export type PedidoEntregaItem = {
    id: string; // ProductoVenta ID
    nombre: string;
    quantity: number;
    pvp: number;
    coste: number;
    categoria: CategoriaProductoVenta;
};
export type EntregaHito = {
    id: string;
    fecha: string;
    hora: string;
    lugarEntrega: string;
    localizacion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    observaciones?: string;
    items: PedidoEntregaItem[];
    portes?: number;
    horasCamarero?: number;
}
export type PedidoEntrega = {
    osId: string;
    hitos: EntregaHito[];
};
export type Entrega = ServiceOrder & {
    vertical: 'Entregas';
    tarifa: 'Empresa' | 'IFEMA';
};
export type PedidoPartner = {
    id: string; // hitoId-productoId
    osId: string;
    serviceNumber: string;
    expedicionNumero: string;
    cliente: string;
    fechaEntrega: string; // En CPR MICE
    horaEntrega: string;  // En CPR MICE
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
}
export type PedidoPartnerStatus = 'Pendiente' | 'En Producción' | 'Listo para Entrega';
export type PickingIncidencia = {
  itemId: string;
  comment: string;
  timestamp: string;
};
export type PickingEntregaState = {
  hitoId: string;
  status: 'Pendiente' | 'En Proceso' | 'Preparado';
  checkedItems: Set<string>;
  incidencias: PickingIncidencia[];
  fotoUrl: string | null;
  ordenItems?: string[];
};

export const TIPO_PROVEEDOR_OPCIONES = ['Transporte', 'Hielo', 'Gastronomia', 'Personal', 'Atipicos', 'Decoracion', 'Servicios', 'Otros', 'Alquiler'] as const;
export type TipoProveedor = typeof TIPO_PROVEEDOR_OPCIONES[number];

export type Proveedor = {
  id: string;
  cif: string;
  IdERP?: string;
  nombreEmpresa: string;
  nombreComercial: string;
  direccionFacturacion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  emailContacto: string;
  telefonoContacto: string;
  iban?: string;
  formaDePagoHabitual?: string;
  tipos: TipoProveedor[];
};

export type PersonalExternoDB = {
    id: string; // DNI
    proveedorId: string;
    nombre: string;
    apellido1: string;
    apellido2: string;
    nombreCompleto: string;
    nombreCompacto: string;
    telefono?: string;
    email?: string;
}

export type PortalUserRole = 'Admin' | 'Comercial' | 'CPR' | 'Pase' | 'Dirección' | 'Almacen' | 'Operaciones' | 'Project Manager' | 'Partner Gastronomia' | 'Partner Personal' | 'Transporte';

export const PORTAL_ROLES: PortalUserRole[] = ['Admin', 'Comercial', 'CPR', 'Pase', 'Dirección', 'Almacen', 'Operaciones', 'Project Manager', 'Partner Gastronomia', 'Partner Personal', 'Transporte'];

export type PortalUser = {
  id: string;
  nombre: string;
  email: string;
  roles: PortalUserRole[];
  proveedorId?: string;
};

export type ActivityLog = {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: PortalUserRole;
  action: string;
  details: string;
  entityId: string; // e.g., osId, turnoId, etc.
};


export type MenajeDB = {
    id: string;
    descripcion: string;
};

export type CategoriaReceta = {
    id: string;
    nombre: string;
    snack?: boolean;
};

export type TipoCocina = {
    id: string;
    nombre: string;
};

export type HistoricoPreciosERP = {
    id: string; // Composite key: articuloErpId + fecha
    articuloErpId: string;
    fecha: string; // ISO Date
    precioCalculado: number;
    proveedorId?: string;
}

export type CosteFijoCPR = {
    id: string;
    concepto: string;
    importeMensual: number;
}

export type ObjetivoMensualCPR = {
    mes: string; // YYYY-MM
    presupuestoVentas: number;
    presupuestoCesionPersonal?: number;
    presupuestoGastosMP: number;
    presupuestoGastosPersonalMice?: number;
    presupuestoGastosPersonalExterno?: number;
    presupuestoOtrosGastos?: number;
    presupuestoPersonalSolicitadoCpr?: number;
}

export const ESTADO_SOLICITUD_PERSONAL_CPR = ['Solicitado', 'Aprobada', 'Rechazada', 'Asignada', 'Confirmado', 'Solicitada Cancelacion', 'Cerrado'] as const;
export type EstadoSolicitudPersonalCPR = typeof ESTADO_SOLICITUD_PERSONAL_CPR[number];


export type SolicitudPersonalCPR = {
  id: string;
  fechaSolicitud: string; // ISO Date
  solicitadoPor: string;
  fechaServicio: string; // ISO Date
  horaInicio: string;
  horaFin: string;
  partida: PartidaProduccion;
  categoria: string;
  cantidad: number;
  motivo: string;
  estado: EstadoSolicitudPersonalCPR;
  proveedorId?: string; // ID del tipo de personal (que incluye el proveedor)
  costeImputado?: number;
  observacionesRRHH?: string;
  personalAsignado?: { idPersonal: string; nombre: string; }[];
};
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
            const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
            setSpaceAddress(currentSpace?.calle || '');
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
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
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
- src/app/planificacion-cpr/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the warehouse picking page.
export default function PlanificacionCprPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/of');
    }, [router]);
    return null;
}


```
```