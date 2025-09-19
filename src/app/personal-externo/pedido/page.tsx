'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, UserPlus, Calendar as CalendarIcon, X, PlusCircle, Trash2 } from 'lucide-react';
import type { ServiceOrder, ProveedorPersonal, PersonalExternoOrder } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const itemSchema = z.object({
      id: z.string(),
      proveedorId: z.string().min(1, 'Obligatorio'),
      precioHora: z.number(),
      cantidad: z.coerce.number().min(1),
});

const personalExternoSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  centroCoste: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe haber al menos un artículo'),
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
      horaEntrada: '09:00',
      horaSalida: '17:00',
      centroCoste: 'SALA',
      tipoServicio: 'Servicio',
      items: [],
    }
  });

  const { control, watch, setValue } = form;
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch('items');

  const totalPedido = useMemo(() => {
    const horas = (new Date(`1970-01-01T${watch('horaSalida')}`).getTime() - new Date(`1970-01-01T${watch('horaEntrada')}`).getTime()) / (1000 * 60 * 60);
    const validHours = horas > 0 ? horas : 0;
    return watchedItems.reduce((acc, item) => acc + (item.cantidad * item.precioHora * validHours), 0);
  }, [watchedItems, watch]);

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

  const handleProviderChange = (index: number, proveedorId: string) => {
    const selected = proveedoresDB.find(p => p.id === proveedorId);
    if(selected) {
        update(index, {
            id: selected.id,
            proveedorId: selected.id,
            precioHora: selected.precioHora,
            cantidad: watchedItems[index].cantidad || 1,
        });
    }
  }

  const addRow = () => {
    append({
        id: '',
        proveedorId: '',
        precioHora: 0,
        cantidad: 1,
    });
  }

  const onSubmit = (data: PersonalExternoFormValues) => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    
    data.items.forEach(item => {
        const providerEntry = proveedoresDB.find(p => p.id === item.proveedorId);
        if (!providerEntry) return;

        const finalOrder: PersonalExternoOrder = {
          id: `${data.id}-${item.id}`,
          osId,
          proveedorId: item.proveedorId,
          categoria: providerEntry.categoria,
          cantidad: item.cantidad,
          precioHora: item.precioHora,
          fecha: format(data.fecha, 'yyyy-MM-dd'),
          horaEntrada: data.horaEntrada,
          horaSalida: data.horaSalida,
          centroCoste: data.centroCoste,
          tipoServicio: data.tipoServicio,
          observaciones: data.observaciones || '',
        };
        allOrders.push(finalOrder);
    });
    
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

                <div className="grid lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos Generales del Servicio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FormField control={form.control} name="fecha" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha</FormLabel>
                                        <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                                        </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="horaEntrada" render={({ field }) => (
                                    <FormItem><FormLabel>Hora Entrada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="horaSalida" render={({ field }) => (
                                    <FormItem><FormLabel>Hora Salida</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
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
                                <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Artículos del Pedido</CardTitle>
                             <Button type="button" variant="outline" onClick={addRow}><PlusCircle className="mr-2" />Añadir Artículo</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Proveedor - Categoría</TableHead>
                                    <TableHead>€/Hora</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? (
                                    fields.map((field, index) => {
                                        const horas = (new Date(`1970-01-01T${watch('horaSalida')}`).getTime() - new Date(`1970-01-01T${watch('horaEntrada')}`).getTime()) / (1000 * 60 * 60);
                                        const subtotal = (watch(`items.${index}.cantidad`) * watch(`items.${index}.precioHora`)) * (horas > 0 ? horas : 0);
                                       return (
                                        <TableRow key={field.id}>
                                            <TableCell className="min-w-[250px]">
                                                 <FormField
                                                    control={control}
                                                    name={`items.${index}.proveedorId`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={(value) => { field.onChange(value); handleProviderChange(index, value); }} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {proveedoresDB.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.categoria}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>{watch(`items.${index}.precioHora`).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={control}
                                                    name={`items.${index}.cantidad`}
                                                    render={({ field }) => <FormItem><FormControl><Input type="number" min="1" {...field} className="w-20" /></FormControl></FormItem>}
                                                />
                                            </TableCell>
                                            <TableCell>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} type="button">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                    ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No hay artículos en el pedido.</TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </div>
                            {form.formState.errors.items?.message && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.message}</p>}
                        </CardContent>
                        {fields.length > 0 && (
                            <CardFooter className="flex justify-end">
                                <div className="text-xl font-bold">Total Pedido: {totalPedido.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                            </CardFooter>
                        )}
                    </Card>

                </div>
            </form>
        </Form>
      </main>
    </>
  );
}
