

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
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw, Star, MessageSquare, Pencil, AlertTriangle, CheckCircle, Send, Printer, FileText, Upload, Mail } from 'lucide-react';

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
import { logActivity } from '../activity-log/utils';


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
    if (!osId || !serviceOrder) return;
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(serviceOrder.startDate),
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
  
  const handlePrintParte = () => {
    if (!serviceOrder) return;
    setIsPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      let finalY = margin;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#059669'); // Verde corporativo
      doc.text('Parte de Horas - Personal Externo', margin, finalY);
      finalY += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#374151');
      
      const serviceData = [
          ['Nº Servicio:', serviceOrder.serviceNumber],
          ['Cliente:', serviceOrder.client],
          ['Fecha:', format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')],
          ['Espacio:', serviceOrder.space || '-']
      ];
      autoTable(doc, {
          body: serviceData,
          startY: finalY,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 0.8 },
          columnStyles: { 0: { fontStyle: 'bold' } }
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;
      
      const tableData = watchedFields
          .flatMap(turno => (turno.asignaciones || []).map(asig => ({ ...asig, turno })))
          .map(item => [
              item.nombre,
              item.turno.categoria,
              item.turno.solicitadoPor,
              item.turno.tipoServicio,
              `${item.turno.horaEntrada} - ${item.turno.horaSalida}`,
              '', // H. Entrada Real
              '', // H. Salida Real
              ''  // Firma
          ]);

      autoTable(doc, {
          head: [['Nombre', 'Categoría', 'Solicitado Por', 'Tipo Servicio', 'Horario Planificado', 'H. Entrada Real', 'H. Salida Real', 'Firma']],
          body: tableData,
          startY: finalY,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5, minCellHeight: 10 },
          headStyles: { fillColor: '#059669', textColor: '#ffffff' }
      });

      doc.save(`Parte_Horas_${serviceOrder.serviceNumber}.pdf`);

    } catch (e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.'});
    } finally {
        setIsPrinting(false);
    }
  };

  const handlePrintInforme = () => {
    if (!serviceOrder) return;
    setIsPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 10;
      let finalY = margin;

      const addHeader = () => {
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#059669'); // Verde corporativo
          doc.text('Informe de Facturación - Personal Externo', margin, finalY);
          finalY += 8;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor('#374151');
          doc.text(`Pedido: ${serviceOrder.serviceNumber} - ${serviceOrder.client}`, margin, finalY);
          finalY += 10;
      };

      addHeader();
      
      const kpiData = [
          { title: 'Coste Total Final', value: formatCurrency(finalTotalReal), color: '#059669' },
          { title: 'Desviación vs. Plan.', value: formatCurrency(finalTotalReal - costeFinalPlanificado), color: finalTotalReal > costeFinalPlanificado ? '#ef4444' : '#10b981' },
          { title: 'Coste Medio / Hora Real', value: formatCurrency(totalReal > 0 ? finalTotalReal / (watchedFields.reduce((s, t) => s + calculateHours(t.horaEntradaReal, t.horaSalidaReal), 0)) : 0) },
          { title: 'Total Horas Reales', value: `${formatDuration(watchedFields.reduce((s,t) => s + calculateHours(t.horaEntradaReal, t.horaSalidaReal), 0))}h` },
      ];
      
      let kpiX = margin;
      const kpiCardWidth = (doc.internal.pageSize.getWidth() - margin * 2) / 4 - 5;
      kpiData.forEach(kpi => {
          doc.setDrawColor('#e5e7eb');
          doc.roundedRect(kpiX, finalY, kpiCardWidth, 18, 2, 2, 'S');
          doc.setFontSize(8);
          doc.setTextColor('#6b7280');
          doc.text(kpi.title, kpiX + 3, finalY + 5);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(kpi.color || '#1f2937');
          doc.text(kpi.value, kpiX + 3, finalY + 12);
          kpiX += kpiCardWidth + 5;
      });
      finalY += 25;
      
      const bySolicitante: Record<string, number> = {};
      let totalTurnos = 0;
      watchedFields.forEach(t => {
          const solicitante = t.solicitadoPor || 'Otro';
          bySolicitante[solicitante] = (bySolicitante[solicitante] || 0) + 1;
          totalTurnos++;
      });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#1f2937');
      doc.text('% Personal Solicitado por Departamento', margin, finalY);
      finalY += 6;

      autoTable(doc, {
          head: [['Departamento', 'Nº Turnos', '% del Total']],
          body: Object.entries(bySolicitante).map(([depto, count]) => [depto, count, `${formatPercentage(count / totalTurnos)}`]),
          startY: finalY,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: '#059669', textColor: '#ffffff' }
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.save(`Informe_Facturacion_${serviceOrder.serviceNumber}.pdf`);

    } catch (e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.'});
    } finally {
        setIsPrinting(false);
    }
  };

  const removeHojaFirmada = () => {
    if(!personalExterno) return;
    const updated = {...personalExterno, hojaFirmadaUrl: undefined};
    setPersonalExterno(updated);
    const allData = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
    const index = allData.findIndex(p => p.osId === osId);
    if (index !== -1) {
        allData[index] = updated;
        localStorage.setItem('personalExterno', JSON.stringify(allData));
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file && personalExterno) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const updated = {...personalExterno, hojaFirmadaUrl: result};
            setPersonalExterno(updated);
            const allData = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
            const index = allData.findIndex(p => p.osId === osId);
            if (index !== -1) {
                allData[index] = updated;
                localStorage.setItem('personalExterno', JSON.stringify(allData));
            }
        };
        reader.readAsDataURL(file);
    }
  }


  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }
  
  const statusBadgeVariant: 'success' | 'warning' | 'outline' | 'default' = personalExterno?.status === 'Asignado' || personalExterno?.status === 'Cerrado' ? 'success' : personalExterno?.status === 'Solicitado' ? 'outline' : 'warning';


  return (
    <>
    <main>
    </main>
    </>
  );
}
