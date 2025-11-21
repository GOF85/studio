'use client';
console.log(`[DEBUG] Module loaded: os/personal-externo/page.tsx at ${new Date().toLocaleTimeString()}`);

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle, Send, Printer, FileText, Upload } from 'lucide-react';

import type { PersonalExternoAjuste, ServiceOrder, ComercialBriefing, ComercialBriefingItem, PersonalExterno, CategoriaPersonal, Proveedor, PersonalExternoTurno, AsignacionPersonal, EstadoPersonalExterno } from '@/types';
import { ESTADO_PERSONAL_EXTERNO, AJUSTE_CONCEPTO_OPCIONES, personalExternoSchema } from '@/types';
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
import { calculateHours, formatCurrency, formatDuration } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { logActivity } from '../activity-log/utils';

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const formSchema = z.object({
    turnos: z.array(personalExternoSchema),
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
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [personalExterno, setPersonalExterno] = useState<PersonalExterno | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();
  const { impersonatedUser } = useImpersonatedUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!osId || !impersonatedUser) return;
    try {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
       
        const allProveedoresData = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setAllProveedores(allProveedoresData);
        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const currentPersonalExterno = allPersonalExterno.find(p => p.osId === osId) || { osId, turnos: [], status: 'Pendiente' };
        setPersonalExterno(currentPersonalExterno);
       
        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
       
        form.reset({ 
            turnos: currentPersonalExterno.turnos.map(t => ({...t, fecha: new Date(t.fecha)})),
            ajustes: storedAjustes[osId] || []
        });
       
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de personal externo.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form, impersonatedUser]);

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
  const watchedAjustes = watch('ajustes');

  const { totalPlanned, totalReal, totalAjustes, costeFinalPlanificado, finalTotalReal } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, order) => {
      const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
       const quantity = (order.asignaciones || []).length > 0 ? order.asignaciones.length : 1;
      return acc + plannedHours * (order.precioHora || 0) * quantity;
    }, 0) || 0;

    const real = watchedFields?.reduce((acc, order) => {
        return acc + (order.asignaciones || []).reduce((sumAsignacion, asignacion) => {
            const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
            const hoursToUse = realHours > 0 ? realHours : calculateHours(order.horaEntrada, order.horaSalida);
            return sumAsignacion + hoursToUse * (order.precioHora || 0);
        }, 0);
    }, 0) || 0;
   
    const aj = watchedAjustes?.reduce((sum, ajuste) => sum + ajuste.importe, 0) || 0;
    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, costeFinalPlanificado: planned + aj, finalTotalReal: real + aj };
  }, [watchedFields, watchedAjustes]);

    const handleGlobalStatusAction = (newStatus: EstadoPersonalExterno) => {
        if (!personalExterno) return;
     
        let requiresUpdate = false;
        if(newStatus === 'Solicitado') {
            requiresUpdate = personalExterno.turnos.some(t => t.statusPartner !== 'Gestionado');
        }
        const updatedTurnos = personalExterno.turnos.map(t => ({
            ...t,
            requiereActualizacion: newStatus === 'Solicitado' ? true : t.requiereActualizacion,
        }));
     
        const updatedPersonalExterno = { ...personalExterno, status: newStatus, turnos: updatedTurnos };
     
        const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
        const index = allPersonalExterno.findIndex(p => p.osId === osId);
     
        if (index > -1) {
            allPersonalExterno[index] = updatedPersonalExterno;
        } else {
            allPersonalExterno.push(updatedPersonalExterno);
        }
        localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
        setPersonalExterno(updatedPersonalExterno);
        toast({ title: 'Estado actualizado', description: `La solicitud de personal ahora está: ${newStatus}` });
    };

    const isSolicitudDesactualizada = useMemo(() => {
        if (personalExterno?.status !== 'Solicitado') return false;
        if (!formState.isDirty) return false;
        const savedTurnos = new Map(personalExterno.turnos.map(t => [t.id, t]));
        const currentTurnos = getValues('turnos');
        if (savedTurnos.size !== currentTurnos.length) return true;
        return currentTurnos.some(current => {
            const saved = savedTurnos.get(current.id);
            if (!saved) return true;
            const { asignaciones, requiereActualizacion, ...savedRest } = saved;
            const { asignaciones: currentAsignaciones, requiereActualizacion: currentReq, ...currentRest } = current;
            return JSON.stringify(savedRest) !== JSON.stringify(currentRest);
        });
    }, [formState.isDirty, personalExterno, getValues]);
 
    const ActionButton = () => {
        if(!personalExterno) return null;
        switch(personalExterno.status) {
            case 'Pendiente':
                return <Button onClick={() => handleGlobalStatusAction('Solicitado')}><Send className="mr-2"/>Solicitar a ETT</Button>
            case 'Solicitado':
                if (isSolicitudDesactualizada) {
                    return <Button onClick={handleSubmit(onSubmit)}><RefreshCw className="mr-2"/>Notificar Cambios a ETT</Button>
                }
                return <Button variant="secondary" disabled><CheckCircle className="mr-2"/>Solicitado</Button>
            case 'Asignado':
                 return <Button onClick={() => handleGlobalStatusAction('Cerrado')}><Save className="mr-2"/>Cerrar y Validar Costes</Button>
            case 'Cerrado':
                 return <Button variant="secondary" disabled><CheckCircle className="mr-2"/>Cerrado</Button>
            default:
                return null;
        }
    }

  const onSubmit = (data: FormValues) => {
      setIsLoading(true);
      if (!osId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
          setIsLoading(false);
          return;
      }
 
      const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
      const index = allPersonalExterno.findIndex(p => p.osId === osId);
     
      const currentStatus = personalExterno?.status || 'Pendiente';
     
      const newPersonalData: PersonalExterno = {
          osId,
          turnos: data.turnos.map(t => {
              const existingTurno = personalExterno?.turnos.find(et => et.id === t.id);
              return {
                  ...t,
                  fecha: format(t.fecha, 'yyyy-MM-dd'),
                  statusPartner: existingTurno?.statusPartner || 'Pendiente Asignación',
                  requiereActualizacion: true,
                  asignaciones: (t.asignaciones || []).map(a => ({
                      ...a,
                      horaEntradaReal: a.horaEntradaReal || '',
                      horaSalidaReal: a.horaSalidaReal || '',
                  })),
              }
          }),
          status: currentStatus,
          observacionesGenerales: form.getValues('observacionesGenerales'),
      };
     
      if (index > -1) {
          allPersonalExterno[index] = newPersonalData;
      } else {
          allPersonalExterno.push(newPersonalData);
      }
 
      localStorage.setItem('personalExterno', JSON.stringify(allPersonalExterno));
     
      const allAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
      allAjustes[osId] = data.ajustes || [];
      localStorage.setItem('personalExternoAjustes', JSON.stringify(allAjustes));
      window.dispatchEvent(new Event('storage'));
 
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
        requiereActualizacion: true,
    });
  }

  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Turno eliminado' });
    }
  };

  const handleClearAll = () => {
    remove();
    removeAjuste();
    setShowClearConfirm(false);
    toast({ title: 'Planificación vaciada' });
    handleSubmit(onSubmit)();
  };

  const saveAjustes = (newAjustes: PersonalExternoAjuste[]) => {
      if (!osId) return;
      const allAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
      allAjustes[osId] = newAjustes;
      localStorage.setItem('personalExternoAjustes', JSON.stringify(allAjustes));
  }

  const providerOptions = useMemo(() =>
    allProveedores.filter(p => p.tipos.includes('Personal')).map(p => ({
        value: p.id,
        label: p.nombreComercial
    })), [allProveedores]);

  const categoriaOptions = useMemo(() => {
    return proveedoresDB.map(p => {
        const proveedor = allProveedores.find(prov => prov.id === p.proveedorId);
        return {
            value: p.id,
            label: `${proveedor?.nombreComercial || 'Desconocido'} - ${p.categoria}`
        }
    });
  }, [proveedoresDB, allProveedores]);

  const turnosAprobados = useMemo(() => {
    return watchedFields?.filter(t => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0) || [];
  }, [watchedFields]);

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }
 
  const statusBadgeVariant = personalExterno?.status === 'Asignado' || personalExterno?.status === 'Cerrado' ? 'success' : personalExterno?.status === 'Solicitado' ? 'outline' : 'warning';

  return (
    <>
      <main>
      <TooltipProvider>
        <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex items-start justify-between mb-2 sticky top-24 z-20 bg-background/95 backdrop-blur-sm py-2 -mt-2">
                    <div/>
                    <div className="flex items-center gap-2">
                         <Badge variant={statusBadgeVariant} className="text-sm px-4 py-2">{personalExterno?.status || 'Pendiente'}</Badge>
                        <ActionButton />
                        <Button type="submit" disabled={isLoading || !formState.isDirty}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar Cambios</span>
                        </Button>
                    </div>
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

                <Tabs defaultValue="planificacion">
                     <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="planificacion">Planificación de Turnos</TabsTrigger>
                        <TabsTrigger value="aprobados">Cierre y Horas Reales</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planificacion" className="mt-4">
                        <Card>
                            <CardHeader className="py-3 flex-row items-center justify-between">
                                <CardTitle className="text-lg">Planificación de Turnos</CardTitle>
                                <div className="flex gap-2">
                                    {fields.length > 0 && (
                                         <Button type="button" variant="destructive" size="sm" onClick={() => setShowClearConfirm(true)}>
                                            <Trash2 className="mr-2"/>Vaciar Planificación
                                        </Button>
                                    )}
                                    <Button type="button" onClick={addRow} size="sm">
                                        <PlusCircle className="mr-2" />
                                        Añadir Turno
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-2">
                                <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-1 w-36">Fecha</TableHead>
                                            <TableHead className="px-2 py-1 w-32">Solicitado Por</TableHead>
                                            <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                            <TableHead className="px-2 py-1 w-36">Tipo Servicio</TableHead>
                                            <TableHead colSpan={3} className="text-center border-l border-r px-2 py-1 bg-muted/30">Planificado</TableHead>
                                            <TableHead className="px-2 py-1">Obs. ETT</TableHead>
                                            <TableHead className="text-center px-2 py-1">Estado ETT</TableHead>
                                            <TableHead className="text-right px-2 py-1 w-20">Acciones</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="border-l px-2 py-1 bg-muted/30 w-24">H. Entrada</TableHead>
                                            <TableHead className="px-2 py-1 bg-muted/30 w-24">H. Salida</TableHead>
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
                                                    <FormField control={control} name={`turnos.${index}.fecha`} render={({ field: dateField }) => (
                                                        <FormItem>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button variant={"outline"} className={cn("w-full h-8 pl-3 text-left font-normal text-xs", !dateField.value && "text-muted-foreground")}>
                                                                            {dateField.value ? format(dateField.value, "dd/MM/yy") : <span>Elige</span>}
                                                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
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
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1 min-w-48">
                                                    <FormField
                                                        control={control}
                                                        name={`turnos.${index}.proveedorId`}
                                                        render={({ field: f }) => (
                                                        <FormItem>
                                                            <Combobox
                                                                options={categoriaOptions}
                                                                value={f.value}
                                                                onChange={(value) => handleProviderChange(index, value)}
                                                                placeholder="Proveedor..."
                                                            />
                                                        </FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    <FormField control={control} name={`turnos.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                        <FormItem>
                                                            <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                                <FormControl><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="border-l px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="border-r px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-8 text-xs" readOnly /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell>
                                                    <CommentDialog turnoIndex={index} form={form} />
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
                                                            {field.statusPartner}
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
                                                    <TableCell className="font-semibold">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 cursor-default">
                                                                    {hasTimeMismatch && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                                                    {asignacion.nombre}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Desviación: {deviation > 0 ? '+' : ''}{formatDuration(deviation)} horas</p>
                                                            </TooltipContent>
                                                        </Tooltip>
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
                                                    <TableCell className="w-[200px] text-center">
                                                       <FeedbackDialog turnoIndex={turnoIndex} asigIndex={asigIndex} form={form} />
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
                                    <span className="text-muted-foreground">Coste Final Planificado (Plan. + Ajustes):</span>
                                    <span className="font-bold">{formatCurrency(costeFinalPlanificado)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Real (Horas):</span>
                                    <span className="font-bold">{formatCurrency(totalReal)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-base">
                                    <span>Coste FINAL (Real + Ajustes):</span>
                                    <span className={finalTotalReal > costeFinalPlanificado ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal)}
                                    </span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación (FINAL vs Planificado):</span>
                                    <span className={finalTotalReal > costeFinalPlanificado ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(finalTotalReal - costeFinalPlanificado)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                               <h4 className="text-xs font-semibold text-muted-foreground">AJUSTE DE COSTES (Facturas, dietas, etc.)</h4>
                                {(ajusteFields || []).map((ajuste, index) => (
                                    <div key={ajuste.id} className="flex gap-2 items-center">
                                        <FormField control={control} name={`ajustes.${index}.proveedorId`} render={({field}) => (
                                            <FormItem className="flex-grow">
                                                <Combobox options={providerOptions} value={field.value} onChange={field.onChange} placeholder="Proveedor..."/>
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name={`ajustes.${index}.concepto`} render={({field}) => (
                                            <Combobox 
                                                options={AJUSTE_CONCEPTO_OPCIONES.map(o => ({label: o, value: o}))} 
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Concepto..."
                                                />
                                        )} />
                                        <FormField control={control} name={`ajustes.${index}.importe`} render={({field}) => (
                                            <Input type="number" step="0.01" placeholder="Importe" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="w-24 h-9"/>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => removeAjuste(index)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                                <Button size="xs" variant="outline" className="w-full" type="button" onClick={() => appendAjuste({ id: Date.now().toString(), proveedorId: '', concepto: '', importe: 0 })}>Añadir Ajuste</Button>
                                 <Separator className="my-2" />
                                  <div className="flex justify-end font-bold">
                                      <span>Total Ajustes: {formatCurrency(totalAjustes)}</span>
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
                Esta acción no se puede deshacer. Se eliminará el turno de la tabla.
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
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Vaciar toda la planificación?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción es irreversible y eliminará todos los turnos de personal de este evento.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={handleClearAll}>Sí, vaciar todo</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

```
- src/app/os/atinpicos/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AtipicosIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/atipicos`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/atipicos/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, FilePlus } from 'lucide-react';
import type { AtipicoOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';

const statusVariant: { [key in AtipicoOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pendiente: 'secondary',
  Aprobado: 'default',
  Rechazado: 'destructive',
};

export default function AtipicosPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [atipicoOrders, setAtipicoOrders] = useState<AtipicoOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
      const relatedOrders = allAtipicoOrders.filter(order => order.osId === osId);
      setAtipicoOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return atipicoOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [atipicoOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    const updatedOrders = allOrders.filter((o: AtipicoOrder) => o.id !== orderToDelete);
    localStorage.setItem('atipicoOrders', JSON.stringify(updatedOrders));
    setAtipicoOrders(updatedOrders.filter((o: AtipicoOrder) => o.osId === osId));
    
    toast({ title: 'Gasto atípico eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Atípicos..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/${osId}/atipicos/pedido`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto Atípico
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos Atípicos Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {atipicoOrders.length > 0 ? (
                          atipicoOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/os/${osId}/atipicos/pedido?orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                              No hay gastos atípicos para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {atipicoOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto atípico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
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
- src/app/os/gastronomia/layout.tsx:
```tsx
'use client';

import { Utensils } from 'lucide-react';
import { useOsData } from '../os-context';


export default function GastronomiaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Módulo de Gastronomía</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}

```
- src/app/os/gastronomia/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Utensils } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrderItem, GastronomyOrderStatus, GastronomyOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { useOsContext } from '../os-context';

const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};

type EnrichedBriefingItem = ComercialBriefingItem & {
    gastro_status?: GastronomyOrderStatus;
}


export default function GastronomiaPage() {
  const [briefingItems, setBriefingItems] = useState<EnrichedBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const { osId, briefing, isLoading } = useOsContext();
  const { toast } = useToast();

  const loadAndSyncOrders = useCallback(() => {
    if (isLoading || !briefing) return;

    const gastronomicHitos = briefing.items.filter(item => item.conGastronomia);
    
    let allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    let osGastroOrders = allGastroOrders.filter(order => order.osId === osId);

    let needsBriefingSave = false;
    
    // Sync: Add new orders from briefing, update existing ones
    const syncedOrders = gastronomicHitos.map(hito => {
        let existingOrder = osGastroOrders.find(o => o.id === hito.id);
        
        if (existingOrder) {
            // Update if data differs, but keep status
            if (JSON.stringify({ ...existingOrder, status: null }) !== JSON.stringify({ ...hito, osId, status: null })) {
                needsBriefingSave = true;
                return { ...existingOrder, ...hito, osId };
            }
            return existingOrder;
        } else {
            // Add new order
            needsBriefingSave = true;
            return { 
                ...hito, 
                id: hito.id,
                osId: osId, 
                status: 'Pendiente' as GastronomyOrderStatus,
                items: hito.gastro_items || [],
                total: hito.gastro_total || 0,
            };
        }
    });

    // Sync: Remove orders that are no longer in the briefing
    const briefingItemIds = new Set(gastronomicHitos.map(i => i.id));
    const finalOrders = syncedOrders.filter(order => briefingItemIds.has(order.id));
    if (osGastroOrders.length !== finalOrders.length) {
        needsBriefingSave = true;
    }

    const otherOsGastroOrders = allGastroOrders.filter(order => order.osId !== osId);
    
    if (needsBriefingSave) {
        const updatedAllOrders = [...otherOsGastroOrders, ...finalOrders];
        localStorage.setItem('gastronomyOrders', JSON.stringify(updatedAllOrders));
        osGastroOrders = finalOrders;
    }
    
     const itemsWithGastro = briefing.items
        .filter(item => item.conGastronomia)
        .map(item => {
            const existingOrder = osGastroOrders.find(o => o.id === item.id);
            return { ...item, gastro_status: existingOrder?.status || 'Pendiente' };
        });

    setBriefingItems(itemsWithGastro);
    setIsMounted(true);
  }, [osId, briefing, isLoading]);

  useEffect(() => {
    loadAndSyncOrders();
  }, [loadAndSyncOrders]);

  const sortedBriefingItems = useMemo(() => {
    return [...briefingItems]
        .sort((a, b) => {
            const dateA = new Date(a.fecha);
            const dateB = new Date(b.fecha);
            const dateComparison = dateA.getTime() - dateB.getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [briefingItems]);
  
  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />;
  }

  return (
    <>
        <Card>
            <CardHeader><CardTitle>Pedidos de Gastronomía Generados</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Asistentes</TableHead>
                            <TableHead>Comentarios</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedBriefingItems.length > 0 ? (
                            sortedBriefingItems.map(item => (
                            <TableRow 
                                key={item.id} 
                                onClick={() => router.push(`/os/${osId}/gastronomia/${item.id}`)} 
                                className={cn(
                                    "cursor-pointer", 
                                    item.descripcion.toLowerCase() === 'prueba de menu' && "bg-muted hover:bg-muted/80"
                                )}
                            >
                                <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{item.horaInicio}</TableCell>
                                <TableCell className="min-w-[200px] font-medium">{item.descripcion}</TableCell>
                                <TableCell>{item.asistentes}</TableCell>
                                <TableCell className="min-w-[200px]">{item.comentarios}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[item.gastro_status || 'Pendiente']}>{item.gastro_status || 'Pendiente'}</Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay pedidos de gastronomía. Activa la opción "Con gastronomía" en los hitos del briefing comercial.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </>
  );
}

```
- src/app/os/gastronomia/layout.tsx:
```tsx
'use client';

import { Utensils } from 'lucide-react';
import { OsContextProvider } from '../os-context';


export default function GastronomiaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Módulo de Gastronomía</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}
```
- src/app/os/gastronomia/[briefingItemId]/page.tsx:
```tsx

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, RefreshCw, Euro, Archive, BrainCircuit, AlertTriangle } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, PartidaProduccion, ElaboracionEnReceta, ComponenteElaboracion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder } from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, PARTIDAS_PRODUCCION, TECNICAS_COCCION } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn, formatNumber } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isBefore, subMonths, startOfToday, format } from 'date-fns';
import { useOsContext } from '../../os-context';
import { RecetaSelector } from '@/components/os/gastronomia/receta-selector';


const gastroItemSchema = z.object({
  id: z.string(), // Receta ID
  keyId: z.string(),
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  costeMateriaPrimaSnapshot: z.number().optional(),
  precioVentaSnapshot: z.number().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
  comentarios: z.string().optional(),
});

const formSchema = z.object({
  items: z.array(gastroItemSchema),
  status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
});

type FormValues = z.infer<typeof formSchema>;
type GastronomyOrderItem = FormValues['items'][0];


function SortableTableRow({ field, index, remove, control, onBlur }: { field: GastronomyOrderItem, index: number, remove: (index: number) => void, control: any, onBlur: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.keyId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const quantity = field.quantity || 0;
    const total = (field.precioVentaSnapshot || field.precioVenta || 0) * quantity;
    
    if (field.type === 'separator') {
        return (
            <TableRow ref={setNodeRef} style={style} className="bg-muted/50 hover:bg-muted/80">
                <TableCell className="w-12 p-2" {...attributes}>
                    <div {...listeners} className="cursor-grab text-muted-foreground p-2">
                        <GripVertical />
                    </div>
                </TableCell>
                <TableCell colSpan={4}>
                    <FormField
                        control={control}
                        name={`items.${index}.nombre`}
                        render={({ field: separatorField }) => (
                            <Input {...separatorField} className="border-none bg-transparent font-bold text-lg focus-visible:ring-1" onBlur={onBlur} />
                        )}
                    />
                </TableCell>
                 <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </TableCell>
            </TableRow>
        );
    }
    
    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
             <TableCell className="w-12 p-2" {...attributes}>
                <div {...listeners} className="cursor-grab text-muted-foreground p-2">
                    <GripVertical />
                </div>
            </TableCell>
            <TableCell>{field.nombre}</TableCell>
            <TableCell>
                <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: quantityField }) => (
                        <Input
                            type="number"
                            {...quantityField}
                            value={quantityField.value ?? ''}
                             onChange={(e) => quantityField.onChange(parseInt(e.target.value, 10) || 0)}
                            onBlur={onBlur}
                            className="w-24 h-8"
                        />
                    )}
                />
            </TableCell>
            <TableCell>{formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function PedidoGastronomiaForm() {
  const params = useParams();
  const osId = params.id as string;
  const briefingItemId = params.briefingItemId as string;
  const { serviceOrder, briefing, isLoading: isOsDataLoading } = useOsContext();

  const [briefingItem, setBriefingItem] = useState<ComercialBriefingItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<{ index: number; text: string } | null>(null);
  const [historicoPrecios, setHistoricoPrecios] = useState<HistoricoPreciosERP[]>([]);
  const [ingredientesInternos, setIngredientesInternos] = useState<IngredienteInterno[]>([]);
  const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
  const [elaboraciones, setElaboraciones] = useState<Elaboracion[]>([]);
  
  const [totalPedido, setTotalPedido] = useState(0);
  const [ratioUnidadesPorPax, setRatioUnidadesPorPax] = useState(0);


  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      status: 'Pendiente',
    },
  });

  const { control, handleSubmit, reset, watch, setValue, getValues, formState } = form;
  const { fields, append, remove, update, move } = useFieldArray({ control, name: "items", keyName: "keyId" });
  
  const watchedItems = watch('items');

  const recalculateTotals = useCallback(() => {
    let total = 0;
    let totalUnits = 0;
    const items = getValues('items');
    
    (items || []).forEach(item => {
        if (item.type === 'item') {
            const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0;
            total += priceToUse * (item.quantity || 0);
            totalUnits += item.quantity || 0;
        }
    });

    const ratio = briefingItem?.asistentes && briefingItem.asistentes > 0 ? totalUnits / briefingItem.asistentes : 0;
    
    setTotalPedido(total);
    setRatioUnidadesPorPax(ratio);
  }, [briefingItem?.asistentes, getValues]);

  const calculateHistoricalCost = useCallback((receta: Receta, eventDate: Date): { coste: number, pvp: number } => {
    const articulosErpMap = new Map(articulosERP.map(a => [a.idreferenciaerp, a]));
    const ingredientesMap = new Map(ingredientesInternos.map(i => [i.id, i]));
    const elaboracionesMap = new Map(elaboraciones.map(e => [e.id, e]));

    const getHistoricalPrice = (erpId: string): number => {
      const relevantPrices = historicoPrecios
        .filter(h => h.articuloErpId === erpId && new Date(h.fecha) <= startOfToday(eventDate))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      const latestPrice = articulosErpMap.get(erpId)?.precio || 0;

      return relevantPrices.length > 0 ? relevantPrices[0].precioCalculado : latestPrice;
    };
    
    const calculateElabCost = (elabId: string): number => {
        const elab = elaboracionesMap.get(elabId);
        if (!elab) return 0;
        
        const elabCost = (elab.componentes || []).reduce((sum, comp) => {
            let componentCost = 0;
            if (comp.tipo === 'ingrediente') {
                const ingrediente = ingredientesMap.get(comp.componenteId);
                const erpItem = ingrediente ? articulosErpMap.get(ingrediente.productoERPlinkId) : undefined;
                if(erpItem) {
                    const price = getHistoricalPrice(erpItem.idreferenciaerp);
                    componentCost = price * comp.cantidad;
                }
            } else { // It's a sub-elaboration
                componentCost = calculateElabCost(comp.componenteId) * comp.cantidad;
            }
            return sum + (componentCost * (1 + (comp.merma || 0) / 100));
        }, 0);

        return elab.produccionTotal > 0 ? elabCost / elab.produccionTotal : 0;
    }

    const costeMateriaPrima = (receta.elaboraciones || []).reduce((sum, elabEnReceta) => {
        const elabCost = calculateElabCost(elabEnReceta.elaboracionId);
        return sum + (elabCost * elabEnReceta.cantidad);
    }, 0);
    
    const pvp = costeMateriaPrima * (1 + (receta.porcentajeCosteProduccion / 100));

    return { coste: costeMateriaPrima, pvp: pvp };
  }, [historicoPrecios, ingredientesInternos, articulosERP, elaboraciones]);

  useEffect(() => {
    setHistoricoPrecios(JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]'));
    setIngredientesInternos(JSON.parse(localStorage.getItem('ingredientesInternos') || '[]'));
    setArticulosERP(JSON.parse(localStorage.getItem('articulosERP') || '[]'));
    setElaboraciones(JSON.parse(localStorage.getItem('elaboraciones') || '[]'));
  }, []);
  
  useEffect(() => {
    if (briefing) {
        const currentHito = briefing.items.find(item => item.id === briefingItemId);
        if (currentHito) {
          setBriefingItem(currentHito);
          const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
          const currentGastroOrder = allGastroOrders.find(o => o.id === briefingItemId);
          if (currentGastroOrder) {
              reset({
                  items: (currentGastroOrder.items || []).map(item => ({...item, keyId: item.id + Math.random()})),
                  status: currentGastroOrder.status || 'Pendiente',
              });
              recalculateTotals();
          }
        }
      }
      setIsMounted(true);
  }, [osId, briefingItemId, reset, recalculateTotals, briefing]);

  const onAddReceta = (receta: Receta) => {
    const { coste, pvp } = calculateHistoricalCost(receta, serviceOrder ? new Date(serviceOrder.startDate) : new Date());
    
    append({
        id: receta.id,
        keyId: receta.id + Math.random(),
        type: 'item',
        nombre: receta.nombre,
        costeMateriaPrima: coste,
        precioVenta: pvp,
        costeMateriaPrimaSnapshot: coste,
        precioVentaSnapshot: pvp,
        quantity: briefingItem?.asistentes || 1,
        comentarios: '',
    });
    recalculateTotals();
    toast({title: "Receta añadida"});
  }
  
  const addSeparator = (name: string) => {
    append({
      id: `sep-${Date.now()}`,
      keyId: `sep-${Date.now()}` + Math.random(),
      type: 'separator',
      nombre: name,
    });
  };

  const onSubmit = (data: FormValues) => {
    if (!briefingItem) return;
    setIsLoading(true);
    
    let allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const orderIndex = allGastroOrders.findIndex(o => o.id === briefingItemId);

    const newOrderData: GastronomyOrder = {
        id: briefingItemId,
        osId: osId,
        status: data.status,
        items: data.items.map(({keyId, ...item}) => item),
        total: totalPedido,
        fecha: briefingItem.fecha,
    };
    
    if (orderIndex > -1) {
        allGastroOrders[orderIndex] = newOrderData;
    } else {
        allGastroOrders.push(newOrderData);
    }
    
    localStorage.setItem('gastronomyOrders', JSON.stringify(allGastroOrders));
        
    toast({ title: 'Pedido de Gastronomía Guardado' });
    reset(data);
    setIsLoading(false);
  };
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex(f => f.keyId === active.id);
        const newIndex = fields.findIndex(f => f.keyId === over.id);
        move(oldIndex, newIndex);
        recalculateTotals();
    }
  }


  if (!isMounted || !briefingItem) {
    return <LoadingSkeleton title="Cargando pedido de gastronomía..." />;
  }

  return (
    <main>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm text-muted-foreground">
                <div className="flex items-center gap-4 text-sm">
                    <span>Para el servicio: <strong>{briefingItem.descripcion}</strong></span>
                    <span className="h-4 border-l"></span>
                    <span>{format(new Date(briefingItem.fecha), 'dd/MM/yyyy')} a las {briefingItem.horaInicio}h</span>
                    <span className="h-4 border-l"></span>
                    <span className="flex items-center gap-1.5"><Users size={16}/>{briefingItem.asistentes} asistentes</span>
                </div>
          </div>
          
          <Card>
            <CardHeader className="flex-row justify-between items-center py-3">
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => addSeparator('Nuevo Separador')}>Añadir Separador</Button>
                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline"><PlusCircle className="mr-2"/>Añadir Plato</Button>
                        </DialogTrigger>
                        <RecetaSelector onSelect={onAddReceta} />
                    </Dialog>
                </div>
                 <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Ratio (uds/pax)</p>
                        <p className="text-xl font-bold">{formatNumber(ratioUnidadesPorPax, 1)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Total Pedido (PVP)</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(totalPedido)}</p>
                    </div>
                    <Button type="submit" disabled={isLoading || !formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" />} 
                        Guardar Pedido
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 p-2"></TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="w-48">Cantidad</TableHead>
                            <TableHead className="w-32">PVP</TableHead>
                            <TableHead className="w-40 text-right">Total</TableHead>
                            <TableHead className="w-28 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <SortableContext items={fields.map(f => f.keyId)} strategy={verticalListSortingStrategy}>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                                <SortableTableRow key={field.keyId} field={field} index={index} remove={remove} control={control} onBlur={recalculateTotals} />
                            )) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay platos en este pedido.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </SortableContext>
                </Table>
                </DndContext>
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}

