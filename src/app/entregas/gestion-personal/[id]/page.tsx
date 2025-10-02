

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

import type { Entrega, PersonalEntrega, CategoriaPersonal, Proveedor, PersonalEntregaTurno, AsignacionPersonal, EstadoPersonalEntrega, PedidoEntrega, EntregaHito } from '@/types';
import { ESTADO_PERSONAL_ENTREGA } from '@/types';
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
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

const formatDuration = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const asignacionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  dni: z.string().optional(),
  telefono: z.string().optional(),
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
  observaciones: z.string().optional().default(''),
  statusPartner: z.enum(['Pendiente Asignación', 'Gestionado']),
  asignaciones: z.array(asignacionSchema).optional(),
  requiereActualizacion: z.boolean().optional(),
});

const formSchema = z.object({
    turnos: z.array(personalTurnoSchema),
    observacionesGenerales: z.string().optional().default('')
});

type FormValues = z.infer<typeof formSchema>;

function FeedbackDialog({ turnoIndex, asigIndex, form }: { turnoIndex: number; asigIndex: number, form: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const { getValues, setValue } = form;

    const ratingFieldName = `turnos.${turnoIndex}.asignaciones.${asigIndex}.rating`;
    const commentFieldName = `turnos.${turnoIndex}.asignaciones.${asigIndex}.comentariosMice`;
    const asignacion = getValues(`turnos.${turnoIndex}.asignaciones.${asigIndex}`);
    
    const [rating, setRating] = useState(getValues(ratingFieldName) || 3);
    const [comment, setComment] = useState(getValues(commentFieldName) || '');
    
    useEffect(() => {
        if(isOpen) {
            setRating(getValues(ratingFieldName) || 3);
            setComment(getValues(commentFieldName) || '');
        }
    }, [isOpen, getValues, ratingFieldName, commentFieldName]);

    const handleSave = () => {
        setValue(ratingFieldName, rating, { shouldDirty: true });
        setValue(commentFieldName, comment, { shouldDirty: true });
        setIsOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            handleSave();
        }
        setIsOpen(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <div className="flex items-center justify-center cursor-pointer">
                    <Pencil className={cn("h-4 w-4", getValues(commentFieldName) && "text-primary")} />
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Valoración para: {asignacion?.nombre}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Desempeño (1-5)</Label>
                        <div className="flex items-center gap-4 pt-2">
                            <span className="text-sm text-muted-foreground">Bajo</span>
                            <Slider
                                value={[rating]}
                                onValueChange={(value) => setRating(value[0])}
                                max={5}
                                min={1}
                                step={1}
                            />
                            <span className="text-sm text-muted-foreground">Alto</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <Label>Comentarios Internos MICE</Label>
                        <Textarea 
                            value={comment} 
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            placeholder="Añade aquí comentarios internos sobre el desempeño..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


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

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [deliveryHitos, setDeliveryHitos] = useState<EntregaHito[]>([]);
  const [personalEntrega, setPersonalEntrega] = useState<PersonalEntrega | null>(null);
  const [ajustes, setAjustes] = useState<PersonalExternoAjuste[]>([]);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [], observacionesGenerales: '' },
  });

  const { control, setValue, watch, trigger, register, handleSubmit } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
  const loadData = useCallback(() => {
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);
        
        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        setDeliveryHitos(currentPedido?.hitos || []);

        const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const turnosDelPedido = allTurnos.find(p => p.osId === osId);
        setPersonalEntrega(turnosDelPedido || { osId, turnos: [], status: 'Pendiente' });
        
        if(turnosDelPedido) {
            form.reset({ 
                turnos: turnosDelPedido.turnos.map(t => ({
                    ...t,
                    fecha: new Date(t.fecha),
                    asignaciones: (t.asignaciones || []).map(a => ({
                        ...a,
                        horaEntradaReal: a.horaEntradaReal || '',
                        horaSalidaReal: a.horaSalidaReal || '',
                    }))
                })),
                observacionesGenerales: turnosDelPedido.observacionesGenerales || ''
            });
        }
        
        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
        setAjustes(storedAjustes[osId] || []);
        
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleFinalSave = (newStatus?: EstadoPersonalEntrega) => {
    setIsLoading(true);
    const data = form.getValues();

    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID del pedido.' });
      setIsLoading(false);
      return;
    }
    
    const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
    const index = allTurnos.findIndex(p => p.osId === osId);
    
    const currentStatus = personalEntrega?.status || 'Pendiente';
    
    const newPersonalData: PersonalEntrega = {
        osId,
        turnos: data.turnos.map(t => ({
            ...t, 
            fecha: format(t.fecha, 'yyyy-MM-dd'),
            statusPartner: t.statusPartner || 'Pendiente Asignación',
            requiereActualizacion: false,
            asignaciones: (t.asignaciones || []).map(a => ({
                ...a,
                horaEntradaReal: a.horaEntradaReal || '',
                horaSalidaReal: a.horaSalidaReal || '',
            })),
        })),
        status: newStatus || currentStatus,
        observacionesGenerales: data.observacionesGenerales,
    }
    
    if (index > -1) {
        allTurnos[index] = newPersonalData;
    } else {
        allTurnos.push(newPersonalData);
    }

    localStorage.setItem('personalEntrega', JSON.stringify(allTurnos));
    
    setPersonalEntrega(newPersonalData); // Update local state immediately

    setTimeout(() => {
        toast({ title: 'Guardado', description: 'Los cambios se han guardado.' });
        setIsLoading(false);
        form.reset(data); // Mark as not dirty
        if (nextAction) {
            nextAction();
            setNextAction(null);
        }
    }, 500);
  };
  
  const onSubmit = () => {
    setNextAction(() => () => {}); // Save and stay on page
    setShowStatusConfirm(true);
  };

  const onBackToList = () => {
    if (form.formState.isDirty) {
        setNextAction(() => () => router.push('/entregas/gestion-personal'));
        setShowStatusConfirm(true);
    } else {
        router.push('/entregas/gestion-personal');
    }
  };


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

  const watchedFields = watch('turnos');

  const { totalPlanned, totalReal, totalAjustes, finalTotalReal } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, turno) => {
      const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
      return acc + plannedHours * (turno.precioHora || 0);
    }, 0) || 0;

    const real = watchedFields?.reduce((acc, turno) => {
        return acc + (turno.asignaciones || []).reduce((sumAsignacion, asignacion) => {
            const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
            if (realHours > 0) {
                return sumAsignacion + realHours * (turno.precioHora || 0);
            }
            const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
            return sumAsignacion + plannedHours * (turno.precioHora || 0);
        }, 0);
    }, 0) || 0;
    
    const aj = ajustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);

    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, finalTotalReal: real + aj };
  }, [watchedFields, ajustes]);
  
  const addRow = () => {
    if (!osId || !entrega) return;
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(entrega.startDate),
        horaEntrada: '09:00',
        horaSalida: '17:00',
        observaciones: '',
        statusPartner: 'Pendiente Asignación',
        asignaciones: [],
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Turno eliminado' });
    }
  };
  
  const saveAjustes = (newAjustes: PersonalExternoAjuste[]) => {
      if (!osId) return;
      const allAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
      allAjustes[osId] = newAjustes;
      localStorage.setItem('personalExternoAjustes', JSON.stringify(allAjustes));
  }

  const addAjusteRow = () => {
      const newAjustes = [...ajustes, { id: Date.now().toString(), concepto: '', ajuste: 0 }];
      setAjustes(newAjustes);
      saveAjustes(newAjustes);
  };

  const updateAjuste = (index: number, field: 'concepto' | 'ajuste', value: string | number) => {
      const newAjustes = [...ajustes];
      if (field === 'ajuste') {
          newAjustes[index][field] = parseFloat(value as string) || 0;
      } else {
          newAjustes[index][field] = value as string;
      }
      setAjustes(newAjustes);
      saveAjustes(newAjustes);
  };

  const removeAjusteRow = (index: number) => {
      const newAjustes = ajustes.filter((_, i) => i !== index);
      setAjustes(newAjustes);
      saveAjustes(newAjustes);
  };

  const providerOptions = useMemo(() => {
    return proveedoresDB
        .filter(p => proveedoresMap.has(p.proveedorId)) 
        .map(p => ({ label: `${proveedoresMap.get(p.proveedorId)} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB, proveedoresMap]);

const hitosConPersonal = useMemo(() => {
    if (!deliveryHitos || !entrega) return [];
    return deliveryHitos
        .map((hito, index) => ({...hito, expedicionNumero: `${entrega.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`}))
        .filter(h => h.horasCamarero && h.horasCamarero > 0)
}, [deliveryHitos, entrega]);

const turnosAprobados = useMemo(() => {
    return watchedFields.filter(t => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0) || [];
}, [watchedFields]);


  if (!isMounted || !entrega) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }
  
  const statusBadgeVariant = personalEntrega?.status === 'Asignado' ? 'success' : 'warning';

  return (
    <>
      <main className="container mx-auto px-4 py-8">
      <TooltipProvider>
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <Button variant="ghost" size="sm" onClick={onBackToList}>
                            <ArrowLeft className="mr-2" />
                            Volver al listado
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3 mt-2"><Users />Asignación de Personal</h1>
                        <div className="text-muted-foreground mt-1 space-y-0.5">
                            <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                        </div>
                    </div>
                </div>

                <Card className="mb-4">
                    <CardHeader className="py-2 px-4 flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            Estado Global del Personal: 
                            <Badge variant={statusBadgeVariant}>{personalEntrega?.status || 'Pendiente'}</Badge>
                        </CardTitle>
                        <Button type="button" onClick={onSubmit} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar</span>
                        </Button>
                    </CardHeader>
                    {hitosConPersonal.length > 0 && (
                        <CardContent className="pt-0 p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="py-1 px-2">Nº Expedición</TableHead>
                                            <TableHead className="py-1 px-2">Dirección del servicio</TableHead>
                                            <TableHead className="py-1 px-2">Horario</TableHead>
                                            <TableHead className="py-1 px-2 w-[40%]">Observaciones</TableHead>
                                            <TableHead className="py-1 px-2 text-center">Horas Camarero</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hitosConPersonal.map(hito => (
                                            <TableRow key={hito.id}>
                                                <TableCell className="py-1 px-2 font-mono"><Badge>{hito.expedicionNumero}</Badge></TableCell>
                                                <TableCell className="py-1 px-2 font-medium">{hito.lugarEntrega} {hito.localizacion && `(${hito.localizacion})`}</TableCell>
                                                <TableCell className="py-1 px-2">{hito.hora}</TableCell>
                                                <TableCell className="py-1 px-2 text-xs text-muted-foreground">{hito.observaciones}</TableCell>
                                                <TableCell className="py-1 px-2 font-bold text-center">{hito.horasCamarero || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                      </CardContent>
                    )}
                </Card>

                <Tabs defaultValue="planificacion">
                     <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger value="planificacion" className="text-base px-6">Planificación de Turnos</TabsTrigger>
                        <TabsTrigger value="aprobados" className="text-base px-6">Turnos Aprobados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planificacion">
                        <Card>
                            <CardHeader className="py-3 flex-row items-center justify-between">
                                <CardTitle className="text-lg">Planificación de Turnos</CardTitle>
                                <Button type="button" onClick={addRow} size="sm">
                                    <PlusCircle className="mr-2" />
                                    Añadir Turno
                                </Button>
                            </CardHeader>
                            <CardContent className="p-2">
                                <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-1">Fecha</TableHead>
                                            <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                            <TableHead className="px-2 py-1">Horario</TableHead>
                                            <TableHead className="px-2 py-1 w-20">€/Hora</TableHead>
                                            <TableHead className="px-2 py-1">Observaciones para ETT</TableHead>
                                            <TableHead className="px-2 py-1">Estado</TableHead>
                                            <TableHead className="text-right px-2 py-1">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? (
                                            fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell className="px-2 py-1">
                                                        <FormField control={control} name={`turnos.${index}.fecha`} render={({ field: dateField }) => (
                                                            <FormItem>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Button variant={"outline"} className={cn("w-32 h-9 pl-3 text-left font-normal", !dateField.value && "text-muted-foreground")}>
                                                                                {dateField.value ? format(dateField.value, "dd/MM/yy") : <span>Elige</span>}
                                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                            </Button>
                                                                        </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0" align="start">
                                                                        <Calendar mode="single" selected={dateField.value} onSelect={dateField.onChange} initialFocus locale={es} />
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </FormItem>
                                                        )} />
                                                    </TableCell>
                                                    <TableCell className="px-2 py-1 min-w-48">
                                                        <FormField
                                                            control={control}
                                                            name={`turnos.${index}.proveedorId`}
                                                            render={({ field: selectField }) => (
                                                            <FormItem>
                                                                <Combobox
                                                                    options={providerOptions}
                                                                    value={selectField.value}
                                                                    onChange={(value) => handleProviderChange(index, value)}
                                                                    placeholder="Proveedor..."
                                                                />
                                                            </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-1 py-1">
                                                        <div className="flex items-center gap-1">
                                                            <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                                            <span className="text-muted-foreground">-</span>
                                                            <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-1">
                                                        <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9" readOnly /></FormControl></FormItem>} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center justify-center cursor-pointer">
                                                                    <CommentDialog turnoIndex={index} form={form} />
                                                                    {field.observaciones && <MessageSquare className="h-4 w-4 text-primary" />}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-xs">{field.observaciones}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-center">
                                                                {field.statusPartner === 'Gestionado' ? (
                                                                     <CheckCircle className="h-5 w-5 text-green-600"/>
                                                                ) : (
                                                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                                )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="font-bold">Asignaciones:</p>
                                                                {field.asignaciones && field.asignaciones.length > 0 ? (
                                                                    <ul className="list-disc pl-4 text-xs">
                                                                        {field.asignaciones.map(a => <li key={a.id}>{a.nombre} {a.dni && `(${a.dni})`}</li>)}
                                                                    </ul>
                                                                ) : <p>Pendiente de gestionar por ETT.</p>}
                                                            </TooltipContent>
                                                        </Tooltip>
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
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No hay personal asignado. Haz clic en "Añadir Turno" para empezar.
                                            </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="aprobados">
                         <Card>
                            <CardHeader className="py-3"><CardTitle className="text-lg">Turnos Aprobados</CardTitle></CardHeader>
                            <CardContent className="p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>DNI</TableHead>
                                            <TableHead>Fecha-Horario</TableHead>
                                            <TableHead className="w-24">H. Entrada Real</TableHead>
                                            <TableHead className="w-24">H. Salida Real</TableHead>
                                            <TableHead className="w-[200px] text-center">Desempeño y Comentarios MICE</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {turnosAprobados.length > 0 ? watchedFields.map((turno, turnoIndex) => {
                                            if (turno.statusPartner !== 'Gestionado' || !turno.asignaciones || turno.asignaciones.length === 0) return null;
                                            
                                            return turno.asignaciones.map((asignacion, asigIndex) => {
                                                const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
                                                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
                                                const deviation = realHours > 0 ? realHours - plannedHours : 0;
                                                const hasTimeMismatch = Math.abs(deviation) > 0.01;

                                                return (
                                                <TableRow key={asignacion.id} className={cn(hasTimeMismatch && "bg-amber-50")}>
                                                    <TableCell className="font-semibold flex items-center gap-2">
                                                        {hasTimeMismatch && (
                                                            <Tooltip>
                                                                <TooltipTrigger><AlertTriangle className="h-4 w-4 text-amber-500" /></TooltipTrigger>
                                                                <TooltipContent><p>Desviación: {deviation > 0 ? '+' : ''}{formatDuration(deviation)} horas</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {asignacion.nombre}
                                                    </TableCell>
                                                    <TableCell>{asignacion.dni}</TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold">{format(new Date(turno.fecha), 'dd/MM/yy')}</div>
                                                        <div className="text-xs">{turno.horaEntrada} - {turno.horaSalida}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                    <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`} render={({ field }) => <Input type="time" {...field} className="h-8" />} />
                                                    </TableCell>
                                                    <TableCell>
                                                    <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`} render={({ field }) => <Input type="time" {...field} className="h-8" />} />
                                                    </TableCell>
                                                    <TableCell className="w-[200px]">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <FeedbackDialog turnoIndex={turnoIndex} asigIndex={asigIndex} form={form} />
                                                            {asignacion.comentariosMice && <MessageSquare className="h-4 w-4 text-primary" />}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )})
                                        }) : (
                                            <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay turnos gestionados por la ETT.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                 <div className="mt-8">
                    <Card>
                        <CardHeader className="py-2"><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-8 p-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Planificado:</span>
                                    <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Real (Horas):</span>
                                    <span className="font-bold">{formatCurrency(totalReal)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Coste Total Real (con Ajustes):</span>
                                    <span className={finalTotalReal > totalPlanned ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal)}
                                    </span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación (Plan vs Real):</span>
                                    <span className={finalTotalReal > totalPlanned ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal - totalPlanned)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                               <h4 className="text-xs font-semibold text-muted-foreground">AJUSTE DE COSTES</h4>
                                {ajustes.map((ajuste, index) => (
                                    <div key={ajuste.id} className="flex gap-2 items-center">
                                        <Input 
                                            placeholder="Concepto" 
                                            value={ajuste.concepto} 
                                            onChange={(e) => updateAjuste(index, 'concepto', e.target.value)}
                                            className="h-7 text-xs flex-grow"
                                        />
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            placeholder="Importe"
                                            value={ajuste.ajuste}
                                            onChange={(e) => updateAjuste(index, 'ajuste', e.target.value)}
                                            className="w-24 h-7 text-xs"
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAjusteRow(index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                                <Button size="xs" variant="outline" className="w-full" type="button" onClick={addAjusteRow}>Añadir Ajuste</Button>
                                 <Separator className="my-2" />
                                  <div className="flex justify-between font-bold">
                                      <span>Total Ajustes:</span>
                                      <span>{formatCurrency(totalAjustes)}</span>
                                  </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </FormProvider>
        </TooltipProvider>

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
        
        <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Se ha asignado todo el personal?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Selecciona "Sí" si has terminado de asignar personal para este pedido. Esto cambiará el estado a "Asignado".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => { handleFinalSave('Asignado'); setShowStatusConfirm(false); }}>Sí</AlertDialogAction>
                    <AlertDialogAction onClick={() => { handleFinalSave('Pendiente'); setShowStatusConfirm(false); }}>No</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </>
  );
}
