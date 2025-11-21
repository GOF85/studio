

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
import { CATERING_VERTICALES, osFormSchema } from '@/types';
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
import { useOsContext } from '../../os-context';
import { useDataStore } from '@/hooks/use-data-store';

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

  const { isLoading, setIsLoading } = useLoadingStore();
  const { serviceOrder, isLoading: isOsDataLoading } = useOsContext();
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

  const { control, handleSubmit, formState: { isDirty }, getValues, reset, watch, setValue } = form;
  
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
    setIsSubmittingFromDialog(true);
    let allOS = data.serviceOrders;
    let message = '';
    let currentOsId = osId;
    
    const osData: ServiceOrder = {
      ...formData,
      startDate: format(formData.startDate, 'yyyy-MM-dd'),
      endDate: format(formData.endDate, 'yyyy-MM-dd'),
      vertical: 'Catering',
    };

    if (isEditing) { // Update existing
      const osIndex = allOS.findIndex(os => os.id === osId);
      if (osIndex !== -1) {
        allOS[osIndex] = { ...allOS[osIndex], ...osData };
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
        setIsSubmittingFromDialog(false);
        return;
      }
      currentOsId = formData.id;
      allOS.push(osData);
      message = 'Orden de Servicio creada correctamente.';
    }

    localStorage.setItem('serviceOrders', JSON.stringify(allOS));
    
    toast({ description: message });
    setIsLoading(false);
    setIsSubmittingFromDialog(false);

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
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
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
                      <FormItem className="flex flex-col"><FormLabel>Fecha Inicio</FormLabel><Popover open={startDateOpen} onOpenChange={setStartDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setStartDateOpen(false); }} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="endDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Fecha Fin</FormLabel><Popover open={endDateOpen} onOpenChange={setEndDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setEndDateOpen(false);}} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="asistentes" render={({ field }) => (
                        <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="cateringVertical" render={({ field }) => (
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
                              <div key={name as string} className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                                    <FormLabel>{label as string}</FormLabel>
                                    <FormField control={control} name={name as any} render={({ field }) => (
                                        <FormItem>
                                            <Combobox options={(personalList as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                                value={field.value}
                                                onChange={(value) => { field.onChange(value); handlePersonalChange(value, phone as keyof OsFormValues, mail as keyof OsFormValues); }}
                                                placeholder="Seleccionar..." />
                                        </FormItem>
                                    )}/>
                                    <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch(phone as any) || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch(mail as any) || '-'}</div>
                              </div>
                            ))}

                             <Separator />
                            
                             <div className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                                <FormField control={control} name="comercialAsiste" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2">
                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="comercial-asiste" /></FormControl>
                                        <FormLabel htmlFor="comercial-asiste">Comercial asiste al evento</FormLabel>
                                    </FormItem>
                                )} />
                                <FormField control={control} name="comercial" render={({ field }) => (
                                    <FormItem>
                                     <Combobox options={(personalComercial as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                        value={field.value}
                                        onChange={(value) => { field.onChange(value); handlePersonalChange(value, 'comercialPhone', 'comercialMail'); }}
                                        placeholder="Seleccionar comercial..." />
                                    </FormItem>
                                )}/>
                                <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch('comercialPhone') || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch('comercialMail') || '-'}</div>
                            </div>
                            

                             <Separator />

                            <div className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                                 <FormField control={control} name="rrhhAsiste" render={({ field }) => (
                                     <FormItem className="flex flex-row items-center gap-2">
                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="rrhh-asiste" /></FormControl>
                                        <FormLabel htmlFor="rrhh-asiste">RRHH asiste al evento</FormLabel>
                                    </FormItem>
                                )}/>
                                 <FormField control={control} name="respRRHH" render={({ field }) => (
                                    <FormItem>
                                     <Combobox options={(personalRRHH as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                        value={field.value}
                                        onChange={(value) => { field.onChange(value); handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail'); }}
                                        placeholder="Seleccionar responsable RRHH..." />
                                    </FormItem>
                                )}/>
                                <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch('respRRHHPhone') || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch('respRRHHMail') || '-'}</div>
                            </div>
                          </div>
                        </AccordionContent>
                        </Card>
                      </AccordionItem>
                      
                       <AccordionItem value="comentarios" className="border-none">
                           <Card>
                             <AccordionTrigger className="p-4"><h3 className="text-lg font-semibold">Comentarios Generales</h3></AccordionTrigger>
                            <AccordionContent>
                              <div className="px-4 pb-4">
                                <FormField control={control} name="comments" render={({ field }) => (
                                    <FormItem><FormControl><Textarea {...field} rows={6} /></FormControl></FormItem>
                                )} />
                              </div>
                            </AccordionContent>
                           </Card>
                       </AccordionItem>
                   </Accordion>
                
              </CardContent>
            </Card>
          </form>
        </FormProvider>
      </main>

        <AlertDialog open={isAnulacionDialogOpen} onOpenChange={setIsAnulacionDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anular Orden de Servicio</AlertDialogTitle>
                    <AlertDialogDescription>
                        Por favor, introduce el motivo de la anulación.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={anulacionMotivo} onChange={(e) => setAnulacionMotivo(e.target.value)} />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsAnulacionDialogOpen(false)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAnulacion}>Confirmar Anulación</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
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
- src/app/os/alquiler/page.tsx:
```tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, FileText } from 'lucide-react';
import type { OrderItem, PickingSheet, ComercialBriefingItem, MaterialOrder } from '@/types';
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
- src/app/os/atipicos/layout.tsx:
```tsx
'use client';

import { FilePlus } from 'lucide-react';
import { useOsData } from '../os-context';

export default function AtipicosLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />Módulo de Atípicos</h1>
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
- src/app/almacen/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, Repeat, AlertTriangle, Warehouse } from 'lucide-react';

const almacenNavLinks = [
    { title: 'Gestión de Picking', href: '/almacen/picking', icon: ListChecks },
    { title: 'Gestión de Retornos', href: '/almacen/retornos', icon: Repeat },
    { title: 'Incidencias Picking', href: '/almacen/incidencias', icon: AlertTriangle },
    { title: 'Incidencias Retorno', href: '/almacen/incidencias-retorno', icon: AlertTriangle },
];

export default function AlmacenLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <Warehouse className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">Almacén</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {almacenNavLinks.map(link => (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${pathname.startsWith(link.href) ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    ))}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}
```
- src/app/analitica/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Factory, Package } from 'lucide-react';

const analiticaNavLinks = [
    { title: 'Visión General', href: '/analitica', icon: BarChart3, exact: true },
    { title: 'Rentabilidad Catering', href: '/analitica/catering', icon: Factory },
    { title: 'Rentabilidad Entregas', href: '/analitica/entregas', icon: Package },
];

export default function AnaliticaLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <BarChart3 className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">Analítica</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {analiticaNavLinks.map(link => {
                        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                        return (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    )})}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}
```
- src/app/book/layout.tsx:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookHeart } from 'lucide-react';
import { bookNavLinks } from '@/lib/nav-links';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { useMemo } from 'react';


export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();
    const { impersonatedUser } = useImpersonatedUser();
    
    const visibleNav = useMemo(() => {
        if (!impersonatedUser) return bookNavLinks;
        const isAdmin = impersonatedUser.roles.includes('Admin');
        return bookNavLinks.filter(item => !item.adminOnly || isAdmin);
    }, [impersonatedUser]);

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <BookHeart className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">Book Gastronómico</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {visibleNav.map(link => {
                        const isActive = link.exact ? pathname === link.path : pathname.startsWith(link.path);
                        return (
                         <Link 
                            key={link.path} 
                            href={link.path}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    )})}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}
