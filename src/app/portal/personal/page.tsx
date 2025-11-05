

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, Calendar as CalendarIcon, CheckCircle, Clock, Factory, User, Users, ArrowLeft, ChevronLeft, ChevronRight, Edit, MessageSquare, Pencil, PlusCircle, RefreshCw, Send, Trash2, AlertTriangle, Printer, FileText, Upload, Phone, Save, Loader2, MapPin } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfToday, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
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
                return { ...t, osId: p.osId, type: 'EVENTO', estado: p.status, osNumber: os?.serviceNumber || '', cliente: os?.client || '', costeEstimado: coste, horario: `${t.horaEntrada} - ${t.horaSalida}`, horas: calculateHours(t.horaEntrada, t.horaSalida), isCprRequest: false };
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
             if (!showCompleted && (isPast || ('estado' in p && p.estado === 'Cerrado'))) {
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
                const allAccepted = Object.values(osData).flatMap(os => os.turnos).every(t =>
                    ('statusPartner' in t && t.statusPartner === 'Gestionado') || 
                    ('estado' in t && (t.estado === 'Confirmado' || t.estado === 'Cerrado'))
                );
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
                    <TabsTrigger value="empleados">Mis Empleados</TabsTrigger>
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
                            <Label htmlFor="show-completed">Mostrar pasados/cerrados</Label>
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
- src/app/transporte/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main OS page as transport is managed within an OS.
export default function TransporteRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/transporte`);
    }, [router, params.id]);
    return null;
}

```
- src/components/os/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function OsHeaderContent({ osId }: { osId: string }) {
    const pathname = usePathname();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, updateKey]);
    
    const {currentModule, isSubPage} = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['os', '123', 'gastronomia', '456']
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];

        const module = navLinks.find(link => link.path === moduleSegment);
        
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }

        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info'}, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (!serviceOrder) {
        return (
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
             </div>
        );
    }
    
    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    
    const responsables = [
        {label: 'Comercial', name: serviceOrder.comercial},
        {label: 'Metre', name: serviceOrder.respMetre},
        {label: 'PM', name: serviceOrder.respProjectManager},
        {label: 'Pase', name: serviceOrder.respPase},
    ].filter(r => r.name);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Link href={`/os/${osId}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${osId}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <currentModule.icon className="h-5 w-5"/>
                            <span>{currentModule.title}</span>
                         </Link>
                        </>
                    )}
                    {isSubPage && (
                         <>
                             <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                             <span className="flex items-center gap-2 font-bold text-primary">
                                 <FilePenLine className="h-5 w-5"/>
                                 <span>Edición</span>
                             </span>
                         </>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                </div>
              </div>
               <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">
                    <div className="flex items-center gap-3">
                       {responsables.map(resp => (
                           <Tooltip key={resp.label}>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                    <span className="font-semibold">{resp.label}:</span>
                                    <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback>{getInitials(resp.name || '')}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{resp.name}</p>
                                </TooltipContent>
                            </Tooltip>
                       ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {serviceOrder.startDate && serviceOrder.endDate && (
                            <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                {durationDays > 0 && <Badge variant="outline">{durationDays} día{durationDays > 1 && 's'}</Badge>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const dashboardHref = `/os/${osId}`;

    return (
        <div className="container mx-auto">
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Menu className="h-5 w-5 mr-2" />
                                Módulos
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Módulos de la OS</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-full p-4">
                                <nav className="grid items-start gap-1 pb-4">
                                    <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                        <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === `/os/${osId}` ? "bg-accent" : "transparent")}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>Panel de Control</span>
                                        </span>
                                    </Link>
                                    {navLinks.map((item, index) => {
                                        const href = `/os/${osId}/${item.path}`;
                                        return (
                                            <Link key={index} href={href} onClick={() => setIsSheetOpen(false)}>
                                                <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname.startsWith(href) ? "bg-accent" : "transparent")}>
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} />
                    </div>
                </div>
            </div>
            <main className="py-8">
                {children}
            </main>
        </div>
    );
}

```
- src/components/os/objective-display.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ServiceOrder, ObjetivosGasto, PersonalExterno, ComercialBriefing, GastronomyOrder } from '@/types';
import { Target, Info, RefreshCw } from 'lucide-react';
import { GASTO_LABELS } from '@/lib/constants';
import { formatCurrency, formatPercentage, formatNumber, calculateHours } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator';

type ModuleName = keyof typeof GASTO_LABELS;

interface ObjectiveDisplayProps {
  osId: string;
  moduleName: ModuleName;
  updateKey?: number; // To force re-render
}


