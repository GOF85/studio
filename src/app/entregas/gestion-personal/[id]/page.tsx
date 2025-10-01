
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react';
import type { PersonalEntrega, Entrega, PedidoEntrega, EntregaHito, Proveedor, CategoriaPersonal } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

const turnoSchema = z.object({
  id: z.string(),
  tipoPersonalId: z.string().min(1, "Debes seleccionar una categoría"),
  cantidad: z.coerce.number().min(1, 'Mínimo 1'),
  fecha: z.date(),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
});

const formSchema = z.object({
    turnos: z.array(turnoSchema)
});

type FormValues = z.infer<typeof formSchema>;

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [hitos, setHitos] = useState<EntregaHito[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [catalogoPersonal, setCatalogoPersonal] = useState<CategoriaPersonal[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
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

  const loadData = useCallback(() => {
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);

        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        setHitos(currentPedido?.hitos.filter(h => h.horasCamarero && h.horasCamarero > 0) || []);

        const allPersonalEntregas = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
        const relatedAssignments = allPersonalEntregas.find(pa => pa.osId === osId);
        if (relatedAssignments) {
            form.reset({ turnos: relatedAssignments.turnos.map(t => ({...t, fecha: new Date(t.fecha)})) });
        }
        
        const dbCatalogo = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setCatalogoPersonal(dbCatalogo);
        const dbProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedores(dbProveedores);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: FormValues) => {
    setIsLoading(true);

    const allAssignments = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
    const otherAssignments = allAssignments.filter(o => o.osId !== osId);
    
    const currentAssignment: PersonalEntrega = { 
      osId, 
      turnos: data.turnos.map(t => ({...t, fecha: format(t.fecha, 'yyyy-MM-dd')})) 
    };

    localStorage.setItem('personalEntregas', JSON.stringify([...otherAssignments, currentAssignment]));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'Todos los cambios han sido guardados.' });
        setIsLoading(false);
        form.reset(data);
    }, 500);
  };
  
  const addRow = () => {
    if (!osId || !hitos.length) return;
    const firstHito = hitos[0];
    append({
        id: Date.now().toString(),
        tipoPersonalId: '',
        cantidad: 1,
        fecha: new Date(firstHito.fecha),
        horaInicio: firstHito.hora,
        horaFin: '17:00',
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Turno eliminado' });
    }
  };

  const catalogoOptions = useMemo(() => {
    return catalogoPersonal.map(item => {
        const prov = proveedores.find(p => p.id === item.proveedorId);
        return {
            value: item.id,
            label: `${prov?.nombreComercial || 'N/A'} - ${item.categoria}`
        }
    });
  }, [catalogoPersonal, proveedores]);


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
                     <div className="space-y-4">
                        {hitos.length > 0 ? hitos.map(item => (
                            <div key={item.id} className="p-4 border rounded-lg">
                                <p className="font-bold">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.hora} - {item.lugarEntrega}</p>
                                <p className="text-sm"><strong>Horas de Camarero Solicitadas:</strong> {item.horasCamarero}</p>
                                {item.observaciones && <p className="text-sm text-amber-700 font-medium mt-2 p-2 bg-amber-50 rounded-md"><strong>Observaciones del comercial:</strong> {item.observaciones}</p>}
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-4">No hay entregas con servicio de personal en este pedido.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Planificación de Turnos</CardTitle>
                    <Button type="button" onClick={addRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Camarero
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-2 min-w-48">Proveedor - Categoría</TableHead>
                                    <TableHead className="px-1 py-2 text-center">Cant.</TableHead>
                                    <TableHead className="px-2 py-2">Fecha</TableHead>
                                    <TableHead className="px-2 py-2 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 w-24">H. Salida</TableHead>
                                    <TableHead className="px-2 py-2 w-20">€/Hora</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => {
                                    const tipoPersonal = catalogoPersonal.find(p => p.id === watch(`turnos.${index}.tipoPersonalId`));
                                    return (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1 min-w-48">
                                            <FormField control={control} name={`turnos.${index}.tipoPersonalId`} render={({ field: formField }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={catalogoOptions}
                                                        value={formField.value}
                                                        onChange={(value) => setValue(`turnos.${index}.tipoPersonalId`, value, { shouldDirty: true })}
                                                        placeholder="Proveedor - Categoría..."
                                                    />
                                                </FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="px-1 py-1">
                                            <FormField control={control} name={`turnos.${index}.cantidad`} render={({ field: inputField }) => <FormItem><FormControl><Input type="number" min="1" {...inputField} className="w-16 h-9 text-center"/></FormControl></FormItem>} />
                                        </TableCell>
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
                                                            <Calendar mode="single" selected={dateField.value} onSelect={dateField.onChange} initialFocus locale={es} />
                                                        </PopoverContent>
                                                    </Popover>
                                                </FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`turnos.${index}.horaInicio`} render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="w-24 h-9" /></FormControl></FormItem>} />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField control={control} name={`turnos.${index}.horaFin`} render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="w-24 h-9" /></FormControl></FormItem>} />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 font-mono">
                                           {tipoPersonal ? formatCurrency(tipoPersonal.precioHora) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right px-2 py-1">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No hay personal asignado.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
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
