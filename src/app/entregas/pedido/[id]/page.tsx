

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Trash2, Package, Save, X, Truck, PlusCircle, Pencil, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { Entrega, ProductoVenta, PedidoEntrega, PedidoEntregaItem, TransporteOrder, EntregaHito, ProveedorTransporte, ServiceOrder } from '@/types';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { osFormSchema } from '@/app/os/[id]/info/page';


export const entregaFormSchema = osFormSchema.extend({
  // No new fields needed at this level for now
});


export type EntregaFormValues = z.infer<typeof entregaFormSchema>;

const defaultValues: Partial<EntregaFormValues> = {
  serviceNumber: '',
  client: '',
  asistentes: 1,
  contact: '',
  phone: '',
  email: '',
  finalClient: '',
  status: 'Borrador',
  tarifa: 'Empresa',
  tipoCliente: 'Empresa',
  comercial: '',
  agencyPercentage: 0,
  agencyCommissionValue: 0,
  spacePercentage: 0,
  spaceCommissionValue: 0,
  comisionesAgencia: 0,
  comisionesCanon: 0,
  facturacion: 0,
  plane: '',
  comments: '',
  deliveryLocations: [],
  direccionPrincipal: '',
};

const hitoDialogSchema = z.object({
    id: z.string(),
    fecha: z.date(),
    hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
    lugarEntrega: z.string().min(1, "El lugar de entrega es obligatorio"),
    localizacion: z.string().optional(),
    contacto: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().or(z.literal('')).optional(),
    observaciones: z.string().optional(),
});
type HitoDialogFormValues = z.infer<typeof hitoDialogSchema>;


