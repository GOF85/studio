
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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


function NuevoTrabajadorDialog({ onWorkerCreated, initialData, trigger }: { onWorkerCreated: (worker: PersonalExternoDB) => void, initialData?: Partial<NuevoTrabajadorFormValues>, trigger: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const { impersonatedUser } = useImpersonatedUser();

    const form = useForm<NuevoTrabajadorFormValues>({
        resolver: zodResolver(nuevoTrabajadorSchema),
        defaultValues: initialData || { id: '', nombre: '', apellido1: '', apellido2: '', telefono: '', email: '' }
    });
    
    useEffect(() => {
        if(isOpen) {
            form.reset(initialData || { id: '', nombre: '', apellido1: '', apellido2: '', telefono: '', email: '' });
        }
    }, [isOpen, initialData, form]);

    const onSubmit = (data: NuevoTrabajadorFormValues) => {
        const allWorkers = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        
        const existingIndex = allWorkers.findIndex(w => w.id === data.id);
        
        if (existingIndex === -1 && allWorkers.some(w => w.id.toLowerCase() === data.id.toLowerCase())) {
            form.setError('id', { message: 'Este DNI/ID ya existe.'});
            return;
        }

        const newWorker: PersonalExternoDB = {
            ...data,
            proveedorId: impersonatedUser?.proveedorId || '',
            nombreCompleto: `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim(),
            nombreCompacto: `${data.nombre} ${data.apellido1}`,
        };
        
        if (existingIndex > -1) {
            allWorkers[existingIndex] = newWorker;
        } else {
            allWorkers.push(newWorker);
        }
        localStorage.setItem('personalExternoDB', JSON.stringify(allWorkers));
        onWorkerCreated(newWorker);
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Trabajador</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="id" render={({field}) => <FormItem><FormLabel>DNI / ID</FormLabel><FormControl><Input {...field} readOnly={!!initialData} /></FormControl><FormMessage/></FormItem>}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="nombre" render={({field}) => <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                            <FormField control={form.control} name="apellido1" render={({field}) => <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        </div>
                         <FormField control={form.control} name="apellido2" render={({field}) => <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        <FormField control={form.control} name="telefono" render={({field}) => <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>}/>
                        <FormField control={form.control} name="email" render={({field}) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>}/>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function EmployeeTab({ impersonatedUser }: { impersonatedUser: PortalUser | null }) {
    const [workers, setWorkers] = useState<PersonalExternoDB[]>([]);
    const [editingWorker, setEditingWorker] = useState<PersonalExternoDB | null>(null);
    const [workerToDelete, setWorkerToDelete] = useState<PersonalExternoDB | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const loadWorkers = useCallback(() => {
        const allWorkers = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        const filtered = allWorkers.filter(w => w.proveedorId === impersonatedUser?.proveedorId);
        setWorkers(filtered);
    }, [impersonatedUser]);

    useEffect(() => {
        loadWorkers();
    }, [loadWorkers]);

    const handleWorkerSaved = () => {
        loadWorkers();
        toast({ title: 'Datos del trabajador guardados.' });
    };

    const handleDelete = () => {
        if (!workerToDelete) return;
        let allWorkers = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        allWorkers = allWorkers.filter(w => w.id !== workerToDelete.id);
        localStorage.setItem('personalExternoDB', JSON.stringify(allWorkers));
        loadWorkers();
        setWorkerToDelete(null);
        toast({ title: 'Trabajador eliminado.' });
    };

    const filteredWorkers = useMemo(() => {
        return workers.filter(w =>
            w.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [workers, searchTerm]);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Mis Trabajadores</CardTitle>
                 <NuevoTrabajadorDialog onWorkerCreated={handleWorkerSaved} trigger={<Button size="sm"><PlusCircle className="mr-2" />Nuevo</Button>}/>
            </CardHeader>
            <CardContent>
                <Input
                    placeholder="Buscar por nombre o DNI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-4"
                />
                 <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>DNI / ID</TableHead>
                                <TableHead>Nombre Completo</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWorkers.map(worker => (
                                <TableRow key={worker.id}>
                                    <TableCell className="font-mono">{worker.id}</TableCell>
                                    <TableCell className="font-semibold">{worker.nombreCompleto}</TableCell>
                                    <TableCell>{worker.telefono}</TableCell>
                                    <TableCell>{worker.email}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <NuevoTrabajadorDialog 
                                                onWorkerCreated={handleWorkerSaved} 
                                                initialData={worker}
                                                trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4"/></Button>}
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setWorkerToDelete(worker)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>¿Eliminar trabajador?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
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
            const asignacionData: any = {
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
                     {!isReadOnly && <NuevoTrabajadorDialog onWorkerCreated={handleWorkerCreated} trigger={<Button variant="outline" size="sm" className="w-full justify-start mt-2"><PlusCircle className="mr-2"/>Crear Nuevo Trabajador</Button>}/>}
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
             if (!showCompleted && (isPast || ('estado' in p && p.estado === 'Cerrado') || ('estado' in p && p.estado === 'Rechazada'))) {
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="lista">Lista de Solicitudes</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                    <TabsTrigger value="empleados">Empleados</TabsTrigger>
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
                                                                    const displayStatus = ('statusPartner' in turno) ? turno.statusPartner : (('estado' in turno && turno.estado === 'Aprobada' && turno.proveedorId) ? 'Asignado' : ('estado' in turno ? turno.estado : 'Pendiente'));
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
                <TabsContent value="empleados" className="mt-6">
                    <EmployeeTab impersonatedUser={impersonatedUser} />
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
                        const osLink = event.osId !== 'CPR' ? `/os/${event.osId}/personal-externo` : '/rrhh/solicitudes';
                        return (
                        <Link href={osLink} key={event.id} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{event.osNumber} - {event.cliente}</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span><span className="font-semibold">Categoría:</span> {event.categoria}</span>
                                <span><span className="font-semibold">Horario:</span> {event.horario}</span>
                            </div>
                        </Link>
                    )})}
                </div>
            </DialogContent>
        </Dialog>
        </TooltipProvider>
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
                                <Link href={currentPage.href} className="flex items-center gap-2">
                                <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                <span>{currentPage.title}</span>
                                </Link>
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
- src/app/rrhh/solicitudes/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, MessageSquare } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, CategoriaPersonal } from '@/types';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' } = {
  'Solicitado': 'warning',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'default',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

const partidaColorClasses: Record<SolicitudPersonalCPR['partida'], string> = {
    FRIO: 'bg-blue-100 border-blue-200',
    CALIENTE: 'bg-red-100 border-red-200',
    PASTELERIA: 'bg-pink-100 border-pink-200',
    EXPEDICION: 'bg-yellow-100 border-yellow-200'
};


function CommentModal({ comment, trigger }: { comment: string, trigger: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                 {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentario de la Asignación</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{comment}</p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [personalExternoDB, setPersonalExternoDB] = useState<Map<string, { nombre: string; proveedorId: string; }>>(new Map());
  const [personalInternoDB, setPersonalInternoDB] = useState<Map<string, { nombre: string }>>(new Map());
  const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
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

    const storedPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalInternoDB(new Map(storedPersonalInterno.map(p => [p.id, {nombre: `${p.nombre} ${p.apellidos}`}])));

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
  
  const handleAction = (action: 'aprobar' | 'rechazar' | 'asignar' | 'delete' | 'cancel', data?: any) => {
    if(!solicitudToManage) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === solicitudToManage.id);

    if(index === -1) return;

    switch(action) {
        case 'aprobar':
            allRequests[index].estado = 'Aprobada';
            toast({ title: 'Solicitud Aprobada' });
            break;
        case 'rechazar':
            allRequests[index].estado = 'Rechazada';
            allRequests[index].observacionesRRHH = data.reason;
            toast({ title: 'Solicitud Rechazada' });
            break;
        case 'asignar':
            const tipoPersonal = tiposPersonal.find(tp => tp.id === data.proveedorId);
            const coste = calculateHours(solicitudToManage.horaInicio, solicitudToManage.horaFin) * (tipoPersonal?.precioHora || 0);
            allRequests[index].estado = 'Asignada';
            allRequests[index].proveedorId = data.proveedorId;
            allRequests[index].costeImputado = coste;
            toast({ title: 'Proveedor Asignado' });
            break;
        case 'delete':
            allRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
            toast({ title: 'Solicitud Eliminada' });
            break;
        case 'cancel':
            allRequests[index].estado = 'Solicitada Cancelacion';
            toast({ title: 'Cancelación Solicitada' });
            break;
    }

    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
    setSolicitudes(allRequests);
    setSolicitudToManage(null);
    setManagementAction(null);
    setIsRejectionModalOpen(false);
    setRejectionReason('');
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
                        
                        let personalInfo = null;
                        if(asignado?.idPersonal) {
                            personalInfo = personalExternoDB.get(asignado.idPersonal) || personalInternoDB.get(asignado.idPersonal);
                        }

                        return (
                        <TableRow key={s.id} onClick={() => handleOpenDialog(s)} className={cn("cursor-pointer", partidaColorClasses[s.partida])}>
                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{s.horaInicio} - {s.horaFin}</TableCell>
                            <TableCell className="font-semibold">{formatNumber(calculateHours(s.horaInicio, s.horaFin), 2)}h</TableCell>
                            <TableCell><Badge variant="secondary">{s.partida}</Badge></TableCell>
                            <TableCell className="font-semibold">{s.categoria}</TableCell>
                            <TableCell>{s.motivo}</TableCell>
                            <TableCell><Badge variant={statusVariant[s.estado] || 'secondary'}>{s.estado}</Badge></TableCell>
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
      
      <AlertDialog open={!!solicitudToManage && !!managementAction} onOpenChange={() => { setSolicitudToManage(null); setManagementAction(null); }}>
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
                <AlertDialogAction onClick={() => managementAction && handleAction(managementAction)}>Sí, continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Dialog open={!!solicitudToManage && !managementAction} onOpenChange={() => setSolicitudToManage(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gestionar Solicitud de Personal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p><strong>Categoría:</strong> {solicitudToManage?.categoria}</p>
                    <p><strong>Fecha:</strong> {solicitudToManage?.fechaServicio ? format(new Date(solicitudToManage.fechaServicio), 'dd/MM/yyyy') : ''}</p>
                    <p><strong>Horario:</strong> {solicitudToManage?.horaInicio} - {solicitudToManage?.horaFin}</p>
                    <p><strong>Partida:</strong> {solicitudToManage?.partida}</p>
                    
                    {solicitudToManage?.estado === 'Solicitado' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold">Acciones de RRHH</h4>
                             <Button onClick={() => handleAction('aprobar')}>Aprobar Solicitud</Button>
                            <Button variant="destructive" className="ml-2" onClick={() => setIsRejectionModalOpen(true)}>Rechazar</Button>
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
                 <AlertDialogFooter>
                    {solicitudToManage && (solicitudToManage.estado === 'Solicitado' || solicitudToManage.estado === 'Aprobada') && (
                        <Button variant="destructive" onClick={() => handleAction('delete')}>Borrar Solicitud</Button>
                    )}
                </AlertDialogFooter>
            </DialogContent>
        </Dialog>
        
         <AlertDialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Motivo del Rechazo</AlertDialogTitle>
                    <AlertDialogDescription>Por favor, indica por qué se rechaza esta solicitud.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('rechazar', { reason: rejectionReason })}>Confirmar Rechazo</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
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
- src/lib/fonts.ts:
```ts

import { Open_Sans, Roboto, Source_Code_Pro } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});

export const sourceCodePro = Source_Code_Pro({
    subsets: ['latin'],
    variable: '--font-code',
});

```
- src/lib/rrhh-nav.ts:
```ts


'use client';

import { Users, BarChart3, ClipboardList } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];


```

- user says: "I see this error with the app, reported by NextJS, please fix it. The error is reported as HTML but presented visually to the user).

A > before the line number in the error source usually indicates the line of interest: 

> Module build failed (from ./node_modules/next/dist/build/webpack/loaders/next-swc-loader.js):
> Error:   x Expected ';', '}' or <eof>
>      ,-[/home/user/studio/src/app/portal/personal/page.tsx:763:1]
>  760 |         );
>  761 |     }
>  762 |     
>  763 | ,-> ```
>  764 | |   - src/hooks/use-assignable-personal.ts:
>  765 | |-> ```ts
>      : `---   ^^
>      : `---- This is the expression part of an expression statement
>  766 |     'use client';
>  767 |     
>  768 |     import { useState, useEffect, useMemo, useCallback } from 'react';
>      `----
> 
> 
> Caused by:
>     Syntax Error"