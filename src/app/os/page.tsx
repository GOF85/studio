'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Warehouse, ChevronRight, PanelLeft, Wine, FilePenLine, Trash2 } from 'lucide-react';

import type { OrderItem, ServiceOrder, MaterialOrder } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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


export const osFormSchema = z.object({
  serviceNumber: z.string().min(1, 'El Nº de Servicio es obligatorio'),
  startDate: z.date({ required_error: 'La fecha de inicio es obligatoria.' }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  finalClient: z.string().optional().default(''),
  commercial: z.string().optional().default(''),
  commercialPhone: z.string().optional().default(''),
  pax: z.coerce.number().optional().default(0),
  endDate: z.date({ required_error: 'La fecha de fin es obligatoria.' }),
  space: z.string().optional().default(''),
  spaceContact: z.string().optional().default(''),
  spacePhone: z.string().optional().default(''),
  respMetre: z.string().optional().default(''),
  respMetrePhone: z.string().optional().default(''),
  respCocina: z.string().optional().default(''),
  respCocinaPhone: z.string().optional().default(''),
  agencyPercentage: z.coerce.number().optional().default(0),
  spacePercentage: z.coerce.number().optional().default(0),
  facturacion: z.coerce.number().optional().default(0),
  uniformity: z.string().optional().default(''),
  plane: z.string().optional().default(''),
  menu: z.string().optional().default(''),
  dniList: z.string().optional().default(''),
  sendTo: z.string().optional().default(''),
  comments: z.string().optional().default(''),
  deliveryLocations: z.array(z.string()).optional().default([]),
  status: z.enum(['Borrador', 'Confirmado', 'Finalizado']).default('Borrador'),
});

export type OsFormValues = z.infer<typeof osFormSchema>;

const defaultValues: Partial<OsFormValues> = {
  serviceNumber: '', client: '', contact: '', phone: '', finalClient: '', commercial: '', commercialPhone: '', pax: 0,
  space: '', spaceContact: '', spacePhone: '', respMetre: '', respMetrePhone: '', respCocina: '', respCocinaPhone: '',
  agencyPercentage: 0, spacePercentage: 0, facturacion: 0,
  uniformity: '', plane: '', menu: '', dniList: '', sendTo: '', comments: '', deliveryLocations: [],
  status: 'Borrador',
};

function FinancialCalculator() {
  const facturacion = useWatch({ name: 'facturacion' });
  const agencyPercentage = useWatch({ name: 'agencyPercentage' });
  const spacePercentage = useWatch({ name: 'spacePercentage' });

  const facturacionNeta = useMemo(() => {
    const totalPercentage = (agencyPercentage || 0) + (spacePercentage || 0);
    return (facturacion || 0) * (1 - totalPercentage / 100);
  }, [facturacion, agencyPercentage, spacePercentage]);

  return (
    <FormItem>
      <FormLabel>Facturación Neta</FormLabel>
      <FormControl>
        <Input
          readOnly
          value={facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          className="font-bold text-primary"
        />
      </FormControl>
    </FormItem>
  );
}

const ClienteTitle = () => {
  const client = useWatch({ name: 'client' });
  const title = `Cliente ${client ? `- ${client}` : ''}`;
  return <h3 className="text-lg font-semibold">{title}</h3>;
};

const EspacioTitle = () => {
    const space = useWatch({ name: 'space' });
    const title = `Espacio ${space ? `- ${space}` : ''}`;
    return <h3 className="text-lg font-semibold">{title}</h3>;
};

const ResponsablesTitle = () => {
    const metre = useWatch({ name: 'respMetre' });
    const cocina = useWatch({ name: 'respCocina' });
    let details = [metre, cocina].filter(Boolean).join(' - ');
    const title = `Responsables ${details ? `- ${details}` : ''}`;
    return <h3 className="text-lg font-semibold">{title}</h3>;
};

export default function OsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('id');

  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [accordionDefaultValue, setAccordionDefaultValue] = useState<string[] | undefined>(undefined);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmittingFromDialog, setIsSubmittingFromDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues,
  });

  const { formState: { isDirty } } = form;

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
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    
    if (osId) {
      setAccordionDefaultValue([]); // Collapse for existing
      const allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allOS.find(os => os.id === osId) || null;
      if (currentOS) {
        const values = {
            ...currentOS,
            startDate: new Date(currentOS.startDate),
            endDate: new Date(currentOS.endDate),
            deliveryLocations: currentOS.deliveryLocations || [],
        }
        form.reset(values);
        
        const relatedMaterialOrders = allMaterialOrders.filter(mo => mo.osId === osId);
        setMaterialOrders(relatedMaterialOrders);
        const total = relatedMaterialOrders.reduce((sum, order) => sum + order.total, 0);
        setTotalAmount(total);

      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la Orden de Servicio.' });
        router.push('/pes');
      }
    } else { // Creating new OS
      form.reset(defaultValues);
      setAccordionDefaultValue(['cliente', 'espacio', 'responsables', 'financiero']); // Expand for new
    }
  }, [osId, form, router, toast]);

  function onSubmit(data: OsFormValues) {
    setIsLoading(true);

    let allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    let message = '';
    let newId = osId;
    
    if (osId) { // Update existing
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
      newId = Date.now().toString();
      const newOS: ServiceOrder = {
        id: newId,
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };
      allOS.push(newOS);
      message = 'Orden de Servicio creada correctamente.';
    }

    localStorage.setItem('serviceOrders', JSON.stringify(allOS));
    
    setTimeout(() => {
      toast({
        title: 'Operación Exitosa',
        description: message,
      });
      setIsLoading(false);
      form.reset(form.getValues()); // Mark form as not dirty
      if (isSubmittingFromDialog) {
        router.push('/pes');
      } else if (newId && !osId) { 
        router.push(`/os?id=${newId}`);
      } else {
        router.replace(`/os?id=${newId}&t=${Date.now()}`);
      }
    }, 1000)
  }

  const handleEditMaterialOrder = (order: MaterialOrder) => {
    const modulePath = order.type === 'Almacén' ? 'almacen' : 'bodega';
    router.push(`/?osId=${osId}&type=${order.type}&orderId=${order.id}`);
  }

  const handleDeleteMaterialOrder = (orderId: string) => {
     let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
     const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderId);
     localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
     setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId));
     const total = updatedOrders.filter(o => o.osId === osId).reduce((sum, o) => sum + o.total, 0);
     setTotalAmount(total);
     toast({ title: 'Pedido de material eliminado' });
  }
  
  const handleSaveFromDialog = async () => {
    setIsSubmittingFromDialog(true);
    await form.handleSubmit(onSubmit)();
  };

  return (
    <TooltipProvider>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold">{osId ? 'Editar' : 'Nueva'} Orden de Servicio</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackToList}>Volver al listado</Button>
            <Button type="submit" form="os-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{osId ? 'Guardar Cambios' : 'Guardar OS'}</span>
            </Button>
          </div>
        </div>

        <div className={cn("grid gap-8 transition-[grid-template-columns] duration-300", isSidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[160px_1fr]")}>
          <aside className="lg:sticky top-24 self-start flex flex-col">
            <div className={cn("flex items-center justify-between mb-4", isSidebarCollapsed && 'justify-center')}>
              {!isSidebarCollapsed && <h2 className="text-lg font-semibold">Módulos</h2>}
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                <PanelLeft className={cn("transition-transform", isSidebarCollapsed && "rotate-180")} />
              </Button>
            </div>
            <nav className={cn("space-y-2", isSidebarCollapsed && 'flex flex-col items-center')}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" className={cn("w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary/80 transition-colors", isSidebarCollapsed && 'w-auto justify-center')} disabled={!osId}>
                     <Link href={osId ? `/almacen?osId=${osId}` : '#'}>
                        <div className="flex items-center gap-3">
                          <Warehouse className="h-5 w-5 flex-shrink-0" />
                          {!isSidebarCollapsed && <span className="font-medium">Almacén</span>}
                        </div>
                        {!isSidebarCollapsed && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </Link>
                  </Button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Almacén</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button asChild variant="ghost" className={cn("w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary/80 transition-colors", isSidebarCollapsed && 'w-auto justify-center')} disabled={!osId}>
                     <Link href={osId ? `/bodega?osId=${osId}` : '#'}>
                        <div className="flex items-center gap-3">
                          <Wine className="h-5 w-5 flex-shrink-0" />
                          {!isSidebarCollapsed && <span className="font-medium">Bodega</span>}
                        </div>
                        {!isSidebarCollapsed && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </Link>
                  </Button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Bodega</TooltipContent>}
              </Tooltip>
            </nav>
          </aside>
          
          <main>
            <FormProvider {...form}>
              <form id="os-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Datos del Servicio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField control={form.control} name="serviceNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nº Servicio</FormLabel>
                          <FormControl><Input {...field} readOnly={!!osId} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha Inicio</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha Fin</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )} />
                       <FormField control={form.control} name="pax" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAX</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                        </FormItem>
                      )} />
                       <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Borrador">Borrador</SelectItem>
                              <SelectItem value="Confirmado">Confirmado</SelectItem>
                              <SelectItem value="Finalizado">Finalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                   {accordionDefaultValue && <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full">
                      <AccordionItem value="cliente">
                        <AccordionTrigger><ClienteTitle /></AccordionTrigger>
                        <AccordionContent>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            <FormField control={form.control} name="client" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
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
                            <FormField control={form.control} name="finalClient" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cliente Final</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="espacio">
                        <AccordionTrigger><EspacioTitle /></AccordionTrigger>
                        <AccordionContent>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            <FormField control={form.control} name="space" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Espacio</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
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
                             <FormField control={form.control} name="plane" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plano</FormLabel>
                                <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                              </FormItem>
                            )} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                       <AccordionItem value="responsables">
                        <AccordionTrigger><ResponsablesTitle /></AccordionTrigger>
                        <AccordionContent>
                           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                              <FormField control={form.control} name="respMetre" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Resp. Metre</FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="metre1">Metre 1</SelectItem>
                                      <SelectItem value="metre2">Metre 2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                               <FormField control={form.control} name="respMetrePhone" render={({ field }) => (
                                <FormItem><FormLabel>Tlf. Resp. Metre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                               )} />
                               <div></div>
                              <FormField control={form.control} name="respCocina" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Resp. Cocina</FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="cocina1">Cocinero 1</SelectItem>
                                      <SelectItem value="cocina2">Cocinero 2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                               <FormField control={form.control} name="respCocinaPhone" render={({ field }) => (
                                <FormItem><FormLabel>Tlf. Resp. Cocina</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                               )} />
                               <div></div>
                              <FormField control={form.control} name="commercial" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resp. Comercial</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                        <SelectItem value="com1">Comercial 1</SelectItem>
                                        <SelectItem value="com2">Comercial 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                                )} />
                               <FormField control={form.control} name="commercialPhone" render={({ field }) => (
                                <FormItem><FormLabel>Tlf. Resp. Comercial</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                               )} />
                           </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="financiero">
                        <AccordionTrigger>
                          <h3 className="text-lg font-semibold">Financiero</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                            <FormField control={form.control} name="facturacion" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facturación</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="agencyPercentage" render={({ field }) => (
                              <FormItem>
                                <FormLabel>% Agencia</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="spacePercentage" render={({ field }) => (
                              <FormItem>
                                <FormLabel>% Espacio</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                              </FormItem>
                            )} />
                            <FinancialCalculator />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>}
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
                       <FormField control={form.control} name="uniformity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uniformidad</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="uniform1">Uniforme 1</SelectItem>
                              <SelectItem value="uniform2">Uniforme 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                       <FormField control={form.control} name="menu" render={({ field }) => (
                        <FormItem>
                          <FormLabel>P. de Menú</FormLabel>
                          <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dniList" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Listado DNI</FormLabel>
                          <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                        </FormItem>
                      )} />
                       <FormField control={form.control} name="sendTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enviar A</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="dest1">Destinatario 1</SelectItem>
                              <SelectItem value="dest2">Destinatario 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="comments" render={({ field }) => (
                          <FormItem className="md:col-span-2 lg:col-span-3">
                              <FormLabel>Comentarios</FormLabel>
                              <FormControl><Textarea rows={4} {...field} /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                  </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Briefing del Evento (Pedidos de Material)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {materialOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Tipo</th>
                                            <th scope="col" className="px-6 py-3">Nº Contrato</th>
                                            <th scope="col" className="px-6 py-3">Artículos</th>
                                            <th scope="col" className="px-6 py-3">Días</th>
                                            <th scope="col" className="px-6 py-3">Importe</th>
                                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materialOrders.map(order => (
                                            <tr key={order.id} className="border-b">
                                                <td className="px-6 py-4 font-medium">{order.type}</td>
                                                <td className="px-6 py-4">{order.contractNumber}</td>
                                                <td className="px-6 py-4">{order.items.length}</td>
                                                <td className="px-6 py-4">{order.days}</td>
                                                <td className="px-6 py-4">{(order.total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                                <td className="px-6 py-4 text-right">
                                                  <Button variant="ghost" size="icon" onClick={() => handleEditMaterialOrder(order)} disabled={order.status !== 'Asignado'}>
                                                    <FilePenLine className="h-4 w-4" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMaterialOrder(order.id)} disabled={order.status !== 'Asignado'}>
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-semibold text-lg">
                                            <td colSpan={4}></td>
                                            <td className="px-6 py-3 text-right">Total Pedidos:</td>
                                            <td className="px-6 py-3" colSpan={2}>{totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No hay ningún pedido de material asociado. Crea uno desde los módulos de Almacén o Bodega.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
              </form>
            </FormProvider>
          </main>
        </div>
      </div>
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
    </TooltipProvider>
  );
}
