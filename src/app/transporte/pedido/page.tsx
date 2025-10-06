

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Truck, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, ProveedorTransporte, TransporteOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  lugarRecogida: z.string().min(1, 'El lugar de recogida es obligatorio'),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, 'El lugar de entrega es obligatorio'),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
});

type TransporteOrderFormValues = z.infer<typeof transporteOrderSchema>;

export default function PedidoTransportePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorTransporte[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<TransporteOrderFormValues>({
    resolver: zodResolver(transporteOrderSchema),
    defaultValues: {
      lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
      horaRecogida: '09:00',
      horaEntrega: '10:00',
      status: 'Pendiente',
    }
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allProveedores = (JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[])
        .filter(p => p.tipo === 'Catering');
    setProveedores(allProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          observaciones: order.observaciones || '',
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        proveedorId: '',
        lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
        horaRecogida: '09:00',
        lugarEntrega: currentOS?.spaceAddress || currentOS?.space || '',
        horaEntrega: currentOS?.deliveryTime || '10:00',
        observaciones: '',
        status: 'Pendiente',
      })
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const selectedProviderId = form.watch('proveedorId');
  const selectedProvider = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  const onSubmit = (data: TransporteOrderFormValues) => {
    if (!osId || !selectedProvider) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    
    const finalOrder: Omit<TransporteOrder, 'id' | 'osId'> = {
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProvider.id,
      proveedorNombre: selectedProvider.nombreProveedor,
      tipoTransporte: selectedProvider.tipoTransporte,
      precio: selectedProvider.precio,
      lugarRecogida: data.lugarRecogida,
      horaRecogida: data.horaRecogida,
      lugarEntrega: data.lugarEntrega,
      horaEntrega: data.horaEntrega,
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
      allOrders.push({ id: data.id, osId, ...finalOrder });
      toast({ title: "Pedido de transporte creado" });
    }

    localStorage.setItem('transporteOrders', JSON.stringify(allOrders));
    router.push(`/os/${osId}/transporte`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Transporte..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/transporte`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Transporte</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/transporte`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
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
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCalendarOpen(false);}} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor y Tipo de Transporte</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.tipoTransporte}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl>
                                    <Input value={selectedProvider ? selectedProvider.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
                                </FormControl>
                            </FormItem>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="lugarRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Recogida</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Recogida</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Entrega</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Entrega</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="observaciones" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Observaciones para la Carga</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        {isEditing && 
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        }
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
}
