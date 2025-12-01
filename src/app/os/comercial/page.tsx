

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, useWatch, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Pencil, DollarSign, Check } from 'lucide-react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, TipoServicio, ComercialAjuste } from '@/types';
import { osFormSchema, type OsFormValues } from '@/app/os/[id]/info/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Combobox } from '@/components/ui/combobox';

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
  importeFijo: z.coerce.number().optional().default(0),
});

type BriefingItemFormValues = z.infer<typeof briefingItemSchema>;

const financialSchema = osFormSchema.pick({
  agencyPercentage: true,
  spacePercentage: true,
  agencyCommissionValue: true,
  spaceCommissionValue: true,
});

type FinancialFormValues = z.infer<typeof financialSchema>;

function FinancialCalculator({ totalFacturacion, onNetChange }: { totalFacturacion: number, onNetChange: (net: number) => void }) {
  const { control } = useFormContext();
  const agencyPercentage = useWatch({ control, name: 'agencyPercentage' });
  const spacePercentage = useWatch({ control, name: 'spacePercentage' });

  const facturacionNeta = useMemo(() => {
    const totalPercentage = (agencyPercentage || 0) + (spacePercentage || 0);
    const net = totalFacturacion * (1 - totalPercentage / 100);
    return net;
  }, [totalFacturacion, agencyPercentage, spacePercentage]);

  useEffect(() => {
    onNetChange(facturacionNeta);
  }, [facturacionNeta, onNetChange]);


  return (
    <FormItem className="mt-auto invisible">
      <FormLabel className="text-lg">Facturación Neta</FormLabel>
      <FormControl>
        <Input
          readOnly
          value={facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          className="font-bold text-primary h-12 text-xl"
        />
      </FormControl>
    </FormItem>
  );
}

export default function ComercialPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
  const [ajustes, setAjustes] = useState<ComercialAjuste[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<ComercialBriefingItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);

  const nuevoAjusteConceptoRef = useRef<HTMLInputElement>(null);
  const nuevoAjusteImporteRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const totalBriefing = useMemo(() => {
    return briefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
  }, [briefing]);

  const totalAjustes = useMemo(() => {
    return ajustes.reduce((acc, ajuste) => acc + ajuste.importe, 0);
  }, [ajustes]);

  const facturacionFinal = useMemo(() => totalBriefing + totalAjustes, [totalBriefing, totalAjustes]);

  const financialForm = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      agencyPercentage: 0,
      spacePercentage: 0,
      agencyCommissionValue: 0,
      spaceCommissionValue: 0,
    }
  });

  const watchedAgencyPercentage = financialForm.watch('agencyPercentage');
  const watchedSpacePercentage = financialForm.watch('spacePercentage');
  const watchedAgencyValue = financialForm.watch('agencyCommissionValue');
  const watchedSpaceValue = financialForm.watch('spaceCommissionValue');

  const facturacionNeta = useMemo(() => {
    const agencyCommission = (facturacionFinal * (watchedAgencyPercentage || 0) / 100) + (watchedAgencyValue || 0);
    const spaceCommission = (facturacionFinal * (watchedSpacePercentage || 0) / 100) + (watchedSpaceValue || 0);
    return facturacionFinal - agencyCommission - spaceCommission;
  }, [facturacionFinal, watchedAgencyPercentage, watchedSpacePercentage, watchedAgencyValue, watchedSpaceValue]);


  const saveFinancials = useCallback(() => {
    if (!serviceOrder) return;

    const data = financialForm.getValues();
    const agencyCommission = (facturacionFinal * (data.agencyPercentage || 0) / 100) + (data.agencyCommissionValue || 0);
    const spaceCommission = (facturacionFinal * (data.spacePercentage || 0) / 100) + (data.spaceCommissionValue || 0);

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const index = allServiceOrders.findIndex(os => os.id === osId);
    if (index !== -1) {
      allServiceOrders[index] = {
        ...allServiceOrders[index],
        facturacion: facturacionFinal,
        agencyPercentage: data.agencyPercentage,
        spacePercentage: data.spacePercentage,
        agencyCommissionValue: data.agencyCommissionValue,
        spaceCommissionValue: data.spaceCommissionValue,
        comisionesAgencia: agencyCommission,
        comisionesCanon: spaceCommission,
      };
      localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
      setServiceOrder(allServiceOrders[index]);
    }
  }, [serviceOrder, osId, facturacionFinal, financialForm]);

  useEffect(() => {
    const loadTiposServicio = async () => {
      try {
        const { data } = await supabase
          .from('tipos_servicio_briefing')
          .select('*')
          .order('nombre');

        if (data) {
          setTiposServicio(data.map(t => ({ id: t.id, servicio: t.nombre })));
        }
      } catch (error) {
        console.error('Error loading service types:', error);
      }
    };
    loadTiposServicio();

    const allAjustes = JSON.parse(localStorage.getItem('comercialAjustes') || '{}') as { [key: string]: ComercialAjuste[] };

    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      if (currentOS) {
        setServiceOrder(currentOS);
        financialForm.reset({
          agencyPercentage: currentOS.agencyPercentage || 0,
          spacePercentage: currentOS.spacePercentage || 0,
          agencyCommissionValue: currentOS.agencyCommissionValue || 0,
          spaceCommissionValue: currentOS.spaceCommissionValue || 0,
        });
      } else {
        router.push('/pes');
      }

      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      setBriefing(currentBriefing || { osId, items: [] });

      setAjustes(allAjustes[osId] || []);
    }
    setIsMounted(true);
  }, [osId, router, financialForm]);

  useEffect(() => {
    if (serviceOrder && facturacionFinal !== serviceOrder.facturacion) {
      saveFinancials();
    }
  }, [facturacionFinal, serviceOrder, saveFinancials]);

  const sortedBriefingItems = useMemo(() => {
    if (!briefing?.items) return [];
    return [...briefing.items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      if (dateComparison !== 0) return dateComparison;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [briefing]);

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
    saveFinancials();
    toast({ title: 'Datos financieros actualizados' });
  };

  const handleRowClick = (item: ComercialBriefingItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleNewClick = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
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

  const saveAjustes = (newAjustes: ComercialAjuste[]) => {
    if (!osId) return;
    const allAjustes = JSON.parse(localStorage.getItem('comercialAjustes') || '{}');
    allAjustes[osId] = newAjustes;
    localStorage.setItem('comercialAjustes', JSON.stringify(allAjustes));
    setAjustes(newAjustes);
  };

  const handleAddAjuste = () => {
    const concepto = nuevoAjusteConceptoRef.current?.value;
    const importe = nuevoAjusteImporteRef.current?.value;

    if (!concepto || !importe) {
      toast({ variant: 'destructive', title: 'Error', description: 'El concepto y el importe son obligatorios.' });
      return;
    }
    const newAjustes = [...ajustes, { id: Date.now().toString(), concepto, importe: parseFloat(importe) }];
    saveAjustes(newAjustes);

    if (nuevoAjusteConceptoRef.current) nuevoAjusteConceptoRef.current.value = '';
    if (nuevoAjusteImporteRef.current) nuevoAjusteImporteRef.current.value = '';
  };

  const handleDeleteAjuste = (id: string) => {
    const newAjustes = ajustes.filter(a => a.id !== id);
    saveAjustes(newAjustes);
  }

  const handleAddLocation = (newLocation: string) => {
    if (!serviceOrder) return;

    const updatedOS = {
      ...serviceOrder,
      deliveryLocations: [...(serviceOrder.deliveryLocations || []), newLocation]
    };

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const osIndex = allServiceOrders.findIndex(os => os.id === serviceOrder.id);

    if (osIndex !== -1) {
      allServiceOrders[osIndex] = updatedOS;
      localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
      setServiceOrder(updatedOS);
      toast({ title: 'Localización añadida', description: `Se ha guardado "${newLocation}" en la Orden de Servicio.` })
    }
  }

  const BriefingItemDialog = ({ open, onOpenChange, item, onSave, serviceOrder, onAddLocation }: { open: boolean, onOpenChange: (open: boolean) => void, item: Partial<ComercialBriefingItem> | null, onSave: (data: BriefingItemFormValues) => boolean, serviceOrder: ServiceOrder | null, onAddLocation: (location: string) => void }) => {
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
        asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
        precioUnitario: item?.precioUnitario || 0,
        importeFijo: item?.importeFijo || 0,
      }
    });

    useEffect(() => {
      form.reset({
        id: item?.id || '',
        fecha: item?.fecha || (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
        horaInicio: item?.horaInicio || '09:00',
        horaFin: item?.horaFin || '10:00',
        conGastronomia: item?.conGastronomia || false,
        descripcion: item?.descripcion || '',
        comentarios: item?.comentarios || '',
        sala: item?.sala || '',
        asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
        precioUnitario: item?.precioUnitario || 0,
        importeFijo: item?.importeFijo || 0,
      })
    }, [item, serviceOrder, form])


    const asistentes = form.watch('asistentes');
    const precioUnitario = form.watch('precioUnitario');
    const importeFijo = form.watch('importeFijo');
    const total = useMemo(() => (asistentes * precioUnitario) + (importeFijo || 0), [asistentes, precioUnitario, importeFijo]);

    const locationOptions = useMemo(() => {
      return serviceOrder?.deliveryLocations?.map(loc => ({ label: loc, value: loc })) || [];
    }, [serviceOrder]);

    const handleLocationChange = (value: string) => {
      const isNew = !locationOptions.some(opt => opt.value === value);
      if (isNew && value) {
        onAddLocation(value);
      }
      form.setValue('sala', value, { shouldDirty: true });
    }

    const onSubmit = (data: BriefingItemFormValues) => {
      if (onSave(data)) {
        onOpenChange(false);
        form.reset();
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{item ? 'Editar' : 'Nuevo'} Hito del Briefing</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="fecha" render={({ field }) => <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="horaInicio" render={({ field }) => <FormItem><FormLabel>Hora Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="horaFin" render={({ field }) => <FormItem><FormLabel>Hora Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="sala" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sala</FormLabel>
                    <Combobox
                      options={locationOptions}
                      value={field.value || ''}
                      onChange={handleLocationChange}
                      placeholder="Busca o crea una sala..."
                      searchPlaceholder="Buscar sala..."
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="asistentes" render={({ field }) => <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input placeholder="Nº Asistentes" type="number" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="precioUnitario" render={({ field }) => <FormItem><FormLabel>Precio Unitario</FormLabel><FormControl><Input placeholder="Precio Unitario" type="number" step="0.01" {...field} /></FormControl></FormItem>} />
                <FormField control={form.control} name="importeFijo" render={({ field }) => <FormItem><FormLabel>Importe Fijo</FormLabel><FormControl><Input placeholder="Importe Fijo" type="number" step="0.01" {...field} /></FormControl></FormItem>} />
                <FormItem>
                  <FormLabel>Total</FormLabel>
                  <FormControl>
                    <Input readOnly value={total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} />
                  </FormControl>
                </FormItem>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={form.control} name="descripcion" render={({ field }) => (
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
                    <FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!m-0">
                        Con gastronomía
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="comentarios" render={({ field }) => <FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea placeholder="Comentarios" {...field} /></FormControl></FormItem>} />
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
    return <LoadingSkeleton title="Cargando Módulo Comercial..." />;
  }

  return (
    <>
      <FormProvider {...financialForm}>
        <Accordion type="single" collapsible className="w-full mb-4">
          <AccordionItem value="item-1">
            <Card>
              <AccordionTrigger className="p-2">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-base flex items-center gap-2 px-2"><DollarSign />Información Financiera y Ajustes</CardTitle>
                  <div className="text-sm font-bold pr-4">
                    <span className="text-black dark:text-white">Facturación Neta: </span>
                    <span className="text-green-600">{facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid lg:grid-cols-2 gap-4 p-4 pt-0">
                  <form onChange={() => financialForm.handleSubmit(handleSaveFinancials)()} className="flex flex-col space-y-2">
                    <h3 className="text-base font-semibold border-b pb-1">Información Financiera</h3>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <FormItem>
                        <FormLabel className="text-xs">Fact. Briefing</FormLabel>
                        <FormControl><Input readOnly value={totalBriefing.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="h-8 text-sm" /></FormControl>
                      </FormItem>
                      <FormItem>
                        <FormLabel className="text-xs">Facturación Final</FormLabel>
                        <FormControl><Input readOnly value={facturacionFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="h-8 text-sm" /></FormControl>
                      </FormItem>
                      <FormField control={financialForm.control} name="agencyPercentage" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">% Agencia</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={financialForm.control} name="agencyCommissionValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Comisión Agencia (€)</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={financialForm.control} name="spacePercentage" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">% Espacio</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={financialForm.control} name="spaceCommissionValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Canon Espacio (€)</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-8 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </form>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold border-b pb-1">Ajustes a la Facturación</h3>
                    <div className="border rounded-lg">
                      <Table>
                        <TableBody>
                          {ajustes.map(ajuste => (
                            <TableRow key={ajuste.id}>
                              <TableCell className="font-medium p-1 text-sm">{ajuste.concepto}</TableCell>
                              <TableCell className="text-right p-1 text-sm">{ajuste.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                              <TableCell className="w-12 text-right p-0 pr-1">
                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteAjuste(ajuste.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="p-1">
                              <Input ref={nuevoAjusteConceptoRef} placeholder="Nuevo concepto" className="h-8 text-xs" />
                            </TableCell>
                            <TableCell className="text-right p-1">
                              <Input ref={nuevoAjusteImporteRef} type="number" step="0.01" placeholder="Importe" className="text-right h-8 w-24 text-xs" />
                            </TableCell>
                            <TableCell className="text-right p-1">
                              <Button type="button" onClick={handleAddAjuste} size="sm" className="h-8 text-xs">Añadir</Button>
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      </FormProvider>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Briefing del Contrato</CardTitle>
          <Button onClick={handleNewClick}><PlusCircle className="mr-2" /> Nuevo Hito</Button>
        </CardHeader>
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
                  <TableHead>Imp. Fijo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefingItems.length > 0 ? (
                  sortedBriefingItems.map(item => (
                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
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
                      <TableCell>{(item.importeFijo || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                      <TableCell>{((item.asistentes * item.precioUnitario) + (item.importeFijo || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      No hay hitos en el briefing. Añade uno para empezar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <BriefingItemDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} item={editingItem} onSave={handleSaveItem} serviceOrder={serviceOrder} onAddLocation={handleAddLocation} />
    </>
  );
}