function PedidoGastronomiaPage() {
    return (
        <React.Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <PedidoGastronomiaForm />
        </React.Suspense>
    );
}

export default PedidoGastronomiaPage;

    
```
- src/app/os/[id]/gastronomia/layout.tsx:
```tsx
'use client';

import { Utensils } from 'lucide-react';
import { OsContextProvider } from '../os-context';


export default function GastronomiaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Módulo de Gastronomía</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}
```
- src/app/os/alquiler/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/alquiler`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/alquiler/page.tsx:
```tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlquilerPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
  
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Alquiler'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
        const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
         const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Resumen de Artículos de Alquiler</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Cant. Cajas</TableHead>
                    <TableHead>Valoración</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((item, index) => {
                    const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                    const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                    return (
                      <TableRow key={`${item.itemCode}-${index}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{cajas}</TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                        <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
             <div className="flex justify-end font-bold text-lg p-4">
                Valoración Total: {formatCurrency(totalValue)}
            </div>
          </DialogContent>
        )
      }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Alquiler
            </Link>
            </Button>
        </div>
        
         <div className="grid md:grid-cols-3 gap-6 mb-8">
              {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                  const items = itemsByStatus[status];
                  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  return (
                  <StatusCard 
                      key={status}
                      title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                      items={items.length}
                      totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                      totalValue={totalValue}
                      onClick={() => setActiveModal(status)}
                  />
              )})}
          </div>
        
          <Card className="mb-6">
              <div className="flex items-center justify-between p-4">
                  <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
              </div>
              <CardContent>
                  <div className="border rounded-lg">
                      <Table>
                           <TableHeader>
                              <TableRow>
                                  <TableHead>Artículo</TableHead>
                                  <TableHead>Solicita</TableHead>
                                  <TableHead>Fecha Entrega</TableHead>
                                  <TableHead className="w-32">Cantidad</TableHead>
                                  <TableHead>Valoración</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                  <TableRow key={item.itemCode + item.orderId}>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell>{item.solicita}</TableCell>
                                      <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                  </TableRow>
                              )) : (
                                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
  
          <Card>
              <CardHeader>
                  <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
              </CardHeader>
               <CardContent>
                   <div className="border rounded-lg">
                      <Table>
                           <TableHeader>
                              <TableRow>
                                  <TableHead>Hoja Picking</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Contenido</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                  <TableRow key={order.sheetId}>
                                      <TableCell>
                                          <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                              <Badge variant="secondary">{order.sheetId}</Badge>
                                          </Link>
                                      </TableCell>
                                      <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                      <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                  </TableRow>
                              )) : (
                                  <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
  
         {activeModal && renderStatusModal(activeModal)}
      </Dialog>
    );
}

