'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Briefcase, Save, Pencil, X, Check } from 'lucide-react';
import { format, differenceInMinutes, parse } from 'date-fns';

import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, TipoServicio } from '@/types';
import { osFormSchema, OsFormValues } from '@/app/os/page';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const briefingItemSchema = z.object({
  id: z.string(),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  conGastronomia: z.boolean().default(false),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  comentarios: z.string().optional(),
  sala: z.string().optional(),
  asistentes: z.coerce.number().min(0),
  precioUnitario: z.coerce.number().min(0),
  bebidas: z.string().optional(),
  matBebida: z.string().optional(),
  materialGastro: z.string().optional(),
  manteleria: z.string().optional(),
});

type BriefingItemFormValues = z.infer<typeof briefingItemSchema>;

const financialSchema = osFormSchema.pick({
    facturacion: true,
    agencyPercentage: true,
    spacePercentage: true,
});

type FinancialFormValues = z.infer<typeof financialSchema>;

function FinancialCalculator() {
  const facturacion = useWatch({ name: 'facturacion' });
  const agencyPercentage = useWatch({ name: 'agencyPercentage' });
  const spacePercentage = useWatch({ name: 'spacePercentage' });

  const facturacionNeta = useMemo(() => {
    const totalPercentage = (agencyPercentage || 0) + (spacePercentage || 0);
    return (facturacion || 0) * (1 - totalPercentage / 100);
  }, [facturacion, agencyPercentage, spacePercentage]);

  return (
    <FormItem>
      <FormLabel>Facturación Neta</FormLabel>
      <FormControl>
        <Input
          readOnly
          value={facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          className="font-bold text-primary"
        />
      </FormControl>
    </FormItem>
  );
}


export default function ComercialPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<ComercialBriefingItem | null>(null);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const financialForm = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
        facturacion: 0,
        agencyPercentage: 0,
        spacePercentage: 0,
    }
  });

  useEffect(() => {
    setIsMounted(true);
    const storedTipos = localStorage.getItem('tipoServicio');
    if (storedTipos) {
      setTiposServicio(JSON.parse(storedTipos));
    }

    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);
      if (currentOS) {
        financialForm.reset({
            facturacion: currentOS.facturacion,
            agencyPercentage: currentOS.agencyPercentage,
            spacePercentage: currentOS.spacePercentage
        });
      }

      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      setBriefing(currentBriefing || { osId, items: [] });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
  }, [osId, router, toast, financialForm]);

  const saveBriefing = (newBriefing: ComercialBriefing) => {
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const index = allBriefings.findIndex(b => b.osId === osId);
    if (index !== -1) {
      allBriefings[index] = newBriefing;
    } else {
      allBriefings.push(newBriefing);
    }
    localStorage.setItem('comercialBriefings', JSON.stringify(allBriefings));
    setBriefing(newBriefing);
  };
  
  const handleSaveFinancials = (data: FinancialFormValues) => {
    if (!serviceOrder) return;
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const index = allServiceOrders.findIndex(os => os.id === osId);
    if (index !== -1) {
        allServiceOrders[index] = { ...allServiceOrders[index], ...data };
        localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
        setServiceOrder(allServiceOrders[index]);
        toast({ title: 'Datos financieros actualizados' });
    }
  };


  const handleSaveItem = (data: BriefingItemFormValues) => {
    if (!briefing) return;
    let newItems;
    if (editingItem) {
      newItems = briefing.items.map(item => item.id === editingItem.id ? data : item);
      toast({ title: 'Hito actualizado' });
    } else {
      newItems = [...briefing.items, { ...data, id: Date.now().toString() }];
      toast({ title: 'Hito añadido' });
    }
    saveBriefing({ ...briefing, items: newItems });
    setEditingItem(null);
    return true; // Indicate success to close dialog
  };

  const handleDeleteItem = (itemId: string) => {
    if (!briefing) return;
    const newItems = briefing.items.filter(item => item.id !== itemId);
    saveBriefing({ ...briefing, items: newItems });
    toast({ title: 'Hito eliminado' });
  };
  
  const calculateDuration = (start: string, end: string) => {
    try {
      const startTime = parse(start, 'HH:mm', new Date());
      const endTime = parse(end, 'HH:mm', new Date());
      const diff = differenceInMinutes(endTime, startTime);
      if (diff < 0) return 'N/A';
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const BriefingItemDialog = ({ item, onSave }: { item: Partial<ComercialBriefingItem> | null, onSave: (data: BriefingItemFormValues) => boolean }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<BriefingItemFormValues>({
      resolver: zodResolver(briefingItemSchema),
      defaultValues: {
        id: item?.id || '',
        fecha: item?.fecha || (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
        horaInicio: item?.horaInicio || '09:00',
        horaFin: item?.horaFin || '10:00',
        conGastronomia: item?.conGastronomia || false,
        descripcion: item?.descripcion || '',
        comentarios: item?.comentarios || '',
        sala: item?.sala || '',
        asistentes: item?.asistentes || serviceOrder?.pax || 0,
        precioUnitario: item?.precioUnitario || 0,
        bebidas: item?.bebidas || '',
        matBebida: item?.matBebida || '',
        materialGastro: item?.materialGastro || '',
        manteleria: item?.manteleria || '',
      }
    });

    const asistentes = form.watch('asistentes');
    const precioUnitario = form.watch('precioUnitario');
    const total = useMemo(() => asistentes * precioUnitario, [asistentes, precioUnitario]);
    
    const onSubmit = (data: BriefingItemFormValues) => {
      if (onSave(data)) {
        setOpen(false);
        form.reset();
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {item ? (
            <Button variant="ghost" size="icon" onClick={() => setEditingItem(item as ComercialBriefingItem)}><Pencil className="h-4 w-4" /></Button>
          ) : (
            <Button><PlusCircle className="mr-2" /> Nuevo Hito</Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{item ? 'Editar' : 'Nuevo'} Hito del Briefing</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="fecha" render={({field}) => <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> } />
                <FormField control={form.control} name="horaInicio" render={({field}) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> } />
                <FormField control={form.control} name="horaFin" render={({field}) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> } />
                <FormField control={form.control} name="sala" render={({field}) => <FormItem><FormLabel>Sala</FormLabel><FormControl><Input placeholder="Sala" {...field} /></FormControl></FormItem> } />
                <FormField control={form.control} name="asistentes" render={({field}) => <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input placeholder="Nº Asistentes" type="number" {...field} /></FormControl></FormItem> } />
                <FormField control={form.control} name="precioUnitario" render={({field}) => <FormItem><FormLabel>Precio Unitario</FormLabel><FormControl><Input placeholder="Precio Unitario" type="number" step="0.01" {...field} /></FormControl></FormItem> } />
                <FormItem>
                  <FormLabel>Total</FormLabel>
                  <FormControl>
                    <Input readOnly value={total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} />
                  </FormControl>
                </FormItem>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={form.control} name="descripcion" render={({field}) => (
                    <FormItem><FormLabel>Descripción</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo de servicio" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {tiposServicio.map(tipo => <SelectItem key={tipo.id} value={tipo.servicio}>{tipo.servicio}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormItem> 
                )} />
                <FormField
                    control={form.control}
                    name="conGastronomia"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>
                            Con gastronomía
                        </FormLabel>
                        </div>
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="comentarios" render={({field}) => <FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea placeholder="Comentarios" {...field} /></FormControl></FormItem> } />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="bebidas" render={({field}) => <FormItem><FormLabel>Bebidas</FormLabel><FormControl><Input placeholder="Bebidas" {...field} /></FormControl></FormItem> } />
                 <FormField control={form.control} name="matBebida" render={({field}) => <FormItem><FormLabel>Material Bebida</FormLabel><FormControl><Input placeholder="Material Bebida" {...field} /></FormControl></FormItem> } />
                 <FormField control={form.control} name="materialGastro" render={({field}) => <FormItem><FormLabel>Material Gastro</FormLabel><FormControl><Input placeholder="Material Gastro" {...field} /></FormControl></FormItem> } />
                 <FormField control={form.control} name="manteleria" render={({field}) => <FormItem><FormLabel>Mantelería</FormLabel><FormControl><Input placeholder="Mantelería" {...field} /></FormControl></FormItem> } />
              </div>

              <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                 <Button type="submit"><Save className="mr-2" /> Guardar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  }

  if (!isMounted || !serviceOrder) {
    return null; // or a loading skeleton
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
              <ArrowLeft className="mr-2" />
              Volver a la OS
            </Button>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase />Módulo Comercial</h1>
            <p className="text-muted-foreground">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
          </div>
          <BriefingItemDialog item={null} onSave={handleSaveItem} />
        </div>
        
        <FormProvider {...financialForm}>
            <form onSubmit={financialForm.handleSubmit(handleSaveFinancials)}>
                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Información Financiera</CardTitle>
                            <Button size="sm" type="submit"><Save className="mr-2 h-4 w-4"/> Guardar Cambios</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField control={financialForm.control} name="facturacion" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Facturación</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={financialForm.control} name="agencyPercentage" render={({ field }) => (
                                <FormItem>
                                <FormLabel>% Agencia</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={financialForm.control} name="spacePercentage" render={({ field }) => (
                                <FormItem>
                                <FormLabel>% Espacio</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                                </FormItem>
                            )} />
                            <FinancialCalculator />
                        </div>
                    </CardContent>
                </Card>
            </form>
        </FormProvider>

        <Card>
          <CardHeader><CardTitle>Briefing del Contrato</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Gastro</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Comentarios</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead>Asistentes</TableHead>
                    <TableHead>P.Unitario</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Bebidas</TableHead>
                    <TableHead>Mat. Bebida</TableHead>
                    <TableHead>Mat. Gastro</TableHead>
                    <TableHead>Mantelería</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {briefing?.items.length > 0 ? (
                    briefing.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{item.horaInicio}</TableCell>
                        <TableCell>{item.horaFin}</TableCell>
                        <TableCell>{calculateDuration(item.horaInicio, item.horaFin)}</TableCell>
                        <TableCell>{item.conGastronomia ? <Check className="h-4 w-4" /> : null}</TableCell>
                        <TableCell className="min-w-[200px]">{item.descripcion}</TableCell>
                        <TableCell className="min-w-[200px]">{item.comentarios}</TableCell>
                        <TableCell>{item.sala}</TableCell>
                        <TableCell>{item.asistentes}</TableCell>
                        <TableCell>{item.precioUnitario.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell>{(item.asistentes * item.precioUnitario).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell>{item.bebidas}</TableCell>
                        <TableCell>{item.matBebida}</TableCell>
                        <TableCell>{item.materialGastro}</TableCell>
                        <TableCell>{item.manteleria}</TableCell>
                        <TableCell className="text-right">
                          <BriefingItemDialog item={item} onSave={handleSaveItem} />
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={16} className="h-24 text-center">
                        No hay hitos en el briefing. Añade uno para empezar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
