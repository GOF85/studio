
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

import type { PersonalExternoOrder, CategoriaPersonal, Proveedor, PersonalExternoAjuste } from '@/types';
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
  solicitadoPor: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  statusPartner: z.enum(['Pendiente Asignación', 'Gestionado']),
  asignaciones: z.array(asignacionSchema).optional(),
  requiereActualizacion: z.boolean().optional(),
});

const formSchema = z.object({
    personal: z.array(personalTurnoSchema),
    ajustes: z.array(z.object({
        id: z.string(),
        proveedorId: z.string(),
        concepto: z.string(),
        importe: z.number(),
    })).optional(),
})

type PersonalExternoFormValues = z.infer<typeof formSchema>;

function FeedbackDialog({ turnoIndex, asigIndex, form }: { turnoIndex: number; asigIndex: number, form: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const { getValues, setValue } = form;

    const ratingFieldName = `personal.${turnoIndex}.asignaciones.${asigIndex}.rating`;
    const commentFieldName = `personal.${turnoIndex}.asignaciones.${asigIndex}.comentariosMice`;
    const asignacion = getValues(`personal.${turnoIndex}.asignaciones.${asigIndex}`);
    
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
                <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                    <Pencil className={cn("h-4 w-4", getValues(commentFieldName) && "text-primary")} />
                </Button>
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

    const fieldName = `personal.${turnoIndex}.observaciones`;
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
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "personal",
  });
  
  const loadData = useCallback(() => {
    try {
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));

        const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const turnosDelPedido = allTurnos.filter(p => p.osId === osId);
        
        form.reset({ personal: turnosDelPedido.map(t => ({...t, fecha: new Date(t.fecha), asignaciones: t.asignaciones || []})) });

        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
        form.setValue('ajustes', storedAjustes[osId] || []);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de personal externo.' });
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
      setValue(`personal.${index}.proveedorId`, tipoPersonal.id, { shouldDirty: true });
      setValue(`personal.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
      trigger(`personal.${index}`);
    }
}, [proveedoresDB, setValue, trigger]);

  const watchedFields = useWatch({ control, name: 'personal' });
  const watchedAjustes = useWatch({ control, name: 'ajustes' });

 const { totalPlanned, totalReal, totalAjustes, finalTotalReal } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, order) => {
      const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
      return acc + plannedHours * (order.precioHora || 0);
    }, 0) || 0;

    const real = watchedFields?.reduce((acc, order) => {
        return acc + (order.asignaciones || []).reduce((sumAsignacion, asignacion) => {
            const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
            if (realHours > 0) {
                return sumAsignacion + realHours * (order.precioHora || 0);
            }
            // If no real hours, use planned hours for this person
            const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
            return sumAsignacion + plannedHours * (order.precioHora || 0);
        }, 0);
    }, 0) || 0;
    
    const aj = watchedAjustes?.reduce((sum, ajuste) => sum + ajuste.importe, 0) || 0;

    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, finalTotalReal: real + aj };
  }, [watchedFields, watchedAjustes]);

 const onSubmit = (data: PersonalExternoFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const otherOsOrders = allTurnos.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalExternoOrder[] = data.personal.map(t => {
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
        }
    });

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));

    const allAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
    allAjustes[osId] = data.ajustes || [];
    localStorage.setItem('personalExternoAjustes', JSON.stringify(allAjustes));

    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
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
  
    const { fields: ajusteFields, append: appendAjuste, remove: removeAjuste } = useFieldArray({
        control,
        name: "ajustes",
    });

    const addAjusteRow = () => {
        appendAjuste({ id: Date.now().toString(), proveedorId: '', concepto: '', importe: 0 });
    };

    const removeAjusteRow = (index: number) => {
        removeAjuste(index);
    };

  const providerOptions = useMemo(() => {
    return proveedoresDB
        .filter(p => proveedoresMap.has(p.proveedorId)) 
        .map(p => ({ label: `${proveedoresMap.get(p.proveedorId)} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB, proveedoresMap]);

