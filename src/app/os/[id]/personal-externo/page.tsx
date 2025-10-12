
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

import type { PersonalExternoOrder, CategoriaPersonal, Proveedor, PersonalEntregaTurno, AsignacionPersonal, EstadoPersonalEntrega, Entrega, PedidoEntrega, EntregaHito, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExternoAjuste } from '@/types';
import { ESTADO_PERSONAL_ENTREGA } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
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

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
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
  solicitadoPor: z.enum(solicitadoPorOptions),
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
                    <MessageSquare className={cn("h-4 w-4 text-muted-foreground", getValues(fieldName) && "text-primary bg-yellow-100 rounded-sm p-0.5")} />
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
  const [ajustes, setAjustes] = useState<PersonalExternoAjuste[]>([]);
  
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
        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
        setAjustes(storedAjustes[osId] || []);
        
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
        
        const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as any[];
        const turnosDelPedido = allTurnos.filter(p => p.osId === osId);

        if(turnosDelPedido.length > 0) {
            form.reset({ 
                turnos: turnosDelPedido.map(t => ({
                    ...t,
                    fecha: new Date(t.fecha),
                    asignaciones: (t.asignaciones || []).map((a:any) => ({
                        ...a,
                        horaEntradaReal: a.horaEntradaReal || '',
                        horaSalidaReal: a.horaSalidaReal || '',
                    }))
                })),
                observacionesGenerales: ''
            });
        }

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

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID del pedido.' });
      setIsLoading(false);
      return;
    }
    
    const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as any[];
    const otherOsOrders = allTurnos.filter(p => p.osId !== osId);
    
    const currentOsOrders: any[] = data.turnos.map(t => ({
        ...t,
        osId,
        fecha: format(t.fecha, 'yyyy-MM-dd'),
        statusPartner: t.statusPartner || 'Pendiente Asignación',
        requiereActualizacion: false, 
        asignaciones: (t.asignaciones || []).map(a => ({
            ...a,
            horaEntradaReal: a.horaEntradaReal || '',
            horaSalidaReal: a.horaSalidaReal || '',
        })),
    }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
        setIsLoading(false);
        form.reset(data);
    }, 500);
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(),
        horaEntrada: '09:00',
        horaSalida: '17:00',
        solicitadoPor: 'Sala',
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

