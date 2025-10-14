
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle, Send, Printer, FileText, Upload, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
import { calculateHours, formatCurrency, formatDuration, formatNumber, formatPercentage } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

const statusBadgeVariant: { [key in EstadoPersonalExterno]: 'success' | 'warning' | 'outline' | 'default' } = {
    'Pendiente': 'warning',
    'Solicitado': 'outline',
    'Asignado': 'success',
    'Cerrado': 'default',
};

function AsignacionDialog({ turno, onSave, children, isReadOnly }: { turno: TurnoConDetalles; onSave: (turnoId: string, asignaciones: AsignacionPersonal[]) => void; children: React.ReactNode, isReadOnly: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [asignacion, setAsignacion] = useState<AsignacionPersonal>({ id: '1', nombre: '', dni: '', telefono: '', email: '', comentarios: '', horaEntradaReal: '', horaSalidaReal: '' });
    
    useEffect(() => {
        if(isOpen) {
             setAsignacion(turno.asignaciones?.[0] || { id: '1', nombre: '', dni: '', telefono: '', email: '', comentarios: '', horaEntradaReal: '', horaSalidaReal: '' });
        }
    }, [isOpen, turno.asignaciones]);

    const updateAsignacion = (field: keyof Omit<AsignacionPersonal, 'id'>, value: string) => {
        setAsignacion(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!asignacion.nombre) {
            alert("El nombre es obligatorio.");
            return;
        }
        onSave(turno.id, [asignacion]);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Asignar Personal: {turno.categoria}</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-sm text-muted-foreground pt-2 space-y-1">
                            <div className="flex items-center gap-2"><MapPin size={14}/> <strong>Dirección:</strong> {turno.lugarEntrega}</div>
                            <div className="flex items-center gap-2"><Clock size={14}/> <strong>Horario:</strong> {turno.horaEntrada} - {turno.horaSalida}</div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor={`nombre-${asignacion.id}`}>Nombre y Apellidos</Label><Input id={`nombre-${asignacion.id}`} placeholder="Nombre completo" value={asignacion.nombre} onChange={e => updateAsignacion('nombre', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`dni-${asignacion.id}`}>DNI</Label><Input id={`dni-${asignacion.id}`} placeholder="DNI" value={asignacion.dni} onChange={e => updateAsignacion('dni', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`tel-${asignacion.id}`}>Teléfono</Label><Input id={`tel-${asignacion.id}`} placeholder="Teléfono de contacto" value={asignacion.telefono} onChange={e => updateAsignacion('telefono', e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor={`email-${asignacion.id}`}>Email</Label><Input id={`email-${asignacion.id}`} placeholder="Email" value={asignacion.email} onChange={e => updateAsignacion('email', e.target.value)} /></div>
                        <div className="space-y-1 col-span-2"><Label htmlFor={`com-${asignacion.id}`}>Comentarios</Label><Input id={`com-${asignacion.id}`} placeholder="Notas (opcional)" value={asignacion.comentarios} onChange={e => updateAsignacion('comentarios', e.target.value)} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isReadOnly}>Guardar Asignación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [personalExterno, setPersonalExterno] = useState<PersonalExterno | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

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
        const currentTurnoIds = new Set(watchedFields?.map(f => f.id));
        const savedTurnoIds = new Set(personalExterno.turnos.map(t => t.id));
        if(currentTurnoIds.size !== savedTurnoIds.size) return true;
        
        return Array.from(currentTurnoIds).some(id => !savedTurnoIds.has(id));
    }, [watchedFields, personalExterno]);
    
    const ActionButton = () => {
        if(!personalExterno) return null;

        switch(personalExterno.status) {
            case 'Pendiente':
                return <Button onClick={() => handleGlobalStatusAction('Solicitado')}><Send className="mr-2"/>Solicitar a ETT</Button>
            case 'Solicitado':
                if (isSolicitudDesactualizada) {
                    return <Button onClick={() => handleGlobalStatusAction('Solicitado')}><RefreshCw className="mr-2"/>Notificar Cambios a ETT</Button>
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

 const handlePrintInforme = async () => {
    if (!serviceOrder) return;
    setIsPrinting(true);
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#16a34a');
        doc.text('Informe de Rentabilidad de Personal Externo', 15, finalY);
        finalY += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#374151'); // Gris oscuro
        doc.text(`OS: ${serviceOrder.serviceNumber} - ${serviceOrder.client}`, margin, finalY);
        finalY += 10;

        const kpiData = [
            ['Coste Total Final:', formatCurrency(finalTotalReal)],
            ['Desviación vs Planificado:', formatCurrency(finalTotalReal - costeFinalPlanificado)],
            ['Coste Medio por Hora Real:', `${formatCurrency(finalTotalReal / (watchedFields.reduce((sum, t) => sum + (t.asignaciones || []).reduce((s, a) => s + (calculateHours(a.horaEntradaReal, a.horaSalidaReal) || calculateHours(t.horaEntrada, t.horaSalida)), 0), 0) || 1))} /h`],
            ['Total Horas Reales:', `${formatNumber(watchedFields.reduce((sum, t) => sum + (t.asignaciones || []).reduce((s, a) => s + (calculateHours(a.horaEntradaReal, a.horaSalidaReal) || calculateHours(t.horaEntrada, t.horaSalida)), 0), 0), 2)} h`],
        ];
        
        autoTable(doc, {
            body: kpiData,
            startY: finalY,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        finalY = (doc as any).lastAutoTable.finalY + 8;

        const totalTurnos = watchedFields.length;
        const bySolicitante = watchedFields.reduce((acc, turno) => {
            acc[turno.solicitadoPor] = (acc[turno.solicitadoPor] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Desglose de Solicitudes', margin, finalY);
        finalY += 6;
        autoTable(doc, {
            head: [['Departamento', 'Nº Turnos', '% del Total']],
            body: Object.entries(bySolicitante).map(([depto, count]) => [depto, count, `${formatPercentage(count / totalTurnos)}`]),
            startY: finalY,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [243, 244, 246] }
        });
        finalY = (doc as any).lastAutoTable.finalY + 8;

        const costePorProveedor: Record<string, number> = {};
        watchedFields.forEach(turno => {
            const costeTurno = (turno.asignaciones || []).reduce((sum, asig) => {
                const horas = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || calculateHours(turno.horaEntrada, turno.horaSalida);
                return sum + horas * turno.precioHora;
            }, 0);
            const proveedor = allProveedores.find(p => p.id === proveedoresDB.find(pdb => pdb.id === turno.proveedorId)?.proveedorId);
            const provName = proveedor?.nombreComercial || 'Desconocido';
            costePorProveedor[provName] = (costePorProveedor[provName] || 0) + costeTurno;
        });

        doc.setFontSize(10);
        doc.text('Coste por Proveedor (Horas Reales)', margin, finalY);
        finalY += 6;
        autoTable(doc, {
            startY: finalY,
            head: [['Proveedor', 'Coste Total']],
            body: Object.entries(costePorProveedor).map(([name, cost]) => [name, formatCurrency(cost)]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [243, 244, 246] }
        });
        finalY = (doc as any).lastAutoTable.finalY + 8;

        if (watchedAjustes && watchedAjustes.length > 0) {
            doc.setFontSize(10);
            doc.text('Ajustes Manuales', margin, finalY);
            finalY += 6;
            autoTable(doc, {
                startY: finalY,
                head: [['Proveedor', 'Concepto', 'Importe']],
                body: watchedAjustes.map(aj => [
                    allProveedores.find(p => p.id === aj.proveedorId)?.nombreComercial || 'N/A',
                    aj.concepto,
                    formatCurrency(aj.importe)
                ]),
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [243, 244, 246] }
            });
        }
        
        doc.save(`Informe_Facturacion_Personal_${serviceOrder.serviceNumber}.pdf`);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error al generar PDF' });
    } finally {
        setIsPrinting(false);
    }
  };

  const handlePrintParte = async () => {
      if (!serviceOrder) return;
      setIsPrinting(true);
      try {
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const margin = 15;
          let finalY = margin;
          
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#16a34a');
          doc.text('Parte de Horas - Personal Externo', 15, finalY);
          finalY += 8;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor('#374151');
          autoTable(doc, {
              body: [
                  ['Nº Servicio:', serviceOrder.serviceNumber],
                  ['Cliente:', serviceOrder.client],
                  ['Fecha Evento:', format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')],
              ],
              startY: finalY,
              theme: 'plain',
              styles: { fontSize: 8, cellPadding: 0.5 },
              columnStyles: { 0: { fontStyle: 'bold' } }
          });
          finalY = (doc as any).lastAutoTable.finalY + 8;

          autoTable(doc, {
              startY: finalY,
              head: [['Fecha', 'Solicitado por', 'Tipo Servicio', 'Nombre y Apellidos', 'DNI', 'H. Entrada', 'H. Salida', 'Firma']],
              body: watchedFields.flatMap(turno => 
                  (turno.asignaciones?.length ? turno.asignaciones : [{id: 'temp', nombre: 'PENDIENTE DE ASIGNAR', dni: ''}]).map(asig => [
                      format(new Date(turno.fecha), 'dd/MM/yy'),
                      turno.solicitadoPor,
                      turno.tipoServicio,
                      asig.nombre,
                      asig.dni,
                      turno.horaEntrada,
                      turno.horaSalida,
                      ''
                  ])
              ),
              theme: 'grid',
              headStyles: { fillColor: '#059669', textColor: '#ffffff' },
              styles: { fontSize: 7, cellPadding: 1.5, minCellHeight: 10 },
              columnStyles: { 7: { cellWidth: 20 } }
          });
          
          doc.save(`Parte_Horas_${serviceOrder.serviceNumber}.pdf`);
      } catch (e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Error al generar PDF' });
      } finally {
          setIsPrinting(false);
      }
  };


  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }

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
                     <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="planificacion">Planificación de Turnos</TabsTrigger>
                        <TabsTrigger value="aprobados">Cierre y Horas Reales</TabsTrigger>
                        <TabsTrigger value="documentacion">Documentación</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planificacion" className="mt-4">
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
                                            <TableHead colSpan={3} className="text-center border-l border-r px-2 py-1 bg-muted/30">Planificado</TableHead>
                                            <TableHead className="px-2 py-1">Obs. ETT</TableHead>
                                            <TableHead className="text-center px-2 py-1">Estado ETT</TableHead>
                                            <TableHead className="text-right px-2 py-1">Acción</TableHead>
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
                                                    <FormField control={control} name={`turnos.${index}.solicitadoPor`} render={({ field: selectField }) => (
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
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
                                                                <FormControl><SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="border-l px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="border-r px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9 text-xs" readOnly /></FormControl></FormItem>} />
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
                                            <TableHead>Teléfono</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Fecha-Horario Plan.</TableHead>
                                            <TableHead className="w-24">H. Entrada Real</TableHead>
                                            <TableHead className="w-24">H. Salida Real</TableHead>
                                            <TableHead className="w-24">Horas Real.</TableHead>
                                            <TableHead className="w-[150px] text-center">Desempeño y Comentarios</TableHead>
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
                                                    <TableCell>{asignacion.telefono}</TableCell>
                                                    <TableCell>{asignacion.email}</TableCell>
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
                                                     <TableCell className="font-mono text-center">
                                                        {formatDuration(calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal))}h
                                                     </TableCell>
                                                    <TableCell className="text-center">
                                                       <FeedbackDialog turnoIndex={turnoIndex} asigIndex={asigIndex} form={form} />
                                                    </TableCell>
                                                </TableRow>
                                            )})
                                        }) : (
                                            <TableRow><TableCell colSpan={9} className="h-24 text-center">No hay turnos gestionados por la ETT.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="documentacion">
                        <Card>
                            <CardHeader className="py-3 flex-row items-center justify-between">
                                <CardTitle className="text-lg">Documentación</CardTitle>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={handlePrintInforme} disabled={isPrinting}>
                                        {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2" />}
                                        Generar Informe Facturación
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handlePrintParte} disabled={isPrinting}>
                                        {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />}
                                        Imprimir Parte de Horas
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Hoja de Firmas Adjunta</CardTitle></CardHeader>
                                    <CardContent>
                                        {personalExterno?.hojaFirmadaUrl ? (
                                             <div className="relative">
                                                <img src={personalExterno.hojaFirmadaUrl} alt="Hoja de firmas" width={500} height={300} className="rounded-md w-full h-auto object-contain"/>
                                            </div>
                                        ) : (
                                            <div>
                                                <Label htmlFor="upload-photo">Subir hoja de firmas escaneada</Label>
                                                <Input id="upload-photo" type="file" accept="image/*" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
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
                                <Button size="xs" variant="outline" className="w-full" type="button" onClick={() => appendAjuste({ id: Date.now().toString(), proveedorId: '', concepto: 'Otros', importe: 0 })}>Añadir Ajuste</Button>
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
```
- `src/types/index.ts`:
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

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
  email?: string;
  comentarios: string;
  comentariosMice?: string;
  rating?: number;
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
  asignaciones: AsignacionPersonal[];
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

export type PersonalExternoDB = {
    id: string; // DNI
    proveedorId: string;
    nombre: string;
    apellido1: string;
    apellido2: string;
    nombreCompleto: string;
    nombreCompacto: string;
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
```