const turnosAprobados = useMemo(() => {
    return watchedFields?.filter(t => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0) || [];
}, [watchedFields]);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }

  return (
    <>
      <main>
        <TooltipProvider>
        <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-end mb-4">
                <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">Guardar Cambios</span>
                </Button>
            </div>
            
            <Tabs defaultValue="planificacion">
                 <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="planificacion">Planificación de Turnos</TabsTrigger>
                    <TabsTrigger value="aprobados">Cierre y Horas Reales</TabsTrigger>
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
                                        <TableHead className="px-2 py-1">Solicitado Por</TableHead>
                                        <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                        <TableHead className="px-2 py-1">Tipo Servicio</TableHead>
                                        <TableHead colSpan={4} className="text-center border-l border-r px-2 py-1 bg-muted/30">Planificado</TableHead>
                                        <TableHead className="px-2 py-1">Observaciones para ETT</TableHead>
                                        <TableHead className="px-2 py-1">Estado</TableHead>
                                        <TableHead className="text-right px-2 py-1">Acción</TableHead>
                                    </TableRow>
                                    <TableRow>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="border-l px-2 py-1 bg-muted/30 w-24">H. Entrada</TableHead>
                                        <TableHead className="px-2 py-1 bg-muted/30 w-24">H. Salida</TableHead>
                                        <TableHead className="px-2 py-1 bg-muted/30">Horas Plan.</TableHead>
                                        <TableHead className="border-r px-2 py-1 bg-muted/30 w-20">€/Hora</TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
                                        <TableHead className="px-2 py-1"></TableHead>
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
                                                    <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
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
                                                    <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                )}/>
                                            </TableCell>
                                            <TableCell className="border-l px-2 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-2 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                            </TableCell>
                                             <TableCell className="px-1 py-1 bg-muted/30 font-mono text-center">
                                                {formatDuration(calculateHours(field.horaEntrada, field.horaSalida))}h
                                            </TableCell>
                                            <TableCell className="border-r px-2 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9 text-xs" readOnly /></FormControl></FormItem>} />
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
                                    <TableCell colSpan={11} className="h-24 text-center">
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
                            <p className="text-sm text-muted-foreground p-2">Esta sección será completada por el responsable en el evento. Los datos aquí introducidos se usarán para el cálculo del coste real.</p>
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
                                                <FormField control={control} name={`personal.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`} render={({ field }) => <Input type="time" {...field} className="h-8" />} />
                                                </TableCell>
                                                <TableCell>
                                                <FormField control={control} name={`personal.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`} render={({ field }) => <Input type="time" {...field} className="h-8" />} />
                                                </TableCell>
                                                <TableCell className="w-[200px]">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center justify-center gap-1 cursor-pointer">
                                                                <FeedbackDialog turnoIndex={turnoIndex} asigIndex={asigIndex} form={form} />
                                                                {(asignacion.comentariosMice || (asignacion.rating && asignacion.rating !== 3)) && (
                                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-bold">Valoración: {'⭐'.repeat(asignacion.rating || 0)}</p>
                                                            {asignacion.comentariosMice && <p className="max-w-xs">{asignacion.comentariosMice}</p>}
                                                        </TooltipContent>
                                                    </Tooltip>
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
                            <FormProvider {...form}>
                                <div className="space-y-2">
                                {(form.watch('ajustes') || []).map((ajuste, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <FormField control={control} name={`ajustes.${index}.concepto`} render={({field}) => (
                                            <Input placeholder="Concepto" {...field} className="h-9" />
                                        )} />
                                        <FormField control={control} name={`ajustes.${index}.importe`} render={({field}) => (
                                            <Input type="number" step="0.01" placeholder="Importe" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="w-32 h-9" />
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => removeAjuste(index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                                <Button size="xs" variant="outline" className="w-full" type="button" onClick={addAjusteRow}>Añadir Ajuste</Button>
                                </div>
                            </FormProvider>
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
      </main>
    </>
  );
}
