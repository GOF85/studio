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
import { useEvento, useEspacios, useComercialBriefings, usePersonalMiceOrders, usePersonal } from '@/hooks/use-data-queries';
import { useSyncPersonalMiceAssignments } from '@/hooks/mutations/use-personal-mice-mutations';


const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

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

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  solicitadoPor: z.enum(solicitadoPorOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

const formSchema = z.object({
    personal: z.array(personalMiceSchema)
})

type PersonalMiceFormValues = z.infer<typeof formSchema>;

export default function PersonalMicePage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const osId = (params.id as string) || '';
  const { toast } = useToast();

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId);
  const { data: allEspacios = [] } = useEspacios();
  const { data: allBriefings = [] } = useComercialBriefings();
  const { data: personalMiceOrders = [], isLoading: isLoadingOrders } = usePersonalMiceOrders(osId);
  const { data: personalDB = [] } = usePersonal();
  const { mutateAsync: syncAssignments } = useSyncPersonalMiceAssignments();

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const spaceAddress = useMemo(() => {
    if (!serviceOrder?.space) return '';
    const currentSpace = allEspacios.find(e => e.nombre === serviceOrder.space);
    return currentSpace?.calle || '';
  }, [serviceOrder, allEspacios]);

  const briefingItems = useMemo(() => {
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    return currentBriefing?.items || [];
  }, [allBriefings, osId]);

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue, reset } = form;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "personal",
  });

  useEffect(() => {
    if (personalMiceOrders.length > 0) {
        reset({ personal: personalMiceOrders as any });
    }
    setIsMounted(true);
  }, [personalMiceOrders, reset]);

  const handlePersonalChange = useCallback((index: number, name: string) => {
    if (!name) return;
    const person = personalDB.find(p => p.nombre.toLowerCase() === name.toLowerCase());
    if (person) {
      setValue(`personal.${index}.nombre`, person.nombre, { shouldDirty: true });
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

  const onSubmit = async (data: PersonalMiceFormValues) => {
    setIsLoading(true);
    try {
        await syncAssignments({
            osId,
            assignments: data.personal.map(p => ({
                ...p,
                osId,
                centroCoste: (p as any).centroCoste || 'SALA'
            }))
        });
        toast({ title: 'Personal MICE guardado', description: 'Todos los cambios han sido guardados.' });
        reset(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        solicitadoPor: 'Sala',
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
    return personalDB.map(p => ({ label: p.nombre, value: p.nombre.toLowerCase() }));
  }, [personalDB]);

  if (!isMounted || isLoadingOS || isLoadingOrders) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />;
  }

  if (!serviceOrder) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h2 className="text-2xl font-bold">Orden de Servicio no encontrada</h2>
            <Button onClick={() => router.push('/os')} className="mt-4">Volver a la lista</Button>
        </div>
    );
  }

  return (
    <>
        <div className="flex items-start justify-end mb-4">
            <div className="flex gap-2">
                <Button type="submit" form="personal-form" disabled={isLoading || !form.formState.isDirty}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
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
                        {briefingItems.length > 0 ? briefingItems.map(item => (
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

       <FormProvider {...form}>
        <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)}>
             <Card className="mb-4">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Planificación de Personal</CardTitle>
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
                                    <TableHead className="px-2 py-2">Solicitado Por</TableHead>
                                    <TableHead className="px-2 py-2">Nombre</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-2 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-2 py-2 bg-muted/30 w-20">€/Hora</TableHead>
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
                                                name={`personal.${index}.solicitadoPor`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
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
                                        <TableCell className="text-right px-2 py-1">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader><CardTitle>Cierre y Horas Reales</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>H. Entrada Real</TableHead>
                                <TableHead>H. Salida Real</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-semibold">{field.nombre}</TableCell>
                                <TableCell>
                                    <FormField
                                        control={control}
                                        name={`personal.${index}.horaEntradaReal`}
                                        render={({ field }) => <Input type="time" {...field} className="w-24 h-9"/>}
                                    />
                                </TableCell>
                                <TableCell>
                                        <FormField
                                        control={control}
                                        name={`personal.${index}.horaSalidaReal`}
                                        render={({ field }) => <Input type="time" {...field} className="w-24 h-9"/>}
                                    />
                                </TableCell>
                            </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay personal planificado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
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
    </>
  );
}
