
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

import type { Entrega, PersonalEntrega, CategoriaPersonal, Proveedor, PersonalEntregaTurno, AsignacionPersonal, EstadoPersonalEntrega, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExternoAjuste, PersonalExternoOrder } from '@/types';
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
  solicitadoPor: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
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
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [ajustes, setAjustes] = useState<PersonalExternoAjuste[]>([]);
  
  // State for the new adjustment form
  const [newAjusteProveedorId, setNewAjusteProveedorId] = useState('');
  const [newAjusteConcepto, setNewAjusteConcepto] = useState('');
  const [newAjusteImporte, setNewAjusteImporte] = useState<number | ''>('');


  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [], observacionesGenerales: '' },
  });

  const { control, setValue, watch, trigger, register } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
  const loadData = useCallback(() => {
    try {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);
        
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
    
    const aj = ajustes.reduce((sum, ajuste) => sum + ajuste.importe, 0);
    
    const costePlanificadoConAjustes = planned + aj;

    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, finalTotalReal: real + aj, totalPlanificadoConAjustes: costePlanificadoConAjustes };
  }, [watchedFields, ajustes]);

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    let allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const otherOsOrders = allTurnos.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalExternoOrder[] = data.turnos.map(t => {
      const existingTurno = watchedFields?.find(et => et.id === t.id);
      return {
        ...t,
        osId,
        fecha: format(t.fecha, 'yyyy-MM-dd'),
        statusPartner: existingTurno?.statusPartner || 'Pendiente Asignación',
        requiereActualizacion: !existingTurno || JSON.stringify(t) !== JSON.stringify(existingTurno),
        asignaciones: (t.asignaciones || []).map(a => ({
            ...a,
            horaEntradaReal: a.horaEntradaReal || '',
            horaSalidaReal: a.horaSalidaReal || '',
        })),
        observacionesGenerales: data.observacionesGenerales
      };
    });

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
        setIsLoading(false);
        form.reset(data); // Mark as not dirty
    }, 500);
  };
  
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
      setAjustes(newAjustes);
  }

  const handleAddAjuste = () => {
    if (!newAjusteProveedorId || !newAjusteConcepto || !newAjusteImporte) {
        toast({ variant: 'destructive', title: 'Error', description: 'El proveedor, concepto y el importe son obligatorios.' });
        return;
    }
    const newAjustes = [...ajustes, { id: Date.now().toString(), proveedorId: newAjusteProveedorId, concepto: newAjusteConcepto, importe: newAjusteImporte }];
    saveAjustes(newAjustes);

    setNewAjusteProveedorId('');
    setNewAjusteConcepto('');
    setNewAjusteImporte('');
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
      const cat = proveedoresDB.find(p => p.id === id);
      const provId = cat ? cat.proveedorId : '';
      return { id: provId, label: proveedoresMap.get(provId) || 'Desconocido'};
    }).filter((v,i,a) => v.id && a.findIndex(t => (t.id === v.id)) === i);
  }, [watchedFields, proveedoresDB, proveedoresMap]);


  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <TooltipProvider>
        <FormProvider {...form}>
        <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-end mb-4">
                <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
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
                                <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yy')} {item.horaEntrada}</TableCell>
                                <TableCell className="py-2 px-3">{item.descripcion}</TableCell>
                                <TableCell className="py-2 px-3">{item.asistentes}</TableCell>
                                <TableCell className="py-2 px-3">{calculateHours(item.horaEntrada, item.horaSalida).toFixed(2)}h</TableCell>
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
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1 min-w-48">
                                                    <FormField
                                                        control={control}
                                                        name={`turnos.${index}.proveedorId`}
                                                        render={({ field: f }) => (
                                                        <FormItem>
                                                            <Combobox
                                                                options={providerOptions}
                                                                value={f.value}
                                                                onChange={(value) => handleProviderChange(index, value)}
                                                                placeholder="Proveedor..."
                                                            />
                                                        </FormItem>
                                                        )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    <FormField control={control} name={`turnos.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
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
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Coste Total Planificado (sin ajustes):</span>
                                <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-base">
                                <span >Coste Total Planificado (con Ajustes):</span>
                                <span >{formatCurrency(totalPlanificadoConAjustes)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Coste Total Real (Horas):</span>
                                <span className="font-bold">{formatCurrency(totalReal)}</span>
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
                                    <p className="text-sm flex-grow">({proveedoresMap.get(ajuste.proveedorId) || '?'}) {ajuste.concepto}: <span className="font-mono">{formatCurrency(ajuste.importe)}</span></p>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAjusteRow(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Select onValueChange={setNewAjusteProveedorId} value={newAjusteProveedorId}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Proveedor..."/></SelectTrigger>
                                    <SelectContent>
                                        {uniqueTurnoProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input value={newAjusteConcepto} onChange={e => setNewAjusteConcepto(e.target.value)} placeholder="Concepto" className="h-8 text-xs flex-grow"/>
                                <Input value={newAjusteImporte} onChange={e => setNewAjusteImporte(Number(e.target.value) || '')} type="number" step="0.01" placeholder="Importe" className="text-right h-8 w-24 text-xs"/>
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
    </>
  );
}

```
- src/app/os/personal-externo/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Loader2 } from 'lucide-react';
import type { PersonalExternoOrder, CategoriaPersonal } from '@/types';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';


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

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalExternoSchema = z.object({
  id: z.string(),
  osId: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  solicitadoPor: z.enum(solicitadoPorOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

const formSchema = z.object({
    personal: z.array(personalExternoSchema)
})

type PersonalExternoFormValues = z.infer<typeof formSchema>;


export default function PersonalExternoPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<PersonalExternoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue, trigger } = form;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "personal",
  });
  
 const handleProviderChange = useCallback((index: number, proveedorId: string) => {
    if (!proveedorId) return;
    const tipoPersonal = proveedoresDB.find(p => p.id === proveedorId);
    if (tipoPersonal) {
      setValue(`personal.${index}.proveedorId`, tipoPersonal.id, { shouldDirty: true });
      setValue(`personal.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
      trigger(`personal.${index}`);
    }
}, [proveedoresDB, setValue, trigger]);
  
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
        const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const relatedOrders = allOrders.filter(order => order.osId === osId);
        form.reset({ personal: relatedOrders.map(o => ({...o, fecha: new Date(o.fecha), horaEntradaReal: o.horaEntradaReal || '', horaSalidaReal: o.horaSalidaReal || ''})) });

        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: PersonalExternoFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const otherOsOrders = allOrders.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalExternoOrder[] = data.personal.map(p => ({ ...p, osId, fecha: format(p.fecha, 'yyyy-MM-dd') }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal Externo guardado', description: 'Todos los cambios han sido guardados.' });
        setIsLoading(false);
        form.reset(data); // Resets form with new values, marking it as not dirty
    }, 500);
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(),
        horaEntrada: '09:00',
        horaSalida: '17:00',
        solicitadoPor: 'Sala',
        tipoServicio: 'Servicio',
        observaciones: '',
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

  const providerOptions = useMemo(() => {
    return proveedoresDB
        .filter(p => p.nombreProveedor)
        .map(p => ({ label: `${p.nombreProveedor} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }

  return (
    <>
        <FormProvider {...form}>
        <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-end mb-4">
                <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">Guardar Cambios</span>
                </Button>
            </div>
            
            <Card className="mb-4">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Planificación de Personal</CardTitle>
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
                                    <TableHead className="px-2 py-2">Fecha</TableHead>
                                    <TableHead className="px-2 py-2">Solicitado Por</TableHead>
                                    <TableHead className="px-2 py-2 min-w-48">Proveedor - Categoría</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-2 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-2 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`personal.${index}.fecha`} render={({ field: dateField }) => (
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
                                            <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`personal.${index}.solicitadoPor`} render={({ field: selectField }) => (
                                                <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                            )}/>
                                        </TableCell>
                                        <TableCell className="px-2 py-1 min-w-48">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.proveedorId`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={providerOptions}
                                                        value={field.value}
                                                        onChange={(value) => handleProviderChange(index, value)}
                                                        placeholder="Proveedor..."
                                                    />
                                                </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`personal.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                            )}/>
                                        </TableCell>
                                        <TableCell className="border-l px-2 py-1 bg-muted/30">
                                            <FormField control={control} name={`personal.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 bg-muted/30">
                                            <FormField control={control} name={`personal.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1 bg-muted/30">
                                            <FormField control={control} name={`personal.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9" readOnly /></FormControl></FormItem>} />
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
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader><CardTitle>Cierre y Horas Reales</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>H. Entrada Real</TableHead>
                                <TableHead>H. Salida Real</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-semibold">{proveedoresDB.find(p => p.id === field.proveedorId)?.nombreProveedor || '-'}</TableCell>
                                <TableCell>{field.categoria}</TableCell>
                                <TableCell>
                                    <FormField
                                        control={control}
                                        name={`personal.${index}.horaEntradaReal`}
                                        render={({ field }) => <Input type="time" {...field} className="w-24 h-9"/>}
                                    />
                                </TableCell>
                                <TableCell>
                                        <FormField
                                        control={control}
                                        name={`personal.${index}.horaSalidaReal`}
                                        render={({ field }) => <Input type="time" {...field} className="w-24 h-9"/>}
                                    />
                                </TableCell>
                            </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay personal planificado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
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
    </>
  );
}


```
- src/app/os/page.tsx:
```tsx

CANTFIX
    
```
- src/hooks/use-impersonated-user.ts:
```ts

'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PortalUser } from '@/types';

type ImpersonatedUserContextType = {
  impersonatedUser: PortalUser | null;
  setImpersonatedUser: (user: PortalUser | null) => void;
};

const ImpersonatedUserContext = createContext<ImpersonatedUserContextType | undefined>(undefined);

export function ImpersonatedUserProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUserState] = useState<PortalUser | null>(null);

  useEffect(() => {
    // On initial load, try to get the user from localStorage
    const storedUser = localStorage.getItem('impersonatedUser');
    if (storedUser) {
      setImpersonatedUserState(JSON.parse(storedUser));
    }
  }, []);

  const setImpersonatedUser = (user: PortalUser | null) => {
    setImpersonatedUserState(user);
    if (user) {
      localStorage.setItem('impersonatedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('impersonatedUser');
    }
  };

  return (
    <ImpersonatedUserContext.Provider value={{ impersonatedUser, setImpersonatedUser }}>
      {children}
    </ImpersonatedUserContext.Provider>
  );
}

export function useImpersonatedUser() {
  const context = useContext(ImpersonatedUserContext);
  if (context === undefined) {
    throw new Error('useImpersonatedUser must be used within a ImpersonatedUserProvider');
  }
  return context;
}

```
- src/hooks/use-loading-store.ts:
```ts
'use client';

import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
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
- src/lib/constants.ts:
```ts

import type { ObjetivosGasto } from './types';

export const GASTO_LABELS: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Bio',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler material',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
};

```
- src/lib/cpr-nav.ts:
```ts


'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Visión general del taller de producción.' },
    { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardList, description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory, description: 'Gestiona la producción en cocina.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
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
        'KILO': 'kg',
        'LITRO': 'l',
        'UNIDAD': 'ud',
    }
    return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function calculateHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
        let startTime = parse(start, 'HH:mm', new Date());
        let endTime = parse(end, 'HH:mm', new Date());

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;

        // Si la hora de fin es anterior a la de inicio, asumimos que es del día siguiente
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
  numeroDeSalas?: number;
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

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    descripcion: string;
    fecha: string;
    horaInicio: string;
    asistentes: number;
    comentarios?: string;
    sala?: string;
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

export type PersonalExternoOrder = {
  id: string;
  osId: string;
  proveedorId: string;
  categoria: string;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  solicitadoPor: 'Sala' | 'Pase' | 'Otro';
  tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
  observaciones?: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
  asignaciones?: AsignacionPersonal[];
  statusPartner?: 'Pendiente Asignación' | 'Gestionado';
  requiereActualizacion?: boolean;
  observacionesGenerales?: string;
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
};

export type PersonalExternoAjuste = {
    id: string;
    proveedorId: string;
    concepto: string;
    importe: number;
}
export const UNIDADES_MEDIDA = ['UNIDAD', 'KILO', 'LITRO', 'GRAMO', 'BOTELLA', 'CAJA', 'PACK'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  idProveedor: z.string().optional(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string().optional(),
  nombreProveedor: z.string().optional(),
  familiaCategoria: z.string().optional(),
  precioCompra: z.coerce.number().min(0, "Debe ser un valor positivo."),
  unidadConversion: z.coerce.number().min(1, "Debe ser mayor que 0.").default(1),
  precio: z.coerce.number().min(0),
  precioAlquiler: z.coerce.number().min(0).optional(),
  unidad: z.enum(UNIDADES_MEDIDA),
  tipo: z.string().optional(),
  alquiler: z.boolean().default(false),
  observaciones: z.string().optional(),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: string[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: 'KILO' | 'LITRO' | 'UNIDAD';
  merma: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Receta = {
    id: string;
    numeroReceta?: string;
    nombre: string;
    nombre_en?: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    descripcionComercial_en?: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: { id: string; menajeId: string; descripcion: string; ratio: number }[];
    instruccionesMiseEnPlace: string;
    fotosMiseEnPlaceURLs?: string[];
    instruccionesRegeneracion: string;
    fotosRegeneracionURLs?: string[];
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: string[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO';
    tecnicaCoccionPrincipal?: string;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL', 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    // Calculated fields
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
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
    solicitante?: 'Sala' | 'Cocina';
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

export const ESTADO_PERSONAL_ENTREGA = ['Pendiente', 'Asignado'] as const;
export type EstadoPersonalEntrega = typeof ESTADO_PERSONAL_ENTREGA[number];

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
  comentarios: string;
  comentariosMice?: string;
  rating?: number;
  horaEntradaReal: string;
  horaSalidaReal: string;
};

export type PersonalEntregaTurno = {
  id: string;
  proveedorId: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  categoria: string;
  precioHora: number;
  observaciones: string;
  statusPartner: 'Pendiente Asignación' | 'Gestionado';
  asignaciones: AsignacionPersonal[];
  requiereActualizacion?: boolean;
};

export type PersonalEntrega = {
    osId: string;
    turnos: PersonalEntregaTurno[];
    status: EstadoPersonalEntrega;
    observacionesGenerales?: string;
};


// --- PORTAL & AUTH ---
export const PORTAL_ROLES = ['Partner Gastronomia', 'Partner Personal', 'Transporte', 'Admin', 'Comercial', 'CPR', 'Pase', 'Dirección', 'Almacen', 'Operaciones', 'Project Manager'] as const;
export type PortalUserRole = typeof PORTAL_ROLES[number];

export type PortalUser = {
  id: string;
  email: string;
  nombre: string;
  roles: PortalUserRole[];
  proveedorId?: string; // Linked to Proveedor DB
}

export type ActivityLog = {
    id: string;
    timestamp: string; // ISO 8601
    userId: string;
    userName: string;
    userRole: PortalUserRole;
    action: string;
    details: string;
    entityId: string; // ID of the entity being acted upon (e.g., OS ID, Turno ID)
}

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

export type MenajeDB = {
    id: string;
    descripcion: string;
    categoria: string;
    imagen: string;
}

export type TipoCocina = {
    id: string;
    nombre: string;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}

```
- tailwind.config.ts:
```ts

import type {Config} from 'tailwindcss';
const {fontFamily} = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-body)', ...fontFamily.sans],
        headline: ['var(--font-headline)', ...fontFamily.sans],
        code: ['monospace'],
      },
      typography: (theme: (arg0: string) => any) => ({
        DEFAULT: {
          css: {
            h1: {
              fontFamily: theme('fontFamily.headline'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
            },
            '--tw-prose-bullets': theme('colors.primary.DEFAULT'),
          },
        },
      }),
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;


```
- tsconfig.json:
```json

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types/index.ts"],
      "@/dnd/*": ["components/dnd/*"]
    },
    "types": ["node", "@types/papaparse", "@types/nprogress", "jspdf-autotable", "@types/react-signature-canvas"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```