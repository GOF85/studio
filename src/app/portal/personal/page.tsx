
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, Users, ArrowLeft, ChevronLeft, ChevronRight, Edit, MessageSquare, Pencil, PlusCircle, RefreshCw, Send, Trash2, AlertTriangle, Printer, FileText, Upload, Phone, Save, Loader2 } from 'lucide-react';
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
    
    const initialAsignacion = turno.type === 'EVENTO' ? turno.asignaciones?.[0] : (turno.personalAsignado?.[0] ? { id: turno.personalAsignado[0].idPersonal, label: turno.personalAsignado[0].nombre } : null);

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

    const buttonLabel = initialAsignacion?.label || "Asignar Personal";
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
            return { ...s, type: 'CPR', costeEstimado: s.costeImputado || ((calculateHours(s.horaInicio, s.horaFin) * (tipo?.precioHora || 0)) * s.cantidad), horario: `${s.horaInicio} - ${s.horaFin}`, horas: calculateHours(s.horaInicio, s.horaFin), isCprRequest: true };
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
            const os = 'osNumber' in p ? p : null;
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
- src/app/produccion/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated. Redirecting to CPR production page.
export default function ProduccionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/cpr/produccion/${params.id}`);
    }, [router, params.id]);
    return null;
}

```
- src/app/produccion/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the cpr production page.
export default function ProduccionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/produccion');
    }, [router]);
    return null;
}

