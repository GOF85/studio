

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
import { osFormSchema } from '@/types';
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
- src/app/personal/nuevo/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL, personalFormSchema } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useLoadingStore } from '@/hooks/use-loading-store';

type PersonalFormValues = z.infer<typeof personalFormSchema>;

export default function NuevoPersonalPage() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: {
      precioHora: 0,
      apellido2: '',
      telefono: '',
    },
  });

  function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    
    const existing = allItems.find(p => p.id.toLowerCase() === data.id.toLowerCase());
    if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un empleado con este DNI.' });
        setIsLoading(false);
        return;
    }
    
    const finalData: Personal = {
        ...data,
        nombreCompleto: `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim(),
        nombreCompacto: `${data.nombre} ${data.apellido1}`,
        iniciales: `${data.nombre[0]}${data.apellido1[0]}`.toUpperCase(),
        email: data.email,
    }

    allItems.push(finalData);
    localStorage.setItem('personal', JSON.stringify(allItems));
    
    toast({ description: 'Nuevo empleado añadido correctamente.' });
    router.push('/bd/personal');
    setIsLoading(false);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Nuevo Empleado</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/bd/personal')}> <X className="mr-2"/> Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Empleado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellido1" render={({ field }) => (
                    <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="apellido2" render={({ field }) => (
                    <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="departamento" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {DEPARTAMENTOS_PERSONAL.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría / Puesto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precioHora" render={({ field }) => (
                        <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField control={form.control} name="telefono" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="id" render={({ field }) => (
                        <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}

```
- src/app/pes/page.tsx:
```tsx

'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PrevisionServiciosContent } from './prevision-servicios-content';

export default function PrevisionServiciosPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Previsión de Servicios..." />}>
            <PrevisionServiciosContent />
        </Suspense>
    );
}

```
- src/app/pes/prevision-servicios-content.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, ClipboardList, AlertTriangle } from 'lucide-react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSkeleton } from '../layout/loading-skeleton';
import { useDataStore } from '@/hooks/use-data-store';

const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Borrador: 'secondary',
  Pendiente: 'outline',
  Confirmado: 'default',
  Anulado: 'destructive'
};

