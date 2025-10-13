

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

import type { Entrega, PersonalEntrega, CategoriaPersonal, Proveedor, PersonalEntregaTurno, AsignacionPersonal, EstadoPersonalEntrega, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExternoAjuste } from '@/types';
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
import { formatCurrency, calculateHours, formatDuration } from '@/lib/utils';


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
  solicitadoPor: z.enum(['SALA', 'COCINA', 'LOGISTICA', 'RRHH']),
  tipoServicio: z.enum(['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga']),
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

export default function PersonalExternoPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [personalExterno, setPersonalExterno] = useState<PersonalExternoOrder | null>(null);
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
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        if (currentOS?.space) {
            const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as any[];
            const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
            setSpaceAddress(currentSpace?.calle || '');
        }
        
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);
        
        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
        setAjustes(storedAjustes[osId] || []);
        
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
        
        const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const turnosDelPedido = allTurnos.filter(p => p.osId === osId);
        
        form.reset({ 
            turnos: turnosDelPedido.map(t => ({
                ...t,
                fecha: new Date(t.fecha),
                asignaciones: (t.asignaciones || []).map(a => ({
                    ...a,
                    horaEntradaReal: a.horaEntradaReal || '',
                    horaSalidaReal: a.horaSalidaReal || '',
                }))
            })),
            observacionesGenerales: turnosDelPedido[0]?.observacionesGenerales || ''
        });

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleFinalSave = () => {
    setIsLoading(true);
    const data = form.getValues();

    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID del pedido.' });
      setIsLoading(false);
      return;
    }
    
    let allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const otherOsOrders = allTurnos.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalExternoOrder[] = data.turnos.map(t => {
        const existingTurno = watchedFields?.find(et => et.id === t.id);
        const requiereActualizacion = !existingTurno || !existingTurno.asignaciones;
        return {
            ...t,
            osId,
            fecha: format(t.fecha, 'yyyy-MM-dd'),
            statusPartner: existingTurno?.statusPartner || 'Pendiente Asignación',
            requiereActualizacion: requiereActualizacion,
            asignaciones: (t.asignaciones || []).map(a => ({
                ...a,
                horaEntradaReal: a.horaEntradaReal || '',
                horaSalidaReal: a.horaSalidaReal || '',
            })),
            observacionesGenerales: data.observacionesGenerales
        }
    });
    
    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));
    
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
    handleFinalSave();
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

  const { totalPlanned, totalReal, totalAjustes, finalTotalReal, totalPlanificadoConAjustes } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, turno) => {
      const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
      return acc + plannedHours * (turno.precioHora || 0);
    }, 0) || 0;

    const real = watchedFields?.reduce((acc, turno) => {
        return acc + (turno.asignaciones || []).reduce((sumAsignacion, asignacion) => {
            let realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
            if (realHours <= 0) {
                realHours = calculateHours(turno.horaEntrada, turno.horaSalida);
            }
            return sumAsignacion + realHours * (turno.precioHora || 0);
        }, 0);
    }, 0) || 0;
    
    const aj = ajustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
    
    const costePlanificadoConAjustes = planned + aj;

    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, finalTotalReal: real + aj, totalPlanificadoConAjustes: costePlanificadoConAjustes };
  }, [watchedFields, ajustes]);
  
  const addRow = () => {
    if (!osId || !serviceOrder) return;
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(serviceOrder.startDate),
        horaEntrada: '09:00',
        horaSalida: '17:00',
        solicitadoPor: 'SALA',
        tipoServicio: 'Servicio',
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
      const proveedorId = (document.getElementById('ajuste-proveedor') as HTMLSelectElement)?.value;
      const concepto = (document.getElementById('ajuste-concepto') as HTMLInputElement)?.value;
      const importe = (document.getElementById('ajuste-importe') as HTMLInputElement)?.value;
      if(!proveedorId || !concepto || !importe) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes rellenar todos los campos para añadir un ajuste.'});
        return;
      }
      const newAjustes = [...ajustes, { id: Date.now().toString(), proveedorId, concepto, ajuste: parseFloat(importe) }];
      setAjustes(newAjustes);
      saveAjustes(newAjustes);
      if(document.getElementById('ajuste-concepto')) (document.getElementById('ajuste-concepto') as HTMLInputElement).value = '';
      if(document.getElementById('ajuste-importe')) (document.getElementById('ajuste-importe') as HTMLInputElement).value = '';
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