```
- src/app/rrhh/solicitudes/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, Briefcase, Factory, MapPin, Clock, Phone } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, EstadoSolicitudPersonalCPR, CategoriaPersonal } from '@/types';
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
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAssignablePersonal } from '@/hooks/use-assignable-personal';
import { AsignacionPersonal, PersonalExterno, PersonalExternoTurno, ServiceOrder } from '@/types';
import { Combobox } from '@/components/ui/combobox';


const ITEMS_PER_PAGE = 20;

type UnifiedRequest = (PersonalExternoTurno & { type: 'EVENTO'; osId: string; estado: PersonalExterno['status']; osNumber?: string; cliente?: string; costeEstimado: number; horario: string; horas: number; isCprRequest: false; }) | (SolicitudPersonalCPR & { type: 'CPR'; osNumber?: string; cliente?: string; costeEstimado: number; horario: string; horas: number; isCprRequest: true; });

const statusVariant: { [key in UnifiedRequest['estado']]: 'success' | 'secondary' | 'warning' | 'destructive' | 'outline' | 'default'} = {
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

function GestionSolicitudDialog({ solicitud, isOpen, onClose, onUpdateStatus, onDeleteRequest, proveedoresMap, allTiposPersonal }: { solicitud: UnifiedRequest | null, isOpen: boolean, onClose: () => void, onUpdateStatus: (isCpr: boolean, id: string, status: UnifiedRequest['estado'], proveedorId?: string, coste?: number, categoria?: string) => void, onDeleteRequest: (req: UnifiedRequest) => void, proveedoresMap: Map<string, string>, allTiposPersonal: CategoriaPersonal[] }) {
    const [selectedTipoPersonal, setSelectedTipoPersonal] = useState<string | undefined>(solicitud?.proveedorId);

    useEffect(() => {
        setSelectedTipoPersonal(solicitud?.proveedorId);
    }, [solicitud]);

    if (!solicitud) return null;

    const isCpr = true;
    
    const displayStatus = (isCpr && solicitud.estado === 'Aprobada' && solicitud.proveedorId) ? 'Asignada' : solicitud.estado;
    
    const canManageCpr = isCpr && displayStatus === 'Solicitado';
    const canDelete = isCpr && (['Solicitado', 'Rechazada'].includes(displayStatus) || displayStatus === 'Solicitada Cancelacion');
    const canAssignCpr = isCpr && displayStatus === 'Aprobada';

    const handleAsignar = () => {
        if (selectedTipoPersonal) {
            const tipo = allTiposPersonal.find(t => t.id === selectedTipoPersonal);
            if (tipo) {
                const coste = solicitud.horas * tipo.precioHora;
                onUpdateStatus(true, solicitud.id, 'Asignada', tipo.id, coste, tipo.categoria);
            }
        }
    };
    

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        Gestionar Solicitud
                    </DialogTitle>
                     <DialogDescription asChild>
                        <div className="flex items-center gap-2 pt-2">
                          <strong>Origen:</strong>
                          <Badge variant={isCpr ? "default" : "secondary"} className={cn(isCpr && "bg-slate-700")}>
                            {isCpr ? <Factory className="mr-2 h-4 w-4"/> : <Briefcase className="mr-2 h-4 w-4"/>}
                            {solicitud.osNumber}
                          </Badge>
                          <Badge variant={statusVariant[displayStatus]}>{displayStatus}</Badge>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                 <div className="py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div><strong className="text-muted-foreground block">Fecha Servicio:</strong> {format(new Date(solicitud.fechaServicio), 'PPP', {locale: es})}</div>
                        <div><strong className="text-muted-foreground block">Horario:</strong> {solicitud.horario} ({solicitud.horas.toFixed(2)}h)</div>
                        <div><strong className="text-muted-foreground block">Categoría:</strong> {solicitud.categoria}</div>
                        <div><strong className="text-muted-foreground block">Coste Estimado:</strong> {formatCurrency(solicitud.costeEstimado)}</div>
                        <div className="col-span-2"><strong className="text-muted-foreground block">Proveedor Asignado:</strong> {solicitud.proveedorId ? proveedoresMap.get(allTiposPersonal.find(t => t.id === solicitud.proveedorId)?.proveedorId || '') || 'N/A' : 'N/A'}</div>
                        <div className="col-span-2 pt-1 "><strong className="text-muted-foreground block">Motivo:</strong> {solicitud.motivo}</div>
                    </div>
                </div>
                 
                <Separator />

                {canManageCpr && (
                    <div className="py-4 space-y-4">
                        <h4 className="font-semibold">Acciones de RRHH (CPR)</h4>
                        <div className="flex gap-2 mt-2">
                            <Button variant={'default'} className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => onUpdateStatus(true, solicitud.id, 'Aprobada')}>Aprobar</Button>
                            <Button variant={'destructive'} size="sm" onClick={() => onUpdateStatus(true, solicitud.id, 'Rechazada')}>Rechazar</Button>
                        </div>
                    </div>
                )}
                
                {canAssignCpr && (
                    <div className="py-4 space-y-4">
                        <h4 className="font-semibold">Asignar Proveedor (CPR)</h4>
                         <div className="flex gap-2 items-end">
                             <div className="flex-grow space-y-1">
                                <Label>Proveedor / ETT</Label>
                                <Select value={selectedTipoPersonal} onValueChange={setSelectedTipoPersonal}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar proveedor y categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allTiposPersonal.map(tipo => (
                                            <SelectItem key={tipo.id} value={tipo.id}>
                                                {proveedoresMap.get(tipo.proveedorId)} - {tipo.categoria} ({formatCurrency(tipo.precioHora)}/h)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             </div>
                            <Button size="sm" onClick={handleAsignar} disabled={!selectedTipoPersonal}>Asignar</Button>
                         </div>
                    </div>
                )}
                
                {!solicitud.isCprRequest && (
                    <div className="py-4">
                        <Button className="w-full" asChild>
                           <Link href={`/os/${solicitud.osId}/personal-externo`}>Ir a la gestión del evento</Link>
                        </Button>
                    </div>
                )}

                {canDelete && (
                    <div className="pt-4 border-t">
                        <Button variant="destructive" size="sm" onClick={() => onDeleteRequest(solicitud)}>Eliminar Solicitud</Button>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    );
}

export default function SolicitudesUnificadasPage() {
  const [solicitudes, setSolicitudes] = useState<UnifiedRequest[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [allTiposPersonal, setAllTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [solicitudToManage, setSolicitudToManage] = useState<UnifiedRequest | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allPersonalExterno = (JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[]);
    const allSolicitudesCPR = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[]);
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
    
    const tiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setAllTiposPersonal(tiposPersonal);

    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));

    const cateringRequests: UnifiedRequest[] = allPersonalExterno.flatMap(p => {
        const os = osMap.get(p.osId);
        if (!os) return [];
        return p.turnos.map(turno => ({
            id: turno.id,
            osId: p.osId,
            osNumber: os.serviceNumber,
            cliente: os.client,
            fechaServicio: turno.fecha,
            horario: `${turno.horaInicio} - ${turno.horaSalida}`,
            horas: calculateHours(turno.horaInicio, turno.horaSalida),
            categoria: turno.categoria,
            motivo: `Evento: ${os.serviceNumber}`,
            proveedorId: turno.proveedorId,
            costeEstimado: calculateHours(turno.horaInicio, turno.horaSalida) * turno.precioHora * (turno.asignaciones?.length || 1),
            estado: p.status,
            isCprRequest: false,
        }));
    });

    const cprRequests: UnifiedRequest[] = allSolicitudesCPR.map(s => {
        const tipo = tiposPersonal.find(t => t.id === s.proveedorId);
        return {
        id: s.id,
        osId: 'CPR',
        osNumber: 'CPR',
        cliente: 'Producción Interna',
        fechaServicio: s.fechaServicio,
        horario: `${s.horaInicio} - ${s.horaFin}`,
        horas: calculateHours(s.horaInicio, s.horaFin),
        categoria: s.categoria,
        motivo: s.motivo,
        proveedorId: s.proveedorId,
        costeEstimado: s.costeImputado || ((calculateHours(s.horaInicio, s.horaFin) * (tipo?.precioHora || 0)) * s.cantidad),
        estado: s.estado,
        isCprRequest: true,
    }});
    
    setSolicitudes([...cateringRequests, ...cprRequests]);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredRequests = useMemo(() => {
    const today = startOfToday();
    return solicitudes.filter(p => {
      const searchMatch = 
        p.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const reqDate = new Date(p.fechaServicio);
        if (dateRange.to) {
            dateMatch = isWithinInterval(reqDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isSameDay(reqDate, dateRange.from);
        }
      }

      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(p.fechaServicio), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }
      
      const statusMatch = statusFilter === 'all' || p.estado === statusFilter;

      return searchMatch && dateMatch && pastEventMatch && statusMatch;
    }).sort((a, b) => new Date(b.fechaServicio).getTime() - new Date(a.fechaServicio).getTime());
  }, [solicitudes, searchTerm, dateRange, showPastEvents, statusFilter]);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);

  const handleUpdateCprStatus = (isCpr: boolean, id: string, status: UnifiedRequest['estado'], proveedorId?: string, coste?: number, categoria?: string) => {
    if (!isCpr) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El estado de solicitudes de eventos se gestiona desde la propia OS.' });
      return;
    }
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === id);
    if(index > -1) {
        allRequests[index].estado = status as EstadoSolicitudPersonalCPR;
        if (status === 'Asignada' && proveedorId && coste !== undefined && categoria) {
            allRequests[index].proveedorId = proveedorId;
            allRequests[index].costeImputado = coste;
            allRequests[index].categoria = categoria; // Update category if needed
        }
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        
        loadData(); // Recargar todos los datos para reflejar el cambio
        setSolicitudToManage(null); // Cerrar el modal
        toast({ title: 'Estado actualizado' });
    }
  }

  const handleDeleteRequest = (req: UnifiedRequest) => {
    if (!req.isCprRequest) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'El borrado de turnos de eventos se debe hacer desde la OS.' });
      return;
    }
    
    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const updated = allRequests.filter(r => r.id !== req.id);
    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(updated));
    
    loadData();
    setSolicitudToManage(null);
    toast({ title: 'Solicitud eliminada' });
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Solicitudes de Personal..." />;
  }

  return (
    <>
      <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
              <Input
                  placeholder="Buscar por OS, cliente, categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
              />
              <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                </PopoverContent>
              </Popover>
              <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                    <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mostrar pasados
                    </label>
            </div>
              <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setStatusFilter('all'); setShowPastEvents(false); }}>Limpiar</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Estado:</span>
                {['all', 'Pendiente', 'Solicitado', 'Asignado', 'Cerrado', 'Aprobada', 'Rechazada'].map(status => (
                    <Button key={status} size="sm" variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
                        {status === 'all' ? 'Todos' : status}
                    </Button>
                ))}
            </div>
       </div>

       <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Origen (OS/CPR)</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Servicio</TableHead>
                    <TableHead>Horario (Horas)</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead className="text-right">Coste Estimado</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedItems.length > 0 ? (
                paginatedItems.map(p => {
                    const displayStatus = (p.isCprRequest && p.estado === 'Aprobada' && p.proveedorId) ? 'Asignada' : p.estado;
                    const tipoPersonal = allTiposPersonal.find(t => t.id === p.proveedorId);
                    const assignedProviderId = p.isCprRequest ? tipoPersonal?.proveedorId : (p as PersonalExternoTurno).proveedorId;

                    return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setSolicitudToManage(p)}>
                        <TableCell className="font-medium">
                            <Badge variant={p.isCprRequest ? "default" : "outline"} className={cn(p.isCprRequest && "bg-slate-700")}>{p.osNumber}</Badge>
                        </TableCell>
                        <TableCell>{p.cliente}</TableCell>
                        <TableCell>{format(new Date(p.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{p.horario} ({p.horas.toFixed(2)}h)</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell>{proveedoresMap.get(assignedProviderId || '') || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.costeEstimado)}</TableCell>
                        <TableCell className="text-right"><Badge variant={statusVariant[displayStatus]}>{displayStatus}</Badge></TableCell>
                    </TableRow>
                )})
                ) : (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                    No hay solicitudes que coincidan con los filtros.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      
      <GestionSolicitudDialog
        solicitud={solicitudToManage}
        isOpen={!!solicitudToManage}
        onClose={() => setSolicitudToManage(null)}
        onUpdateStatus={handleUpdateCprStatus}
        onDeleteRequest={handleDeleteRequest}
        proveedoresMap={proveedoresMap}
        allTiposPersonal={allTiposPersonal}
      />
    </>
  );
}

```
- src/hooks/use-local-storage.ts:
```ts

'use client';

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = JSON.stringify(storedValue);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.log(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

```
- src/middleware.ts:
```ts

import { NextResponse, type NextRequest } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { genkitEval, GenkitMetric } from '@genkit-ai/evaluator';
import { text } from 'genkit/eval';
import { defineFlow, runFlow } from 'genkit/flow';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  matcher: ['/', '/index'],
};

export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

```
