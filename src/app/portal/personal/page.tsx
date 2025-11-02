
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isSameDay, isBefore, startOfToday, isWithinInterval, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle, Send, Printer, FileText, Upload } from 'lucide-react';

import type { PersonalExternoAjuste, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExterno, CategoriaPersonal, Proveedor, PersonalExternoTurno, AsignacionPersonal, EstadoPersonalExterno } from '@/types';
import { ESTADO_PERSONAL_EXTERNO, AJUSTE_CONCEPTO_OPCIONES } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { FeedbackDialog } from '@/components/portal/feedback-dialog';
import { calculateHours, formatCurrency, formatDuration, formatNumber } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { logActivity } from '../activity-log/utils';
import { Checkbox } from '@/components/ui/checkbox';


const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const asignacionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  dni: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  comentarios: z.string().optional(),
  rating: z.number().optional(),
  comentariosMice: z.string().optional(),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});


const personalTurnoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  solicitadoPor: z.enum(solicitadoPorOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  statusPartner: z.enum(['Pendiente Asignación', 'Gestionado']),
  asignaciones: z.array(asignacionSchema).optional(),
  requiereActualizacion: z.boolean().optional(),
});

const formSchema = z.object({
    turnos: z.array(personalTurnoSchema),
    ajustes: z.array(z.object({
        id: z.string(),
        proveedorId: z.string().min(1, "Debe seleccionar un proveedor."),
        concepto: z.string().min(1, "El concepto del ajuste es obligatorio."),
        importe: z.coerce.number(),
    })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function CommentDialog({ turnoIndex, form }: { turnoIndex: number; form: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const { getValues, setValue } = form;

    const fieldName = `turnos.${turnoIndex}.observaciones`;
    const dialogTitle = `Observaciones para la ETT`;

    const [comment, setComment] = useState(getValues(fieldName) || '');

    const handleSave = () => {
        setValue(fieldName, comment, { shouldDirty: true });
        setIsOpen(false);
    };
    
    useEffect(() => {
        if(isOpen) {
            setComment(getValues(fieldName) || '');
        }
    }, [isOpen, getValues, fieldName]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                    <Pencil className={cn("h-4 w-4", getValues(fieldName) && "text-primary")} />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Añade aquí comentarios..."
                />
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PersonalExternoPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  
  const [currentTurnos, setCurrentTurnos] = useState<(PersonalExternoTurno & { osId: string; status: EstadoPersonalExterno })[]>([]);
  const [currentAjustes, setCurrentAjustes] = useState<PersonalExternoAjuste[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const { impersonatedUser } = useImpersonatedUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


  const isAdminOrComercial = useMemo(() => {
    if (!impersonatedUser) return false;
    const roles = impersonatedUser.roles || [];
    return roles.includes('Admin') || roles.includes('Comercial');
  }, [impersonatedUser]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [], ajustes: [] },
  });

  const { control, setValue, watch, trigger, getValues, handleSubmit, formState } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
  const { fields: ajusteFields, append: appendAjuste, remove: removeAjuste } = useFieldArray({
    control,
    name: "ajustes",
  });
  
  const loadData = useCallback(() => {
    if (!impersonatedUser) return;
    try {
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedoresData = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setAllProveedores(allProveedoresData);

        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const turnosDelProveedor = allPersonalExterno
            .flatMap(p => p.turnos.map(t => ({ ...t, osId: p.osId, status: p.status })))
            .filter(t => isAdminOrComercial || allProveedoresData.find(p => p.id === t.proveedorId)?.id === impersonatedUser.proveedorId);


        setCurrentTurnos(turnosDelProveedor);
        
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de personal externo.' });
    } finally {
        setIsMounted(true);
    }
  }, [toast, impersonatedUser, isAdminOrComercial]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleProviderChange = useCallback((index: number, proveedorId: string) => {
    if (!proveedorId) return;
    const tipoPersonal = proveedoresDB.find(p => p.id === proveedorId);
    if (tipoPersonal) {
        setValue(`turnos.${index}.proveedorId`, tipoPersonal.id, { shouldDirty: true });
        setValue(`turnos.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
        setValue(`turnos.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
        trigger(`turnos.${index}`);
    }
}, [proveedoresDB, setValue, trigger]);

  const filteredTurnos = useMemo(() => {
    return currentTurnos.filter(turno => {
        let dateMatch = true;
        if (dateRange?.from) {
            const turnoDate = new Date(turno.fecha);
            if (dateRange.to) {
                dateMatch = isWithinInterval(turnoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
            } else {
                dateMatch = isSameDay(turnoDate, dateRange.from);
            }
        }
        const statusMatch = !showCompleted ? turno.statusPartner !== 'Gestionado' : true;
        
        const searchMatch = searchTerm === '' ||
            turno.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (turno.osId || '').toLowerCase().includes(searchTerm.toLowerCase()); // This needs OS data
        
        return dateMatch && statusMatch && searchMatch;
    })
  }, [currentTurnos, dateRange, showCompleted, searchTerm]);
  
  const setDatePreset = (preset: 'month' | 'year' | 'week') => {
    const now = new Date();
    if(preset === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    if(preset === 'year') setDateRange({ from: startOfYear(now), to: endOfYear(now) });
    if(preset === 'week') setDateRange({ from: startOfWeek(now, {weekStartsOn: 1}), to: endOfWeek(now, {weekStartsOn: 1}) });
  };
  
  const groupedTurnos = useMemo(() => {
    const grouped: Record<string, (PersonalExternoTurno & { osId: string; status: EstadoPersonalExterno })[]> = {};
    filteredTurnos.forEach(turno => {
        const dateKey = format(new Date(turno.fecha), 'yyyy-MM-dd');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(turno);
    });
    return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
  }, [filteredTurnos]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Portal de Personal..." />;
  }
  
  return (
    <main>
      <TooltipProvider>
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Users className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Personal Externo</h1>
                </div>
            </div>
            {impersonatedUser && (
                 <Badge variant="secondary" className="px-4 py-2 text-lg">
                    <Building2 className="mr-2 h-5 w-5" />
                    {allProveedores.find(p => p.id === impersonatedUser.proveedorId)?.nombreComercial || 'Admin View'}
                </Badge>
            )}
        </div>

        <Tabs defaultValue="lista">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lista">Lista de Turnos</TabsTrigger>
                <TabsTrigger value="calendario" disabled>Calendario (Próximamente)</TabsTrigger>
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
                        <PopoverContent className="w-auto p-0 flex">
                            <div className="p-2 border-r">
                                <div className="flex flex-col gap-1">
                                    <Button variant="outline" size="sm" onClick={() => {setDatePreset('week'); setIsDatePickerOpen(false);}}>Esta semana</Button>
                                    <Button variant="outline" size="sm" onClick={() => {setDatePreset('month'); setIsDatePickerOpen(false);}}>Este mes</Button>
                                    <Button variant="outline" size="sm" onClick={() => {setDateRange(undefined); setIsDatePickerOpen(false);}}>Limpiar</Button>
                                </div>
                            </div>
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} locale={es}/>
                        </PopoverContent>
                    </Popover>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(Boolean(checked))} />
                        <Label htmlFor="show-completed">Mostrar gestionados</Label>
                    </div>
                </div>
                <div className="space-y-4">
                    {groupedTurnos.length > 0 ? groupedTurnos.map(([date, dailyTurnos]) => (
                         <Card key={date}>
                            <CardHeader>
                                <CardTitle className="capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>OS</TableHead>
                                            <TableHead>Horario</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Nº Personas</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailyTurnos.map(turno => (
                                        <TableRow key={turno.id}>
                                            <TableCell><Badge variant="outline">{turno.osId.substring(0, 10)}...</Badge></TableCell>
                                            <TableCell>{turno.horaEntrada} - {turno.horaSalida}</TableCell>
                                            <TableCell>{turno.categoria}</TableCell>
                                            <TableCell>{(turno.asignaciones || []).length}</TableCell>
                                            <TableCell>
                                                <Badge variant={turno.statusPartner === 'Gestionado' ? 'success' : 'warning'}>
                                                    {turno.statusPartner}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" disabled={isReadOnly}>Gestionar</Button>
                                            </TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                         </Card>
                    )) : (
                         <Card>
                            <CardContent className="py-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No hay solicitudes</h3>
                                <p className="mt-1 text-sm text-muted-foreground">No hay turnos pendientes o que coincidan con los filtros seleccionados.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>
        </Tabs>
        </TooltipProvider>
    </main>
    </>
  );
}
