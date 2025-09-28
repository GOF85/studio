

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Trash2, Package, Save, X, Truck } from 'lucide-react';

import type { Entrega, ProductoVenta, PedidoEntrega, PedidoEntregaItem, TransporteOrder } from '@/types';
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
import { DeliveryOrderSummary } from '@/components/entregas/delivery-order-summary';
import { UnifiedItemCatalog } from '@/components/entregas/unified-item-catalog';
import { Separator } from '@/components/ui/separator';

export const entregaFormSchema = z.object({
  serviceNumber: z.string().min(1, 'El Nº de Pedido es obligatorio'),
  startDate: z.date({ required_error: 'La fecha es obligatoria.' }),
  deliveryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  asistentes: z.coerce.number().min(1, 'El número de asistentes es obligatorio.'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  finalClient: z.string().optional().default(''),
  spaceAddress: z.string().optional().default(''),
  status: z.enum(['Borrador', 'Confirmado', 'Enviado', 'Entregado']).default('Borrador'),
});

export type EntregaFormValues = z.infer<typeof entregaFormSchema>;

const defaultValues: Partial<EntregaFormValues> = {
  serviceNumber: '', 
  client: '', 
  asistentes: 1,
  contact: '',
  phone: '',
  finalClient: '',
  spaceAddress: '',
  status: 'Borrador',
  deliveryTime: '09:00',
};

export default function EntregaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transportOrderExists, setTransportOrderExists] = useState(false);
  const { toast } = useToast();
  
  const [productosVenta, setProductosVenta] = useState<ProductoVenta[]>([]);
  const [deliveryItems, setDeliveryItems] = useState<PedidoEntregaItem[]>([]);
  
  const form = useForm<EntregaFormValues>({
    resolver: zodResolver(entregaFormSchema),
    defaultValues,
  });

  useEffect(() => {
    // Load catalogs
    const allProductos = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    setProductosVenta(allProductos);
    
    // Load existing order data if editing
    if (isEditing) {
      const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
      const currentEntrega = allEntregas.find(e => e.id === id);
      
      const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
      const currentPedido = allPedidosEntrega.find(p => p.osId === id);

      if (currentEntrega) {
        form.reset({
            ...defaultValues,
            ...currentEntrega,
            startDate: new Date(currentEntrega.startDate),
        });
        setDeliveryItems(currentPedido?.items || []);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el pedido de entrega.' });
        router.push('/entregas/pes');
      }

      const allTransportOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      setTransportOrderExists(allTransportOrders.some(t => t.osId === id));

    } else {
      form.reset({
          ...defaultValues,
          startDate: new Date(),
      });
      setDeliveryItems([]);
    }
    setIsMounted(true);
  }, [id, isEditing, form, router, toast]);

  const handleAddItem = (item: ProductoVenta, quantity: number) => {
    const costeComponentes = item.componentes.reduce((sum, comp) => sum + comp.coste * comp.cantidad, 0);

    setDeliveryItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
            return prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + quantity} : i);
        }
        return [...prev, {
            id: item.id,
            nombre: item.nombre,
            quantity: quantity,
            pvp: item.pvp,
            coste: costeComponentes,
            categoria: item.categoria,
        }];
    })
  }

  function onSubmit(data: EntregaFormValues) {
    setIsLoading(true);
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    let message = '';
    let currentId = isEditing ? id : Date.now().toString();

    const entregaData: Entrega = {
        ...data,
        id: currentId,
        startDate: data.startDate.toISOString(),
        endDate: data.startDate.toISOString(),
        vertical: 'Entregas',
    }
    
    const pedidoEntregaData: PedidoEntrega = {
        osId: currentId,
        items: deliveryItems,
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
    router.push('/entregas/pes');
  }

  const handleDelete = () => {
    if (!isEditing) return;
    
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    allEntregas = allEntregas.filter(e => e.id !== id);
    localStorage.setItem('entregas', JSON.stringify(allEntregas));

    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    allPedidosEntrega = allPedidosEntrega.filter(p => p.osId !== id);
    localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));

    toast({ title: 'Pedido eliminado' });
    router.push('/entregas/pes');
  };

  const handleAssignTransport = () => {
    if (!isEditing) return;
    const currentEntrega = form.getValues();
    const newTransportOrder: Omit<TransporteOrder, 'proveedorId' | 'proveedorNombre' | 'tipoTransporte' | 'precio'> = {
        id: Date.now().toString(),
        osId: id,
        fecha: currentEntrega.startDate.toISOString(),
        lugarRecogida: 'Almacén Central MICE',
        horaRecogida: '09:00', // Default
        lugarEntrega: currentEntrega.spaceAddress || currentEntrega.client,
        horaEntrega: currentEntrega.deliveryTime,
        observaciones: `Entrega para ${currentEntrega.client}. Contacto: ${currentEntrega.contact} (${currentEntrega.phone})`,
        status: 'Pendiente',
    }
    // This will be completed in the transport module
    const transportOrderToSave = {
      ...newTransportOrder,
      proveedorId: '',
      proveedorNombre: 'Asignación Pendiente',
      tipoTransporte: '',
      precio: 0
    }

    const allTransportOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    allTransportOrders.push(transportOrderToSave);
    localStorage.setItem('transporteOrders', JSON.stringify(allTransportOrders));
    
    setTransportOrderExists(true);
    toast({ title: 'Transporte Asignado', description: 'El pedido ha sido enviado al módulo de transporte para su gestión.' });
  }

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
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/>Borrar</Button>
          )}
          <Button type="submit" form="entrega-form" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Guardar Pedido'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8">
        <div className="space-y-4">
             <Form {...form}>
              <form id="entrega-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Información del Pedido</CardTitle>
                        {isEditing && (
                            <Button 
                                type="button" 
                                variant={transportOrderExists ? "secondary" : "default"}
                                onClick={handleAssignTransport}
                                disabled={transportOrderExists}
                            >
                                <Truck className="mr-2"/> 
                                {transportOrderExists ? 'Transporte Asignado' : 'Asignar Transporte'}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name="serviceNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº Pedido</FormLabel><FormControl><Input {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="startDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel>
                                    <Popover><PopoverTrigger asChild>
                                        <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button></FormControl>
                                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                                <FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                                <FormItem><FormLabel>Hora Entrega</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Borrador">Borrador</SelectItem><SelectItem value="Confirmado">Confirmado</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Entregado">Entregado</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="client" render={({ field }) => (
                                <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="finalClient" render={({ field }) => (
                                <FormItem><FormLabel>Cliente Final</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                             <FormField control={form.control} name="contact" render={({ field }) => (
                                <FormItem><FormLabel>Contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                              <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                             <FormField control={form.control} name="spaceAddress" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Dirección de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                             <FormField control={form.control} name="asistentes" render={({ field }) => (
                                <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>
              </form>
            </Form>
            <UnifiedItemCatalog items={productosVenta} onAddItem={handleAddItem} />
        </div>
        <div>
            <DeliveryOrderSummary items={deliveryItems} onUpdateItems={setDeliveryItems} />
        </div>
      </div>
      
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará permanentemente el pedido de entrega.
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
