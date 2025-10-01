

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, Building2, Save, Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Info, Clock, Phone, MapPin, RefreshCw } from 'lucide-react';

import type { Entrega, PersonalEntrega, CategoriaPersonal, Proveedor, PersonalEntregaTurno, EstadoPersonalEntrega, PedidoEntrega, EntregaHito } from '@/types';
import { ESTADO_PERSONAL_ENTREGA } from '@/types';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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

const personalTurnoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  cantidad: z.coerce.number().min(1, 'La cantidad debe ser mayor que 0'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
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
  const [deliveryHitos, setDeliveryHitos] = useState<EntregaHito[]>([]);
  const [forceRecalc, setForceRecalc] = useState(0);
  const [personalEntrega, setPersonalEntrega] = useState<PersonalEntrega | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [] },
  });

  const { control, setValue, watch, trigger } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "turnos",
  });
  
  const loadData = useCallback(() => {
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);
        
        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        setDeliveryHitos(currentPedido?.hitos || []);

        const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const turnosDelPedido = allTurnos.find(p => p.osId === osId);
        setPersonalEntrega(turnosDelPedido || { osId, turnos: [], status: 'Pendiente' });
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
        setValue(`turnos.${index}.proveedorId`, tipoPersonal.id, { shouldDirty: true });
        setValue(`turnos.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
        setValue(`turnos.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
        trigger(`turnos.${index}`);
    }
}, [proveedoresDB, setValue, trigger]);

  const watchedFields = watch('turnos');

  const { totalPlanned } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, order) => {
      const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
      return acc + plannedHours * (order.precioHora || 0) * (order.cantidad || 1);
    }, 0) || 0;

    return { totalPlanned: planned };
  }, [watchedFields, forceRecalc]);

  const handleStatusChange = (newStatus: EstadoPersonalEntrega) => {
    if (!personalEntrega) return;
    const updatedPersonalEntrega = { ...personalEntrega, status: newStatus };
    setPersonalEntrega(updatedPersonalEntrega);
    
    const allTurnos = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
    const index = allTurnos.findIndex(p => p.osId === osId);
    if (index > -1) {
      allTurnos[index] = updatedPersonalEntrega;
    } else {
      allTurnos.push(updatedPersonalEntrega);
    }
    localStorage.setItem('personalEntrega', JSON.stringify(allTurnos));
    toast({ title: 'Estado actualizado', description: `El estado del personal es ahora: ${newStatus}` });
  };

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
        turnos: data.turnos.map(t => ({...t, fecha: format(t.fecha, 'yyyy-MM-dd')})),
        status: personalEntrega?.status || 'Pendiente'
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

const hitosConPersonal = useMemo(() => {
    if (!deliveryHitos || !entrega) return [];
    return deliveryHitos
        .map((hito, index) => ({...hito, expedicionNumero: `${entrega.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`}))
        .filter(h => h.horasCamarero && h.horasCamarero > 0)
}, [deliveryHitos, entrega]);

  if (!isMounted || !entrega) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')}>
                            <ArrowLeft className="mr-2" />
                            Volver al listado
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Asignación de Personal</h1>
                        <div className="text-muted-foreground mt-1 space-y-0.5">
                            <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                        </div>
                    </div>
                </div>

                <Card className="mb-6">
                    <CardHeader className="py-3 flex-row items-center justify-between">
                        <CardTitle className="text-lg">Servicios con Personal</CardTitle>
                        <div className='flex items-center gap-2'>
                             <Select value={personalEntrega?.status || 'Pendiente'} onValueChange={(value: EstadoPersonalEntrega) => handleStatusChange(value)}>
                                <SelectTrigger className="w-[200px] h-9 text-base font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADO_PERSONAL_ENTREGA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={isLoading || !form.formState.isDirty} size="sm">
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar Cambios</span>
                            </Button>
                        </div>
                    </CardHeader>
                    {hitosConPersonal.length > 0 && (
                        <CardContent className="pt-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="py-1 px-2">Nº Expedición</TableHead>
                                            <TableHead className="py-1 px-2">Dirección del servicio</TableHead>
                                            <TableHead className="py-1 px-2 w-[40%]">Observaciones</TableHead>
                                            <TableHead className="py-1 px-2 text-center">Horas Camarero</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hitosConPersonal.map(hito => (
                                            <TableRow key={hito.id}>
                                                <TableCell className="py-1 px-2 font-mono"><Badge>{hito.expedicionNumero}</Badge></TableCell>
                                                <TableCell className="py-1 px-2 font-medium">{hito.lugarEntrega} {hito.localizacion && `(${hito.localizacion})`}</TableCell>
                                                <TableCell className="py-1 px-2 text-xs text-muted-foreground">{hito.observaciones}</TableCell>
                                                <TableCell className="py-1 px-2 font-bold text-center">{hito.horasCamarero || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                       </CardContent>
                    )}
                </Card>

                <Card>
                    <CardHeader className="py-3 flex-row items-center justify-between">
                        <CardTitle className="text-lg">Turnos de Personal</CardTitle>
                        <div className='flex items-center gap-2'>
                            <Button size="sm" type="button" variant="outline" onClick={() => setForceRecalc(c => c + 1)}>
                                <RefreshCw className="mr-2 h-4 w-4"/>Recalcular Coste
                            </Button>
                            <Button type="button" onClick={addRow} size="sm">
                                <PlusCircle className="mr-2" />
                                Añadir Turno
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2">
                        <div className="border rounded-lg overflow-x-auto">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-2 py-1">Fecha</TableHead>
                                        <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                        <TableHead className="px-1 py-1 text-center">Cant.</TableHead>
                                        <TableHead className="px-1 py-1 w-24">H. Entrada</TableHead>
                                        <TableHead className="px-1 py-1 w-24">H. Salida</TableHead>
                                        <TableHead className="px-1 py-1 w-20">Horas</TableHead>
                                        <TableHead className="px-1 py-1 w-20">€/Hora</TableHead>
                                        <TableHead className="text-right px-2 py-1">Acción</TableHead>
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
                                                                        <Button variant={"outline"} className={cn("w-32 h-8 pl-3 text-left font-normal", !dateField.value && "text-muted-foreground")}>
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
                                                        render={({ field: selectField }) => (
                                                        <FormItem>
                                                            <Combobox
                                                                options={providerOptions}
                                                                value={selectField.value}
                                                                onChange={(value) => handleProviderChange(index, value)}
                                                                placeholder="Proveedor - Categoría..."
                                                            />
                                                        </FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-1 py-1">
                                                    <FormField control={control} name={`turnos.${index}.cantidad`} render={({ field: f }) => <FormItem><FormControl><Input type="number" min="1" {...f} onChange={(e) => f.onChange(parseInt(e.target.value) || 1)} className="w-16 h-8 text-center"/></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-1 py-1">
                                                    <FormField control={control} name={`turnos.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-1 py-1">
                                                    <FormField control={control} name={`turnos.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-8" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-1 py-1 font-mono text-center">
                                                    {calculateHours(watch(`turnos.${index}.horaEntrada`), watch(`turnos.${index}.horaSalida`)).toFixed(2)}h
                                                </TableCell>
                                                <TableCell className="px-1 py-1">
                                                    <FormField control={control} name={`turnos.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-8" readOnly /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="text-right px-2 py-1">
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setRowToDelete(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                             </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No hay personal asignado. Haz clic en "Añadir Turno" para empezar.
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
                                <CardHeader className="py-2"><CardTitle className="text-base">Resumen de Costes de Personal</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm p-3">
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