const turnosAprobados = useMemo(() => {
    return watchedFields.filter(t => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0) || [];
}, [watchedFields]);

  const uniqueTurnoProviders = useMemo(() => {
    const providerIds = new Set(watchedFields?.map(t => t.proveedorId));
    return Array.from(providerIds).map(id => {
      const turno = watchedFields.find(t => t.proveedorId === id);
      const cat = proveedoresDB.find(p => p.id === id);
      const prov = cat ? proveedoresMap.get(cat.proveedorId) : 'Desconocido';
      return { id: cat?.proveedorId || '', label: prov || 'Desconocido'};
    }).filter((v,i,a) => a.findIndex(t => (t.id === v.id)) === i); // unique
  }, [watchedFields, proveedoresDB, proveedoresMap]);


  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <main>
      <TooltipProvider>
        <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex items-start justify-end mb-4">
                    <Button type="button" onClick={onSubmit} disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
                 <Accordion type="single" collapsible className="w-full mb-4" >
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
                                    <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yy')} {item.horaInicio}</TableCell>
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

                <Tabs defaultValue="planificacion">
                     <TabsList className="mb-4 grid w-full grid-cols-2 max-w-lg">
                        <TabsTrigger value="planificacion" className="text-base px-6">Planificación de Turnos</TabsTrigger>
                        <TabsTrigger value="aprobados" className="text-base px-6">Cierre y Horas Reales</TabsTrigger>
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
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-1">Fecha</TableHead>
                                            <TableHead className="px-2 py-1">Solicitado</TableHead>
                                            <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                            <TableHead className="px-2 py-1">Tipo Servicio</TableHead>
                                            <TableHead className="px-1 py-1 bg-muted/30 w-24">H. Entrada</TableHead>
                                            <TableHead className="px-1 py-1 bg-muted/30 w-24">H. Salida</TableHead>
                                            <TableHead className="px-1 py-1 bg-muted/30 w-20">H. Plan.</TableHead>
                                            <TableHead className="px-1 py-1 bg-muted/30 w-20">€/Hora</TableHead>
                                            <TableHead className="px-1 py-1 w-10"></TableHead>
                                            <TableHead className="text-right px-2 py-1"></TableHead>
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
                                                                            <Button variant={"outline"} className={cn("w-32 h-8 text-xs pl-2 font-normal", !dateField.value && "text-muted-foreground")}>
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
                                                        <TableCell className="px-2 py-1">
                                                        <FormField control={control} name={`turnos.${index}.solicitadoPor`} render={({ field: selectField }) => (
                                                            <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['SALA', 'COCINA', 'LOGISTICA', 'RRHH'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                        )}/>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-1 min-w-48">
                                                        <FormField
                                                            control={control}
                                                            name={`turnos.${index}.proveedorId`}
                                                            render={({ field }) => (
                                                            <FormItem>
                                                                <Combobox
                                                                    options={providerOptions}
                                                                    value={field.value}
                                                                    onChange={(value) => handleProviderChange(index, value)}
                                                                    placeholder="Proveedor..."
                                                                />
                                                            </FormItem>
                                                            )}/>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-1">
                                                        <FormField control={control} name={`turnos.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                            <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                        )}/>
                                                    </TableCell>
                                                    <TableCell className="border-l px-2 py-1 bg-muted/30">
                                                        <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                    </TableCell>
                                                    <TableCell className="px-2 py-1 bg-muted/30">
                                                        <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                    </TableCell>
                                                     <TableCell className="px-1 py-1 bg-muted/30 font-mono text-center">
                                                        {formatDuration(calculateHours(watchedFields[index].horaEntrada, watchedFields[index].horaSalida))}
                                                    </TableCell>
                                                    <TableCell className="border-r px-2 py-1 bg-muted/30">
                                                        <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-8 text-xs" readOnly /></FormControl></FormItem>} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CommentDialog turnoIndex={index} form={form} />
                                                    </TableCell>
                                                    <TableCell className="text-right px-2 py-1">
                                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setRowToDelete(index)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                            <TableCell colSpan={10} className="h-24 text-center">
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
                            <CardHeader className="py-3"><CardTitle className="text-lg">Cierre y Horas Reales</CardTitle></CardHeader>
                            <CardContent className="p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>DNI</TableHead>
                                            <TableHead>Fecha-Horario</TableHead>
                                            <TableHead className="w-24">H. Entrada Real</TableHead>
                                            <TableHead className="w-24">H. Salida Real</TableHead>
                                            <TableHead className="w-24">Horas Reales</TableHead>
                                            <TableHead className="w-[100px] text-center">Valoración MICE</TableHead>
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
                                                    <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`} render={({ field }) => <Input type="time" {...field} className="h-8 w-24 text-xs" />} />
                                                    </TableCell>
                                                    <TableCell>
                                                            <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`} render={({ field }) => <Input type="time" {...field} className="h-8 w-24 text-xs" />} />
                                                    </TableCell>
                                                     <TableCell className="font-mono text-center">{realHours > 0 ? formatDuration(realHours) : '-'}</TableCell>
                                                    <TableCell className="w-[100px] text-center">
                                                        <FeedbackDialog turnoIndex={turnoIndex} asigIndex={asigIndex} form={form} />
                                                    </TableCell>
                                                </TableRow>
                                            )})
                                        }) : (
                                            <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay turnos gestionados por la ETT.</TableCell></TableRow>
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
                                <div className="flex justify-between font-bold text-base">
                                    <span className="text-muted-foreground">Coste Total Planificado (con Ajustes):</span>
                                    <span className="font-bold">{formatCurrency(totalPlanificadoConAjustes)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Coste Total Real (con Ajustes):</span>
                                    <span className={finalTotalReal > totalPlanificadoConAjustes ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal)}
                                    </span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación (Plan vs Real):</span>
                                    <span className={finalTotalReal > totalPlanificadoConAjustes ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal - totalPlanificadoConAjustes)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                               <h4 className="text-xs font-semibold text-muted-foreground">AJUSTE DE COSTES</h4>
                               <div className="border rounded-md p-2 space-y-2">
                                {ajustes.map((ajuste, index) => (
                                    <div key={ajuste.id} className="flex gap-2 items-center">
                                        <p className="text-sm flex-grow">({proveedoresMap.get(ajuste.proveedorId) || '?'}) {ajuste.concepto}: <span className="font-mono">{formatCurrency(ajuste.ajuste)}</span></p>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAjusteRow(index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                     <Select name="ajuste-proveedor" id="ajuste-proveedor">
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Proveedor..."/></SelectTrigger>
                                        <SelectContent>
                                            {uniqueTurnoProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input id="ajuste-concepto" placeholder="Concepto" className="h-8 text-xs flex-grow"/>
                                    <Input id="ajuste-importe" type="number" step="0.01" placeholder="Importe" className="text-right h-8 w-24 text-xs"/>
                                    <Button type="button" onClick={handleAddAjuste} size="sm" className="h-8 text-xs">Añadir</Button>
                                </div>
                                  <div className="flex justify-end font-bold pt-2">
                                      <span className="text-sm">Total Ajustes:</span>
                                      <span className="text-sm ml-2">{formatCurrency(totalAjustes)}</span>
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

      </main>
    </>
  );
}