export function PrevisionServiciosContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const { data, isLoaded } = useDataStore();

  const serviceOrders = useMemo(() => data.serviceOrders || [], [data.serviceOrders]);

  const availableMonths = useMemo(() => {
    if (!serviceOrders) return ['all'];
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return ['all', ...Array.from(months).sort().reverse()];
  }, [serviceOrders]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    
    const filtered = serviceOrders.filter(os => {
      const searchMatch = searchTerm.trim() === '' || os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || os.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const osMonth = format(new Date(os.startDate), 'yyyy-MM');
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(os.endDate), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }

      return os.vertical !== 'Entregas' && searchMatch && monthMatch && pastEventMatch;
    });

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents]);

  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando Previsión..." />;
  }
  
  return (
    <main>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
          <ClipboardList />
          Previsión de Servicios
        </h1>
        <Button asChild>
          <Link href="/os/nuevo/info">
            <PlusCircle className="mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
                placeholder="Buscar por Nº de OS o Cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Filtrar por mes" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                    {month === 'all' ? 'Todos' : format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                <label
                    htmlFor="show-past"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Mostrar eventos finalizados
                </label>
            </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Servicio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Nº Asistentes</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length > 0 ? (
              filteredAndSortedOrders.map(os => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">
                    <Link href={`/os/${os.id}`} className="text-primary hover:underline">
                      {os.serviceNumber}
                       {os.isVip && <AlertTriangle className="inline-block w-4 h-4 ml-2 text-yellow-500" />}
                    </Link>
                  </TableCell>
                  <TableCell>{os.client}</TableCell>
                  <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{format(new Date(os.endDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{os.asistentes}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[os.status]}>
                      {os.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay órdenes de servicio que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

```
- src/hooks/use-data-store.ts:
```ts

'use client';

import { create } from 'zustand';
import type { 
    ServiceOrder, Entrega, ComercialBriefing, PedidoEntrega, GastronomyOrder, MaterialOrder, 
    TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, 
    PruebaMenuData, PickingSheet, ReturnSheet, OrdenFabricacion, PickingState, ExcedenteProduccion, 
    PersonalEntrega, PartnerPedidoStatus, ActivityLog, CtaRealCost, CtaComentario, 
    ObjetivosGasto, IngredienteERP, FamiliaERP, IngredienteInterno, Elaboracion, Receta, 
    CategoriaReceta, PortalUser, ComercialAjuste, ProductoVenta, PickingEntregaState, 
    StockElaboracion, PersonalExternoAjuste, PersonalExternoDB, HistoricoPreciosERP, 
    CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, Personal, Espacio, ArticuloCatering, 
    TipoServicio, CategoriaPersonal, Proveedor, TipoTransporte, DecoracionDBItem, 
    AtipicoDBItem, PedidoPlantilla, FormatoExpedicion 
} from '@/types';

type DataStoreData = {
    serviceOrders: ServiceOrder[];
    entregas: Entrega[];
    comercialBriefings: ComercialBriefing[];
    pedidosEntrega: PedidoEntrega[];
    gastronomyOrders: GastronomyOrder[];
    materialOrders: MaterialOrder[];
    transporteOrders: TransporteOrder[];
    hieloOrders: HieloOrder[];
    decoracionOrders: DecoracionOrder[];
    atipicoOrders: AtipicoOrder[];
    personalMiceOrders: PersonalMiceOrder[];
    personalExterno: PersonalExterno[];
    pruebasMenu: PruebaMenuData[];
    pickingSheets: Record<string, PickingSheet>;
    returnSheets: Record<string, ReturnSheet>;
    ordenesFabricacion: OrdenFabricacion[];
    pickingStates: Record<string, PickingState>;
    excedentesProduccion: ExcedenteProduccion[];
    personalEntrega: PersonalEntrega[];
    partnerPedidosStatus: Record<string, any>;
    activityLogs: ActivityLog[];
    ctaRealCosts: Record<string, any>;
    ctaComentarios: Record<string, any>;
    objetivosGastoPlantillas: ObjetivosGasto[];
    defaultObjetivoGastoId: string | null;
    articulosERP: IngredienteERP[];
    familiasERP: FamiliaERP[];
    ingredientesInternos: IngredienteInterno[];
    elaboraciones: Elaboracion[];
    recetas: Receta[];
    categoriasRecetas: CategoriaReceta[];
    portalUsers: PortalUser[];
    comercialAjustes: Record<string, ComercialAjuste[]>;
    productosVenta: ProductoVenta[];
    pickingEntregasState: Record<string, PickingEntregaState>;
    stockElaboraciones: Record<string, StockElaboracion>;
    personalExternoAjustes: Record<string, PersonalExternoAjuste[]>;
    personalExternoDB: PersonalExternoDB[];
    historicoPreciosERP: HistoricoPreciosERP[];
    costesFijosCPR: CosteFijoCPR[];
    objetivosCPR: ObjetivoMensualCPR[];
    personal: Personal[];
    espacios: Espacio[];
    articulos: ArticuloCatering[];
    tipoServicio: TipoServicio[];
    tiposPersonal: CategoriaPersonal[];
    proveedores: Proveedor[];
    tiposTransporte: TipoTransporte[];
    decoracionDB: DecoracionDBItem[];
    atipicosDB: AtipicoDBItem[];
    pedidoPlantillas: PedidoPlantilla[];
    formatosExpedicionDB: FormatoExpedicion[];
    solicitudesPersonalCPR: SolicitudPersonalCPR[];
    incidenciasRetorno: any[];
    cesionesPersonal: any[];
    centros: any[];
    ubicaciones: any[];
    stockArticuloUbicacion: any;
    stockMovimientos: any[];
    incidenciasInventario: any[];
    cierresInventario: any[];
};

type DataKeys = keyof DataStoreData;

type DataStore = {
    data: Partial<DataStoreData>;
    isLoaded: boolean;
    loadAllData: () => Promise<void>;
};

export const ALL_DATA_KEYS: DataKeys[] = [
    'serviceOrders', 'entregas', 'comercialBriefings', 'pedidosEntrega', 'gastronomyOrders', 'materialOrders',
    'transporteOrders', 'hieloOrders', 'decoracionOrders', 'atipicoOrders', 'personalMiceOrders', 'personalExterno',
    'pruebasMenu', 'pickingSheets', 'returnSheets', 'ordenesFabricacion', 'pickingStates', 'excedentesProduccion',
    'personalEntrega', 'partnerPedidosStatus', 'activityLogs', 'ctaRealCosts', 'ctaComentarios', 'objetivosGastoPlantillas',
    'defaultObjetivoGastoId', 'articulosERP', 'familiasERP', 'ingredientesInternos', 'elaboraciones', 'recetas',
    'categoriasRecetas', 'portalUsers', 'comercialAjustes', 'productosVenta', 'pickingEntregasState',
    'stockElaboraciones', 'personalExternoAjustes', 'personalExternoDB', 'historicoPreciosERP', 'costesFijosCPR',
    'objetivosCPR', 'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal', 'proveedores', 'tiposTransporte',
    'decoracionDB', 'atipicosDB', 'pedidoPlantillas', 'formatosExpedicionDB', 'solicitudesPersonalCPR', 'incidenciasRetorno',
    'cesionesPersonal', 'centros', 'ubicaciones', 'stockArticuloUbicacion', 'stockMovimientos', 'incidenciasInventario', 'cierresInventario'
];

export const defaultValuesMap: { [key in DataKeys]?: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {}, stockArticuloUbicacion: {},
};

export const useDataStore = create<DataStore>((set, get) => ({
    data: {},
    isLoaded: false,
    loadAllData: async () => {
        if (get().isLoaded || typeof window === 'undefined') return;

        await Promise.resolve(); 

        const loadedData: { [key: string]: any } = {};
        
        for (const key of ALL_DATA_KEYS) {
            try {
                const storedValue = localStorage.getItem(key);
                if (storedValue) {
                    loadedData[key] = JSON.parse(storedValue);
                } else {
                    loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
                }
            } catch(e) {
                console.warn(`Could not parse key: ${key}. Setting to default.`, e);
                loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
            }
        }
        
        set({ data: loadedData as Partial<DataStoreData>, isLoaded: true });
    },
}));

```
- src/app/os/[id]/os-context.tsx:
```tsx
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, ComercialBriefing, Espacio, MaterialOrder, PickingSheet, ReturnSheet, OrderItem } from '@/types';
import { useDataStore } from '@/hooks/use-data-store';

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

interface ProcessedData {
    allItems: ItemWithOrderInfo[];
    blockedOrders: BlockedOrderInfo[];
    pendingItems: ItemWithOrderInfo[];
    itemsByStatus: Record<StatusColumn, ItemWithOrderInfo[]>;
    totalValoracionPendiente: number;
}

interface OsDataContextType {
    osId: string;
    serviceOrder: ServiceOrder | null;
    briefing: ComercialBriefing | null;
    spaceAddress: string;
    isLoading: boolean;
    updateKey: number;
    getProcessedDataForType: (type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') => ProcessedData;
}

const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}

export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const { data, isLoaded: isDataStoreLoaded } = useDataStore();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
    const [spaceAddress, setSpaceAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [updateKey, setUpdateKey] = useState(Date.now());
    
    useEffect(() => {
        if (isDataStoreLoaded && osId) {
            setIsLoading(true);
            const currentOS = data.serviceOrders?.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            if (currentOS?.space) {
                const currentSpace = data.espacios?.find(e => e.identificacion.nombreEspacio === currentOS.space);
                setSpaceAddress(currentSpace?.identificacion.calle || '');
            } else {
                setSpaceAddress('');
            }
            setBriefing(data.comercialBriefings?.find(b => b.osId === osId) || null);
            setIsLoading(false);
        }
    }, [osId, isDataStoreLoaded, data, updateKey]);
    
    const getProcessedDataForType = useCallback((type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler'): ProcessedData => {
        const relatedOrders = (data.materialOrders || []).filter(order => order.osId === osId && order.type === type);
        const relatedPickingSheets = Object.values(data.pickingSheets || {}).filter(sheet => sheet.osId === osId);
        
        const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
        const processedItemKeys = new Set<string>();
        const blocked: BlockedOrderInfo[] = [];

        relatedPickingSheets.forEach(sheet => {
            const targetStatus = statusMap[sheet.status];
            const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

            sheet.items.forEach(itemInSheet => {
                if (itemInSheet.type !== type) return;
                
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
            order.items.map(item => ({
                ...item, 
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo))
        );
        
        const pending = all.filter(item => {
          const uniqueKey = `${item.orderId}-${item.itemCode}`;
          return !processedItemKeys.has(uniqueKey) && item.quantity > 0;
        });
        
        statusItems['Asignado'] = pending;

        const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        return { allItems: all, blockedOrders: blocked, pendingItems: pending, itemsByStatus: statusItems, totalValoracionPendiente };

    }, [data, osId]);

    const value = { osId, serviceOrder, briefing, spaceAddress, isLoading, updateKey, getProcessedDataForType };
    
    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

```
- src/app/os/[id]/alquiler/page.tsx:
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
- src/app/os/almacen/layout.tsx:
```tsx
'use client';

import { Warehouse } from 'lucide-react';
import { useOsData } from '../os-context';


export default function AlmacenLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Warehouse />Módulo de Almacén</h1>
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

    const { allItems, blockedOrders, pendingItems, itemsByStatus } = useMemo(() => {
        const emptyResult = { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] } };
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

        return { allItems: all, blockedOrders: blocked, pendingItems: pending, itemsByStatus: statusItems };
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
- src/app/os/[id]/alquiler/page.tsx:
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
- src/app/os/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/os/[id]/almacen/page.tsx:
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

    const { allItems, blockedOrders, pendingItems, itemsByStatus } = useMemo(() => {
        const emptyResult = { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] } };
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

        return { allItems: all, blockedOrders: blocked, pendingItems: pending, itemsByStatus: statusItems };
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