export function ObjectiveDisplay({ osId, moduleName, updateKey }: ObjectiveDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<{
    objective: number;
    objectivePct: number;
    budget: number;
    facturacionNeta: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (isMounted && osId && moduleName) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);

      if (!currentOS) return;
      
      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as any[];
      const allAjustes = (JSON.parse(localStorage.getItem('comercialAjustes') || '{}')[osId] || []) as { importe: number }[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      const totalBriefing = currentBriefing?.items.reduce((acc:number, item:any) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
      const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
      const facturacionBruta = totalBriefing + totalAjustes;
      
      const agencyCommission = (facturacionBruta * (currentOS.agencyPercentage || 0) / 100) + (currentOS.agencyCommissionValue || 0);
      const spaceCommission = (facturacionBruta * (currentOS.spacePercentage || 0) / 100) + (currentOS.spaceCommissionValue || 0);
      const facturacionNeta = facturacionBruta - agencyCommission - spaceCommission;

      const storedPlantillas = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
      const plantillaGuardadaId = currentOS.objetivoGastoId || localStorage.getItem('defaultObjetivoGastoId');
      const plantilla = storedPlantillas.find(p => p.id === plantillaGuardadaId) || storedPlantillas.find(p => p.name === 'Micecatering') || storedPlantillas[0];

      if (!plantilla) return;
      
      const objectivePct = (plantilla[moduleName] || 0) / 100;
      const objectiveValue = facturacionNeta * objectivePct;

      let budgetValue = 0;
      
      if (moduleName === 'personalExterno') {
            const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
            const personalExternoData = allPersonalExterno.find(p => p.osId === osId) || null;
            const allPersonalExternoAjustes = (JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}')[osId] || []) as {importe: number}[];

            const costeTurnos = personalExternoData?.turnos.reduce((sum, turno) => {
                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
                const quantity = (turno.asignaciones || []).length > 0 ? turno.asignaciones.length : 1;
                return sum + (plannedHours * (turno.precioHora || 0) * quantity);
            }, 0) || 0;

            const costeAjustes = allPersonalExternoAjustes.reduce((sum: number, ajuste) => sum + ajuste.importe, 0);
            budgetValue = costeTurnos + costeAjustes;

      } else {
            const materialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as any[];
            switch(moduleName) {
                case 'gastronomia':
                    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
                    budgetValue = allGastroOrders.filter(o => o.osId === osId).reduce((sum, o) => sum + (o.total || 0), 0);
                    break;
                case 'bodega':
                    budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Bodega').reduce((s, o) => s + o.total, 0);
                    break;
                case 'consumibles':
                    budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Bio').reduce((s, o) => s + o.total, 0);
                    break;
                case 'hielo':
                    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as any[];
                    budgetValue = allHieloOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.total, 0);
                    break;
                case 'almacen':
                    budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Almacen').reduce((s, o) => s + o.total, 0);
                    break;
                case 'alquiler':
                    budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Alquiler').reduce((s, o) => s + o.total, 0);
                    break;
                case 'transporte':
                    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as any[];
                    budgetValue = allTransporteOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
                    break;
                case 'decoracion':
                    const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as any[];
                    budgetValue = allDecoracionOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
                    break;
                case 'atipicos':
                    const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as any[];
                    budgetValue = allAtipicoOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
                    break;
                case 'personalMice':
                    const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as any[];
                    budgetValue = allPersonalMiceOrders.filter(o => o.osId === osId).reduce((sum, order) => {
                        const hours = calculateHours(order.horaEntrada, order.horaSalida);
                        return sum + (hours * (order.precioHora || 0));
                    }, 0);
                    break;
                case 'costePruebaMenu':
                    const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as any[];
                    const prueba = allPruebasMenu.find(p => p.osId === osId);
                    budgetValue = prueba?.costePruebaMenu || 0;
                    break;
            }
      }

      setData({
        objective: objectiveValue,
        objectivePct,
        budget: budgetValue,
        facturacionNeta,
      });
    }
  }, [osId, moduleName, isMounted, updateKey]);

  if (!isMounted || !data) {
    return null; // Or a loading skeleton
  }

  const isExceeded = data.budget > data.objective;
  const budgetPct = data.facturacionNeta > 0 ? data.budget / data.facturacionNeta : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
              "flex items-center gap-2 text-sm font-semibold p-2 rounded-md border",
              isExceeded ? "bg-amber-100 border-amber-300" : "bg-card"
            )}>
              <Target className="h-5 w-5 text-primary"/>
              <span className="font-normal text-muted-foreground">Objetivos de gasto:</span>
              <span>{formatCurrency(data.objective)} ({formatPercentage(data.objectivePct)})</span>
              <span className="text-muted-foreground mx-1">/</span>
               <div className={cn(isExceeded ? "text-destructive" : "text-green-600")}>
                <span>Actual: {formatCurrency(data.budget)} ({formatPercentage(budgetPct)})</span>
              </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
            <div className="space-y-1 text-xs p-1">
                <p>El presupuesto actual de este módulo es <strong>{formatCurrency(data.budget)}</strong></p>
                <p>El objetivo es <strong>{formatCurrency(data.objective)}</strong></p>
                <Separator className="my-2"/>
                 <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Desviación:</span>
                    <span className={cn("font-bold", isExceeded ? "text-destructive" : "text-green-600")}>
                        {formatCurrency(data.budget - data.objective)}
                    </span>
                </div>
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

  
```
- src/hooks/use-data-store.ts:
```ts

'use client';

import { create } from 'zustand';
import type { 
    ServiceOrder, Entrega, ComercialBriefing, PedidoEntrega, GastronomyOrder, MaterialOrder, 
    TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, 
    PruebaMenuData, PickingSheet, ReturnSheet, OrdenFabricacion, PickingState, ExcedenteProduccion, 
    PersonalEntrega, PartnerPedidoStatus, ActivityLog, CtaRealCost, CtaComentario, 
    ObjetivosGasto, IngredienteERP, FamiliaERP, IngredienteInterno, Elaboracion, Receta, 
    CategoriaReceta, PortalUser, ComercialAjuste, ProductoVenta, PickingEntregaState, 
    StockElaboracion, PersonalExternoAjuste, PersonalExternoDB, HistoricoPreciosERP, 
    CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, Personal, Espacio, ArticuloCatering, 
    TipoServicio, CategoriaPersonal, Proveedor, TipoTransporte, DecoracionDBItem, 
    AtipicoDBItem, PedidoPlantilla, FormatoExpedicion 
} from '@/types';

