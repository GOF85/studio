'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parse, differenceInMinutes } from 'date-fns';
import { ArrowLeft, Save, Users, X } from 'lucide-react';
import type { ServiceOrder, PersonalMiceOrder, Personal } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  centroCoste: z.enum(centroCosteOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

type PersonalMiceFormValues = z.infer<typeof personalMiceSchema>;

const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());
        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        return 0;
    }
}

export default function AsignacionPersonalMicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [personalDB, setPersonalDB] = useState<Personal[]>([]);
  const { toast } = useToast();

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(personalMiceSchema),
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const dbPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalDB(dbPersonal);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset(order);
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        centroCoste: 'SALA',
        tipoServicio: 'Servicio',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        precioHora: 0,
        horaEntradaReal: '',
        horaSalidaReal: '',
      });
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const personalOptions = useMemo(() => {
    return personalDB.map(p => ({ label: p.nombre, value: p.nombre }));
  }, [personalDB]);

  const { watch, setValue } = form;
  const selectedNombre = watch('nombre');
  const horaEntrada = watch('horaEntrada');
  const horaSalida = watch('horaSalida');
  const horaEntradaReal = watch('horaEntradaReal');
  const horaSalidaReal = watch('horaSalidaReal');
  const precioHora = watch('precioHora');

  const plannedHours = useMemo(() => calculateHours(horaEntrada, horaSalida), [horaEntrada, horaSalida]);
  const realHours = useMemo(() => calculateHours(horaEntradaReal, horaSalidaReal), [horaEntradaReal, horaSalidaReal]);
  const plannedTotal = plannedHours * precioHora;
  const realTotal = realHours * precioHora;

  useEffect(() => {
    const person = personalDB.find(p => p.nombre.toLowerCase() === selectedNombre?.toLowerCase());
    if (person) {
      setValue('dni', 'N/A'); // DNI field not in personal DB
    }
  }, [selectedNombre, personalDB, setValue]);

  const onSubmit = (data: PersonalMiceFormValues) => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    
    const finalOrder: PersonalMiceOrder = {
      ...data,
      osId,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = finalOrder;
        toast({ title: "Asignación actualizada" });
      }
    } else {
      allOrders.push(finalOrder);
      toast({ title: "Personal asignado correctamente" });
    }

    localStorage.setItem('personalMiceOrders', JSON.stringify(allOrders));
    router.push(`/personal-mice?osId=${osId}`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/personal-mice?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />{isEditing ? 'Editar' : 'Nueva'} Asignación de Personal</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/personal-mice?osId=${osId}`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Asignación</Button>
                    </div>
                </div>
                <div className="grid lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles de la Asignación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <FormField control={form.control} name="centroCoste" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Centro de Coste</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="tipoServicio" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Servicio</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="nombre" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Nombre</FormLabel>
                                    <Combobox options={personalOptions} value={field.value} onChange={field.onChange} placeholder="Busca o añade un nombre..." />
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="dni" render={({ field }) => (
                                <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="precioHora" render={({ field }) => (
                                <FormItem><FormLabel>Precio / Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Horarios y Costes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-medium mb-2">Planificado</h4>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="horaEntrada" render={({ field }) => (
                                            <FormItem><FormLabel>Hora Entrada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="horaSalida" render={({ field }) => (
                                            <FormItem><FormLabel>Hora Salida</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="flex justify-between items-center mt-3 text-sm border-t pt-3">
                                        <span className="text-muted-foreground">Nº Horas Planificadas:</span>
                                        <span className="font-semibold">{plannedHours.toFixed(2)}h</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-base">
                                        <span className="font-semibold">Total Planificado:</span>
                                        <span className="font-bold text-primary">{plannedTotal.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-medium mb-2">Real</h4>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="horaEntradaReal" render={({ field }) => (
                                            <FormItem><FormLabel>Hora Entrada Real</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="horaSalidaReal" render={({ field }) => (
                                            <FormItem><FormLabel>Hora Salida Real</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                     <div className="flex justify-between items-center mt-3 text-sm border-t pt-3">
                                        <span className="text-muted-foreground">Nº Horas Reales:</span>
                                        <span className="font-semibold">{realHours.toFixed(2)}h</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-base">
                                        <span className="font-semibold">Total Real:</span>
                                        <span className="font-bold text-primary">{realTotal.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </Form>
      </main>
    </>
  );
}
