
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, FilePlus, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import type { AtipicoOrder } from '@/types';
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
import { Combobox } from '@/components/ui/combobox';
import { useEvento } from '@/hooks/use-data-queries';
import { useAtipicos } from '@/hooks/use-atipicos';

const statusOptions: AtipicoOrder['status'][] = ['Pendiente', 'Aprobado', 'Rechazado'];

const atipicoOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  observaciones: z.string().optional(),
  precio: z.coerce.number().min(0.01, 'El precio debe ser mayor que cero'),
  status: z.enum(['Pendiente', 'Aprobado', 'Rechazado'] as const).default('Pendiente'),
});

type AtipicoOrderFormValues = z.infer<typeof atipicoOrderSchema>;

function PedidoAtipicoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const osId = searchParams.get('osId') || '';
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const { toast } = useToast();
  const { data: evento, isLoading: loadingOS } = useEvento(osId);
  const { atipicos, catalogo, isLoading: loadingAtipicos, createAtipico, updateAtipico, addToCatalogo } = useAtipicos(evento?.id || '');

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<AtipicoOrderFormValues>({
    resolver: zodResolver(atipicoOrderSchema),
    defaultValues: {
      id: '',
      fecha: new Date(),
      concepto: '',
      observaciones: '',
      precio: 0,
      status: 'Pendiente',
    }
  });

  const { setValue, watch, reset } = form;
  const selectedConcepto = watch('concepto');

  useEffect(() => {
    if (isEditing && atipicos.length > 0) {
      const order = atipicos.find(o => o.id === orderId);
      if (order) {
        reset({
          ...order,
          fecha: new Date(order.fecha),
        });
      }
    } else if (!isEditing && evento) {
      reset({
        id: 'temp',
        fecha: evento.startDate ? new Date(evento.startDate) : new Date(),
        status: 'Pendiente',
        precio: 0,
        concepto: '',
        observaciones: '',
      });
    }
  }, [osId, orderId, isEditing, atipicos, evento, reset]);

  useEffect(() => {
    const dbItem = catalogo.find(item => item.concepto.toLowerCase() === selectedConcepto?.toLowerCase());
    if (dbItem) {
      setValue('precio', dbItem.precio);
    }
  }, [selectedConcepto, catalogo, setValue]);

  const atipicosOptions = useMemo(() => {
    return catalogo.map(item => ({ label: item.concepto, value: item.concepto }));
  }, [catalogo]);

  const onSubmit = async (data: AtipicoOrderFormValues) => {
    if (!evento?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      return;
    }

    try {
        // Check if the concept is new. If so, add it to the DB.
        const isNewConcept = !catalogo.some(item => item.concepto.toLowerCase() === data.concepto.toLowerCase());
        if (isNewConcept) {
            await addToCatalogo.mutateAsync({
                concepto: data.concepto,
                precio: data.precio,
            });
            toast({ title: "Concepto nuevo guardado", description: `"${data.concepto}" se ha añadido al catálogo.` });
        }

        const finalOrder = {
          ...data,
          fecha: format(data.fecha, 'yyyy-MM-dd'),
          osId: evento.id,
        };

        if (isEditing && orderId) {
          await updateAtipico.mutateAsync({ ...finalOrder, id: orderId, osId: evento.id });
        } else {
            const { id, ...newOrder } = finalOrder;
          await createAtipico.mutateAsync(newOrder as any);
        }
        
        router.push(`/os/${osId}/atipicos`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (loadingOS || loadingAtipicos) {
    return <LoadingSkeleton title="Cargando Gasto Atípico..." />;
  }

  if (!evento) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">No se ha encontrado la Orden de Servicio.</p>
        <Button onClick={() => router.push('/os')}>Volver a OS</Button>
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/atipicos`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />{isEditing ? 'Editar' : 'Nuevo'} Gasto Atípico</h1>
                        <p className="text-muted-foreground">Para la OS: {evento.serviceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/atipicos`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createAtipico.isPending || updateAtipico.isPending}>
                            {(createAtipico.isPending || updateAtipico.isPending) ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
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
                                        options={atipicosOptions}
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
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
}

export default function PedidoAtipicoPage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <PedidoAtipicoPageInner />
    </Suspense>
  );
}