type DataStore = {
    isLoaded: boolean;
    data: {
        serviceOrders: ServiceOrder[];
        entregas: Entrega[];
        comercialBriefings: ComercialBriefing[];
        pedidosEntrega: PedidoEntrega[];
        gastronomyOrders: GastronomyOrder[];
        materialOrders: MaterialOrder[];
        transporteOrders: TransporteOrder[];
        hieloOrders: HieloOrder[];
        decoracionOrders: DecoracionOrder[];
        atipicoOrders: AtipicoOrder[];
        personalMiceOrders: PersonalMiceOrder[];
        personalExterno: PersonalExterno[];
        pruebasMenu: PruebaMenuData[];
        pickingSheets: Record<string, PickingSheet>;
        returnSheets: Record<string, ReturnSheet>;
        ordenesFabricacion: OrdenFabricacion[];
        pickingStates: Record<string, PickingState>;
        excedentesProduccion: ExcedenteProduccion[];
        personalEntrega: PersonalEntrega[];
        partnerPedidosStatus: Record<string, any>;
        activityLogs: ActivityLog[];
        ctaRealCosts: Record<string, any>;
        ctaComentarios: Record<string, any>;
        objetivosGastoPlantillas: ObjetivosGasto[];
        defaultObjetivoGastoId: string | null;
        ingredientesERP: IngredienteERP[];
        familiasERP: FamiliaERP[];
        ingredientesInternos: IngredienteInterno[];
        elaboraciones: Elaboracion[];
        recetas: Receta[];
        categoriasRecetas: CategoriaReceta[];
        portalUsers: PortalUser[];
        comercialAjustes: Record<string, ComercialAjuste[]>;
        productosVenta: ProductoVenta[];
        pickingEntregasState: Record<string, PickingEntregaState>;
        stockElaboraciones: Record<string, StockElaboracion>;
        personalExternoAjustes: Record<string, PersonalExternoAjuste[]>;
        personalExternoDB: PersonalExternoDB[];
        historicoPreciosERP: HistoricoPreciosERP[];
        costesFijosCPR: CosteFijoCPR[];
        objetivosCPR: ObjetivoMensualCPR[];
        personal: Personal[];
        espacios: Espacio[];
        articulos: ArticuloCatering[];
        tipoServicio: TipoServicio[];
        tiposPersonal: CategoriaPersonal[];
        proveedores: Proveedor[];
        tiposTransporte: TipoTransporte[];
        decoracionDB: DecoracionDBItem[];
        atipicosDB: AtipicoDBItem[];
        pedidoPlantillas: PedidoPlantilla[];
        formatosExpedicionDB: FormatoExpedicion[];
        solicitudesPersonalCPR: SolicitudPersonalCPR[];
        cesionesPersonal: any[];
        incidenciasRetorno: any[];
    };
    loadAllData: () => void;
    refreshData: () => void;
};

const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const storedValue = localStorage.getItem(key);
    try {
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return defaultValue;
    }
};

