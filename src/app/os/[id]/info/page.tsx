
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Warehouse, ChevronRight, PanelLeft, Wine, FilePenLine, Trash2, Leaf, Briefcase, Utensils, Truck, Archive, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, Star, Save, AlertTriangle, Phone, Mail } from 'lucide-react';

import type { ServiceOrder, Personal, Espacio, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { CATERING_VERTICALES } from '@/types';
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
import { useOsContext } from '../os-context';

export const osFormSchema = z.object({
  id: z.string().min(1),
  serviceNumber: z.string().min(1, 'El Nº de Servicio es obligatorio'),
  startDate: z.date({ required_error: 'La fecha de inicio es obligatoria.' }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  tipoCliente: z.enum(['Empresa', 'Agencia', 'Particular']).optional(),
  asistentes: z.coerce.number().min(1, 'El número de asistentes es obligatorio.'),
  cateringVertical: z.enum(CATERING_VERTICALES, { required_error: 'La vertical de catering es obligatoria.' }),
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
  respProjectManager: z.string().optional().default(''),
  respProjectManagerPhone: z.string().optional().default(''),
  respProjectManagerMail: z.string().email().optional().or(z.literal('')),
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
  email: z.string().email().optional().or(z.literal('')),
});

export type OsFormValues = z.infer<typeof osFormSchema>;

const defaultValues: Partial<OsFormValues> = {
  serviceNumber: '', client: '', contact: '', phone: '', finalClient: '', asistentes: 0,
  space: '', spaceAddress: '', spaceContact: '', spacePhone: '', spaceMail: '',
  respMetre: '', respMetrePhone: '', respMetreMail: '', 
  respPase: '', respPasePhone: '', respPaseMail: '',
  respCocinaPase: '', respCocinaPasePhone: '', respCocinaPaseMail: '',
  respCocinaCPR: '', respCocinaCPRPhone: '', respCocinaCPRMail: '',
  respProjectManager: '', respProjectManagerPhone: '', respProjectManagerMail: '',
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

const ClientInfo = () => {
    const { control } = useFormContext();
    return (
        <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-2">
                 <FormField control={control} name="client" render={({ field }) => (
                    <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="tipoCliente" render={({ field }) => (
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
                 <FormField control={control} name="finalClient" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cliente Final</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Principal</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="direccionPrincipal" render={({ field }) => (
                    <FormItem className="col-span-full"><FormLabel>Dirección Principal de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
            </div>
        </AccordionContent>
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

  const [accordionDefaultValue, setAccordionDefaultValue] = useState<string[] | undefined>(undefined);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmittingFromDialog, setIsSubmittingFromDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const { serviceOrder, briefing, isLoading: isOsDataLoading } = useOsData(osId);
  const { data, isLoaded } = useDataStore();
  
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isAnulacionDialogOpen, setIsAnulacionDialogOpen] = useState(false);
  const [anulacionMotivo, setAnulacionMotivo] = useState("");
  const [pendingStatus, setPendingStatus] = useState<OsFormValues['status'] | null>(null);

  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues,
  });

  const { formState: { isDirty }, setValue, watch, reset } = form;
  
  const getFullName = (p: Personal) => `${p.nombre} ${p.apellido1} ${p.apellido2 || ''}`.trim();

  const personalSala = useMemo(() => personal.filter(p => p.departamento === 'Sala' && p.nombre && p.apellido1), [personal]);
  const personalPase = useMemo(() => personal.filter(p => p.departamento === 'Pase' && p.nombre && p.apellido1), [personal]);
  const personalCPR = useMemo(() => personal.filter(p => p.departamento === 'CPR' && p.nombre && p.apellido1), [personal]);
  const personalComercial = useMemo(() => personal.filter(p => p.departamento === 'Comercial' && p.nombre && p.apellido1), [personal]);
  const personalCocina = useMemo(() => personal.filter(p => p.departamento === 'COCINA' && p.nombre && p.apellido1), [personal]);
  const personalRRHH = useMemo(() => personal.filter(p => p.departamento === 'RRHH' && p.nombre && p.apellido1), [personal]);
  const personalOperaciones = useMemo(() => personal.filter(p => p.departamento === 'Operaciones' && p.nombre && p.apellido1), [personal]);
  const validEspacios = useMemo(() => espacios.filter(e => e.identificacion.nombreEspacio), [espacios]);
  const espacioOptions = useMemo(() => validEspacios.map(e => ({label: e.identificacion.nombreEspacio, value: e.identificacion.nombreEspacio})), [validEspacios]);

  const handlePersonalChange = (name: string, phoneField: keyof OsFormValues, mailField: keyof OsFormValues) => {
    const person = personal.find(p => getFullName(p) === name);
    setValue(phoneField, person?.telefono || '', { shouldDirty: true });
    setValue(mailField, person?.email || '', { shouldDirty: true });
  }

  const handleEspacioChange = (name: string) => {
    const espacio = espacios.find(e => e.identificacion.nombreEspacio === name);
    setValue('spaceAddress', espacio?.identificacion.calle || '', { shouldDirty: true });
    setValue('spaceContact', espacio?.contactos[0]?.nombre || '', { shouldDirty: true });
    setValue('spacePhone', espacio?.contactos[0]?.telefono || '', { shouldDirty: true });
    setValue('spaceMail', espacio?.contactos[0]?.email || '', { shouldDirty: true });
  }

  useEffect(() => {
    if (!isLoaded) return;
    setPersonal(data.personal.filter(p => p.nombre && p.apellido1));
    setEspacios(data.espacios.filter(e => e.identificacion.nombreEspacio));
  }, [isLoaded, data]);

  useEffect(() => {
    if (isLoaded && serviceOrder) {
      reset({
        ...serviceOrder,
        startDate: new Date(serviceOrder.startDate),
        endDate: new Date(serviceOrder.endDate),
      });
    } else if (isLoaded && !isEditing) {
       reset({
          ...defaultValues,
          id: Date.now().toString(),
          startDate: new Date(),
          endDate: new Date(),
        });
       setAccordionDefaultValue(['cliente', 'espacio', 'responsables']);
    }
  }, [serviceOrder, isLoaded, isEditing, reset]);


  function onSubmit(formData: OsFormValues) {
    setIsLoading(true);

    let allOS = data.serviceOrders;
    let message = '';
    let currentOsId = osId;
    
    if (isEditing) { // Update existing
      const osIndex = allOS.findIndex(os => os.id === osId);
      if (osIndex !== -1) {
        allOS[osIndex] = { ...allOS[osIndex], ...formData, id: osId };
        message = 'Orden de Servicio actualizada correctamente.';
      }
    } else { // Create new
      const existingOS = allOS.find(os => os.serviceNumber === formData.serviceNumber);
      if (existingOS) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Ya existe una Orden de Servicio con este número.',
        });
        setIsLoading(false);
        return;
      }
      currentOsId = formData.id;
      const newOS: ServiceOrder = {
        ...formData,
        facturacion: formData.facturacion || 0, // Ensure facturacion is a number
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };
      allOS.push(newOS);
      message = 'Orden de Servicio creada correctamente.';
    }

    localStorage.setItem('serviceOrders', JSON.stringify(allOS));
    
    toast({ description: message });
    setIsLoading(false);

    if (!isEditing) {
        router.push(`/os/${currentOsId}/info`);
    } else {
        form.reset(formData); // Mark form as not dirty
        if (isSubmittingFromDialog) {
          router.push('/pes');
        }
    }
  }
  
  const statusValue = watch("status");

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


  if (!isLoaded || isOsDataLoading) {
    return <LoadingSkeleton title={isEditing ? 'Editando Orden de Servicio...' : 'Creando Orden de Servicio...'} />;
  }

  return (
    <>
      <main>
        <FormProvider {...form}>
          <form id="os-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Card>
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-xl">Datos del Servicio</CardTitle>
                <div className="flex items-center gap-2">
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem>
                        <Select onValueChange={handleStatusChange} value={field.value}>
                            <FormControl><SelectTrigger className={cn("w-[150px] font-semibold h-9", statusValue === 'Confirmado' && 'bg-green-100 dark:bg-green-900 border-green-400', statusValue === 'Pendiente' && 'bg-yellow-100 dark:bg-yellow-800 border-yellow-400', statusValue === 'Anulado' && 'bg-destructive/20 text-destructive-foreground border-destructive/40')}><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Borrador">Borrador</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="Confirmado">Confirmado</SelectItem><SelectItem value="Anulado">Anulado</SelectItem></SelectContent>
                        </Select>
                        </FormItem>
                    )} />
                    <Button type="submit" form="os-form" size="sm" disabled={isLoading || !isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar OS'}</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <FormField control={control} name="serviceNumber" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Nº Servicio</FormLabel><FormControl><Input {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="startDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Fecha Inicio</FormLabel><Popover open={startDateOpen} onOpenChange={setStartDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setStartDateOpen(false);}} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="endDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Fecha Fin</FormLabel><Popover open={endDateOpen} onOpenChange={setEndDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setEndDateOpen(false);}} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="asistentes" render={({ field }) => (
                        <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={control} name="cateringVertical" render={({ field }) => (
                        <FormItem><FormLabel>Vertical Catering</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {CATERING_VERTICALES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                
                   <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full space-y-3 pt-3">
                      <AccordionItem value="cliente" className="border-none">
                      <Card>
                        <AccordionTrigger className="p-0"><ClienteTitle /></AccordionTrigger>
                        <ClientInfo />
                      </Card>
                      </AccordionItem>

                      <AccordionItem value="espacio" className="border-none">
                      <Card>
                        <AccordionTrigger className="p-0"><EspacioTitle /></AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 px-4 pb-4">
                            <FormField control={control} name="space" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Espacio</FormLabel>
                                    <Combobox
                                        options={espacioOptions}
                                        value={field.value || ''}
                                        onChange={(value) => { field.onChange(value); handleEspacioChange(value); }}
                                        placeholder="Busca o selecciona un espacio..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name="spaceAddress" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección</FormLabel>
                                    <FormControl><Input {...field} placeholder="Dirección del espacio" /></FormControl>
                                </FormItem>
                            )} />
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField control={control} name="spaceContact" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contacto Espacio</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                </FormItem>
                                )} />
                                <FormField control={control} name="spacePhone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tlf. Espacio</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                </FormItem>
                                )} />
                                <FormField control={control} name="spaceMail" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Espacio</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={control} name="plane" render={({ field }) => (
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
                            {[
                                ['respMetre', 'respMetrePhone', 'respMetreMail', 'Resp. Metre', personalSala], 
                                ['respPase', 'respPasePhone', 'respPaseMail', 'Resp. Pase', personalPase], 
                                ['respCocinaPase', 'respCocinaPasePhone', 'respCocinaPaseMail', 'Resp. Cocina Pase', personalCocina], 
                                ['respCocinaCPR', 'respCocinaCPRPhone', 'respCocinaCPRMail', 'Resp. Cocina CPR', personalCPR],
                                ['respProjectManager', 'respProjectManagerPhone', 'respProjectManagerMail', 'Resp. Project Manager', personalOperaciones],
                            ].map(([name, phone, mail, label, personalList]) => (
                              <div key={name as string} className="flex items-end gap-4">
                                <FormField control={control} name={name as any} render={({ field }) => (
                                  <FormItem className="flex-grow">
                                    <FormLabel>{label as string}</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, phone as any, mail as any); }} value={field.value}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        {(personalList as Personal[]).map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}
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
                            
                            <FormField control={control} name="comercialAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">Comercial asiste al evento</FormLabel></FormItem>)} />
                            <div className="flex items-end gap-4">
                              <FormField control={control} name="comercial" render={({ field }) => (
                                <FormItem className="flex-grow">
                                  <FormLabel>Resp. Comercial</FormLabel>
                                  <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'comercialPhone', 'comercialMail'); }} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{personalComercial.map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}</SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Phone className="h-4 w-4"/><span>{watch('comercialPhone') || '-'}</span></div>
                              <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Mail className="h-4 w-4"/><span>{watch('comercialMail') || '-'}</span></div>
                            </div>
                            
                            <Separator className="my-3" />

                            <FormField control={control} name="rrhhAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">RRHH asiste al evento</FormLabel></FormItem>)} />
                            <div className="flex items-end gap-4">
                              <FormField control={control} name="respRRHH" render={({ field }) => (
                                <FormItem className="flex-grow">
                                  <FormLabel>Resp. RRHH</FormLabel>
                                  <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail'); }} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{personalRRHH.map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}</SelectContent>
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
                  <FormField control={control} name="comments" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Comentarios Generales</FormLabel>
                          <FormControl><Textarea rows={4} {...field} /></FormControl>
                      </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          </form>
        </FormProvider>
      </main>
    </>
  );
}
