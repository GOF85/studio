
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, UserPlus, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, ProveedorPersonal, PersonalExternoOrder } from '@/types';
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

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalExternoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor y categoría'),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  centroCoste: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional(),
});

type PersonalExternoFormValues = z.infer<typeof personalExternoSchema>;

export default function PedidoPersonalExternoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  
  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [proveedoresDB, setProveedoresDB] = useState<ProveedorPersonal[]>([]);
  const { toast } = useToast();

  const form = useForm<PersonalExternoFormValues>({
    resolver: zodResolver(personalExternoSchema),
    defaultValues: {
      id: Date.now().toString(),
      cantidad: 1,
      horaEntrada: '09:00',
      horaSalida: '17:00',
      centroCoste: 'SALA',
      tipoServicio: 'Servicio',
    }
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const dbItems = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]') as ProveedorPersonal[];
    setProveedoresDB(dbItems);
    
    if (currentOS?.startDate) {
        form.setValue('fecha', new Date(currentOS.startDate));
    }
    
    setIsMounted(true);
  }, [osId, form]);

  const selectedProviderEntryId = form.watch('proveedorId');
  const selectedProviderEntry = useMemo(() => {
    return proveedoresDB.find(p => p.id === selectedProviderEntryId);
  }, [selectedProviderEntryId, proveedoresDB]);

  const onSubmit = (data: PersonalExternoFormValues) => {
    if (!osId || !selectedProviderEntry) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    
    const finalOrder: PersonalExternoOrder = {
      ...data,
      osId,
      categoria: selectedProviderEntry.categoria,
      precioHora: selectedProviderEntry.precioHora,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      observaciones: data.observaciones || '',
    };
    
    allOrders.push(finalOrder);
    localStorage.setItem('personalExternoOrders', JSON.stringify(allOrders));

    toast({ title: "Pedido de personal externo creado" });
    router.push(`/personal-externo?osId=${osId}`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Personal Externo..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/personal-externo?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><UserPlus />Nuevo Pedido de Personal Externo</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/personal-externo?osId=${osId}`)}>
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
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                           <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem className="lg:col-span-2">
                                    <FormLabel>Proveedor y Categoría</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {proveedoresDB.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.categoria}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormItem>
                                <FormLabel>Precio / Hora</FormLabel>
                                <FormControl><Input value={selectedProviderEntry ? selectedProviderEntry.precioHora.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly /></FormControl>
                            </FormItem>
                             <FormField control={form.control} name="cantidad" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cantidad</FormLabel>
                                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha</FormLabel>
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
                             <FormField control={form.control} name="horaEntrada" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora Entrada</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaSalida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora Salida</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField control={form.control} name="centroCoste" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Centro de Coste</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="tipoServicio" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Servicio</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
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
    </>
  );
}