const turnosAprobados = useMemo(() => {
    return watchedFields.filter(t => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0) || [];
}, [watchedFields]);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }
  
  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                     <Button variant="outline" type="button">Informar a Partners</Button>
                    <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="planificacion">
                 <TabsList className="mb-4 grid w-full grid-cols-2">
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
                                        <TableHead className="px-2 py-1 w-32">Fecha</TableHead>
                                        <TableHead className="px-2 py-1 w-32">Solicitado</TableHead>
                                        <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                        <TableHead className="px-2 py-1 w-32">Tipo Servicio</TableHead>
                                        <TableHead className="px-1 py-1 bg-muted/30 w-24">H. Entrada</TableHead>
                                        <TableHead className="px-1 py-1 bg-muted/30 w-24">H. Salida</TableHead>
                                        <TableHead className="px-1 py-1 bg-muted/30 w-20">€/Hora</TableHead>
                                        <TableHead className="px-1 py-1 w-10"></TableHead>
                                        <TableHead className="text-right px-2 py-1 w-12"></TableHead>
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
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1 min-w-48">
                                                    <FormField
                                                        control={control}
                                                        name={`turnos.${index}.proveedorId`}
                                                        render={({ field: selectField }) => (
                                                        <FormItem><Combobox options={providerOptions} value={selectField.value} onChange={(value) => handleProviderChange(index, value)} placeholder="Proveedor..."/></FormItem>
                                                        )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    <FormField control={control} name={`turnos.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="px-1 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-1 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-1 py-1 bg-muted/30">
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
                                        <TableCell colSpan={9} className="h-24 text-center">
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
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>H. Entrada Real</TableHead>
                                        <TableHead>H. Salida Real</TableHead>
                                        <TableHead>Horas Reales</TableHead>
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
                                                <TableCell>{format(new Date(turno.fecha), 'dd/MM/yy')}</TableCell>
                                                <TableCell>
                                                <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`} render={({ field }) => <Input type="time" {...field} className="h-8 w-24 text-xs" />} />
                                                </TableCell>
                                                <TableCell>
                                                <FormField control={control} name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`} render={({ field }) => <Input type="time" {...field} className="h-8 w-24 text-xs" />} />
                                                </TableCell>
                                                <TableCell className="font-mono text-center">{formatDuration(realHours)}h</TableCell>
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
            
             <div className="mt-8 grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader className="py-2"><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                    <CardContent className="space-y-2 p-4 text-sm">
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
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-2"><CardTitle className="text-lg">Ajuste de Costes</CardTitle></CardHeader>
                    <CardContent className="space-y-2 p-4">
                        {ajustes.map((ajuste, index) => (
                            <div key={ajuste.id} className="flex gap-2 items-center">
                                <Input 
                                    placeholder="Concepto" 
                                    value={ajuste.concepto} 
                                    onChange={(e) => updateAjuste(index, 'concepto', e.target.value)}
                                    className="h-9"
                                />
                                <Input 
                                    type="number"
                                    step="0.01"
                                    placeholder="Importe"
                                    value={ajuste.ajuste}
                                    onChange={(e) => updateAjuste(index, 'ajuste', e.target.value)}
                                    className="w-32 h-9"
                                />
                                <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => removeAjusteRow(index)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                        <Button size="xs" variant="outline" className="w-full" type="button" onClick={addAjusteRow}>Añadir Ajuste</Button>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold">
                                <span>Total Ajustes:</span>
                                <span>{formatCurrency(totalAjustes)}</span>
                            </div>
                    </CardContent>
                </Card>
            </div>
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
- src/app/os/transporte/[id]/page.tsx:
```tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Truck, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, ProveedorTransporte, TransporteOrder } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  lugarRecogida: z.string().min(1, 'El lugar de recogida es obligatorio'),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, 'El lugar de entrega es obligatorio'),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
});

type TransporteOrderFormValues = z.infer<typeof transporteOrderSchema>;

export default function PedidoTransportePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorTransporte[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<TransporteOrderFormValues>({
    resolver: zodResolver(transporteOrderSchema),
    defaultValues: {
      lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
      horaRecogida: '09:00',
      horaEntrega: '10:00',
      status: 'Pendiente',
    }
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allProveedores = (JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[])
        .filter(p => p.tipo === 'Catering');
    setProveedores(allProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          observaciones: order.observaciones || '',
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        proveedorId: '',
        lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
        horaRecogida: '09:00',
        lugarEntrega: currentOS?.spaceAddress || currentOS?.space || '',
        horaEntrega: currentOS?.deliveryTime || '10:00',
        observaciones: '',
        status: 'Pendiente',
      })
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const selectedProviderId = form.watch('proveedorId');
  const selectedProvider = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  const onSubmit = (data: TransporteOrderFormValues) => {
    if (!osId || !selectedProvider) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    
    const finalOrder: Omit<TransporteOrder, 'id' | 'osId'> = {
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProvider.id,
      proveedorNombre: selectedProvider.nombreProveedor,
      tipoTransporte: selectedProvider.tipoTransporte,
      precio: selectedProvider.precio,
      lugarRecogida: data.lugarRecogida,
      horaRecogida: data.horaRecogida,
      lugarEntrega: data.lugarEntrega,
      horaEntrega: data.horaEntrega,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...finalOrder };
        toast({ title: "Pedido actualizado" });
      }
    } else {
      allOrders.push({ id: data.id, osId, ...finalOrder });
      toast({ title: "Pedido de transporte creado" });
    }

    localStorage.setItem('transporteOrders', JSON.stringify(allOrders));
    router.push(`/os/${osId}/transporte`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Transporte..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/transporte`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Transporte</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/transporte`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del Servicio</FormLabel>
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCalendarOpen(false);}} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor y Tipo de Transporte</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.tipoTransporte}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl>
                                    <Input value={selectedProvider ? selectedProvider.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
                                </FormControl>
                            </FormItem>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="lugarRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Recogida</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Recogida</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Entrega</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Entrega</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="observaciones" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Observaciones para la Carga</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        {isEditing && 
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        }
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
}

```