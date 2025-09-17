'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';

import type { OrderItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';

const osFormSchema = z.object({
  serviceNumber: z.string().default(''),
  startDate: z.date({
    required_error: 'La fecha de inicio es obligatoria.',
  }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  contact: z.string().default(''),
  phone: z.string().default(''),
  finalClient: z.string().default(''),
  commercial: z.string().default(''),
  pax: z.coerce.number().optional(),
  endDate: z.date({
    required_error: 'La fecha de fin es obligatoria.',
  }),
  space: z.string().default(''),
  spaceContact: z.string().default(''),
  spacePhone: z.string().default(''),
  respMetre: z.string().default(''),
  agencyPercentage: z.coerce.number().optional(),
  spacePercentage: z.coerce.number().optional(),
  uniformity: z.string().default(''),
  respCocina: z.string().default(''),
  plane: z.string().default(''),
  menu: z.string().default(''),
  dniList: z.string().default(''),
  sendTo: z.string().default(''),
  comments: z.string().default(''),
});

type OsFormValues = z.infer<typeof osFormSchema>;

export default function OsPage() {
  const [order, setOrder] = useState<{ items: OrderItem[]; contractNumber: string, total: number, days: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues: {
      pax: 0,
      agencyPercentage: 0,
      spacePercentage: 0
    }
  });

  useEffect(() => {
    // This code runs only on the client
    const savedOrder = localStorage.getItem('currentOrder');
    if (savedOrder) {
      const parsedOrder = JSON.parse(savedOrder);
      setOrder(parsedOrder);
      form.setValue('serviceNumber', parsedOrder.contractNumber);
       // We don't want to clear it, so the user can refresh
       // localStorage.removeItem('currentOrder');
    }

    const currentServiceNumber = (new Date()).getFullYear() + '-';
    form.setValue('serviceNumber', currentServiceNumber);

  }, [form]);

  function onSubmit(data: OsFormValues) {
    setIsLoading(true);
    console.log({ ...data, order });
    
    setTimeout(() => {
      toast({
        title: 'Orden de Servicio Generada',
        description: 'Se ha simulado la generación de la OS. Revisa la consola.',
      });
      setIsLoading(false);
    }, 1500)
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-headline font-bold">Orden de Servicio de Evento</h1>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
                <span className="ml-2">Generar OS</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Datos del Servicio</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Row 1 */}
                <FormField control={form.control} name="serviceNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº Servicio</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Inicio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                )} />
                <FormField control={form.control} name="client" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="finalClient" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente Final</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="commercial" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comercial</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="com1">Comercial 1</SelectItem>
                        <SelectItem value="com2">Comercial 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                
                {/* Row 2 */}
                <FormField control={form.control} name="pax" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAX</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Fin</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                )} />
                <FormField control={form.control} name="space" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espacio</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="spaceContact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto Espacio</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="spacePhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tlf. Espacio</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="respMetre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resp. Metre</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="metre1">Metre 1</SelectItem>
                        <SelectItem value="metre2">Metre 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                
                {/* Row 3 and 4 */}
                 <FormField control={form.control} name="agencyPercentage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Agencia</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={form.control} name="spacePercentage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Espacio</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <div className="flex items-end">
                    <p className="font-bold text-lg">NETA: <span>{(order?.total ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></p>
                </div>
                 <FormField control={form.control} name="uniformity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uniformidad</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="uniform1">Uniforme 1</SelectItem>
                        <SelectItem value="uniform2">Uniforme 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="respCocina" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resp. Cocina</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cocina1">Cocinero 1</SelectItem>
                        <SelectItem value="cocina2">Cocinero 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="plane" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={form.control} name="menu" render={({ field }) => (
                  <FormItem>
                    <FormLabel>P. de Menú</FormLabel>
                    <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="dniList" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listado DNI</FormLabel>
                    <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={form.control} name="sendTo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enviar A</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="dest1">Destinatario 1</SelectItem>
                        <SelectItem value="dest2">Destinatario 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="comments" render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-4">
                        <FormLabel>Comentarios</FormLabel>
                        <FormControl><Textarea rows={4} {...field} /></FormControl>
                    </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Briefing del Evento (Pedido de Material)</CardTitle>
                </CardHeader>
                <CardContent>
                    {order && order.items.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-muted/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Descripción</th>
                                        <th scope="col" className="px-6 py-3">Uds</th>
                                        <th scope="col" className="px-6 py-3">Precio</th>
                                        <th scope="col" className="px-6 py-3">Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map(item => (
                                        <tr key={item.itemCode} className="border-b">
                                            <td className="px-6 py-4 font-medium">{item.description}</td>
                                            <td className="px-6 py-4">{item.quantity}</td>
                                            <td className="px-6 py-4">{item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                            <td className="px-6 py-4">{(item.price * item.quantity).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-semibold">
                                        <td colSpan={2}></td>
                                        <td className="px-6 py-3 text-right">Días de alquiler:</td>
                                        <td className="px-6 py-3">{order.days}</td>
                                    </tr>
                                    <tr className="font-semibold text-lg">
                                        <td colSpan={2}></td>
                                        <td className="px-6 py-3 text-right">Total Pedido:</td>
                                        <td className="px-6 py-3">{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            No hay ningún pedido de material asociado. Ve a la página principal para crear uno.
                        </p>
                    )}
                </CardContent>
            </Card>

          </form>
        </FormProvider>
      </main>
    </>
  );
}
