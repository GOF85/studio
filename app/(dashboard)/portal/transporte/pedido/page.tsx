

'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Truck, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, TransporteOrder } from '@/types';
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

import { useEvento, useTransporteOrders, useTiposTransporte, useProveedoresTransporte } from '@/hooks/use-data-queries';
import { useCreateTransporteOrder, useUpdateTransporteOrder } from '@/hooks/mutations/use-transporte-mutations';

const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  tipoTransporteId: z.string().min(1, 'Debes seleccionar un tipo de transporte'),
  lugarRecogida: z.string().min(1, 'El lugar de recogida es obligatorio'),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, 'El lugar de entrega es obligatorio'),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  observaciones: z.string().optional(),
  status: z.enum(['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'] as const).default('Pendiente'),
});

type TransporteOrderFormValues = z.infer<typeof transporteOrderSchema>;

function PedidoTransportePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const osId = searchParams.get('osId') || '';
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const { data: serviceOrder, isLoading: loadingOS } = useEvento(osId);
  const { data: allTiposTransporte = [], isLoading: loadingTipos } = useProveedoresTransporte();
  const { data: allTransportOrders = [], isLoading: loadingOrders } = useTransporteOrders();
  
  const createMutation = useCreateTransporteOrder();
  const updateMutation = useUpdateTransporteOrder();
  
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const existingOrder = useMemo(() => 
    isEditing ? allTransportOrders.find(o => o.id === orderId) : null
  , [isEditing, allTransportOrders, orderId]);

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
    if (isEditing && existingOrder) {
      form.reset({
        fecha: new Date(existingOrder.fecha),
        tipoTransporteId: existingOrder.proveedorId, // In this context, proveedorId seems to store the tipoTransporte ID or similar
        lugarRecogida: existingOrder.lugarRecogida,
        horaRecogida: existingOrder.horaRecogida,
        lugarEntrega: existingOrder.lugarEntrega,
        horaEntrega: existingOrder.horaEntrega,
        observaciones: existingOrder.observaciones || '',
        status: existingOrder.status,
      });
    } else if (serviceOrder) {
      form.reset({
        fecha: serviceOrder.startDate ? new Date(serviceOrder.startDate) : new Date(),
        lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
        horaRecogida: '09:00',
        lugarEntrega: serviceOrder.spaceAddress || serviceOrder.space || '',
        horaEntrega: serviceOrder.deliveryTime || '10:00',
        status: 'Pendiente',
      });
    }
  }, [isEditing, existingOrder, serviceOrder, form]);

  const selectedTipoId = form.watch('tipoTransporteId');
  const selectedTipo = useMemo(() => {
    return allTiposTransporte.find(t => t.id === selectedTipoId);
  }, [selectedTipoId, allTiposTransporte]);

  const onSubmit = async (data: TransporteOrderFormValues) => {
    if (!osId || !selectedTipo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const finalOrderData = {
      osId,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedTipo.id,
      proveedorNombre: selectedTipo.nombre,
      tipoTransporte: selectedTipo.nombre,
      precio: selectedTipo.precio_base || 0,
      lugarRecogida: data.lugarRecogida,
      horaRecogida: data.horaRecogida,
      lugarEntrega: data.lugarEntrega,
      horaEntrega: data.horaEntrega,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    try {
      if (isEditing && orderId) {
        await updateMutation.mutateAsync({
          id: orderId,
          updates: finalOrderData
        });
        toast({ title: "Pedido actualizado" });
      } else {
        await createMutation.mutateAsync(finalOrderData as any);
        toast({ title: "Pedido de transporte creado" });
      }
      router.push(`/os/${osId}/transporte`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el pedido.' });
    }
  };

  if (loadingOS || loadingTipos || loadingOrders) {
    return <LoadingSkeleton title="Cargando Pedido de Transporte..." />;
  }

  if (!serviceOrder) {
      return <div className="p-8 text-center">No se encontró la Orden de Servicio</div>;
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
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            <Save className="mr-2" /> 
                            {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar Pedido'}
                        </Button>
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
                             <FormField control={form.control} name="tipoTransporteId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Transporte</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {allTiposTransporte.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Precio Base</FormLabel>
                                <FormControl>
                                    <Input value={selectedTipo ? (selectedTipo.precio_base || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
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

export default function PedidoTransportePage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <PedidoTransportePageInner />
        </Suspense>
    );
}
