

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock } from 'lucide-react';

import type { Entrega, PersonalEntrega, CategoriaPersonal, Proveedor, PersonalEntregaTurno, EstadoPersonalEntrega } from '@/types';
import { ESTADO_PERSONAL_ENTREGA } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalTurnoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser mayor que 0'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  centroCoste: z.enum(centroCosteOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  status: z.enum(ESTADO_PERSONAL_ENTREGA).default('Pendiente'),
});

const formSchema = z.object({
    turnos: z.array(personalTurnoSchema)
});

type FormValues = z.infer<typeof formSchema>;

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
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

  const { control, setValue, watch } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
  const loadData = useCallback(() => {
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);
        
        const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const turnosDelPedido = allTurnos.find(p => p.osId === osId);
        if(turnosDelPedido) {
            form.reset({ turnos: turnosDelPedido.turnos.map(t => ({...t, fecha: new Date(t.fecha)})) });
        }
        
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProviderChange = useCallback((index: number, tipoPersonalId: string) => {
    if (!tipoPersonalId) return;
    const tipoPersonal = proveedoresDB.find(p => p.id === tipoPersonalId);
    if (tipoPersonal) {
      setValue(`turnos.${index}.proveedorId`, tipoPersonal.proveedorId, { shouldDirty: true });
      setValue(`turnos.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
      setValue(`turnos.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
    }
  }, [proveedoresDB, setValue]);
  
  const watchedFields = watch('turnos');

  const totalPlanned = useMemo(() => {
    return watchedFields?.reduce((acc, turno) => {
      const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
      return acc + plannedHours * (turno.precioHora || 0) * (turno.cantidad || 1);
    }, 0) || 0;
  }, [watchedFields]);

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID del pedido.' });
      setIsLoading(false);
      return;
    }
    
    const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
    const index = allTurnos.findIndex(p => p.osId === osId);
    
    const newPersonalData: PersonalEntrega = {
        osId,
        turnos: data.turnos.map(t => ({...t, fecha: format(t.fecha, 'yyyy-MM-dd')}))
    }
    
    if (index > -1) {
        allTurnos[index] = newPersonalData;
    } else {
        allTurnos.push(newPersonalData);
    }

    localStorage.setItem('personalEntrega', JSON.stringify(allTurnos));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
        setIsLoading(false);
        form.reset(data);
    }, 500);
  };
  
  const addRow = () => {
    if (!osId || !entrega) return;
    append({
        id: Date.now().toString(),
        proveedorId: '',
        categoria: '',
        cantidad: 1,
        precioHora: 0,
        fecha: new Date(entrega.startDate),
        horaEntrada: '09:00',
        horaSalida: '17:00',
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
      toast({ title: 'Turno eliminado de la lista. Guarda los cambios para hacerlo permanente.' });
    }
  };

  const providerOptions = useMemo(() => {
    return proveedoresDB.map(p => ({ label: `${proveedoresMap.get(p.proveedorId)} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB, proveedoresMap]);

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
                        <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')}>
                            <ArrowLeft className="mr-2" />
                            Volver al listado
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Asignación de Personal</h1>
                        <div className="text-muted-foreground mt-2 space-y-1">
                            <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                            <div className="flex items-center gap-4">
                                <p className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4"/>
                                    {entrega.direccionPrincipal}
                                </p>
                                <p className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {format(new Date(entrega.startDate), 'dd/MM/yy')} {entrega.deliveryTime}
                                </p>
                            </div>
                             {entrega.comments && (
                                <div className="mt-2 text-sm text-amber-700 font-semibold flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{entrega.comments}</span>
                                </div>
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

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>Turnos de Personal</CardTitle>
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
                                        <TableHead className="px-2 py-2 w-40">Fecha</TableHead>
                                        <TableHead className="px-2 py-2 min-w-48">Proveedor - Categoría</TableHead>
                                        <TableHead className="px-1 py-2 text-center">Cant.</TableHead>
                                        <TableHead className="px-1 py-2 w-24">Entrada</TableHead>
                                        <TableHead className="px-1 py-2 w-24">Salida</TableHead>
                                        <TableHead className="px-1 py-2 w-20">€/Hora</TableHead>
                                        <TableHead className="px-2 py-2 w-40">Estado</TableHead>
                                        <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                         <TableRow key={field.id}>
                                            <TableCell className="px-2 py-1">
                                                <FormField control={control} name={`turnos.${index}.fecha`} render={({ field: dateField }) => (
                                                    <FormItem>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant={"outline"} className={cn("w-[150px] h-9 pl-3 text-left font-normal", !dateField.value && "text-muted-foreground")}>
                                                                        {dateField.value ? format(dateField.value, "dd/MM/yy") : <span>Elige</span>}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar mode="single" selected={dateField.value} onSelect={dateField.onChange} initialFocus locale={es} />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="px-2 py-1 min-w-48">
                                                <FormField
                                                    control={control}
                                                    name={`turnos.${index}.proveedorId`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Combobox
                                                                options={providerOptions}
                                                                value={proveedoresDB.find(p => p.id === field.value)?.id || ''}
                                                                onChange={(value) => handleProviderChange(index, value)}
                                                                placeholder="Proveedor - Categoría..."
                                                            />
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="px-1 py-1">
                                                <FormField control={control} name={`turnos.${index}.cantidad`} render={({ field: f }) => <FormItem><FormControl><Input type="number" min="1" {...f} className="w-16 h-9 text-center"/></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-1 py-1">
                                                <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-1 py-1">
                                                <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-1 py-1">
                                                <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9" readOnly /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-2 py-1">
                                                <FormField control={control} name={`turnos.${index}.status`} render={({ field: statusField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={statusField.onChange} value={statusField.value}>
                                                            <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {ESTADO_PERSONAL_ENTREGA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="text-right px-2 py-1">
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                         </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {fields.length > 0 && (
                        <CardFooter>
                            <Card className="w-full md:w-1/2 ml-auto">
                                <CardHeader><CardTitle className="text-lg">Resumen de Costes de Personal</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between font-bold text-base">
                                        <span>Coste Total Planificado:</span>
                                        <span>{formatCurrency(totalPlanned)}</span>
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
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar turno?</AlertDialogTitle><AlertDialogDescription>El turno se eliminará de la lista. Guarda los cambios para hacerlo permanente.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteRow}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
