'use client';

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
import { calculateHours, formatCurrency, formatDuration } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { logActivity } from '@/app/(dashboard)/portal/activity-log/utils';

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const asignacionSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    dni: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
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
    fecha: z.date({ required_error: "La fecha es obligatoria." }),
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
    observacionesGenerales: z.string().optional(),
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
        if (isOpen) {
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

import {
    useEvento,
    useComercialBriefings,
    useCategoriasPersonal,
    useProveedores,
    usePersonalExterno,
    usePersonalExternoAjustes,
    useUpdatePersonalExterno,
    useUpdatePersonalExternoAjustes
} from '@/hooks/use-data-queries';

export default function PersonalExternoPage() {
    const params = useParams() ?? {};
    const osId = (params.id as string) || '';
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId);
    const { data: briefings, isLoading: isLoadingBriefings } = useComercialBriefings(osId);
    const { data: proveedoresDB = [], isLoading: isLoadingCategorias } = useCategoriasPersonal();
    const { data: allProveedores = [], isLoading: isLoadingProveedores } = useProveedores();
    const { data: personalExternoData, isLoading: isLoadingPersonal } = usePersonalExterno(osId);
    const { data: ajustesData = [], isLoading: isLoadingAjustes } = usePersonalExternoAjustes(osId);

    const updatePersonalMutation = useUpdatePersonalExterno();
    const updateAjustesMutation = useUpdatePersonalExternoAjustes();

    const briefingItems = useMemo(() => briefings?.[0]?.items || [], [briefings]);
    const personalExterno = useMemo(() => (personalExternoData as PersonalExterno) || { osId, turnos: [], status: 'Pendiente' }, [personalExternoData, osId]);

    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

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

    useEffect(() => {
        if (personalExterno && isMounted) {
            form.reset({
                turnos: personalExterno.turnos.map(t => ({ ...t, fecha: new Date(t.fecha) })),
                ajustes: ajustesData,
                observacionesGenerales: personalExterno.observacionesGenerales || ''
            });
        }
    }, [personalExterno, ajustesData, isMounted, form]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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
            const asignaciones = order.asignaciones || [];
            const quantity = asignaciones.length > 0 ? asignaciones.length : 1;
            return acc + plannedHours * (order.precioHora || 0) * quantity;
        }, 0) || 0;

        const real = watchedFields?.reduce((acc, order) => {
            return acc + (order.asignaciones || []).reduce((sumAsignacion, asignacion) => {
                const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
                const hoursToUse = realHours > 0 ? realHours : calculateHours(order.horaEntrada, order.horaSalida);
                return sumAsignacion + hoursToUse * (order.precioHora || 0);
            }, 0);
        }, 0) || 0;

        const aj = watchedAjustes?.reduce((sum, ajuste) => sum + (ajuste.importe || 0), 0) || 0;
        return { totalPlanned: planned, totalReal: real, totalAjustes: aj, costeFinalPlanificado: planned + aj, finalTotalReal: real + aj };
    }, [watchedFields, watchedAjustes]);

    const handleGlobalStatusAction = async (newStatus: EstadoPersonalExterno) => {
        if (!personalExterno) return;

        const updatedTurnos = personalExterno.turnos.map(t => ({
            ...t,
            requiereActualizacion: newStatus === 'Solicitado' ? true : t.requiereActualizacion,
        }));

        const updatedPersonalExterno = { ...personalExterno, status: newStatus, turnos: updatedTurnos };

        try {
            await updatePersonalMutation.mutateAsync(updatedPersonalExterno);
            toast({ title: 'Estado actualizado', description: `La solicitud de personal ahora está: ${newStatus}` });
        } catch (error) {
            console.error('Error updating status:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
        }
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
        if (!personalExterno) return null;
        switch (personalExterno.status) {
            case 'Pendiente':
                return <Button onClick={() => handleGlobalStatusAction('Solicitado')}><Send className="mr-2" />Solicitar a ETT</Button>
            case 'Solicitado':
                if (isSolicitudDesactualizada) {
                    return <Button onClick={handleSubmit(onSubmit)}><RefreshCw className="mr-2" />Notificar Cambios a ETT</Button>
                }
                return <Button variant="secondary" disabled><CheckCircle className="mr-2" />Solicitado</Button>
            case 'Asignado':
                return <Button onClick={() => handleGlobalStatusAction('Cerrado')}><Save className="mr-2" />Cerrar y Validar Costes</Button>
            case 'Cerrado':
                return <Button variant="secondary" disabled><CheckCircle className="mr-2" />Cerrado</Button>
            default:
                return null;
        }
    }

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        try {
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
                observacionesGenerales: data.observacionesGenerales || '',
            };

            await updatePersonalMutation.mutateAsync(newPersonalData);
            await updateAjustesMutation.mutateAsync({ osId, ajustes: data.ajustes || [] });

            toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
            form.reset(data);
        } catch (error) {
            console.error('Error saving personal:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la planificación.' });
        } finally {
            setIsLoading(false);
        }
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

    const handleClearAll = async () => {
        remove();
        setShowClearConfirm(false);
        toast({ title: 'Planificación vaciada' });
        await handleSubmit(onSubmit)();
    };

    const providerOptions = useMemo(() =>
        allProveedores.filter(p => p.nombreComercial && p.nombreComercial.length > 0).map(p => ({
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
                                <div />
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
                                                        <Trash2 className="mr-2" />Vaciar Planificación
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
                                                                        )} />
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
                                                                        )} />
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
                                                                                        <CheckCircle className="h-5 w-5 text-green-600" />
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
                                                            )
                                                        })
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
                                                    <FormField control={control} name={`ajustes.${index}.proveedorId`} render={({ field }) => (
                                                        <FormItem className="flex-grow">
                                                            <Combobox options={providerOptions} value={field.value || ''} onChange={field.onChange} placeholder="Proveedor..." />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={control} name={`ajustes.${index}.concepto`} render={({ field }) => (
                                                        <Combobox
                                                            options={AJUSTE_CONCEPTO_OPCIONES.map(o => ({ label: o, value: o }))}
                                                            value={field.value || ''}
                                                            onChange={field.onChange}
                                                            placeholder="Concepto..."
                                                        />
                                                    )} />
                                                    <FormField control={control} name={`ajustes.${index}.importe`} render={({ field }) => (
                                                        <Input type="number" step="0.01" placeholder="Importe" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="w-24 h-9" />
                                                    )} />
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => removeAjuste(index)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                            <Button size="sm" variant="outline" className="w-full" type="button" onClick={() => appendAjuste({ id: Date.now().toString(), proveedorId: '', concepto: '', importe: 0 })}>Añadir Ajuste</Button>
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