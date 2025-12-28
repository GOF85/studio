

'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Flower2, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import type { DecoracionDBItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { useEvento, useDecoracionOrders, useCreateDecoracionOrder, useUpdateDecoracionOrder, useDecoracionCatalogo } from '@/hooks/use-data-queries';


const decoracionOrderSchema = z.object({
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  precio: z.coerce.number().min(0.01, 'El precio debe ser mayor que cero'),
  observaciones: z.string().optional(),
});

type DecoracionOrderFormValues = z.infer<typeof decoracionOrderSchema>;

function PedidoDecoracionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const osId = searchParams.get('osId') || '';
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const { toast } = useToast();
  const { data: evento, isLoading: loadingOS } = useEvento(osId);
  const { data: decoracionOrders = [], isLoading: loadingOrders } = useDecoracionOrders(evento?.id || osId);
  const { data: decoracionCatalogo = [], isLoading: loadingCatalogo } = useDecoracionCatalogo();
  const createOrder = useCreateDecoracionOrder();
  const updateOrder = useUpdateDecoracionOrder();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<DecoracionOrderFormValues>({
    resolver: zodResolver(decoracionOrderSchema),
    defaultValues: {
        fecha: new Date(),
        concepto: '',
        precio: 0,
        observaciones: '',
    }
  });

  const { setValue, watch, reset } = form;
  const selectedConcepto = watch('concepto');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    if (isEditing) {
      if (decoracionOrders.length > 0) {
        const order = decoracionOrders.find(o => o.id === orderId);
        if (order) {
          setIsInitialized(true);
          reset({
            concepto: order.concepto,
            precio: order.precio,
            observaciones: order.observaciones || '',
            fecha: new Date(order.fecha),
          });
        }
      }
    } else if (evento) {
      setIsInitialized(true);
      reset({
        fecha: evento.startDate ? new Date(evento.startDate) : new Date(),
        precio: 0,
        concepto: '',
        observaciones: '',
      });
    }
  }, [isEditing, decoracionOrders, orderId, evento, reset, isInitialized]);

  // Reset initialization when orderId or osId changes
  useEffect(() => {
    setIsInitialized(false);
  }, [osId, orderId]);

  useEffect(() => {
    const dbItem = decoracionCatalogo.find((item: any) => item.nombre.toLowerCase() === selectedConcepto?.toLowerCase());
    if (dbItem) {
      setValue('precio', dbItem.precio_referencia);
    }
  }, [selectedConcepto, setValue, decoracionCatalogo]);

  const decoracionOptions = useMemo(() => {
    return decoracionCatalogo.map((item: any) => ({ label: item.nombre, value: item.nombre }));
  }, [decoracionCatalogo]);

  const onSubmit = async (data: DecoracionOrderFormValues) => {
    try {
        const payload = {
            ...data,
            osId: osId,
            fecha: format(data.fecha, 'yyyy-MM-dd'),
        };

        if (isEditing && orderId) {
            await updateOrder.mutateAsync({ ...payload, id: orderId });
            toast({ title: "Gasto actualizado" });
        } else {
            await createOrder.mutateAsync(payload);
            toast({ title: "Gasto de decoración creado" });
        }
        router.push(`/os/${osId}/decoracion`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (loadingOS || loadingOrders) {
    return <LoadingSkeleton title="Cargando Gasto de Decoración..." />;
  }

  if (!evento && !loadingOS) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4 font-bold text-lg">No se ha encontrado la Orden de Servicio.</p>
        <p className="text-muted-foreground mb-6 text-sm">ID/Número buscado: <span className="font-mono bg-muted px-2 py-1 rounded">{osId || 'Ninguno'}</span></p>
        <Button onClick={() => router.push('/os')}>Volver a OS</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/decoracion`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Flower2 />{isEditing ? 'Editar' : 'Nuevo'} Gasto de Decoración</h1>
                        <p className="text-muted-foreground">Para la OS: {evento?.serviceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/decoracion`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createOrder.isPending || updateOrder.isPending}>
                            {(createOrder.isPending || updateOrder.isPending) ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                            Guardar Gasto
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Gasto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Entrega/Necesidad</FormLabel>
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
                            <FormField control={form.control} name="concepto" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Concepto</FormLabel>
                                    <Combobox
                                        options={decoracionOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Busca o crea un concepto..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="precio" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
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
  );
}

export default function PedidoDecoracionPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
      <PedidoDecoracionPageInner />
    </Suspense>
  );
}
