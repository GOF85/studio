'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Snowflake, Calendar as CalendarIcon } from 'lucide-react';
import type { ServiceOrder, ProveedorHielo, HieloOrder } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

const statusOptions: HieloOrder['status'][] = ['Pendiente', 'Confirmado', 'En reparto', 'Entregado'];

const hieloOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  productoId: z.string().min(1, 'Debes seleccionar un producto'),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
});

type HieloOrderFormValues = z.infer<typeof hieloOrderSchema>;

export default function PedidoHieloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [allProveedores, setAllProveedores] = useState<ProveedorHielo[]>([]);
  const { toast } = useToast();

  const form = useForm<HieloOrderFormValues>({
    resolver: zodResolver(hieloOrderSchema),
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const storedProveedores = JSON.parse(localStorage.getItem('proveedorHielo') || '[]') as ProveedorHielo[];
    setAllProveedores(storedProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        const proveedor = storedProveedores.find(p => p.nombreProveedor === order.proveedorNombre);
        const producto = proveedor?.producto === order.producto ? proveedor.id : '';
        form.reset({
          id: order.id,
          fecha: new Date(order.fecha),
          proveedorId: proveedor?.id,
          productoId: producto,
          cantidad: order.cantidad,
          observaciones: order.observaciones,
          status: order.status,
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        status: 'Pendiente',
        cantidad: 1,
      });
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const selectedProviderId = form.watch('proveedorId');
  const selectedProductId = form.watch('productoId');
  const cantidad = form.watch('cantidad');

  const uniqueProveedores = useMemo(() => {
      const providerNames = new Set<string>();
      return allProveedores.filter(p => {
          if (providerNames.has(p.nombreProveedor)) {
              return false;
          }
          providerNames.add(p.nombreProveedor);
          return true;
      });
  }, [allProveedores]);

  const productosDelProveedor = useMemo(() => {
    const providerName = allProveedores.find(p => p.id === selectedProviderId)?.nombreProveedor;
    if (!providerName) return [];
    return allProveedores.filter(p => p.nombreProveedor === providerName);
  }, [selectedProviderId, allProveedores]);

  const selectedProduct = useMemo(() => {
      return allProveedores.find(p => p.id === selectedProductId);
  }, [selectedProductId, allProveedores]);

  const total = useMemo(() => {
      if (!selectedProduct || !cantidad) return 0;
      return selectedProduct.precio * cantidad;
  }, [selectedProduct, cantidad]);
  
  useEffect(() => {
    form.setValue('productoId', '');
  }, [selectedProviderId, form]);

  const onSubmit = (data: HieloOrderFormValues) => {
    if (!osId || !selectedProduct) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    
    const finalOrder: HieloOrder = {
      id: data.id,
      osId,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProviderId,
      proveedorNombre: selectedProduct.nombreProveedor,
      producto: selectedProduct.producto,
      precio: selectedProduct.precio,
      cantidad: data.cantidad,
      total: total,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...finalOrder };
        toast({ title: "Pedido actualizado" });
      }
    } else {
      allOrders.push(finalOrder);
      toast({ title: "Pedido de hielo creado" });
    }

    localStorage.setItem('hieloOrders', JSON.stringify(allOrders));
    router.push(`/hielo?osId=${osId}`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Hielo..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/hielo?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Snowflake />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Hielo</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                    <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del Servicio</FormLabel>
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
                             <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {uniqueProveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField control={form.control} name="productoId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Producto</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProviderId}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {productosDelProveedor.map(p => <SelectItem key={p.id} value={p.id}>{p.producto}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl>
                                    <Input value={selectedProduct ? selectedProduct.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
                                </FormControl>
                            </FormItem>
                            <FormField control={form.control} name="cantidad" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad</FormLabel>
                                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Total</FormLabel>
                                <FormControl>
                                    <Input value={total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} readOnly />
                                </FormControl>
                            </FormItem>
                        </div>
                        
                         <FormField control={form.control} name="observaciones" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Observaciones</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
}