export const useDataStore = create<DataStore>((set, get) => ({
    isLoaded: false,
    data: {
        serviceOrders: [], entregas: [], comercialBriefings: [], pedidosEntrega: [],
        gastronomyOrders: [], materialOrders: [], transporteOrders: [], hieloOrders: [],
        decoracionOrders: [], atipicoOrders: [], personalMiceOrders: [], personalExterno: [],
        pruebasMenu: [], pickingSheets: {}, returnSheets: {}, ordenesFabricacion: [],
        pickingStates: {}, excedentesProduccion: [], personalEntrega: [], partnerPedidosStatus: {},
        activityLogs: [], ctaRealCosts: {}, ctaComentarios: {}, objetivosGastoPlantillas: [],
        defaultObjetivoGastoId: null, ingredientesERP: [], familiasERP: [], ingredientesInternos: [],
        elaboraciones: [], recetas: [], categoriasRecetas: [], portalUsers: [],
        comercialAjustes: {}, productosVenta: [], pickingEntregasState: {},
        stockElaboraciones: {}, personalExternoAjustes: {}, personalExternoDB: [],
        historicoPreciosERP: [], costesFijosCPR: [], objetivosCPR: [], personal: [],
        espacios: [], articulos: [], tipoServicio: [], tiposPersonal: [], proveedores: [],
        tiposTransporte: [], decoracionDB: [], atipicosDB: [], pedidoPlantillas: [],
        formatosExpedicionDB: [], solicitudesPersonalCPR: [], cesionesPersonal: [], incidenciasRetorno: [],
    },
    loadAllData: () => {
        if (get().isLoaded) return;
        const allData = {
            serviceOrders: loadFromLocalStorage<ServiceOrder[]>('serviceOrders', []),
            entregas: loadFromLocalStorage<Entrega[]>('entregas', []),
            comercialBriefings: loadFromLocalStorage<ComercialBriefing[]>('comercialBriefings', []),
            pedidosEntrega: loadFromLocalStorage<PedidoEntrega[]>('pedidosEntrega', []),
            gastronomyOrders: loadFromLocalStorage<GastronomyOrder[]>('gastronomyOrders', []),
            materialOrders: loadFromLocalStorage<MaterialOrder[]>('materialOrders', []),
            transporteOrders: loadFromLocalStorage<TransporteOrder[]>('transporteOrders', []),
            hieloOrders: loadFromLocalStorage<HieloOrder[]>('hieloOrders', []),
            decoracionOrders: loadFromLocalStorage<DecoracionOrder[]>('decoracionOrders', []),
            atipicoOrders: loadFromLocalStorage<AtipicoOrder[]>('atipicoOrders', []),
            personalMiceOrders: loadFromLocalStorage<PersonalMiceOrder[]>('personalMiceOrders', []),
            personalExterno: loadFromLocalStorage<PersonalExterno[]>('personalExterno', []),
            pruebasMenu: loadFromLocalStorage<PruebaMenuData[]>('pruebasMenu', []),
            pickingSheets: loadFromLocalStorage<Record<string, PickingSheet>>('pickingSheets', {}),
            returnSheets: loadFromLocalStorage<Record<string, ReturnSheet>>('returnSheets', {}),
            ordenesFabricacion: loadFromLocalStorage<OrdenFabricacion[]>('ordenesFabricacion', []),
            pickingStates: loadFromLocalStorage<Record<string, PickingState>>('pickingStates', {}),
            excedentesProduccion: loadFromLocalStorage<ExcedenteProduccion[]>('excedentesProduccion', []),
            personalEntrega: loadFromLocalStorage<PersonalEntrega[]>('personalEntrega', []),
            partnerPedidosStatus: loadFromLocalStorage<Record<string, any>>('partnerPedidosStatus', {}),
            activityLogs: loadFromLocalStorage<ActivityLog[]>('activityLogs', []),
            ctaRealCosts: loadFromLocalStorage<Record<string, any>>('ctaRealCosts', {}),
            ctaComentarios: loadFromLocalStorage<Record<string, any>>('ctaComentarios', {}),
            objetivosGastoPlantillas: loadFromLocalStorage<ObjetivosGasto[]>('objetivosGastoPlantillas', []),
            defaultObjetivoGastoId: loadFromLocalStorage<string | null>('defaultObjetivoGastoId', null),
            ingredientesERP: loadFromLocalStorage<IngredienteERP[]>('articulosERP', []), // Key is articulosERP
            familiasERP: loadFromLocalStorage<FamiliaERP[]>('familiasERP', []),
            ingredientesInternos: loadFromLocalStorage<IngredienteInterno[]>('ingredientesInternos', []),
            elaboraciones: loadFromLocalStorage<Elaboracion[]>('elaboraciones', []),
            recetas: loadFromLocalStorage<Receta[]>('recetas', []),
            categoriasRecetas: loadFromLocalStorage<CategoriaReceta[]>('categoriasRecetas', []),
            portalUsers: loadFromLocalStorage<PortalUser[]>('portalUsers', []),
            comercialAjustes: loadFromLocalStorage<Record<string, ComercialAjuste[]>>('comercialAjustes', {}),
            productosVenta: loadFromLocalStorage<ProductoVenta[]>('productosVenta', []),
            pickingEntregasState: loadFromLocalStorage<Record<string, PickingEntregaState>>('pickingEntregasState', {}),
            stockElaboraciones: loadFromLocalStorage<Record<string, StockElaboracion>>('stockElaboraciones', {}),
            personalExternoAjustes: loadFromLocalStorage<Record<string, PersonalExternoAjuste[]>>('personalExternoAjustes', {}),
            personalExternoDB: loadFromLocalStorage<PersonalExternoDB[]>('personalExternoDB', []),
            historicoPreciosERP: loadFromLocalStorage<HistoricoPreciosERP[]>('historicoPreciosERP', []),
            costesFijosCPR: loadFromLocalStorage<CosteFijoCPR[]>('costesFijosCPR', []),
            objetivosCPR: loadFromLocalStorage<ObjetivoMensualCPR[]>('objetivosCPR', []),
            personal: loadFromLocalStorage<Personal[]>('personal', []),
            espacios: loadFromLocalStorage<Espacio[]>('espacios', []),
            articulos: loadFromLocalStorage<ArticuloCatering[]>('articulos', []),
            tipoServicio: loadFromLocalStorage<TipoServicio[]>('tipoServicio', []),
            tiposPersonal: loadFromLocalStorage<CategoriaPersonal[]>('tiposPersonal', []),
            proveedores: loadFromLocalStorage<Proveedor[]>('proveedores', []),
            tiposTransporte: loadFromLocalStorage<TipoTransporte[]>('tiposTransporte', []),
            decoracionDB: loadFromLocalStorage<DecoracionDBItem[]>('decoracionDB', []),
            atipicosDB: loadFromLocalStorage<AtipicoDBItem[]>('atipicosDB', []),
            pedidoPlantillas: loadFromLocalStorage<PedidoPlantilla[]>('pedidoPlantillas', []),
            formatosExpedicionDB: loadFromLocalStorage<FormatoExpedicion[]>('formatosExpedicionDB', []),
            solicitudesPersonalCPR: loadFromLocalStorage<SolicitudPersonalCPR[]>('solicitudesPersonalCPR', []),
            cesionesPersonal: loadFromLocalStorage<any[]>('cesionesPersonal', []),
            incidenciasRetorno: loadFromLocalStorage<any[]>('incidenciasRetorno', []),
        };
        set({ data: allData, isLoaded: true });
    },
    refreshData: () => {
        set({ isLoaded: false });
        get().loadAllData();
    }
}));
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
- src/lib/rrhh-nav.ts:
```ts

'use client';

import { Users, ClipboardList, BarChart3, UserPlus, Shuffle, UserCheck } from 'lucide-react';

export const rrhhNav = [
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Shuffle, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
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
    id: string; // DNI
    nombre: string;
    apellido1: string;
    apellido2: string;
    nombreCompleto: string;
    nombreCompacto: string;
    iniciales: string;
    departamento: string;
    categoria: string;
    telefono: string;
    email: string;
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
  rating?: number; // From 1 to 5
  comentariosMice?: string;
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

export type AsignacionPersonalCPR = {
  idPersonal: string;
  nombre: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
  rating?: number;
  comentariosMice?: string;
};

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
  personalAsignado?: AsignacionPersonalCPR[];
};

export const ESTADO_CESION_PERSONAL = ['Solicitado', 'Aprobado', 'Asignado', 'Cerrado', 'Rechazado'] as const;
export type EstadoCesionPersonal = typeof ESTADO_CESION_PERSONAL[number];
export const CENTRO_COSTE_OPCIONES = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH', 'ALMACEN', 'COMERCIAL', 'DIRECCION', 'MARKETING', 'PASE', 'CPR'] as const;
export type CentroCoste = typeof CENTRO_COSTE_OPCIONES[number];

export type CesionStorage = {
  id: string;
  fecha: string;
  centroCoste: CentroCoste;
  nombre: string;
  dni?: string;
  tipoServicio?: string;
  horaEntrada: string;
  horaSalida: string;
  precioHora: number;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
  comentarios?: string;
  estado: EstadoCesionPersonal;
};

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
    if (isNaN(value)) {
        return (0).toFixed(decimals);
    }
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
  if (isNaN(value)) return '0.00%';
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
- src/app/control-explotacion/cpr/page.tsx:
```tsx

'use client';

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, TrendingUp, TrendingDown, Euro, Calendar as CalendarIcon, BarChart, Info, MessageSquare, Save } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachMonthOfInterval, startOfYear, endOfYear, endOfMonth, startOfQuarter, endOfQuarter, subDays, startOfMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, XAxis, YAxis, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import Link from "next/link";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, GastronomyOrder, Receta, PersonalMiceOrder, PersonalExterno, PersonalExternoAjuste, CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, CategoriaPersonal, CesionStorage, Personal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { GASTO_LABELS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatNumber, formatPercentage, calculateHours } from '@/lib/utils';
import type { ObjetivosGasto } from '@/types';


type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
    className?: string;
}

function KpiCard({ title, value, icon: Icon, description, className }: KpiCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
}

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  real: number;
  objetivo: number;
  objetivo_pct: number;
  comentario?: string;
  detailType?: string;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);