```
- src/app/bd/layout.tsx:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Users, Building, Package, Layers, Box, Trash2, UserPlus, Factory, CreditCard, Banknote } from 'lucide-react';
import { bdNavLinks } from '@/lib/nav-links';

export default function BdLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <Database className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">Bases de Datos</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {bdNavLinks.map(link => {
                        const isActive = pathname.startsWith(link.href);
                        return (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    )})}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}
```
- src/app/cpr/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory } from 'lucide-react';
import { cprNav } from '@/lib/nav-links';

export default function CprLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <Factory className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">Producción (CPR)</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {cprNav.map(link => (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${pathname.startsWith(link.href) ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    ))}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}
```
- src/app/entregas/layout.tsx:
```tsx

'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EntregasLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="theme-orange">
            <Suspense fallback={<LoadingSkeleton title="Cargando Módulo de Entregas..." />}>
                 {children}
            </Suspense>
        </div>
    )
}

```
- src/app/rrhh/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import { rrhhNav } from '@/lib/nav-links';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { useMemo } from 'react';


export default function RrhhLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const pathname = usePathname();
    const { impersonatedUser } = useImpersonatedUser();
    
    const visibleNav = useMemo(() => {
        if (!impersonatedUser) return [];
        const isAdmin = impersonatedUser.roles.includes('Admin');
        return rrhhNav.filter(item => !item.adminOnly || isAdmin);
    }, [impersonatedUser]);

    return (
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-8">
            <aside className="w-[220px] flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <Users className="w-8 h-8"/>
                    <h1 className="text-2xl font-headline font-bold">RRHH</h1>
                </div>
                <nav className="grid gap-1 text-sm text-muted-foreground">
                    {visibleNav.map(link => {
                        const isActive = pathname.startsWith(link.href);
                        return (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted font-semibold text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4" />
                            {link.title}
                        </Link>
                    )})}
                </nav>
            </aside>
             <main>
                {children}
            </main>
        </div>
    )
}

```
- src/lib/nav-links.ts:
```ts
'use client';

import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart } from 'lucide-react';
import { cprNav, bookNavLinks, bdNavLinks, rrhhNav } from './cpr-nav';

export const mainNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList, exact: true },
    { title: 'Calendario de Servicios', href: '/calendario', icon: Calendar, exact: true },
    { title: 'Entregas MICE', href: '/entregas', icon: Truck },
    { title: 'Almacén', href: '/almacen', icon: Warehouse },
    { title: 'Analítica', href: '/analitica', icon: BarChart3 },
    { title: 'Control de Explotación', href: '/control-explotacion', icon: AreaChart },
    { title: 'Configuración', href: '/configuracion', icon: Settings },
];

export { cprNav, bookNavLinks, bdNavLinks, rrhhNav };
```
- src/lib/cpr-nav.ts:
```ts
'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, Shield, TrendingUp, Users, UserCheck, Archive, HistoryIcon, Calculator, Box, Layers, Percent, Target, Banknote, CreditCard, Building, Trash2, UserPlus, Database } from 'lucide-react';

export const cprNav = [
    { title: 'Dashboard CPR', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Vista general y KPIs del centro de producción.' },
    { title: 'Planificación y OFs', href: '/cpr/of', icon: Factory, description: 'Agrega necesidades y gestiona las O.F.' },
    { title: 'Taller de Producción', href: '/cpr/produccion', icon: ChefHat, description: 'Interfaz para cocineros en tablets.' },
    { title: 'Inventario de Materia Prima', href: '/cpr/inventario', icon: Archive, description: 'Gestiona el stock teórico y físico de ingredientes.'},
    { title: 'Cierres de Inventario', href: '/cpr/cierres', icon: Calculator, description: 'Realiza y consulta los cierres de inventario mensuales.'},
    { title: 'Movimientos de Inventario', href: '/cpr/inventario/movimientos', icon: HistoryIcon, description: 'Auditoría de todos los ajustes y movimientos de stock.'},
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Solicitudes de Personal', href: '/cpr/solicitud-personal', icon: Users, description: 'Pide personal de apoyo para picos de trabajo.' },
    { title: 'Validación de Horas', href: '/cpr/validacion-horas', icon: UserCheck, description: 'Cierra los turnos del personal de apoyo.'},
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción e inventario.' },
];

export const rrhhNav = [
    { title: 'Dashboard RRHH', href: '/rrhh', icon: LayoutDashboard, description: 'Vista general y accesos directos del módulo de RRHH.' },
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Users, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];

export const bookNavLinks = [
    { title: 'Dashboard', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Verificación de Ingredientes', path: '/book/verificacionIngredientes', icon: Shield },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Evolución de Costes', path: '/book/evolucion-costes', icon: TrendingUp },
    { title: 'Info. Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

    
export const bdNavLinks = [
    { title: 'Personal Interno', href: '/bd/personal', icon: Users },
    { title: 'Personal Externo', href: '/bd/personal-externo-db', icon: UserPlus },
    { title: 'Proveedores', href: '/bd/proveedores', icon: Building },
    { title: 'Catálogo Personal Externo', href: '/bd/tipos-personal', icon: Users },
    { title: 'Espacios', href: '/bd/espacios', icon: Building },
    { title: 'Artículos MICE', href: '/bd/articulos', icon: Package },
    { title: 'Base de Datos ERP', href: '/bd/erp', icon: Database },
    { title: 'Familias ERP', href: '/bd/familiasERP', icon: Layers },
    { title: 'Categorías de Recetas', href: '/bd/categorias-recetas', icon: BookHeart },
    { title: 'Formatos de Expedición', href: '/bd/formatos-expedicion', icon: Box },
    { title: 'Centros y Ubicaciones', href: '/bd/centros', icon: Factory },
    { title: 'Objetivos CPR', href: '/bd/objetivos-cpr', icon: CreditCard },
    { title: 'Administración', href: '/bd/borrar', icon: Trash2 },
];
```

