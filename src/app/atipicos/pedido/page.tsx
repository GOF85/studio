'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, FilePlus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import type { ServiceOrder, AtipicoDBItem, AtipicoOrder } from '@/types';
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
import { Combobox } from '@/components/ui/combobox';

const statusOptions: AtipicoOrder['status'][] = ['Pendiente', 'Aprobado', 'Rechazado'];

const atipicoOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  observaciones: z.string().optional(),
  precio: z.coerce.number().min(0.01, 'El precio debe ser mayor que cero'),
  status: z.enum(statusOptions).default('Pendiente'),
});

type AtipicoOrderFormValues = z.infer<typeof atipicoOrderSchema>;

export default function PedidoAtipicoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [atipicosDB, setAtipicosDB] = useState<AtipicoDBItem[]>([]);
  const { toast } = useToast();

  const form = useForm<AtipicoOrderFormValues>({
    resolver: zodResolver(atipicoOrderSchema),
  });

  const { setValue, watch } = form;
  const selectedConcepto = watch('concepto');

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const dbItems = JSON.parse(localStorage.getItem('atipicosDB') || '[]') as AtipicoDBItem[];
    setAtipicosDB(dbItems);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        status: 'Pendiente',
        precio: 0,
        concepto: '',
        observaciones: '',
      });
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  useEffect(() => {
    const dbItem = atipicosDB.find(item => item.concepto.toLowerCase() === selectedConcepto?.toLowerCase());
    if (dbItem) {
      setValue('precio', dbItem.precio);
    }
  }, [selectedConcepto, atipicosDB, setValue]);

  const atipicosOptions = useMemo(() => {
    return atipicosDB.map(item => ({ label: item.concepto, value: item.concepto }));
  }, [atipicosDB]);

  const onSubmit = (data: AtipicoOrderFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    // Check if the concept is new. If so, add it to the DB.
    const isNewConcept = !atipicosDB.some(item => item.concepto.toLowerCase() === data.concepto.toLowerCase());
    if (isNewConcept) {
      const newDBItem: AtipicoDBItem = {
        id: Date.now().toString(),
        concepto: data.concepto,
        precio: data.precio,
      };
      const updatedDB = [...atipicosDB, newDBItem];
      localStorage.setItem('atipicosDB', JSON.stringify(updatedDB));
      setAtipicosDB(updatedDB);
      toast({ title: "Concepto nuevo guardado", description: `"${data.concepto}" se ha añadido a la base de datos.` });
    }

    const allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    
    const finalOrder: AtipicoOrder = {
      ...data,
      osId,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = finalOrder;
        toast({ title: "Gasto actualizado" });
      }
    } else {
      allOrders.push(finalOrder);
      toast({ title: "Gasto atípico creado" });
    }

    localStorage.setItem('atipicoOrders', JSON.stringify(allOrders));
    
    setTimeout(() => {
        setIsLoading(false);
        router.push(`/atipicos?osId=${osId}`);
    }, 500);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Gasto Atípico..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/atipicos?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />{isEditing ? 'Editar' : 'Nuevo'} Gasto Atípico</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                        Guardar Gasto
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Gasto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del Gasto</FormLabel>
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