```
- src/app/os/almacen/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlmacenIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/almacen`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/almacen/page.tsx:
```tsx


'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem, ReturnSheet, ServiceOrder, MaterialOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/hooks/use-data-store';
import { useParams } from 'next/navigation';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';


const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { data, isLoaded } = useDataStore();
    const briefing = useMemo(() => {
        if (!isLoaded) return null;
        return data.comercialBriefings?.find(b => b.osId === osId) || null;
    }, [isLoaded, data.comercialBriefings, osId]);

    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    if(!briefing) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlmacenPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const params = useParams();
    const osId = params.id as string;
    const { data, isLoaded } = useDataStore();

    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
        const emptyResult = { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
        if (!isLoaded || !osId) return emptyResult;

        const { materialOrders = [], pickingSheets = {}, returnSheets = {} } = data;

        const relatedOrders = materialOrders.filter(order => order.osId === osId && order.type === 'Almacen');
        const relatedPickingSheets = Object.values(pickingSheets).filter(sheet => sheet.osId === osId);
        
        const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
        const processedItemKeys = new Set<string>();
        const blocked: BlockedOrderInfo[] = [];

        relatedPickingSheets.forEach(sheet => {
            const targetStatus = statusMap[sheet.status];
            const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

            sheet.items.forEach(itemInSheet => {
                if (itemInSheet.type !== 'Almacen') return;
                
                const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
                const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
                const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);

                if (!originalItem) return;
                
                const itemWithInfo: ItemWithOrderInfo = {
                    ...originalItem,
                    orderId: sheet.id, 
                    orderContract: orderRef?.contractNumber || 'N/A', 
                    orderStatus: sheet.status, 
                    solicita: orderRef?.solicita,
                };

                statusItems[targetStatus].push(itemWithInfo);
                sheetInfo.items.push(itemWithInfo);

                processedItemKeys.add(uniqueKey);
            });

            if (sheetInfo.items.length > 0) {
                blocked.push(sheetInfo);
            }
        });

        const all = relatedOrders.flatMap(order => 
            order.items.map(item => {
                return {
                    ...item, 
                    quantity: item.quantity,
                    orderId: order.id, 
                    contractNumber: order.contractNumber, 
                    solicita: order.solicita, 
                    tipo: item.tipo, 
                    deliveryDate: order.deliveryDate,
                    ajustes: item.ajustes
                } as ItemWithOrderInfo
            })
        );
        
        const pending = all.filter(item => {
          const uniqueKey = `${item.orderId}-${item.itemCode}`;
          return !processedItemKeys.has(uniqueKey) && item.quantity > 0;
        });
        
        statusItems['Asignado'] = pending;

        const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        return { allItems: all, blockedOrders: blocked, pendingItems: pending, itemsByStatus: statusItems, totalValoracionPendiente };
    }, [osId, isLoaded, data]);
    
    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
      const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
       const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Resumen de Artículos de Almacén</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Cant. Cajas</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item, index) => {
                  const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                  const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                  return (
                    <TableRow key={`${item.itemCode}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{cajas}</TableCell>
                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                      <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-end font-bold text-lg p-4">
              Valoración Total: {formatCurrency(totalValue)}
          </div>
        </DialogContent>
      )
    }

    if (!isLoaded) {
        return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Almacen`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Almacén
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}



```
- src/app/os/alquiler/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/alquiler`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/alquiler/layout.tsx:
```tsx
'use client';

import { Archive } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function AlquilerLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Archive />Módulo de Alquiler</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/alquiler/page.tsx:
```tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlquilerPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
  
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Alquiler'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
      const items = itemsByStatus[status];
      return (
          <DialogContent className="max-w-4xl">
              <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                      <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {items.length > 0 ? items.map((item, index) => (
                              <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </div>
          </DialogContent>
      )
    }
    
    const renderSummaryModal = () => {
        const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
         const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Resumen de Artículos de Alquiler</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Cant. Cajas</TableHead>
                    <TableHead>Valoración</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((item, index) => {
                    const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                    const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                    return (
                      <TableRow key={`${item.itemCode}-${index}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{cajas}</TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                        <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
             <div className="flex justify-end font-bold text-lg p-4">
                Valoración Total: {formatCurrency(totalValue)}
            </div>
          </DialogContent>
        )
      }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Alquiler
            </Link>
            </Button>
        </div>
        
         <div className="grid md:grid-cols-3 gap-6 mb-8">
              {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                  const items = itemsByStatus[status];
                  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  return (
                  <StatusCard 
                      key={status}
                      title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                      items={items.length}
                      totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                      totalValue={totalValue}
                      onClick={() => setActiveModal(status)}
                  />
              )})}
          </div>
        
          <Card className="mb-6">
              <div className="flex items-center justify-between p-4">
                  <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
              </div>
              <CardContent>
                  <div className="border rounded-lg">
                      <Table>
                           <TableHeader>
                              <TableRow>
                                  <TableHead>Artículo</TableHead>
                                  <TableHead>Solicita</TableHead>
                                  <TableHead>Fecha Entrega</TableHead>
                                  <TableHead className="w-32">Cantidad</TableHead>
                                  <TableHead>Valoración</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                  <TableRow key={item.itemCode + item.orderId}>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell>{item.solicita}</TableCell>
                                      <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                  </TableRow>
                              )) : (
                                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
  
          <Card>
              <CardHeader>
                  <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
              </CardHeader>
               <CardContent>
                   <div className="border rounded-lg">
                      <Table>
                           <TableHeader>
                              <TableRow>
                                  <TableHead>Hoja Picking</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Contenido</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                  <TableRow key={order.sheetId}>
                                      <TableCell>
                                          <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                              <Badge variant="secondary">{order.sheetId}</Badge>
                                          </Link>
                                      </TableCell>
                                      <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                      <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                  </TableRow>
                              )) : (
                                  <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
  
         {activeModal && renderStatusModal(activeModal)}
      </Dialog>
    );
}



