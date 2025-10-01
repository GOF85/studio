

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react';
import type { PersonalEntrega, Entrega, Espacio, EntregaHito, ProveedorPersonal, PersonalEntregaTurno, PedidoEntrega, Proveedor } from '@/types';
import { Header } from '@/components/layout/header';
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
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

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

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Montaje', 'Servicio', 'Recogida'] as const;
const estadoOptions: PersonalEntregaTurno['status'][] = ['Pendiente', 'Asignado a ETT', 'Confirmado'];

const turnoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, 'El proveedor es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser mayor que 0'),
  precioHora: z.coerce.number().min(0),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  centroCoste: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  status: z.enum(estadoOptions),
});

const formSchema = z.object({
    turnos: z.array(turnoSchema)
});

type FormValues = z.infer<typeof formSchema>;

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [hitos, setHitos] = useState<EntregaHito[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<ProveedorPersonal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [] },
  });

  const { control, setValue, getValues, watch } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
 const handleProviderChange = useCallback((index: number, proveedorId: string) => {
    if (!proveedorId) return;
    const provider = proveedoresDB.find(p => p.id === proveedorId);
    if (provider) {
      setValue(`turnos.${index}.proveedorId`, provider.id, { shouldDirty: true });
      setValue(`turnos.${index}.categoria`, provider.categoria, { shouldDirty: true });
      setValue(`turnos.${index}.precioHora`, provider.precioHora || 0, { shouldDirty: true });
    }
  }, [proveedoresDB, setValue]);
  
  const watchedFields = watch('turnos');

 const totalCost = useMemo(() => {
    return watchedFields?.reduce((acc, turno) => {
      const hours = calculateHours(turno.horaInicio, turno.horaFin);
      return acc + hours * (turno.precioHora || 0) * (turno.cantidad || 1);
    }, 0) || 0;
  }, [watchedFields]);

  const loadData = useCallback(() => {
     if (!osId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/entregas/gestion-personal');
        return;
    }
    
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);

        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        setHitos(currentPedido?.hitos.filter(h => h.horasCamarero && h.horasCamarero > 0) || []);

        const allPersonalEntregas = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
        const relatedAssignments = allPersonalEntregas.find(pa => pa.osId === osId);
        form.reset({ turnos: relatedAssignments?.turnos.map(t => ({...t, fecha: new Date(t.fecha)})) || [] });
        
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as ProveedorPersonal[];
        setProveedoresDB(dbProveedores);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID del pedido.' });
      setIsLoading(false);
      return;
    }

    const allAssignments = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
    const otherAssignments = allAssignments.filter(o => o.osId !== osId);
    
    const currentAssignment: PersonalEntrega = { osId, turnos: data.turnos.map(t => ({...t, fecha: format(t.fecha, 'yyyy-MM-dd')})) };

    const updatedAllAssignments = [...otherAssignments, currentAssignment];
    localStorage.setItem('personalEntregas', JSON.stringify(updatedAllAssignments));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'Todos los cambios han sido guardados.' });
        setIsLoading(false);
        form.reset(data); // Mark form as not dirty
    }, 500);
  };
  
  const addRow = () => {
    if (!osId || !hitos.length) return;
    const firstHito = hitos[0];
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        cantidad: 1,
        precioHora: 0,
        fecha: new Date(firstHito.fecha),
        horaInicio: firstHito.hora,
        horaFin: '17:00',
        centroCoste: 'SALA',
        tipoServicio: 'Servicio',
        observaciones: '',
        status: 'Pendiente',
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Turno eliminado' });
    }
  };

  const providerOptions = useMemo(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    return proveedoresDB
        .map(p => {
          const proveedorInfo = allProveedores.find(prov => prov.id === p.proveedorId);
          return { label: `${proveedorInfo?.nombreComercial || 'Desconocido'} - ${p.categoria}`, value: p.id };
        });
    }, [proveedoresDB]);

    const getProviderName = (proveedorId: string) => {
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        const proveedor = allProveedores.find(p => p.id === proveedorId);
        return proveedor?.nombreComercial || 'Desconocido';
    }


  if (!isMounted || !entrega) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
       <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')} className="mb-2">
                        <ArrowLeft className="mr-2" />
                        Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Asignación de Personal</h1>
                    <div className="text-muted-foreground mt-2 space-y-1">
                        <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                         <p className="flex items-center gap-2"><Building className="h-3 w-3"/>{entrega.spaceAddress}</p>
                        {entrega.respMetre && (
                            <p className="flex items-center gap-2">
                                Resp. Metre: {entrega.respMetre} 
                                {entrega.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {entrega.respMetrePhone}</span>}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Entregas con Servicio de Personal</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Fecha y Hora</TableHead>
                            <TableHead>Lugar de Entrega</TableHead>
                            <TableHead>Horas de Camarero</TableHead>
                            <TableHead>Observaciones</TableHead>
                            <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {hitos.length > 0 ? hitos.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.hora}</TableCell>
                                <TableCell>{item.lugarEntrega}</TableCell>
                                <TableCell className="font-bold">{item.horasCamarero}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.observaciones}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/entregas/entrega/${item.id}?osId=${osId}`}>
                                            Ver Entrega
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay entregas con servicio de personal en este pedido.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Planificación de Turnos</CardTitle>
                    <Button type="button" onClick={addRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Turno
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-2">Fecha</TableHead>
                                    <TableHead className="px-2 py-2 min-w-48">Proveedor - Categoría</TableHead>
                                    <TableHead className="px-1 py-2 text-center">Cant.</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead className="px-2 py-2">Estado</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-1 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-1 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-1 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-1 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-1 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`turnos.${index}.fecha`} render={({ field: dateField }) => (
                                                <FormItem>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} className={cn("w-32 h-9 pl-3 text-left font-normal", !dateField.value && "text-muted-foreground")}>
                                                                    {dateField.value ? format(dateField.value, "dd/MM/yy") : <span>Elige</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={dateField.value} onSelect={dateField.onChange} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                </FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 min-w-48">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.proveedorId`}
                                                render={({ field: formField }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={providerOptions}
                                                        value={formField.value}
                                                        onChange={(value) => handleProviderChange(index, value)}
                                                        placeholder="Proveedor..."
                                                    />
                                                </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-1 py-1">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.cantidad`}
                                                render={({ field: inputField }) => <FormItem><FormControl><Input type="number" min="1" {...inputField} className="w-16 h-9 text-center"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.tipoServicio`}
                                                render={({ field: selectField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="border-l px-1 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.horaInicio`}
                                                render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-1 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.horaFin`}
                                                render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-1 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`turnos.${index}.precioHora`}
                                                render={({ field: inputField }) => <FormItem><FormControl><Input type="number" step="0.01" {...inputField} className="w-20 h-9" readOnly /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell>
                                             <FormField
                                                control={control}
                                                name={`turnos.${index}.status`}
                                                render={({ field: selectField }) => (
                                                <FormItem>
                                                    <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                        <FormControl><SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>{estadoOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                                )}
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
                                    No hay personal asignado.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="justify-end font-bold text-xl">
                    Coste Total Planificado: {formatCurrency(totalCost)}
                </CardFooter>
            </Card>
        </form>
       </FormProvider>

        <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará el turno de la tabla.
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
