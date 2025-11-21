

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Espacio, ComercialBriefing, ComercialBriefingItem, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { differenceInMinutes, parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOsData } from '@/hooks/use-os-data';
import { calculateHours, formatCurrency } from '@/lib/utils';
import { personalMiceSchema } from '@/types';

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const formSchema = z.object({
    personal: z.array(personalMiceSchema)
})

type PersonalMiceFormValues = z.infer<typeof formSchema>;


export default function PersonalMiceFormPage() {
  const params = useParams();
  const osId = params.id as string;
  const { serviceOrder, spaceAddress, briefing, isLoading: isOsDataLoading } = useOsData(osId);
  
  const [personalDB, setPersonalDB] = useState<Personal[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue, getValues, formState } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "personal",
  });
  
 const handlePersonalChange = useCallback((index: number, name: string) => {
    if (!name) return;
    const person = personalDB.find(p => p.nombreCompleto === name);
    if (person) {
      setValue(`personal.${index}.nombre`, person.nombreCompleto, { shouldDirty: true });
      setValue(`personal.${index}.dni`, person.dni || '', { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true });
    } else {
       setValue(`personal.${index}.nombre`, name, { shouldDirty: true });
    }
  }, [personalDB, setValue]);
  
  const watchedFields = useWatch({ control, name: 'personal' });

 const { totalPlanned, totalReal } = useMemo(() => {
    if (!watchedFields) return { totalPlanned: 0, totalReal: 0 };
    
    const totals = watchedFields.reduce((acc, order) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
        acc.planned += plannedHours * (order.precioHora || 0);
        
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        acc.real += realHours * (order.precioHora || 0);
        
        return acc;
    }, { planned: 0, real: 0 });

    return { totalPlanned: totals.planned, totalReal: totals.real };
  }, [watchedFields]);

  const loadData = useCallback(() => {
     if (!osId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
        return;
    }
    
    try {
        const dbPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalDB(dbPersonal);
        
        const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
        const relatedOrders = allOrders.filter(order => order.osId === osId);
        form.reset({ personal: relatedOrders });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    }
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: PersonalMiceFormValues) => {
    setIsSubmitting(true);
    
    const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const otherOsOrders = allOrders.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalMiceOrder[] = data.personal.map(p => ({ ...p, osId }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal MICE guardado', description: 'Todos los cambios han sido guardados.' });
        setIsSubmitting(false);
        form.reset(data); // Resets form with new values, marking it as not dirty
    }, 500);
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        centroCoste: 'SALA',
        nombre: '',
        dni: '',
        tipoServicio: 'Servicio',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        precioHora: 0,
        horaEntradaReal: '',
        horaSalidaReal: '',
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Asignación eliminada' });
    }
  };

  const personalOptions = useMemo(() => {
    return personalDB.map(p => ({ label: p.nombreCompleto, value: p.nombreCompleto }));
  }, [personalDB]);

  if (isOsDataLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />;
  }

  return (
    <>
      <main>
       <FormProvider {...form}>
        <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-between mb-6">
                 <Card className="flex-grow">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 font-semibold">
                            <Building className="h-5 w-5" /> 
                            <span>{serviceOrder?.space}</span>
                            {spaceAddress && <span className="font-normal">({spaceAddress})</span>}
                        </div>
                        <Separator orientation="vertical" className="h-6"/>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> 
                            <span className="font-semibold">Resp. Metre:</span>
                            <span>{serviceOrder?.respMetre}</span>
                            {serviceOrder?.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {serviceOrder?.respMetrePhone}</span>}
                        </div>
                    </div>
                  </CardContent>
                </Card>
                 <div className="flex gap-2 ml-4">
                    <Button type="submit" disabled={isSubmitting || !formState.isDirty}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
            </div>
            
             <Accordion type="single" collapsible className="w-full mb-4" >
                <AccordionItem value="item-1">
                <Card>
                    <AccordionTrigger className="p-4">
                        <h3 className="text-xl font-semibold">Servicios del Evento</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                    <CardContent className="pt-0">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="py-2 px-3">Fecha</TableHead>
                            <TableHead className="py-2 px-3">Descripción</TableHead>
                            <TableHead className="py-2 px-3">Asistentes</TableHead>
                            <TableHead className="py-2 px-3">Duración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(briefing?.items || []).length > 0 ? briefing?.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.horaInicio}</TableCell>
                                <TableCell className="py-2 px-3">{item.descripcion}</TableCell>
                                <TableCell className="py-2 px-3">{item.asistentes}</TableCell>
                                <TableCell className="py-2 px-3">{calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h</TableCell>
                            </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </AccordionContent>
                </Card>
                </AccordionItem>
            </Accordion>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Personal Asignado</CardTitle>
                    <Button type="button" onClick={addRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Personal
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-2">Centro Coste</TableHead>
                                    <TableHead className="px-2 py-2">Nombre</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead colSpan={2} className="text-center border-r px-2 py-2">Real</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-2 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-2 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                    <TableHead className="w-24">H. Entrada</TableHead>
                                    <TableHead className="border-r w-24">H. Salida</TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.centroCoste`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 min-w-40">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.nombre`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={personalOptions}
                                                        value={field.value}
                                                        onChange={(value) => handlePersonalChange(index, value)}
                                                        placeholder="Nombre..."
                                                    />
                                                </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.tipoServicio`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="border-l px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntrada`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalida`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.precioHora`}
                                                render={({ field }) => <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-20 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntradaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalidaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right px-2 py-1">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {fields.length > 0 && (
                    <CardFooter>
                         <Card className="w-full md:w-1/2 ml-auto">
                            <CardHeader><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Planificado:</span>
                                    <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Real:</span>
                                    <span className="font-bold">{formatCurrency(totalReal)}</span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación:</span>
                                    <span className={totalReal - totalPlanned > 0 ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(totalReal - totalPlanned)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </CardFooter>
                )}
            </Card>
        </form>
       </FormProvider>

        <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará la asignación de personal de la tabla.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteRow}
                >
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