```
- src/app/os/bodega/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BodegaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bodega`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bodega/page.tsx:
```tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BodegaPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
    
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Bodega'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
      const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
       const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Resumen de Artículos de Bodega</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Cant. Cajas</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item, index) => {
                  const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                  const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                  return (
                    <TableRow key={`${item.itemCode}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{cajas}</TableCell>
                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                      <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-end font-bold text-lg p-4">
              Valoración Total: {formatCurrency(totalValue)}
          </div>
        </DialogContent>
      )
    }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Bodega..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Bodega`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Bodega
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}

```
- src/app/os/bio/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BioIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bio`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bio/page.tsx:
```tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BioPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
    
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Bio'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
      const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
       const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Resumen de Artículos de Bio (Consumibles)</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Cant. Cajas</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item, index) => {
                  const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                  const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                  return (
                    <TableRow key={`${item.itemCode}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{cajas}</TableCell>
                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                      <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-end font-bold text-lg p-4">
              Valoración Total: {formatCurrency(totalValue)}
          </div>
        </DialogContent>
      )
    }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Bio..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Bio`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Bio
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}

```
- src/app/os/atipicos/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AtipicosIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/atipicos`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/atipicos/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, FilePlus } from 'lucide-react';
import type { AtipicoOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { useOsContext } from '../os-context';

const statusVariant: { [key in AtipicoOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pendiente: 'secondary',
  Aprobado: 'default',
  Rechazado: 'destructive',
};

export default function AtipicosPage() {
  const [atipicoOrders, setAtipicoOrders] = useState<AtipicoOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { osId, serviceOrder, isLoading } = useOsContext();
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
      const relatedOrders = allAtipicoOrders.filter(order => order.osId === osId);
      setAtipicoOrders(relatedOrders);
    }
    setIsMounted(true);
  }, [osId]);

  const totalAmount = useMemo(() => {
    return atipicoOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [atipicoOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    const updatedOrders = allOrders.filter((o: AtipicoOrder) => o.id !== orderToDelete);
    localStorage.setItem('atipicoOrders', JSON.stringify(updatedOrders));
    setAtipicoOrders(updatedOrders.filter((o: AtipicoOrder) => o.osId === osId));
    
    toast({ title: 'Gasto atípico eliminado' });
    setOrderToDelete(null);
  };
  
  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Atípicos..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/atipicos/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto Atípico
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos Atípicos Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {atipicoOrders.length > 0 ? (
                          atipicoOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/atipicos/pedido?osId=${osId}&orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                              No hay gastos atípicos para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {atipicoOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto atípico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
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
- src/app/os/atipicos/layout.tsx:
```tsx
'use client';

import { FilePlus } from 'lucide-react';
import { useOsContext } from '../os-context';

export default function AtipicosLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsContext();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />Módulo de Gastos Atípicos</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}

```
- src/app/os/hielo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HieloIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/hielo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/hielo/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Snowflake, Phone, Building } from 'lucide-react';
import type { HieloOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { useOsContext } from '../os-context';

const statusVariant: { [key in HieloOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En reparto': 'outline',
  Entregado: 'outline',
};

export default function HieloPage() {
  const [hieloOrders, setHieloOrders] = useState<HieloOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { osId, serviceOrder, isLoading } = useOsContext();
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
      const relatedOrders = allHieloOrders.filter(order => order.osId === osId);
      setHieloOrders(relatedOrders);
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return hieloOrders.reduce((sum, order) => sum + order.total, 0);
  }, [hieloOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const updatedOrders = allOrders.filter((o: HieloOrder) => o.id !== orderToDelete);
    localStorage.setItem('hieloOrders', JSON.stringify(updatedOrders));
    setHieloOrders(updatedOrders.filter((o: HieloOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de hielo eliminado' });
    setOrderToDelete(null);
  };
  
  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Hielo..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-8">
        <Button asChild>
          <Link href={`/hielo/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Hielo
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Pedidos de Hielo Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Nº Artículos</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {hieloOrders.length > 0 ? (
                          hieloOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.proveedorNombre}</TableCell>
                              <TableCell>{order.items?.length || 0}</TableCell>
                              <TableCell>{formatCurrency(order.total)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/hielo/pedido?osId=${osId}&orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                              No hay pedidos de hielo para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {hieloOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de hielo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
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
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

import { OsContextProvider } from '../../os-context';

export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return <OsContextProvider>{children}</OsContextProvider>;
}

```
- src/app/os/gastronomia/layout.tsx:
```tsx
'use client';

import { Utensils } from 'lucide-react';
import { OsContextProvider } from '../os-context';


export default function GastronomiaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Módulo de Gastronomía</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/decoracion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DecoracionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/decoracion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/decoracion/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Flower2 } from 'lucide-react';
import type { DecoracionOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { useOsContext } from '../os-context';


export default function DecoracionPage() {
  const [decoracionOrders, setDecoracionOrders] = useState<DecoracionOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { osId, serviceOrder, isLoading } = useOsContext();
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
      const relatedOrders = allDecoracionOrders.filter(order => order.osId === osId);
      setDecoracionOrders(relatedOrders);
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return decoracionOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [decoracionOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const updatedOrders = allOrders.filter((o: DecoracionOrder) => o.id !== orderToDelete);
    localStorage.setItem('decoracionOrders', JSON.stringify(updatedOrders));
    setDecoracionOrders(updatedOrders.filter((o: DecoracionOrder) => o.osId === osId));
    
    toast({ title: 'Gasto de decoración eliminado' });
    setOrderToDelete(null);
  };
  
  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/decoracion/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto de Decoración
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos de Decoración Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {decoracionOrders.length > 0 ? (
                          decoracionOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/decoracion/pedido?osId=${osId}&orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              No hay gastos de decoración para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {decoracionOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de decoración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
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
- src/app/os/cta-explotacion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CtaExplotacionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/cta-explotacion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/comercial/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ComercialIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/comercial`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/comercial/layout.tsx:
```tsx
'use client';

import { Briefcase } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function ComercialLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase />Módulo Comercial</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/bodega/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BodegaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bodega`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bodega/page.tsx:
```tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BodegaPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
    
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Bodega'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
        const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
         const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Resumen de Artículos de Bodega</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Cant. Cajas</TableHead>
                    <TableHead>Valoración</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((item, index) => {
                    const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                    const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                    return (
                      <TableRow key={`${item.itemCode}-${index}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{cajas}</TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                        <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
             <div className="flex justify-end font-bold text-lg p-4">
                Valoración Total: {formatCurrency(totalValue)}
            </div>
          </DialogContent>
        )
      }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Bodega..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Bodega`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Bodega
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}

    
```
- src/app/os/bio/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BioIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bio`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bio/page.tsx:
```tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const { briefing } = useOsContext();
    
    const sortedItems = useMemo(() => {
        if (!briefing?.items) return [];
        return [...briefing.items].sort((a, b) => {
            const dateComparison = a.fecha.localeCompare(b.fecha);
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
        });
    }, [briefing]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.length > 0 ? sortedItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function BioPage() {
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
    const { osId, getProcessedDataForType, isLoading } = useOsContext();
    
    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(
        () => getProcessedDataForType('Bio'),
        [getProcessedDataForType]
    );

    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }
    
    const renderSummaryModal = () => {
      const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
       const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Resumen de Artículos de Bio (Consumibles)</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Cant. Cajas</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item, index) => {
                  const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                  const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                  return (
                    <TableRow key={`${item.itemCode}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{cajas}</TableCell>
                      <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                      <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-end font-bold text-lg p-4">
              Valoración Total: {formatCurrency(totalValue)}
          </div>
        </DialogContent>
      )
    }
  
    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Bio..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Bio`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Bio
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}

```
- src/app/os/atipicos/layout.tsx:
```tsx
'use client';

import { FilePlus } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function AtipicosLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />Módulo de Gastos Atípicos</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/comercial/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ComercialIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/comercial`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/cta-explotacion/layout.tsx:
```tsx
'use client';

import { Euro } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function CtaExplotacionLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Euro />Cuenta de Explotación</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/decoracion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DecoracionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/decoracion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/decoracion/layout.tsx:
```tsx
'use client';

import { Flower2 } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function DecoracionLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Flower2 />Módulo de Decoración</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

import { OsContextProvider } from '../../os-context';

export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return <OsContextProvider>{children}</OsContextProvider>;
}

```
- src/app/os/info/layout.tsx:
```tsx

'use client';

import { OsContextProvider } from '../os-context';

export default function InfoLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <OsContextProvider>
            {children}
        </OsContextProvider>
    )
}
```
- src/app/os/layout.tsx:
```tsx

'use client';

import { usePathname, useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo, Suspense } from 'react';
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
import { cn } from '@/lib/utils';
import { OsContextProvider, useOsContext } from './os-context';

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

function OsHeaderContent() {
    const pathname = usePathname();
    const { serviceOrder, isLoading, updateKey } = useOsContext();
    
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

    if (isLoading || !serviceOrder) {
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
                    <Link href={`/os/${serviceOrder.id}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${serviceOrder.id}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
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
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={serviceOrder.id} moduleName={currentModule.moduleName} updateKey={updateKey} />}
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

function OSDetailsLayoutContent({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const dashboardHref = `/os/${osId}`;

    return (
      <div className="container mx-auto">
          <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
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
                      <OsHeaderContent />
                  </div>
              </div>
          </div>
          <main className="py-8">
              {children}
          </main>
      </div>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const osId = params.id as string;
    
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <OsContextProvider osId={osId}>
                <OSDetailsLayoutContent>{children}</OSDetailsLayoutContent>
            </OsContextProvider>
        </Suspense>
    )
}

```
- src/app/os/personal-mice/layout.tsx:
```tsx
'use client';

import { Users } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function PersonalMiceLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}
```
- src/app/os/personal-externo/layout.tsx:
```tsx
'use client';

import { Users } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function PersonalExternoLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal Externo</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}
```
- src/app/os/transporte/layout.tsx:
```tsx
'use client';

import { Truck } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function TransporteLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />Módulo de Transporte</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/prueba-menu/layout.tsx:
```tsx
'use client';

import { ClipboardCheck } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function PruebaMenuLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ClipboardCheck />Prueba de Menú</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/hielo/layout.tsx:
```tsx
'use client';

import { Snowflake } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function HieloLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Snowflake />Módulo de Hielo</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}
```
- src/app/os/comercial/layout.tsx:
```tsx
'use client';

import { Briefcase } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function ComercialLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase />Módulo Comercial</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/cta-explotacion/layout.tsx:
```tsx
'use client';

import { Euro } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function CtaExplotacionLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Euro />Cuenta de Explotación</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

```
- src/app/os/info/layout.tsx:
```tsx

'use client';

import { OsContextProvider } from '../os-context';

export default function InfoLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <OsContextProvider>
            {children}
        </OsContextProvider>
    )
}
```
```