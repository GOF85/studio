

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
                                {['Recurrente', 'Grandes Eventos', 'Gran Cuenta'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
- src/app/os/comercial/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, useWatch, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Pencil, DollarSign, Check, Utensils } from 'lucide-react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, TipoServicio, ComercialAjuste } from '@/types';
import { osFormSchema, type OsFormValues } from '@/app/os/[id]/info/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Combobox } from '@/components/ui/combobox';
import { useOsContext } from '../os-context';

const briefingItemSchema = z.object({
  id: z.string(),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  conGastronomia: z.boolean().default(false),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  comentarios: z.string().optional(),
  sala: z.string().optional(),
  asistentes: z.coerce.number().min(0),
  precioUnitario: z.coerce.number().min(0),
  importeFijo: z.coerce.number().optional().default(0),
});

type BriefingItemFormValues = z.infer<typeof briefingItemSchema>;

const financialSchema = osFormSchema.pick({
    agencyPercentage: true,
    spacePercentage: true,
    agencyCommissionValue: true,
    spaceCommissionValue: true,
});

type FinancialFormValues = z.infer<typeof financialSchema>;

function FinancialCalculator ({ totalFacturacion, onNetChange }: { totalFacturacion: number, onNetChange: (net:number) => void }) {
    const { control } = useFormContext();
    const agencyPercentage = useWatch({ control, name: 'agencyPercentage' });
    const spacePercentage = useWatch({ control, name: 'spacePercentage' });
  
    const facturacionNeta = useMemo(() => {
      const totalPercentage = (agencyPercentage || 0) + (spacePercentage || 0);
      const net = totalFacturacion * (1 - totalPercentage / 100);
      return net;
    }, [totalFacturacion, agencyPercentage, spacePercentage]);
  
    useEffect(() => {
      onNetChange(facturacionNeta);
    }, [facturacionNeta, onNetChange]);
  
  
    return (
      <FormItem className="mt-auto invisible">
        <FormLabel className="text-lg">Facturación Neta</FormLabel>
        <FormControl>
          <Input
            readOnly
            value={facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            className="font-bold text-primary h-12 text-xl"
          />
        </FormControl>
      </FormItem>
    );
  }

export default function ComercialPage() {
    const { serviceOrder, briefing: initialBriefing, isLoading: isOsDataLoading, osId } = useOsContext();
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(initialBriefing);
    const [ajustes, setAjustes] = useState<ComercialAjuste[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [editingItem, setEditingItem] = useState<ComercialBriefingItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);

    const nuevoAjusteConceptoRef = useRef<HTMLInputElement>(null);
    const nuevoAjusteImporteRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { toast } = useToast();
    
    const totalBriefing = useMemo(() => {
        return briefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
    }, [briefing]);

    const totalAjustes = useMemo(() => {
        return ajustes.reduce((acc, ajuste) => acc + ajuste.importe, 0);
    }, [ajustes]);

    const facturacionFinal = useMemo(() => totalBriefing + totalAjustes, [totalBriefing, totalAjustes]);

    const financialForm = useForm<FinancialFormValues>({
        resolver: zodResolver(financialSchema),
        defaultValues: {
            agencyPercentage: 0,
            spacePercentage: 0,
            agencyCommissionValue: 0,
            spaceCommissionValue: 0,
        }
    });

    const watchedAgencyPercentage = financialForm.watch('agencyPercentage');
    const watchedSpacePercentage = financialForm.watch('spacePercentage');
    const watchedAgencyValue = financialForm.watch('agencyCommissionValue');
    const watchedSpaceValue = financialForm.watch('spaceCommissionValue');

    const facturacionNeta = useMemo(() => {
      const agencyCommission = (facturacionFinal * (watchedAgencyPercentage || 0) / 100) + (watchedAgencyValue || 0);
      const spaceCommission = (facturacionFinal * (watchedSpacePercentage || 0) / 100) + (watchedSpaceValue || 0);
      return facturacionFinal - agencyCommission - spaceCommission;
    }, [facturacionFinal, watchedAgencyPercentage, watchedSpacePercentage, watchedAgencyValue, watchedSpaceValue]);


   const saveFinancials = useCallback(() => {
    if (!serviceOrder) return;

    const data = financialForm.getValues();
    const agencyCommission = (facturacionFinal * (data.agencyPercentage || 0) / 100) + (data.agencyCommissionValue || 0);
    const spaceCommission = (facturacionFinal * (data.spacePercentage || 0) / 100) + (data.spaceCommissionValue || 0);

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const index = allServiceOrders.findIndex(os => os.id === osId);
    if (index !== -1) {
        allServiceOrders[index] = { 
            ...allServiceOrders[index], 
            facturacion: facturacionFinal,
            agencyPercentage: data.agencyPercentage,
            spacePercentage: data.spacePercentage,
            agencyCommissionValue: data.agencyCommissionValue,
            spaceCommissionValue: data.spaceCommissionValue,
            comisionesAgencia: agencyCommission,
            comisionesCanon: spaceCommission,
        };
        localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
    }
  }, [serviceOrder, osId, facturacionFinal, financialForm]);

  useEffect(() => {
    const storedTipos = localStorage.getItem('tipoServicio');
    if (storedTipos) {
      setTiposServicio(JSON.parse(storedTipos));
    }
    
    const allAjustes = (JSON.parse(localStorage.getItem('comercialAjustes') || '{}') as {[key: string]: ComercialAjuste[]})[osId] || [];

    if (serviceOrder) {
        financialForm.reset({
            agencyPercentage: serviceOrder.agencyPercentage || 0,
            spacePercentage: serviceOrder.spacePercentage || 0,
            agencyCommissionValue: serviceOrder.agencyCommissionValue || 0,
            spaceCommissionValue: serviceOrder.spaceCommissionValue || 0,
        });
    }

    setBriefing(initialBriefing || { osId, items: [] });
    setAjustes(allAjustes);
    setIsMounted(true);
  }, [osId, financialForm, initialBriefing, serviceOrder]);

   useEffect(() => {
    if (serviceOrder && facturacionFinal !== serviceOrder.facturacion) {
        saveFinancials();
    }
  }, [facturacionFinal, serviceOrder, saveFinancials]);

  const sortedBriefingItems = useMemo(() => {
    if (!briefing?.items) return [];
    return [...briefing.items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      if (dateComparison !== 0) return dateComparison;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [briefing]);

  const saveBriefing = (newBriefing: ComercialBriefing) => {
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const index = allBriefings.findIndex(b => b.osId === osId);
    if (index !== -1) {
      allBriefings[index] = newBriefing;
    } else {
      allBriefings.push(newBriefing);
    }
    localStorage.setItem('comercialBriefings', JSON.stringify(allBriefings));
    setBriefing(newBriefing);
  };
  
  const handleSaveFinancials = (data: FinancialFormValues) => {
    saveFinancials();
    toast({ title: 'Datos financieros actualizados' });
  };

  const handleRowClick = (item: ComercialBriefingItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleNewClick = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleSaveItem = (data: BriefingItemFormValues) => {
    if (!briefing) return false;
    let newItems;
    if (editingItem) {
      newItems = briefing.items.map(item => item.id === editingItem.id ? data : item);
      toast({ title: 'Hito actualizado' });
    } else {
      newItems = [...briefing.items, { ...data, id: Date.now().toString() }];
      toast({ title: 'Hito añadido' });
    }
    saveBriefing({ ...briefing, items: newItems });
    setEditingItem(null);
    return true; // Indicate success to close dialog
  };

  const handleDeleteItem = (itemId: string) => {
    if (!briefing) return;
    const newItems = briefing.items.filter(item => item.id !== itemId);
    saveBriefing({ ...briefing, items: newItems });
    toast({ title: 'Hito eliminado' });
  };
  
  const calculateDuration = (start: string, end: string) => {
    try {
      const startTime = parse(start, 'HH:mm', new Date());
      const endTime = parse(end, 'HH:mm', new Date());
      const diff = differenceInMinutes(endTime, startTime);
      if (diff < 0) return 'N/A';
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const saveAjustes = (newAjustes: ComercialAjuste[]) => {
      if(!osId) return;
      const allAjustes = JSON.parse(localStorage.getItem('comercialAjustes') || '{}');
      allAjustes[osId] = newAjustes;
      localStorage.setItem('comercialAjustes', JSON.stringify(allAjustes));
      setAjustes(newAjustes);
  };

  const handleAddAjuste = () => {
    const concepto = nuevoAjusteConceptoRef.current?.value;
    const importe = nuevoAjusteImporteRef.current?.value;

    if (!concepto || !importe) {
        toast({ variant: 'destructive', title: 'Error', description: 'El concepto y el importe son obligatorios.' });
        return;
    }
    const newAjustes = [...ajustes, { id: Date.now().toString(), concepto, importe: parseFloat(importe) }];
    saveAjustes(newAjustes);

    if(nuevoAjusteConceptoRef.current) nuevoAjusteConceptoRef.current.value = '';
    if(nuevoAjusteImporteRef.current) nuevoAjusteImporteRef.current.value = '';
  };
  
  const handleDeleteAjuste = (id: string) => {
      const newAjustes = ajustes.filter(a => a.id !== id);
      saveAjustes(newAjustes);
  }
  
  const handleAddLocation = (newLocation: string) => {
    if (!serviceOrder) return;
    
    const updatedOS = {
        ...serviceOrder,
        deliveryLocations: [...(serviceOrder.deliveryLocations || []), newLocation]
    };
    
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const osIndex = allServiceOrders.findIndex(os => os.id === serviceOrder.id);
    
    if (osIndex !== -1) {
        allServiceOrders[osIndex] = updatedOS;
        localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
        // setServiceOrder(updatedOS); // This will be handled by context
        toast({ title: 'Localización añadida', description: `Se ha guardado "${newLocation}" en la Orden de Servicio.`})
    }
  }

  const BriefingItemDialog = ({ open, onOpenChange, item, onSave, serviceOrder, onAddLocation }: { open: boolean, onOpenChange: (open: boolean) => void, item: Partial<ComercialBriefingItem> | null, onSave: (data: BriefingItemFormValues) => boolean, serviceOrder: ServiceOrder | null, onAddLocation: (location: string) => void }) => {
    const form = useForm<BriefingItemFormValues>({
      resolver: zodResolver(briefingItemSchema),
      defaultValues: {
        id: item?.id || '',
        fecha: item?.fecha || (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
        horaInicio: item?.horaInicio || '09:00',
        horaFin: item?.horaFin || '10:00',
        conGastronomia: item?.conGastronomia || false,
        descripcion: item?.descripcion || '',
        comentarios: item?.comentarios || '',
        sala: item?.sala || '',
        asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
        precioUnitario: item?.precioUnitario || 0,
        importeFijo: item?.importeFijo || 0,
      }
    });
    
    useEffect(() => {
        form.reset({
            id: item?.id || '',
            fecha: item?.fecha || (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
            horaInicio: item?.horaInicio || '09:00',
            horaFin: item?.horaFin || '10:00',
            conGastronomia: item?.conGastronomia || false,
            descripcion: item?.descripcion || '',
            comentarios: item?.comentarios || '',
            sala: item?.sala || '',
            asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
            precioUnitario: item?.precioUnitario || 0,
            importeFijo: item?.importeFijo || 0,
        })
    }, [item, serviceOrder, form])


    const asistentes = form.watch('asistentes');
    const precioUnitario = form.watch('precioUnitario');
    const importeFijo = form.watch('importeFijo');
    const total = useMemo(() => (asistentes * precioUnitario) + (importeFijo || 0), [asistentes, precioUnitario, importeFijo]);
    
    const locationOptions = useMemo(() => {
      return serviceOrder?.deliveryLocations?.map(loc => ({ label: loc, value: loc })) || [];
    }, [serviceOrder]);

    const handleLocationChange = (value: string) => {
      const isNew = !locationOptions.some(opt => opt.value === value);
      if (isNew && value) {
        onAddLocation(value);
      }
      form.setValue('sala', value, { shouldDirty: true });
    }

    const onSubmit = (data: BriefingItemFormValues) => {
      if (onSave(data)) {
        onOpenChange(false);
        form.reset();
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{item ? 'Editar' : 'Nuevo'} Hito del Briefing</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="fecha" render={({field}) => <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem> } />
                <FormField control={form.control} name="horaInicio" render={({field}) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                <FormField control={form.control} name="horaFin" render={({field}) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage/></FormItem> } />
                <FormField control={form.control} name="sala" render={({field}) => (
                    <FormItem className="flex flex-col"><FormLabel>Sala</FormLabel>
                       <Combobox
                          options={locationOptions}
                          value={field.value || ''}
                          onChange={handleLocationChange}
                          placeholder="Busca o crea una sala..."
                          searchPlaceholder="Buscar sala..."
                      />
                      <FormMessage />
                    </FormItem>
                 )} />
                <FormField control={form.control} name="asistentes" render={({field}) => <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input placeholder="Nº Asistentes" type="number" {...field} /></FormControl><FormMessage/></FormItem> } />
                <FormField control={form.control} name="precioUnitario" render={({field}) => <FormItem><FormLabel>Precio Unitario</FormLabel><FormControl><Input placeholder="Precio Unitario" type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem> } />
                 <FormField control={form.control} name="importeFijo" render={({field}) => <FormItem><FormLabel>Importe Fijo</FormLabel><FormControl><Input placeholder="Importe Fijo" type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem> } />
                <FormItem>
                  <FormLabel>Total</FormLabel>
                  <FormControl>
                    <Input readOnly value={total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} />
                  </FormControl>
                </FormItem>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={form.control} name="descripcion" render={({field}) => (
                    <FormItem><FormLabel>Descripción</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo de servicio" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {tiposServicio.map(tipo => <SelectItem key={tipo.id} value={tipo.servicio}>{tipo.servicio}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage/>
                    </FormItem> 
                )} />
                <FormField
                    control={form.control}
                    name="conGastronomia"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <FormLabel className="!m-0 text-base flex items-center gap-2">
                            <Utensils/>
                            Con gastronomía
                        </FormLabel>
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="comentarios" render={({field}) => <FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea placeholder="Comentarios" {...field} /></FormControl></FormItem> } />
              </div>
              
              <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                 <Button type="submit"><Save className="mr-2" /> Guardar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  }

  if (isOsDataLoading || !isMounted) {
    return <LoadingSkeleton title="Cargando Módulo Comercial..." />;
  }

  return (
    <>
      <FormProvider {...financialForm}>
           <Accordion type="single" collapsible className="w-full mb-4">
              <AccordionItem value="item-1">
                  <Card>
                      <AccordionTrigger className="p-2">
                          <div className="flex items-center justify-between w-full">
                              <CardTitle className="text-base flex items-center gap-2 px-2"><DollarSign/>Información Financiera y Ajustes</CardTitle>
                               <div className="text-sm font-bold pr-4">
                                  <span className="text-black dark:text-white">Facturación Neta: </span>
                                  <span className="text-green-600">{facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                              </div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent>
                           <div className="grid lg:grid-cols-2 gap-4 p-4 pt-0">
                              <form onChange={handleSubmit(handleSaveFinancials)} className="flex flex-col space-y-2">
                                  <h3 className="text-base font-semibold border-b pb-1">Información Financiera</h3>
                                  <div className="grid grid-cols-2 gap-4 items-end">
                                      <FormItem>
                                          <FormLabel className="text-xs">Fact. Briefing</FormLabel>
                                          <FormControl><Input readOnly value={totalBriefing.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="h-8 text-sm" /></FormControl>
                                      </FormItem>
                                      <FormItem>
                                          <FormLabel className="text-xs">Facturación Final</FormLabel>
                                          <FormControl><Input readOnly value={facturacionFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="h-8 text-sm"/></FormControl>
                                      </FormItem>
                                      <FormField control={financialForm.control} name="agencyPercentage" render={({ field }) => (
                                          <FormItem>
                                          <FormLabel className="text-xs">% Agencia</FormLabel>
                                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                                          </FormItem>
                                      )} />
                                      <FormField control={financialForm.control} name="agencyCommissionValue" render={({ field }) => (
                                          <FormItem>
                                          <FormLabel className="text-xs">Comisión Agencia (€)</FormLabel>
                                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                                          </FormItem>
                                      )} />
                                       <FormField control={financialForm.control} name="spacePercentage" render={({ field }) => (
                                          <FormItem>
                                          <FormLabel className="text-xs">% Espacio</FormLabel>
                                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                                          </FormItem>
                                      )} />
                                        <FormField control={financialForm.control} name="spaceCommissionValue" render={({ field }) => (
                                          <FormItem>
                                          <FormLabel className="text-xs">Canon Espacio (€)</FormLabel>
                                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                                          </FormItem>
                                      )} />
                                  </div>
                              </form>
                              <div className="space-y-2">
                                  <h3 className="text-base font-semibold border-b pb-1">Ajustes a la Facturación</h3>
                                  <div className="border rounded-lg">
                                      <Table>
                                          <TableBody>
                                              {ajustes.map(ajuste => (
                                              <TableRow key={ajuste.id}>
                                                  <TableCell className="font-medium p-1 text-sm">{ajuste.concepto}</TableCell>
                                                  <TableCell className="text-right p-1 text-sm">{ajuste.importe.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</TableCell>
                                                  <TableCell className="w-12 text-right p-0 pr-1">
                                                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteAjuste(ajuste.id)}>
                                                          <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                  </TableCell>
                                              </TableRow>
                                              ))}
                                          </TableBody>
                                          <TableFooter>
                                          <TableRow>
                                              <TableCell className="p-1">
                                                  <Input ref={nuevoAjusteConceptoRef} placeholder="Nuevo concepto" className="h-8 text-xs"/>
                                              </TableCell>
                                              <TableCell className="text-right p-1">
                                                  <Input ref={nuevoAjusteImporteRef} type="number" step="0.01" placeholder="Importe" className="text-right h-8 w-24 text-xs"/>
                                              </TableCell>
                                              <TableCell className="text-right p-1">
                                                  <Button type="button" onClick={handleAddAjuste} size="sm" className="h-8 text-xs">Añadir</Button>
                                              </TableCell>
                                          </TableRow>
                                      </TableFooter>
                                      </Table>
                                  </div>
                              </div>
                          </div>
                      </AccordionContent>
                  </Card>
              </AccordionItem>
          </Accordion>
      </FormProvider>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Briefing del Contrato</CardTitle>
          <Button onClick={handleNewClick}><PlusCircle className="mr-2" /> Nuevo Hito</Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Gastro</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Comentarios</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Asistentes</TableHead>
                  <TableHead>P.Unitario</TableHead>
                  <TableHead>Imp. Fijo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefingItems.length > 0 ? (
                  sortedBriefingItems.map(item => (
                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                      <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{item.horaInicio}</TableCell>
                      <TableCell>{item.horaFin}</TableCell>
                      <TableCell>{calculateDuration(item.horaInicio, item.horaFin)}</TableCell>
                      <TableCell>{item.conGastronomia ? <Check className="h-4 w-4" /> : null}</TableCell>
                      <TableCell className="min-w-[200px]">{item.descripcion}</TableCell>
                      <TableCell className="min-w-[200px]">{item.comentarios}</TableCell>
                      <TableCell>{item.sala}</TableCell>
                      <TableCell>{item.asistentes}</TableCell>
                      <TableCell>{item.precioUnitario.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                      <TableCell>{(item.importeFijo || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                      <TableCell>{((item.asistentes * item.precioUnitario) + (item.importeFijo || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      No hay hitos en el briefing. Añade uno para empezar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <BriefingItemDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} item={editingItem} onSave={handleSaveItem} serviceOrder={serviceOrder} onAddLocation={handleAddLocation} />
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
- src/app/os/personal-mice/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-mice`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/personal-externo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalExternoIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-externo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/prueba-menu/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PruebaMenuIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/prueba-menu`);
    }, [router, params.id]);
    return null;
}

```
- src/hooks/use-loading-store.ts:
```ts
import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

```
- src/pes/page.tsx
- src/components/pes/prevision-servicios-content.tsx