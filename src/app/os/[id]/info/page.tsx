

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Warehouse, ChevronRight, PanelLeft, Wine, FilePenLine, Trash2, Leaf, Briefcase, Utensils, Truck, Archive, Snowflake, DollarSign, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, Star, Save, AlertTriangle, Phone, Mail } from 'lucide-react';

import type { ServiceOrder, Personal, Espacio, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';

export const osFormSchema = z.object({
  serviceNumber: z.string().min(1, 'El Nº de Servicio es obligatorio'),
  startDate: z.date({ required_error: 'La fecha de inicio es obligatoria.' }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  tipoCliente: z.enum(['Empresa', 'Agencia', 'Particular']).optional(),
  asistentes: z.coerce.number().min(1, 'El número de asistentes es obligatorio.'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  finalClient: z.string().optional().default(''),
  endDate: z.date({ required_error: 'La fecha de fin es obligatoria.' }),
  space: z.string().optional().default(''),
  spaceAddress: z.string().optional().default(''),
  spaceContact: z.string().optional().default(''),
  spacePhone: z.string().optional().default(''),
  spaceMail: z.string().email().optional().or(z.literal('')),
  respMetre: z.string().optional().default(''),
  respMetrePhone: z.string().optional().default(''),
  respMetreMail: z.string().email().optional().or(z.literal('')),
  respCocinaCPR: z.string().optional().default(''),
  respCocinaCPRPhone: z.string().optional().default(''),
  respCocinaCPRMail: z.string().email().optional().or(z.literal('')),
  respPase: z.string().optional().default(''),
  respPasePhone: z.string().optional().default(''),
  respPaseMail: z.string().email().optional().or(z.literal('')),
  respCocinaPase: z.string().optional().default(''),
  respCocinaPasePhone: z.string().optional().default(''),
  respCocinaPaseMail: z.string().email().optional().or(z.literal('')),
  comercialAsiste: z.boolean().optional().default(false),
  comercial: z.string().optional().default(''),
  comercialPhone: z.string().optional().default(''),
  comercialMail: z.string().email().optional().or(z.literal('')),
  rrhhAsiste: z.boolean().optional().default(false),
  respRRHH: z.string().optional().default(''),
  respRRHHPhone: z.string().optional().default(''),
  respRRHHMail: z.string().email().optional().or(z.literal('')),
  agencyPercentage: z.coerce.number().optional().default(0),
  agencyCommissionValue: z.coerce.number().optional().default(0),
  spacePercentage: z.coerce.number().optional().default(0),
  spaceCommissionValue: z.coerce.number().optional().default(0),
  comisionesAgencia: z.coerce.number().optional().default(0),
  comisionesCanon: z.coerce.number().optional().default(0),
  facturacion: z.coerce.number().optional().default(0),
  plane: z.string().optional().default(''),
  comments: z.string().optional().default(''),
  status: z.enum(['Borrador', 'Pendiente', 'Confirmado', 'Anulado']).default('Borrador'),
  anulacionMotivo: z.string().optional(),
  deliveryLocations: z.array(z.string()).optional().default([]),
  objetivoGastoId: z.string().optional(),
  direccionPrincipal: z.string().optional().default(''),
  isVip: z.boolean().optional().default(false),
});

export type OsFormValues = z.infer<typeof osFormSchema>;

const defaultValues: Partial<OsFormValues> = {
  serviceNumber: '', client: '', contact: '', phone: '', finalClient: '', asistentes: 0,
  space: '', spaceAddress: '', spaceContact: '', spacePhone: '', spaceMail: '',
  respMetre: '', respMetrePhone: '', respMetreMail: '', 
  respPase: '', respPasePhone: '', respPaseMail: '',
  respCocinaPase: '', respCocinaPasePhone: '', respCocinaPaseMail: '',
  respCocinaCPR: '', respCocinaCPRPhone: '', respCocinaCPRMail: '',
  comercialAsiste: false, comercial: '', comercialPhone: '', comercialMail: '',
  rrhhAsiste: false, respRRHH: '', respRRHHPhone: '', respRRHHMail: '',
  agencyPercentage: 0, agencyCommissionValue: 0, spacePercentage: 0, spaceCommissionValue: 0,
  facturacion: 0,
  plane: '', comments: '',
  status: 'Borrador', tipoCliente: 'Empresa',
  deliveryLocations: [],
  direccionPrincipal: '',
  isVip: false,
};

const ClienteTitle = () => {
  const { watch } = useFormContext();
  const client = watch('client');
  const finalClient = watch('finalClient');
  return (
    <div className="flex w-full items-center justify-between p-4">
        <h3 className="text-lg font-semibold">Cliente</h3>
        {(client || finalClient) && (
             <span className="text-lg font-bold text-primary text-right">
                {client}{finalClient && ` / ${finalClient}`}
            </span>
        )}
    </div>
  );
};

const EspacioTitle = () => {
    const { watch } = useFormContext();
    const space = watch('space');
    const spaceAddress = watch('spaceAddress');
    
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Espacio</h3>
            {space && (
                <span className="text-base font-semibold text-primary text-right">
                    {space} {spaceAddress && <span className="font-normal text-muted-foreground">({spaceAddress})</span>}
                </span>
            )}
        </div>
    );
};

const ResponsablesTitle = () => {
  const metre = useWatch({ name: 'respMetre' });
  const pase = useWatch({ name: 'respPase' });

  return (
    <div className="flex w-full items-center justify-between p-4">
        <h3 className="text-lg font-semibold">Responsables</h3>
        {(metre || pase) && (
            <div className="text-right">
                {metre && <p className="text-sm"><span className="font-semibold text-muted-foreground">Metre:</span> <span className="font-semibold text-primary">{metre}</span></p>}
                {pase && <p className="text-sm"><span className="font-semibold text-muted-foreground">Pase:</span> <span className="font-semibold text-primary">{pase}</span></p>}
            </div>
        )}
    </div>
  );
};

export default function InfoPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const isEditing = osId !== 'nuevo';

  const [isMounted, setIsMounted] = useState(false);
  const { isLoading, setIsLoading } = useLoadingStore();
  const [accordionDefaultValue, setAccordionDefaultValue] = useState<string[] | undefined>(undefined);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmittingFromDialog, setIsSubmittingFromDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isAnulacionDialogOpen, setIsAnulacionDialogOpen] = useState(false);
  const [anulacionMotivo, setAnulacionMotivo] = useState("");
  const [pendingStatus, setPendingStatus] = useState<OsFormValues['status'] | null>(null);

  
  const hasPruebaDeMenu = useMemo(() => {
    return briefingItems.some(item => item.descripcion.toLowerCase() === 'prueba de menu');
  }, [briefingItems]);

  const personalSala = useMemo(() => personal.filter(p => p.departamento === 'SALA' && p.nombre), [personal]);
  const personalCPR = useMemo(() => personal.filter(p => p.departamento === 'CPR' && p.nombre), [personal]);
  const personalComercial = useMemo(() => personal.filter(p => p.departamento === 'COMERCIAL' && p.nombre), [personal]);
  const personalCocina = useMemo(() => personal.filter(p => p.departamento === 'COCINA' && p.nombre), [personal]);
  const personalRRHH = useMemo(() => personal.filter(p => p.departamento === 'RRHH' && p.nombre), [personal]);
  const validEspacios = useMemo(() => espacios.filter(e => e.identificacion.nombreEspacio), [espacios]);
  const espacioOptions = useMemo(() => validEspacios.map(e => ({label: e.identificacion.nombreEspacio, value: e.identificacion.nombreEspacio})), [validEspacios]);


  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues,
  });

  const { formState: { isDirty }, setValue, watch } = form;
  
  const handlePersonalChange = (name: string, phoneField: keyof OsFormValues, mailField: keyof OsFormValues) => {
    const person = personal.find(p => p.nombre === name);
    setValue(phoneField, person?.telefono || '', { shouldDirty: true });
    setValue(mailField, person?.mail || '', { shouldDirty: true });
  }

  const handleEspacioChange = (name: string) => {
    const espacio = espacios.find(e => e.identificacion.nombreEspacio === name);
    setValue('spaceAddress', espacio?.identificacion.calle || '', { shouldDirty: true });
    setValue('spaceContact', espacio?.contactos[0]?.nombre || '', { shouldDirty: true });
    setValue('spacePhone', espacio?.contactos[0]?.telefono || '', { shouldDirty: true });
    setValue('spaceMail', espacio?.contactos[0]?.email || '', { shouldDirty: true });
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);


  const handleBackToList = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
        router.push('/pes');
    }
  };


  useEffect(() => {
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    setPersonal(allPersonal.filter(p => p.nombre));
    setEspacios(allEspacios.filter(e => e.identificacion.nombreEspacio));
    
    if (isEditing) {
      setAccordionDefaultValue([]); // Collapse for existing
      const allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allOS.find(os => os.id === osId) || null;
      if (currentOS) {
        const values = {
            ...defaultValues, // Ensure all keys are present
            ...currentOS,
            startDate: new Date(currentOS.startDate),
            endDate: new Date(currentOS.endDate),
        }
        form.reset(values);

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);
        
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la Orden de Servicio.' });
        router.push('/pes');
      }
    } else { // Creating new OS
      const initialValues = {...defaultValues, startDate: new Date(), endDate: new Date()};
      form.reset(initialValues);
      setAccordionDefaultValue(['cliente', 'espacio', 'responsables']); // Expand for new
    }
    setIsMounted(true);
  }, [osId, isEditing, form, router, toast]);

  function onSubmit(data: OsFormValues) {
    setIsLoading(true);

    let allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    let message = '';
    let currentOsId = osId;
    
    if (isEditing) { // Update existing
      const osIndex = allOS.findIndex(os => os.id === osId);
      if (osIndex !== -1) {
        allOS[osIndex] = { ...allOS[osIndex], ...data, id: osId };
        message = 'Orden de Servicio actualizada correctamente.';
      }
    } else { // Create new
      const existingOS = allOS.find(os => os.serviceNumber === data.serviceNumber);
      if (existingOS) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Ya existe una Orden de Servicio con este número.',
        });
        setIsLoading(false);
        return;
      }
      currentOsId = Date.now().toString();
      const newOS: ServiceOrder = {
        id: currentOsId,
        ...data,
        facturacion: data.facturacion || 0, // Ensure facturacion is a number
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };
      allOS.push(newOS);
      message = 'Orden de Servicio creada correctamente.';
    }

    localStorage.setItem('serviceOrders', JSON.stringify(allOS));
    
    setTimeout(() => {
      toast({
        description: message,
      });
      setIsLoading(false);
      form.reset(form.getValues()); // Mark form as not dirty
      if (isSubmittingFromDialog) {
        router.push('/pes');
      } else if (currentOsId && !isEditing) { 
        router.push(`/os/${currentOsId}`);
      } else {
        router.replace(`/os/${currentOsId}/info?t=${Date.now()}`);
      }
    }, 1000)
  }
  
  const handleSaveFromDialog = async () => {
    setIsSubmittingFromDialog(true);
    await form.handleSubmit(onSubmit)();
  };
  
  const handleDelete = () => {
    if (!isEditing) return;
    
    // Delete OS
    let allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    allOS = allOS.filter(os => os.id !== osId);
    localStorage.setItem('serviceOrders', JSON.stringify(allOS));

    // Delete related data from other localStorage items
    const keysToDeleteFrom: (keyof Window['localStorage'])[] = [
      'materialOrders', 'comercialBriefings', 'gastronomyOrders', 'transporteOrders', 'hieloOrders', 
      'decoracionOrders', 'atipicosOrders', 'personalMiceOrders', 'personalExternoOrders', 'pruebasMenu', 'pedidosEntrega'
    ];

    keysToDeleteFrom.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key) || '[]') as { osId: string }[];
        const filteredData = data.filter(item => item.osId !== osId);
        localStorage.setItem(key, JSON.stringify(filteredData));
    });

    toast({ title: 'Orden de Servicio eliminada', description: 'Se han eliminado todos los datos asociados.' });
    router.push('/pes');
  };

  const statusValue = watch("status");
  const anulacionMotivoSaved = watch("anulacionMotivo");

  const handleStatusChange = (value: OsFormValues['status']) => {
    if (value === 'Anulado') {
        setPendingStatus(value);
        setIsAnulacionDialogOpen(true);
    } else {
        setValue('status', value, { shouldDirty: true });
        setValue('anulacionMotivo', undefined, { shouldDirty: true });
    }
  }

  const handleConfirmAnulacion = () => {
      if (pendingStatus && anulacionMotivo.trim()) {
          setValue('status', pendingStatus, { shouldDirty: true });
          setValue('anulacionMotivo', anulacionMotivo, { shouldDirty: true });
          setIsAnulacionDialogOpen(false);
          setAnulacionMotivo("");
          setPendingStatus(null);
      } else {
          toast({ variant: 'destructive', description: "El motivo de anulación no puede estar vacío."})
      }
  }


  if (!isMounted) {
    return <LoadingSkeleton title={isEditing ? 'Editando Orden de Servicio...' : 'Creando Orden de Servicio...'} />;
  }

  return (
    <>
        <main>
            <FormProvider {...form}>
              <form id="os-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <Card>
                  <CardHeader className="py-3 flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-xl">Datos del Servicio</CardTitle>
                        <FormField control={form.control} name="isVip" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} id="vip-check" />
                                </FormControl>
                                <FormLabel htmlFor="vip-check" className="flex items-center gap-2 !mt-0 font-bold"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Evento VIP</FormLabel>
                            </FormItem>
                        )} />
                    </div>
                    <div className="flex items-center gap-2">
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={handleStatusChange} value={field.value}>
                                <FormControl><SelectTrigger className={cn("w-[150px] font-semibold h-9", statusValue === 'Confirmado' && 'bg-green-100 dark:bg-green-900 border-green-400', statusValue === 'Pendiente' && 'bg-yellow-100 dark:bg-yellow-800 border-yellow-400', statusValue === 'Anulado' && 'bg-destructive/20 text-destructive-foreground border-destructive/40')}><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Borrador">Borrador</SelectItem>
                                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                                  <SelectItem value="Anulado">Anulado</SelectItem>
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )} />
                        <Button type="submit" form="os-form" size="sm" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar OS'}</span>
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      <FormField control={form.control} name="serviceNumber" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Nº Servicio</FormLabel>
                          <FormControl><Input {...field} readOnly={isEditing} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha Inicio</FormLabel>
                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={(date) => {field.onChange(date); setStartDateOpen(false);}}
                                  initialFocus 
                                  locale={es} 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha Fin</FormLabel>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                 <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={(date) => {field.onChange(date); setEndDateOpen(false);}}
                                  initialFocus 
                                  locale={es} 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="asistentes" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Asistentes</FormLabel>
                            <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    
                       <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full space-y-3 pt-3">
                          <AccordionItem value="cliente" className="border-none">
                          <Card>
                            <AccordionTrigger className="p-0"><ClienteTitle /></AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pb-4">
                                <FormField control={form.control} name="client" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Cliente</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="tipoCliente" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Tipo Cliente</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Empresa">Empresa</SelectItem>
                                            <SelectItem value="Agencia">Agencia</SelectItem>
                                            <SelectItem value="Particular">Particular</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="finalClient" render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                    <FormLabel>Cliente Final</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="contact" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contacto</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Teléfono</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>
                            </AccordionContent>
                          </Card>
                          </AccordionItem>

                          <AccordionItem value="espacio" className="border-none">
                          <Card>
                            <AccordionTrigger className="p-0"><EspacioTitle /></AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 px-4 pb-4">
                                <FormField control={form.control} name="space" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Espacio</FormLabel>
                                        <Combobox
                                            options={espacioOptions}
                                            value={field.value}
                                            onChange={(value) => { field.onChange(value); handleEspacioChange(value); }}
                                            placeholder="Busca o selecciona un espacio..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="spaceAddress" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dirección</FormLabel>
                                        <FormControl><Input {...field} placeholder="Dirección del espacio" /></FormControl>
                                    </FormItem>
                                )} />
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="spaceContact" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contacto Espacio</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                    )} />
                                    <FormField control={form.control} name="spacePhone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tlf. Espacio</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                    )} />
                                    <FormField control={form.control} name="spaceMail" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Espacio</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="plane" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plano</FormLabel>
                                        <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                                    </FormItem>
                                    )} />
                                </div>
                              </div>
                            </AccordionContent>
                          </Card>
                          </AccordionItem>
                          
                          <AccordionItem value="responsables" className="border-none">
                            <Card>
                            <AccordionTrigger className="p-0"><ResponsablesTitle /></AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 px-4 pb-4">
                                {[['respMetre', 'respMetrePhone', 'respMetreMail', 'Resp. Metre', personalSala], ['respPase', 'respPasePhone', 'respPaseMail', 'Resp. Pase', personalCPR], ['respCocinaPase', 'respCocinaPasePhone', 'respCocinaPaseMail', 'Resp. Cocina Pase', personalCPR], ['respCocinaCPR', 'respCocinaCPRPhone', 'respCocinaCPRMail', 'Resp. Cocina CPR', personalCPR]].map(([name, phone, mail, label, personalList]) => (
                                  <div key={name} className="flex items-end gap-4">
                                    <FormField control={form.control} name={name as any} render={({ field }) => (
                                      <FormItem className="flex-grow">
                                        <FormLabel>{label}</FormLabel>
                                        <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, phone as any, mail as any); }} value={field.value}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            {(personalList as Personal[]).map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )} />
                                    <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
                                       <Phone className="h-4 w-4"/>
                                       <span>{watch(phone as any) || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
                                       <Mail className="h-4 w-4"/>
                                       <span>{watch(mail as any) || '-'}</span>
                                    </div>
                                  </div>
                                ))}

                                <Separator className="my-3" />
                                
                                <FormField control={form.control} name="comercialAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">Comercial asiste al evento</FormLabel></FormItem>)} />
                                <div className="flex items-end gap-4">
                                  <FormField control={form.control} name="comercial" render={({ field }) => (
                                    <FormItem className="flex-grow">
                                      <FormLabel>Resp. Comercial</FormLabel>
                                      <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'comercialPhone', 'comercialMail'); }} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>{personalComercial.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </FormItem>
                                  )} />
                                  <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Phone className="h-4 w-4"/><span>{watch('comercialPhone') || '-'}</span></div>
                                  <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Mail className="h-4 w-4"/><span>{watch('comercialMail') || '-'}</span></div>
                                </div>
                                
                                <Separator className="my-3" />

                                <FormField control={form.control} name="rrhhAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">RRHH asiste al evento</FormLabel></FormItem>)} />
                                <div className="flex items-end gap-4">
                                  <FormField control={form.control} name="respRRHH" render={({ field }) => (
                                    <FormItem className="flex-grow">
                                      <FormLabel>Resp. RRHH</FormLabel>
                                      <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail'); }} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>{personalRRHH.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </FormItem>
                                  )} />
                                  <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Phone className="h-4 w-4"/><span>{watch('respRRHHPhone') || '-'}</span></div>
                                  <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Mail className="h-4 w-4"/><span>{watch('respRRHHMail') || '-'}</span></div>
                                </div>
                              </div>
                            </AccordionContent>
                            </Card>
                          </AccordionItem>
                        </Accordion>
                    
                    <div className="space-y-4 pt-4 border-t">
                      <FormField control={form.control} name="comments" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Comentarios Generales</FormLabel>
                              <FormControl><Textarea rows={4} {...field} /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                    {statusValue === 'Anulado' && (
                        <div className="space-y-2 pt-4 border-t border-destructive">
                            <h3 className="text-destructive font-bold">Motivo de Anulación</h3>
                            <p className="text-muted-foreground p-4 bg-destructive/10 rounded-md">{anulacionMotivoSaved}</p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </form>
            </FormProvider>
             {isEditing && (
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="danger-zone">
                      <Card className="mt-4 border-destructive bg-destructive/5">
                        <AccordionTrigger className="py-3 px-4 text-destructive hover:no-underline">
                            <div className="flex items-center gap-2"><AlertTriangle/>Borrar OS</div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-4 pb-4">
                            <p className="text-sm text-destructive/80 mb-4">
                              Esta acción es irreversible. Se eliminará la OS y todos los datos asociados a ella.
                            </p>
                            <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>
                              <Trash2 className="mr-2" /> Eliminar Orden de Servicio
                            </Button>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </Accordion>
            )}
          </main>
        
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Qué quieres hacer con los cambios que has realizado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="destructive" className="bg-orange-500 hover:bg-orange-600" onClick={() => router.push('/pes')}>Descartar</Button>
                <Button onClick={handleSaveFromDialog} disabled={isLoading}>
                {isLoading && isSubmittingFromDialog ? <Loader2 className="animate-spin" /> : 'Guardar y Salir'}
                </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará permanentemente la Orden de Servicio y todos sus datos asociados (pedidos de material, briefings, etc.).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar Permanentemente</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAnulacionDialogOpen} onOpenChange={setIsAnulacionDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Vas a anular esta orden de servicio?</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Es correcto? Indica, por favor, el motivo de la anulación.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea 
                    placeholder="Escribe aquí el motivo de la anulación..."
                    value={anulacionMotivo}
                    onChange={(e) => setAnulacionMotivo(e.target.value)}
                    rows={4}
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                        setIsAnulacionDialogOpen(false);
                        form.setValue('status', form.getValues('status')); // revert select
                    }}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAnulacion} disabled={!anulacionMotivo.trim()}>Confirmar Anulación</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}


    