function HitoDialog({ onSave, initialData, os, children }: { onSave: (data: EntregaHito) => void; initialData?: Partial<EntregaHito>; os: Partial<Entrega> | null, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<HitoDialogFormValues>({
        resolver: zodResolver(hitoDialogSchema),
        defaultValues: {
            id: initialData?.id || Date.now().toString(),
            fecha: initialData?.fecha ? new Date(initialData.fecha) : (os?.startDate ? new Date(os.startDate) : new Date()),
            hora: initialData?.hora || '10:00',
            lugarEntrega: initialData?.lugarEntrega || os?.direccionPrincipal || '',
            localizacion: initialData?.localizacion || '',
            contacto: initialData?.contacto || os?.contact || '',
            telefono: initialData?.telefono || os?.phone || '',
            email: initialData?.email || os?.email || '',
            observaciones: initialData?.observaciones || '',
        }
    });

    const handleSubmit = (data: HitoDialogFormValues) => {
        onSave({
            ...data,
            fecha: format(data.fecha, 'yyyy-MM-dd'),
            items: initialData?.items || [],
        });
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nueva'} Entrega</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="fecha" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                         )} />
                          <FormField control={form.control} name="hora" render={({ field }) => (
                            <FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                       </div>
                        <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                            <FormItem><FormLabel>Lugar de Entrega (Dirección)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="localizacion" render={({ field }) => (
                            <FormItem><FormLabel>Localización (ej. Sala, Stand, etc.)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-3 gap-4">
                            <FormField control={form.control} name="contacto" render={({ field }) => (<FormItem><FormLabel>Contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const ClienteTitle = () => {
    const { watch } = useFormContext();
    const client = watch('client');
    const finalClient = watch('finalClient');
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información del Cliente</h3>
            {(client || finalClient) && (
                 <span className="text-lg font-bold text-primary text-right">
                    {client}{finalClient && ` / ${finalClient}`}
                </span>
            )}
        </div>
    )
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

const FinancialTitle = ({ pvpBruto }: { pvpBruto: number }) => {
    const { watch } = useFormContext();
    const agencyPercentage = watch('agencyPercentage');
    const agencyCommissionValue = watch('agencyCommissionValue');
    const spacePercentage = watch('spacePercentage');
    const spaceCommissionValue = watch('spaceCommissionValue');

    const pvpNeto = useMemo(() => {
        const agencyDiscount = pvpBruto * ((agencyPercentage || 0) / 100);
        const spaceDiscount = pvpBruto * ((spacePercentage || 0) / 100);
        return pvpBruto - agencyDiscount - (agencyCommissionValue || 0) - spaceDiscount - (spaceCommissionValue || 0);
    }, [pvpBruto, agencyPercentage, agencyCommissionValue, spacePercentage, spaceCommissionValue]);

    return (
         <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información Financiera</h3>
            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Bruto: {formatCurrency(pvpBruto)}</p>
                <p className="text-2xl font-bold text-green-600">Neto: {formatCurrency(pvpNeto)}</p>
            </div>
        </div>
    )
}

function TransporteDialog({ onSave, osId, hitos, existingTransportOrders }: { onSave: (order: Omit<TransporteOrder, 'id'>) => void; osId: string; hitos: EntregaHito[]; existingTransportOrders: TransporteOrder[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHitos, setSelectedHitos] = useState<Set<string>>(new Set());
    const [proveedorId, setProveedorId] = useState<string>('');
    const [proveedores, setProveedores] = useState<ProveedorTransporte[]>([]);

    useEffect(() => {
        const allProveedores = (JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[])
            .filter(p => p.tipo === 'Entregas');
        setProveedores(allProveedores);
    }, []);
    
    const assignedHitoIds = useMemo(() => {
        return new Set(existingTransportOrders.flatMap(t => t.hitosIds || []));
    }, [existingTransportOrders]);

    const selectedProvider = useMemo(() => proveedores.find(p => p.id === proveedorId), [proveedorId, proveedores]);

    const handleSave = () => {
        if (selectedHitos.size === 0 || !selectedProvider) {
            alert("Por favor, selecciona al menos una entrega y un proveedor.");
            return;
        }
        
        const firstHito = hitos.find(h => selectedHitos.has(h.id));
        if (!firstHito) return;
        
        onSave({
            osId,
            fecha: firstHito.fecha,
            proveedorId: selectedProvider.id,
            proveedorNombre: selectedProvider.nombreProveedor,
            tipoTransporte: selectedProvider.tipoTransporte,
            precio: selectedProvider.precio,
            lugarRecogida: 'C. Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid',
            horaRecogida: '09:00',
            lugarEntrega: firstHito.lugarEntrega,
            horaEntrega: firstHito.hora,
            observaciones: '',
            status: 'Pendiente',
            hitosIds: Array.from(selectedHitos),
        });
        setIsOpen(false);
        setSelectedHitos(new Set());
        setProveedorId('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2"/>Asignar Transporte</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Asignar Transporte</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <h4 className="font-semibold mb-2">1. Selecciona las entregas a incluir:</h4>
                        <div className="space-y-2 border p-2 rounded-md max-h-40 overflow-y-auto">
                            {hitos.map((hito, index) => {
                                const isAssigned = assignedHitoIds.has(hito.id);
                                const assignedProvider = isAssigned 
                                    ? existingTransportOrders.find(t => t.hitosIds?.includes(hito.id))?.proveedorNombre
                                    : null;
                                return (
                                <div key={hito.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`hito-${hito.id}`}
                                        checked={selectedHitos.has(hito.id)}
                                        onCheckedChange={(checked) => {
                                            const newSelection = new Set(selectedHitos);
                                            if(checked) newSelection.add(hito.id);
                                            else newSelection.delete(hito.id);
                                            setSelectedHitos(newSelection);
                                        }}
                                        disabled={isAssigned}
                                    />
                                    <label htmlFor={`hito-${hito.id}`} className={cn("text-sm font-medium leading-none", isAssigned && "text-muted-foreground line-through")}>
                                        #{index + 1} - {hito.lugarEntrega} ({format(new Date(hito.fecha), 'dd/MM/yy')} {hito.hora})
                                    </label>
                                    {isAssigned && <Badge variant="secondary">{assignedProvider}</Badge>}
                                </div>
                            )})}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">2. Selecciona un proveedor:</h4>
                        <Select onValueChange={setProveedorId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                            <SelectContent>
                                {proveedores.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.nombreProveedor} - {p.tipoTransporte} ({formatCurrency(p.precio)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={selectedHitos.size === 0 || !proveedorId}>Asignar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function EntregaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const { toast } = useToast();
  
  const [hitos, setHitos] = useState<EntregaHito[]>([]);
  const [transporteOrders, setTransporteOrders] = useState<TransporteOrder[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const form = useForm<EntregaFormValues>({
    resolver: zodResolver(entregaFormSchema),
    defaultValues,
  });

  const { control, handleSubmit, formState: { isDirty }, getValues, reset, watch, setValue } = form;
  
  const calculateHitoTotal = useCallback((hito: EntregaHito): number => {
    const totalProductos = hito.items.reduce((sum, item) => sum + ((item.pvp || 0) * item.quantity), 0);
    const tarifa = getValues('tarifa');
    const costePorte = tarifa === 'IFEMA' ? 95 : 30;
    const totalPortes = (hito.portes || 0) * costePorte;
    return totalProductos + totalPortes;
  }, [getValues]);
  
  const pvpTotalHitos = useMemo(() => {
    return hitos.reduce((total, hito) => total + calculateHitoTotal(hito), 0);
  }, [hitos, calculateHitoTotal]);
  
  const tarifa = watch('tarifa');
  
  useEffect(() => {
    if (tarifa === 'IFEMA') {
      setValue('spacePercentage', 17.85, { shouldDirty: true });
    } else if (tarifa === 'Empresa' && getValues('spacePercentage') === 17.85) {
      setValue('spacePercentage', 0, { shouldDirty: true });
    }
  }, [tarifa, setValue, getValues]);
  
  const agencyPercentage = watch('agencyPercentage');
  const agencyCommissionValue = watch('agencyCommissionValue');
  const spacePercentage = watch('spacePercentage');
  const spaceCommissionValue = watch('spaceCommissionValue');

  useEffect(() => {
    if (isEditing) {
      const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
      const currentEntrega = allEntregas.find(e => e.id === id);
      
      const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
      const currentPedido = allPedidosEntrega.find(p => p.osId === id);
      
      const allTransporte = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      setTransporteOrders(allTransporte.filter(t => t.osId === id));

      if (currentEntrega) {
        reset({
            ...defaultValues, // Ensure all keys are present
            ...currentEntrega,
            startDate: new Date(currentEntrega.startDate),
            endDate: new Date(currentEntrega.endDate)
        });
        setHitos(currentPedido?.hitos || []);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el pedido de entrega.' });
        router.push('/entregas/pes');
      }
    } else {
      reset({
          ...defaultValues,
          startDate: new Date(),
          endDate: new Date(),
      });
    }

    setIsMounted(true);
  }, [id, isEditing, reset, router, toast]);
  
  const handleSaveHito = async (hitoData: EntregaHito) => {
     // Force save main form if it's dirty before adding hito
    if(isDirty) {
        await handleSubmit(onSubmit)();
    }

     setHitos(prevHitos => {
         const existingIndex = prevHitos.findIndex(h => h.id === hitoData.id);
         let newHitos;
         if (existingIndex > -1) {
             newHitos = [...prevHitos];
             newHitos[existingIndex] = hitoData;
         } else {
            newHitos = [...prevHitos, hitoData];
         }

        // Save hitos to localStorage immediately
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const pedidoIndex = allPedidosEntrega.findIndex(p => p.osId === id);
        if (pedidoIndex > -1) {
            allPedidosEntrega[pedidoIndex].hitos = newHitos;
        } else {
            allPedidosEntrega.push({ osId: id, hitos: newHitos });
        }
        localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));

        return newHitos;
     });
  }
  
  const handleDeleteHito = (index: number) => {
      const hitoIdToDelete = hitos[index].id;
      const newHitos = hitos.filter((_, i) => i !== index);
      setHitos(newHitos);

      const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
      const pedidoIndex = allPedidosEntrega.findIndex(p => p.osId === id);
      if (pedidoIndex > -1) {
          allPedidosEntrega[pedidoIndex].hitos = newHitos;
          localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));
      }

      // Also delete associated transport orders
      const allTransporte = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      const updatedTransporte = allTransporte.filter(t => !t.hitosIds?.includes(hitoIdToDelete));
      localStorage.setItem('transporteOrders', JSON.stringify(updatedTransporte));
      setTransporteOrders(updatedTransporte.filter(t => t.osId === id));
  }

  function onSubmit(data: EntregaFormValues) {
    setIsLoading(true);
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    let message = '';
    let currentId = isEditing ? id : Date.now().toString();

    // Recalculate commissions just before saving
    const agencyDiscount = pvpTotalHitos * ((data.agencyPercentage || 0) / 100);
    const spaceDiscount = pvpTotalHitos * ((data.spacePercentage || 0) / 100);
    const comisionAgenciaTotal = agencyDiscount + (data.agencyCommissionValue || 0);
    const comisionCanonTotal = spaceDiscount + (data.spaceCommissionValue || 0);

    const entregaData: Entrega = {
        ...data,
        id: currentId,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        vertical: 'Entregas',
        deliveryTime: hitos?.[0]?.hora || '', 
        space: '',
        spaceAddress: hitos?.[0]?.lugarEntrega || '',
        comisionesAgencia: comisionAgenciaTotal,
        comisionesCanon: comisionCanonTotal,
    }
    
    const pedidoEntregaData: PedidoEntrega = {
        osId: currentId,
        hitos: hitos,
    }

    if (isEditing) {
      const entregaIndex = allEntregas.findIndex(e => e.id === id);
      if (entregaIndex > -1) {
        allEntregas[entregaIndex] = entregaData;
      }
      const pedidoIndex = allPedidosEntrega.findIndex(p => p.osId === id);
      if(pedidoIndex > -1) {
          allPedidosEntrega[pedidoIndex] = pedidoEntregaData;
      } else {
          allPedidosEntrega.push(pedidoEntregaData);
      }
      message = 'Pedido de entrega actualizado.';
    } else {
       const existing = allEntregas.find(e => e.serviceNumber === data.serviceNumber);
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un pedido con este número.' });
            setIsLoading(false);
            return;
        }
      allEntregas.push(entregaData);
      allPedidosEntrega.push(pedidoEntregaData);
      message = 'Pedido de entrega creado.';
    }

    localStorage.setItem('entregas', JSON.stringify(allEntregas));
    localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));
    
    toast({ description: message });
    setIsLoading(false);

    if (!isEditing) {
        router.push(`/entregas/pedido/${currentId}`);
    } else {
        form.reset(getValues()); // Mark form as not dirty
    }
  }

  const handleDelete = () => {
    if (!isEditing) return;
    
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    allEntregas = allEntregas.filter(e => e.id !== id);
    localStorage.setItem('entregas', JSON.stringify(allEntregas));

    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    allPedidosEntrega = allPedidosEntrega.filter(p => p.osId !== id);
    localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));

    let allTransporte = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    allTransporte = allTransporte.filter(t => t.osId !== id);
    localStorage.setItem('transporteOrders', JSON.stringify(allTransporte));
    
    let allPersonal = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as {osId: string}[];
    allPersonal = allPersonal.filter(p => p.osId !== id);
    localStorage.setItem('personalEntrega', JSON.stringify(allPersonal));

    toast({ title: 'Pedido eliminado' });
    router.push('/entregas/pes');
  };
  

  const handleSaveTransporte = (order: Omit<TransporteOrder, 'id'>) => {
    let allTransporte = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const newOrder: TransporteOrder = { ...order, id: Date.now().toString() };
    allTransporte.push(newOrder);
    localStorage.setItem('transporteOrders', JSON.stringify(allTransporte));
    setTransporteOrders(prev => [...prev, newOrder]);
    toast({ title: 'Transporte Asignado' });
  }

  const handlePrintProposal = async (lang: 'es' | 'en') => {
    const os = form.getValues();
    if (!os) return;

    setIsPrinting(true);
    try {
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;
        
        // --- TEXTOS ---
        const texts = {
            es: { proposalTitle: 'Propuesta Comercial', orderNumber: 'Nº Pedido:', issueDate: 'Fecha Emisión:', client: 'Cliente:', finalClient: 'Cliente Final:', contact: 'Contacto:', eventDate: 'Fecha Principal:', deliveryFor: 'Entrega para:', logistics: 'Logística:', item: 'Producto', qty: 'Cant.', unitPrice: 'P. Unitario', subtotal: 'Subtotal', deliveryTotal: 'Total Entrega', summaryTitle: 'Resumen Económico', productsSubtotal: 'Subtotal Productos', logisticsSubtotal: 'Subtotal Logística', taxableBase: 'Base Imponible', vat: 'IVA', total: 'TOTAL Propuesta', observations: 'Observaciones', footer: 'MICE Catering - Propuesta generada digitalmente.', portes: 'portes', porte: 'porte' },
            en: { proposalTitle: 'Commercial Proposal', orderNumber: 'Order No.:', issueDate: 'Issue Date:', client: 'Client:', finalClient: 'End Client:', contact: 'Contact:', eventDate: 'Main Date:', deliveryFor: 'Delivery for:', logistics: 'Logistics:', item: 'Product', qty: 'Qty.', unitPrice: 'Unit Price', subtotal: 'Subtotal', deliveryTotal: 'Financial Summary', productsSubtotal: 'Products Subtotal', logisticsSubtotal: 'Logistics Subtotal', taxableBase: 'Taxable Base', vat: 'VAT', total: 'TOTAL Proposal', observations: 'Observations', footer: 'MICE Catering - Digitally generated proposal.', portes: 'deliveries', porte: 'delivery' }
        };
        const T = texts[lang];

        // --- CABECERA ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#f97316'); // Orange
        doc.text(T.proposalTitle, margin, finalY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#374151');
        doc.text(`${T.orderNumber} ${os.serviceNumber}`, pageWidth - margin, finalY - 5, { align: 'right' });
        doc.text(`${T.issueDate} ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += 15;

        // --- INFO CLIENTE ---
        const clientInfo = [
            [T.client, os.client],
            [T.finalClient, os.finalClient || '-'],
            [T.contact, `${os.contact || ''} ${os.phone ? `(${os.phone})` : ''}`],
            [T.eventDate, format(os.startDate, 'dd/MM/yyyy')]
        ];
        autoTable(doc, {
            body: clientInfo,
            startY: finalY,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 0.5 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;

        // --- DESGLOSE POR HITOS ---
        let totalLogisticsCost = 0;
        
        for (const hito of hitos) {
            const hitoTotal = calculateHitoTotal(hito);
            const costePorte = os.tarifa === 'IFEMA' ? 95 : 30;
            const portesHito = (hito.portes || 0) * costePorte;
            totalLogisticsCost += portesHito;
            
            if (finalY + 40 > pageHeight) { doc.addPage(); finalY = margin; }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#1f2937');
            doc.text(`${T.deliveryFor} ${hito.lugarEntrega}`, margin, finalY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#6b7280');
            doc.text(`${format(new Date(hito.fecha), 'dd/MM/yy')} - ${hito.hora}`, margin, finalY + 5);
            finalY += 12;

            const body = hito.items.map(item => {
                const producto = productosMap.get(item.id);
                const nombre = lang === 'en' && producto?.nombre_en ? producto.nombre_en : item.nombre;
                return [
                    nombre,
                    item.quantity,
                    formatCurrency(item.pvp),
                    formatCurrency(item.pvp * item.quantity)
                ]
            });
            
            if (hito.portes > 0) {
                 body.push([
                    { content: `${T.logistics} (${hito.portes} ${hito.portes > 1 ? T.portes : T.porte})`, styles: { fontStyle: 'bold' } },
                    '',
                    formatCurrency(costePorte),
                    formatCurrency(portesHito)
                ]);
            }

            autoTable(doc, {
                head: [[T.item, T.qty, T.unitPrice, T.subtotal]],
                body: body,
                startY: finalY,
                theme: 'grid',
                headStyles: { fillColor: '#f3f4f6', textColor: '#374151', fontStyle: 'bold' },
                styles: { fontSize: 8 },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 5;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`${T.deliveryTotal}: ${formatCurrency(hitoTotal)}`, pageWidth - margin, finalY, { align: 'right' });
            finalY += 15;
        }

        // --- RESUMEN FINAL ---
        if (finalY + 45 > pageHeight) { doc.addPage(); finalY = margin; }

        const totalProductos = pvpTotalHitos - totalLogisticsCost;
        const baseImponible = pvpTotalHitos;
        const iva = baseImponible * 0.10; // Asumiendo 10% para simplificar
        const totalFinal = baseImponible + iva;

        const summaryData = [
            [T.productsSubtotal, formatCurrency(totalProductos)],
            [T.logisticsSubtotal, formatCurrency(totalLogisticsCost)],
            [{ content: T.taxableBase, styles: { fontStyle: 'bold' } }, { content: formatCurrency(baseImponible), styles: { fontStyle: 'bold' } }],
            [`${T.vat} (10%)`, formatCurrency(iva)],
            [{ content: T.total, styles: { fontStyle: 'bold', fontSize: 12, textColor: '#f97316' } }, { content: formatCurrency(totalFinal), styles: { fontStyle: 'bold', fontSize: 12, textColor: '#f97316' } }]
        ];

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#1f2937');
        doc.text(T.summaryTitle, margin, finalY);
        finalY += 8;

        autoTable(doc, {
            body: summaryData,
            startY: finalY,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1 },
            columnStyles: { 1: { halign: 'right' } }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        // --- FOOTER ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor('#6b7280');
            doc.text(`${T.footer} - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }


        doc.save(`Propuesta_${os.serviceNumber}.pdf`);

    } catch (error) {
        console.error("Error al generar el PDF:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la propuesta en PDF.' });
    } finally {
        setIsPrinting(false);
    }
  };


  if (!isMounted) {
    return <LoadingSkeleton title={isEditing ? 'Editando Pedido...' : 'Nuevo Pedido...'} />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Pedido de Entrega</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/entregas/pes')}>Cancelar</Button>
            {isEditing && (
                <>
                 <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Printer className="mr-2"/>Propuesta Comercial</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generar Propuesta Comercial</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-center">
                            <p className="mb-4">Selecciona el idioma para la propuesta:</p>
                            <div className="flex justify-center gap-4">
                                <Button onClick={() => { handlePrintProposal('es'); setShowProposalDialog(false); }} disabled={isPrinting}>
                                    {isPrinting ? <Loader2 className="animate-spin"/> : 'Español'}
                                </Button>
                                <Button onClick={() => { handlePrintProposal('en'); setShowProposalDialog(false); }} disabled={isPrinting}>
                                     {isPrinting ? <Loader2 className="animate-spin"/> : 'English'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/>Borrar</Button>
                </>
            )}
            <Button type="submit" form="entrega-form" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                {isEditing ? 'Guardar Cambios' : 'Guardar Pedido'}
            </Button>
        </div>
      </div>

      <div className="space-y-4">
             <FormProvider {...form}>
              <form id="entrega-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                    <CardHeader className="py-3 flex-row items-center justify-between">
                        <CardTitle className="text-xl">Información General del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <FormField control={control} name="serviceNumber" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Nº Pedido</FormLabel><FormControl><Input {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={control} name="startDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha Principal</FormLabel><Popover open={startDateOpen} onOpenChange={setStartDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setStartDateOpen(false); }} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="asistentes" render={({ field }) => (
                                <FormItem><FormLabel>Nº Asistentes</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="tarifa" render={({ field }) => (
                                <FormItem><FormLabel>Tarifa</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Empresa">Empresa</SelectItem><SelectItem value="IFEMA">IFEMA</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className={cn(getValues('status') === 'Confirmado' && 'bg-green-100 dark:bg-green-900 border-green-400', getValues('status') === 'Pendiente' && 'bg-yellow-100 dark:bg-yellow-800 border-yellow-400')}><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Borrador">Borrador</SelectItem><SelectItem value="Confirmado">Confirmado</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Entregado">Entregado</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                    
                       <Accordion type="single" defaultValue="cliente-info" collapsible className="w-full space-y-4 pt-3">
                          <AccordionItem value="cliente-info" className="border-none">
                          <Card>
                            <AccordionTrigger className="p-0"><ClienteTitle /></AccordionTrigger>
                            <ClientInfo />
                          </Card>
                          </AccordionItem>
                          <AccordionItem value="financial-info" className="border-none">
                            <Card>
                                 <AccordionTrigger className="p-0"><FinancialTitle pvpBruto={pvpTotalHitos} /></AccordionTrigger>
                                 <AccordionContent>
                                    <div className="p-4 pt-2 space-y-4">
                                      <div className="flex flex-wrap items-center gap-4">
                                          <FormField control={control} name="agencyPercentage" render={({ field }) => (<FormItem><FormLabel>Comisión Agencia (%)</FormLabel><FormControl><Input type="number" {...field} className="w-28"/></FormControl></FormItem>)} />
                                          <FormField control={control} name="agencyCommissionValue" render={({ field }) => (<FormItem><FormLabel>Comisión Agencia (€)</FormLabel><FormControl><Input type="number" {...field} className="w-28"/></FormControl></FormItem>)} />
                                          <FormField control={control} name="spacePercentage" render={({ field }) => (<FormItem><FormLabel>Canon Espacio (%)</FormLabel><FormControl><Input type="number" {...field} className="w-28" readOnly={tarifa === 'IFEMA'} /></FormControl></FormItem>)} />
                                          <FormField control={control} name="spaceCommissionValue" render={({ field }) => (<FormItem><FormLabel>Canon Espacio (€)</FormLabel><FormControl><Input type="number" {...field} className="w-28"/></FormControl></FormItem>)} />
                                      </div>
                                    </div>
                                 </AccordionContent>
                            </Card>
                        </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
                
              </form>
            </FormProvider>
            
            {isEditing && (
              <>
                <Card>
                    <CardHeader className="flex-row justify-between items-center py-3">
                        <CardTitle className="text-lg">Entregas del Pedido</CardTitle>
                        <HitoDialog onSave={handleSaveHito} os={getValues()}>
                            <Button>
                                <PlusCircle className="mr-2"/>
                                Añadir Entrega
                            </Button>
                        </HitoDialog>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {hitos.map((hito, index) => (
                            <Card key={hito.id} className="hover:bg-secondary/50">
                                <CardHeader className="p-3 flex-row justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="font-bold text-base">
                                            <span className="text-primary">{`${getValues('serviceNumber') || 'Pedido'}.${(index + 1).toString().padStart(2, '0')}`}</span> - {hito.lugarEntrega}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{hito.localizacion}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(hito.fecha), "PPP", { locale: es })} - {hito.hora}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-lg text-green-600">
                                            {formatCurrency(calculateHitoTotal(hito))}
                                        </div>
                                        <Button asChild size="sm">
                                            <Link href={`/entregas/entrega/${hito.id}?osId=${id}`}>
                                                Confeccionar
                                            </Link>
                                        </Button>
                                         <HitoDialog onSave={handleSaveHito} initialData={hito} os={getValues()}>
                                            <Button size="sm" variant="ghost"><Pencil className="h-4 w-4"/></Button>
                                         </HitoDialog>
                                        <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => {e.stopPropagation(); handleDeleteHito(index)}}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                        {hitos.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">No hay entregas definidas para este pedido.</div>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex-row justify-between items-center py-3">
                        <CardTitle className="text-lg">Transporte</CardTitle>
                        <TransporteDialog onSave={handleSaveTransporte} osId={id} hitos={hitos} existingTransportOrders={transporteOrders} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Entrega(s)</TableHead><TableHead>Proveedor</TableHead><TableHead>Coste</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {transporteOrders.length > 0 ? transporteOrders.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(t.hitosIds || []).map(hId => {
                                                    const hito = hitos.find(h => h.id === hId);
                                                    return <Badge key={hId} variant="outline">{hito?.lugarEntrega}</Badge>
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>{t.proveedorNombre}</TableCell>
                                        <TableCell>{formatCurrency(t.precio)}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">Ver</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No hay transportes asignados.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
              </>
            )}
        </div>
      
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará permanentemente el pedido de entrega y todos sus datos asociados (confección, transportes, etc.).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}