export default function CprControlExplotacionPage() {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            try {
                return { from: parseISO(from), to: parseISO(to) };
            } catch (e) {
                console.error("Invalid date format in URL", e);
            }
        }
        return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    });
    
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [objetivoMes, setObjetivoMes] = useState<Date>(startOfMonth(new Date()));
    const [availableObjetivoMonths, setAvailableObjetivoMonths] = useState<{label: string, value: string}[]>([]);


    // Estados para datos maestros
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allCostesFijos, setAllCostesFijos] = useState<CosteFijoCPR[]>([]);
    const [allObjetivos, setAllObjetivos] = useState<ObjetivoMensualCPR[]>([]);
    const [allSolicitudesPersonalCPR, setAllSolicitudesPersonalCPR] = useState<SolicitudPersonalCPR[]>([]);
    const [allCesionesPersonal, setAllCesionesPersonal] = useState<CesionStorage[]>([]);
    const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
    const [personalInterno, setPersonalInterno] = useState<Personal[]>([]);
    
    // Estados para valores manuales
    const [realCostInputs, setRealCostInputs] = useState<Record<string, number | undefined>>({});
    const [comentarios, setComentarios] = useState<Record<string, string>>({});
    const [editingComment, setEditingComment] = useState<{label: string, text: string} | null>(null);

    const osId = searchParams.get('osId');

    const loadData = useCallback(() => {
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllCostesFijos(JSON.parse(localStorage.getItem('costesFijosCPR') || '[]'));
        setAllSolicitudesPersonalCPR(JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]'));
        
        const cesionesData = JSON.parse(localStorage.getItem('cesionesPersonal') || '[]') as CesionStorage[];
        setAllCesionesPersonal(cesionesData);
        
        const personalData = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        const pMap = new Map<string, Personal>();
        personalData.forEach(p => {
            pMap.set(p.nombre, p); 
            pMap.set(p.nombreCompleto, p);
        });
        setPersonalMap(pMap);
        setPersonalInterno(personalData);


        const objetivosData = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        setAllObjetivos(objetivosData);
        
        const months = objetivosData
            .map(o => o.mes)
            .sort((a,b) => b.localeCompare(a));
        setAvailableObjetivoMonths(months.map(m => ({
            value: m,
            label: format(parseISO(`${m}-02`), 'MMMM yyyy', { locale: es })
        })));
        
        const storedComentarios = osId ? (JSON.parse(localStorage.getItem('ctaComentarios') || '{}')[osId] || {}) : {};
        setComentarios(storedComentarios);
        
        const storedRealCosts = osId ? (JSON.parse(localStorage.getItem('ctaRealCosts') || '{}')[osId] || {}) : {};
        setRealCostInputs(storedRealCosts);

        setIsMounted(true);
    }, [osId]);


    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (dateRange?.from) {
            params.set('from', dateRange.from.toISOString().split('T')[0]);
        } else {
            params.delete('from');
        }
        if (dateRange?.to) {
            params.set('to', dateRange.to.toISOString().split('T')[0]);
        } else {
            params.delete('to');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`);
    }, [dateRange, router]);

    const dataCalculada = useMemo(() => {
        if (!isMounted || !dateRange?.from) return null;

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
        const osIdsEnRango = new Set(
            allServiceOrders
                .filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                })
                .map(os => os.id)
        );

        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

        const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => {
            const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        return itemSum + ((receta.precioVenta || 0) * (item.quantity || 0));
                    }
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
             const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    return itemSum + ((receta?.costeMateriaPrima || 0) * (item.quantity || 0));
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const cesionesEnRango = allCesionesPersonal.filter(c => {
             if (!c.fecha) return false;
             try {
                const parts = c.fecha.split('-').map(Number);
                const fechaCesion = new Date(parts[0], parts[1] - 1, parts[2]);
                return isWithinInterval(fechaCesion, { start: rangeStart, end: rangeEnd });
            } catch(e) { return false; }
        });
        
        let ingresosCesionPersonalPlanificado = 0, ingresosCesionPersonalCierre = 0;
        let gastosCesionPersonalPlanificado = 0, gastosCesionPersonalCierre = 0;
        
        cesionesEnRango.forEach(c => {
            const personalInfo = personalMap.get(c.nombre) || personalInterno.find(p => p.nombre === c.nombre);
            if (!personalInfo) return;

            const costePlanificado = calculateHours(c.horaEntrada, c.horaSalida) * c.precioHora;
            const costeReal = (calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora;

            if (personalInfo.departamento === 'CPR' && c.centroCoste !== 'CPR') {
                ingresosCesionPersonalPlanificado += costePlanificado;
                ingresosCesionPersonalCierre += costeReal;
            } else if (personalInfo.departamento !== 'CPR' && c.centroCoste === 'CPR') {
                gastosCesionPersonalPlanificado += costePlanificado;
                gastosCesionPersonalCierre += costeReal;
            }
        });

        const tiposPersonalMap = new Map((JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]).map(t => [t.id, t]));
        const solicitudesPersonalEnRango = allSolicitudesPersonalCPR.filter(solicitud => {
            try {
                const fechaServicio = new Date(solicitud.fechaServicio);
                return isWithinInterval(fechaServicio, { start: rangeStart, end: rangeEnd });
            } catch(e) { return false; }
        });
        
        const costePersonalSolicitadoPlanificado = solicitudesPersonalEnRango.reduce((sum, s) => {
            const horas = calculateHours(s.horaInicio, s.horaFin);
            const tipo = tiposPersonalMap.get(s.proveedorId || '');
            const precioHora = tipo?.precioHora || 0;
            return sum + (horas * precioHora * s.cantidad);
        }, 0);

        const costePersonalSolicitadoCierre = solicitudesPersonalEnRango.filter(s => s.estado === 'Cerrado').reduce((sum, s) => {
            const tipo = tiposPersonalMap.get(s.proveedorId || '');
            const precioHora = tipo?.precioHora || 0;
            const horasReales = s.personalAsignado && s.personalAsignado.length > 0
                ? s.personalAsignado.reduce((hSum, pa) => hSum + calculateHours(pa.horaEntradaReal, pa.horaSalidaReal), 0)
                : calculateHours(s.horaInicio, s.horaFin) * s.cantidad;
            return sum + (horasReales * precioHora);
        }, 0);


        const ingresosTotales = ingresosVenta + ingresosCesionPersonalCierre;
        const otrosGastos = allCostesFijos.reduce((sum, fijo) => sum + (fijo.importeMensual || 0), 0);
        const gastosTotales = costeEscandallo + gastosCesionPersonalCierre + otrosGastos + costePersonalSolicitadoCierre;
        const resultadoExplotacion = ingresosTotales - gastosTotales;

        const kpis = {
            ingresos: ingresosTotales,
            gastos: gastosTotales,
            resultado: resultadoExplotacion,
            margen: ingresosTotales > 0 ? resultadoExplotacion / ingresosTotales : 0,
        };
        
        return { kpis, objetivo: allObjetivos.find(o => o.mes === format(objetivoMes, 'yyyy-MM')) || {}, costeEscandallo, ingresosVenta, ingresosCesionPersonalPlanificado, ingresosCesionPersonalCierre, gastosCesionPersonalPlanificado, gastosCesionPersonalCierre, costesFijosPeriodo: otrosGastos, facturacionNeta: ingresosTotales, costePersonalSolicitadoPlanificado, costePersonalSolicitadoCierre };

    }, [isMounted, dateRange, allServiceOrders, allGastroOrders, allRecetas, allCostesFijos, allObjetivos, allSolicitudesPersonalCPR, objetivoMes, allCesionesPersonal, personalMap, personalInterno]);

    const dataAcumulada = useMemo(() => {
        if (!isMounted) return [];
        const mesesDelAno = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date())});
        
        const localPersonalMap = new Map(personalInterno.map(p => [p.nombreCompleto, p]));

        return mesesDelAno.map(month => {
            const rangeStart = startOfMonth(month);
            const rangeEnd = endOfMonth(month);

            const osIdsEnRango = new Set(
                allServiceOrders.filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                }).map(os => os.id)
            );

            const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

            const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => sum + (order.total || 0), 0);
            const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
                 return sum + (order.items || []).reduce((itemSum, item) => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        return itemSum + ((receta?.costeMateriaPrima || 0) * (item.quantity || 0));
                    }
                    return itemSum;
                }, 0);
            }, 0);
            
            const cesionesEnRango = allCesionesPersonal.filter(c => {
                 if (!c.fecha) return false;
                 try {
                    const parts = c.fecha.split('-').map(Number);
                    const fechaCesion = new Date(parts[0], parts[1] - 1, parts[2]);
                    return isWithinInterval(fechaCesion, { start: rangeStart, end: rangeEnd });
                } catch(e) { return false; }
            });

            const ingresosCesionPersonal = cesionesEnRango.filter(c => localPersonalMap.get(c.nombre)?.departamento === 'CPR' && c.centroCoste !== 'CPR').reduce((sum, c) => sum + ((calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora), 0);
            const gastosCesionPersonal = cesionesEnRango.filter(c => c.centroCoste === 'CPR' && localPersonalMap.get(c.nombre)?.departamento !== 'CPR').reduce((sum, c) => sum + ((calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora), 0);
            
            const solicitudesPersonalEnRango = allSolicitudesPersonalCPR.filter(solicitud => {
                 try {
                    const fechaServicio = new Date(solicitud.fechaServicio);
                    return solicitud.estado === 'Cerrado' && isWithinInterval(fechaServicio, { start: rangeStart, end: rangeEnd });
                } catch (e) {
                    return false;
                }
            });
            const tiposPersonalMap = new Map((JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]).map(t => [t.id, t]));
            const costePersonalSolicitado = solicitudesPersonalEnRango.reduce((sum, s) => {
                const tipo = tiposPersonalMap.get(s.proveedorId || '');
                const precioHora = tipo?.precioHora || 0;
                if (s.personalAsignado && s.personalAsignado.length > 0) {
                     const horasReales = s.personalAsignado.reduce((hSum, pa) => hSum + calculateHours(pa.horaEntradaReal, pa.horaSalidaReal), 0);
                     return sum + (horasReales * precioHora);
                }
                return sum + (calculateHours(s.horaInicio, s.horaFin) * precioHora * s.cantidad);
            }, 0);


            const varios = allCostesFijos.reduce((s, c) => s + c.importeMensual, 0);

            const ingresos = ingresosVenta + ingresosCesionPersonal;
            const totalGastos = costeEscandallo + gastosCesionPersonal + costePersonalSolicitado + varios;
            const resultado = ingresos - totalGastos;

            return {
                mes: format(month, 'MMMM', { locale: es }),
                ingresos,
                consumoMMPP: costeEscandallo,
                cesionesGasto: gastosCesionPersonal,
                personalSolicitado: costePersonalSolicitado,
                totalPersonalCPR: gastosCesionPersonal + costePersonalSolicitado,
                varios,
                resultado,
            }
        });

    }, [isMounted, allServiceOrders, allGastroOrders, allRecetas, allCostesFijos, allSolicitudesPersonalCPR, allCesionesPersonal, personalInterno]);
    
    const processedCostes: CostRow[] = useMemo(() => {
        if (!dataCalculada) return [];
        const { facturacionNeta, objetivo } = dataCalculada;
        const gastos = [
            { label: 'Venta Gastronomía', presupuesto: dataCalculada.ingresosVenta, cierre: dataCalculada.ingresosVenta, detailType: 'ventaGastronomia' },
            { label: 'Cesión de Personal', presupuesto: dataCalculada.ingresosCesionPersonalPlanificado, cierre: dataCalculada.ingresosCesionPersonalCierre, detailType: 'cesionIngreso' },
            { label: GASTO_LABELS.gastronomia, presupuesto: dataCalculada.costeEscandallo, cierre: dataCalculada.costeEscandallo, detailType: 'costeMP' },
            { label: 'Personal Cedido a CPR', presupuesto: dataCalculada.gastosCesionPersonalPlanificado, cierre: dataCalculada.gastosCesionPersonalCierre, detailType: 'cesionGasto' },
            { label: GASTO_LABELS.personalSolicitadoCpr, presupuesto: dataCalculada.costePersonalSolicitadoPlanificado, cierre: dataCalculada.costePersonalSolicitadoCierre, detailType: 'personalApoyo' },
            { label: 'Otros Gastos (Fijos)', presupuesto: dataCalculada.costesFijosPeriodo, cierre: dataCalculada.costesFijosPeriodo },
        ];

        return gastos.map(g => {
            const keyMap: {[key: string]: keyof Omit<ObjetivoMensualCPR, 'mes'>} = {
                'Venta Gastronomía': 'presupuestoVentas',
                'Cesión de Personal': 'presupuestoCesionPersonal',
                [GASTO_LABELS.gastronomia]: 'presupuestoGastosMP',
                [GASTO_LABELS.personalMice]: 'presupuestoGastosPersonalMice',
                [GASTO_LABELS.personalSolicitadoCpr]: 'presupuestoGastosPersonalExterno',
                'Otros Gastos (Fijos)': 'presupuestoOtrosGastos',
            };
            const objKey = keyMap[g.label];
            const objetivo_pct = (objKey && objetivo?.[objKey] / 100) || 0;
            const realValue = realCostInputs[g.label] ?? g.cierre;
            return {
                ...g,
                real: realValue,
                objetivo: facturacionNeta * objetivo_pct,
                objetivo_pct: objetivo_pct,
                comentario: comentarios[g.label] || '',
            }
        });
    }, [dataCalculada, realCostInputs, comentarios]);
    
    const totals = useMemo(() => {
        if (!processedCostes) return { totalPresupuesto: 0, totalCierre: 0, totalReal: 0, totalObjetivo: 0 };
        const totalPresupuesto = processedCostes.reduce((sum, row) => sum + row.presupuesto, 0);
        const totalCierre = processedCostes.reduce((sum, row) => sum + row.cierre, 0);
        const totalReal = processedCostes.reduce((sum, row) => sum + (row.real ?? row.cierre), 0);
        const totalObjetivo = processedCostes.reduce((sum, row) => sum + row.objetivo, 0);
        return { totalPresupuesto, totalCierre, totalReal, totalObjetivo };
    }, [processedCostes]);


    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 0, 1)), to: endOfQuarter(new Date(now.getFullYear(), 2, 31)) }); break;
            case 'q2': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 3, 1)), to: endOfQuarter(new Date(now.getFullYear(), 5, 30)) }); break;
            case 'q3': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 6, 1)), to: endOfQuarter(new Date(now.getFullYear(), 8, 30)) }); break;
            case 'q4': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 9, 1)), to: endOfQuarter(new Date(now.getFullYear(), 11, 31)) }); break;
        }
        if (fromDate && toDate) {
            setDateRange({ from: fromDate, to: toDate });
        }
        setIsDatePickerOpen(false);
    };

    const handleRealCostInputChange = (label: string, value: string) => {
        const numericValue = value === '' ? undefined : parseFloat(value) || 0;
        setRealCostInputs(prev => ({...prev, [label]: numericValue}));
    }

    const handleSaveRealCost = (label: string, value: string) => {
        if (!osId) return;
        const numericValue = value === '' ? undefined : parseFloat(value) || 0;
        const allCosts = JSON.parse(localStorage.getItem('ctaRealCosts') || '{}');
        if (!allCosts[osId]) {
        allCosts[osId] = {};
        }
        allCosts[osId][label] = numericValue;
        localStorage.setItem('ctaRealCosts', JSON.stringify(allCosts));
        toast({ title: "Coste Real Guardado", description: "El valor se ha guardado localmente."});
    };
    
    const handleSaveComentario = () => {
        if (!editingComment || !osId) return;
        const newComentarios = { ...comentarios, [editingComment.label]: editingComment.text };
        setComentarios(newComentarios);
        
        const allComentarios = JSON.parse(localStorage.getItem('ctaComentarios') || '{}');
        allComentarios[osId] = newComentarios;
        localStorage.setItem('ctaComentarios', JSON.stringify(allComentarios));
        
        setEditingComment(null);
        toast({ title: "Comentario guardado" });
    };

    if (!isMounted || !dataCalculada) {
        return <LoadingSkeleton title="Calculando rentabilidad del CPR..." />;
    }

    const { kpis, facturacionNeta } = dataCalculada;
    
    const totalRealIngresos = processedCostes.filter(g => ['Venta Gastronomía', 'Cesión de Personal'].includes(g.label)).reduce((s, r) => s + r.real, 0);
    const totalRealGastos = processedCostes.filter(g => !['Venta Gastronomía', 'Cesión de Personal'].includes(g.label)).reduce((s, r) => s + r.real, 0);
    const rentabilidadReal = totalRealIngresos - totalRealGastos;

    const renderCostRow = (row: CostRow, index: number) => {
        const pctSFactPresupuesto = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0;
        const pctSFactCierre = facturacionNeta > 0 ? row.cierre / facturacionNeta : 0;
        const pctSFactReal = facturacionNeta > 0 ? row.real / facturacionNeta : 0;
        const desviacion = row.objetivo - row.real;
        const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0;
        
        return (
             <TableRow key={`${row.label}-${index}`}>
                <TableCell className="p-0 font-medium sticky left-0 bg-background z-10 w-48">
                    <div className="flex items-center gap-2 h-full w-full px-2 py-1">
                        {row.detailType ? (
                            <Link href={`/control-explotacion/cpr/${row.detailType}?from=${dateRange?.from?.toISOString()}&to=${dateRange?.to?.toISOString()}`} className="text-primary hover:underline flex items-center gap-2">
                                {row.label} <Info size={14}/>
                            </Link>
                        ): row.label}
                    </div>
                </TableCell>
                <TableCell className="py-1 px-2 text-right font-mono border-l bg-blue-50/50">{formatCurrency(row.presupuesto)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-blue-50/50">{formatPercentage(pctSFactPresupuesto)}</TableCell>
                
                <TableCell className="py-1 px-2 text-right font-mono border-l bg-amber-50/50">{formatCurrency(row.cierre)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-amber-50/50">{formatPercentage(pctSFactCierre)}</TableCell>

                <TableCell className="py-1 px-2 text-right border-l bg-green-50/50">
                    <Input
                        type="number"
                        step="0.01"
                        placeholder={formatNumber(row.cierre, 2)}
                        value={realCostInputs[row.label] === undefined ? '' : realCostInputs[row.label]}
                        onChange={(e) => handleRealCostInputChange(row.label, e.target.value)}
                        onBlur={(e) => handleSaveRealCost(row.label, e.target.value)}
                        className="h-7 text-right w-28 ml-auto"
                    />
                </TableCell>
                <TableCell className={cn("py-1 px-2 text-right font-mono border-r bg-green-50/50", pctSFactReal > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFactReal)}</TableCell>
                
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-l">{formatCurrency(row.objetivo)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r">{formatPercentage(row.objetivo_pct)}</TableCell>
                
                <TableCell className={cn("py-1 px-2 text-right font-mono border-l", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatCurrency(desviacion)}</TableCell>
                <TableCell className={cn("py-1 px-2 text-right font-mono border-r", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatPercentage(desviacionPct)}</TableCell>
            </TableRow>
        )
    };
    
    const renderSummaryRow = (label: string, value: number, isSubtotal: boolean = false) => {
        return (
            <TableRow className={cn(isSubtotal ? "bg-muted hover:bg-muted" : "bg-primary/10 hover:bg-primary/10")}>
                <TableCell className="font-bold py-2 px-2 text-black sticky left-0 bg-inherit z-10">{label}</TableCell>
                <TableCell className="text-right font-bold py-2 px-2 text-black">{formatCurrency(value)}</TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
            </TableRow>
        )
    };

    const renderFinalRow = (label: string, value: number) => {
        return (
            <TableRow className="bg-primary/20 hover:bg-primary/20">
                <TableCell className="font-bold py-2 px-2 text-base text-black sticky left-0 bg-inherit z-10">{label}</TableCell>
                <TableCell className={cn("text-right font-bold py-2 px-2 text-base", value < 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(value)}</TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
            </TableRow>
        )
    }

    return (
        <div className="space-y-4">
             <Card>
                 <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-bold text-lg", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                         <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Label className="font-semibold whitespace-nowrap">Objetivos:</Label>
                         <Select onValueChange={(value) => setObjetivoMes(parseISO(`${value}-02`))} value={format(objetivoMes, 'yyyy-MM')}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableObjetivoMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <TooltipProvider>
                <Tabs defaultValue="control-explotacion">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="control-explotacion">Control de Explotación CPR</TabsTrigger>
                        <TabsTrigger value="acumulado-mensual">Acumulado Mensual</TabsTrigger>
                    </TabsList>
                    <TabsContent value="control-explotacion" className="mt-4">
                        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
                            <KpiCard title="Ingresos Totales" value={formatCurrency(kpis.ingresos)} icon={Euro} className="bg-green-100/60" />
                            <KpiCard title="Gastos Totales" value={formatCurrency(kpis.gastos)} icon={TrendingDown} className="bg-red-100/60"/>
                            <KpiCard title="RESULTADO" value={formatCurrency(kpis.resultado)} icon={kpis.resultado >= 0 ? TrendingUp : TrendingDown} className={cn(kpis.resultado >= 0 ? "bg-green-100/60 text-green-800" : "bg-red-100/60 text-red-800")} />
                             <KpiCard title="Margen Bruto" value={formatPercentage(kpis.margen)} icon={kpis.margen >= 0 ? TrendingUp : TrendingDown} className={cn(kpis.margen >= 0 ? "bg-green-100/60 text-green-800" : "bg-red-100/60 text-red-800")} />
                        </div>
                        
                        <Card className="mt-4">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-2 sticky left-0 bg-muted/50 z-10 w-48">Partida</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Presupuesto</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                                    Cierre
                                                    <Tooltip><TooltipTrigger asChild><span className="ml-1.5 cursor-help"><Info className="h-3 w-3 inline text-muted-foreground"/></span></TooltipTrigger><TooltipContent><p>Presupuesto menos devoluciones y mermas.</p></TooltipContent></Tooltip>
                                                </TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                                    Real
                                                </TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Objetivo</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l">Desviación (Real vs. Obj.)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                         <TableBody>
                                            {renderSummaryRow('INGRESOS', totalRealIngresos, true)}
                                            {processedCostes.filter(g => ['Venta Gastronomía', 'Cesión de Personal'].includes(g.label)).map(renderCostRow)}
                                            {renderSummaryRow('GASTOS', totalRealGastos, true)}
                                            {processedCostes.filter(g => !['Venta Gastronomía', 'Cesión de Personal'].includes(g.label)).map(renderCostRow)}
                                            {renderFinalRow('RESULTADO', rentabilidadReal)}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="acumulado-mensual" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Acumulado Mensual {getYear(new Date())} (€)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Concepto</TableHead>
                                                {dataAcumulada.map(d => <TableHead key={d.mes} className="text-right capitalize">{d.mes}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow className="font-bold bg-primary/10">
                                                <TableCell className="text-black">Ingresos</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.ingresos)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Consumos MP</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.consumoMMPP)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Personal Cedido a CPR</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.cesionesGasto)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal de Apoyo CPR</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.personalSolicitado)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Varios (Costes Fijos)</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.varios)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="font-bold bg-primary/20">
                                                <TableCell className="text-black">RESULTADO</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className={cn("text-right", m.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(m.resultado)}</TableCell>)}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Acumulado Mensual {getYear(new Date())} (%)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>% sobre Ingresos</TableHead>
                                                {dataAcumulada.map(d => <TableHead key={d.mes} className="text-right capitalize">{d.mes}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                             <TableRow>
                                                <TableCell className="pl-8">Consumos MP</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.consumoMMPP / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal Cedido</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.cesionesGasto / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal de Apoyo CPR</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.personalSolicitado / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Varios (Costes Fijos)</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.varios / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="font-bold bg-primary/20">
                                                <TableCell className="text-black">RESULTADO</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className={cn("text-right", m.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatPercentage(m.ingresos > 0 ? m.resultado / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </TooltipProvider>
        </div>
    );
}
```