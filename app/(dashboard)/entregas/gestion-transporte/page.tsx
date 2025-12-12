

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, Calendar as CalendarIcon, Save, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { TransporteOrder, ProveedorTransporte, Entrega } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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


const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  id: z.string(),
  osId: z.string(),
  fecha: z.date(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio."),
  tipoTransporte: z.string(),
  precio: z.coerce.number(),
  lugarRecogida: z.string().min(1, "El lugar de recogida es obligatorio."),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, "El lugar de entrega es obligatorio."),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
    status: z.enum(['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'] as const),
});

const formSchema = z.object({
    orders: z.array(transporteOrderSchema)
});

type FormValues = z.infer<typeof formSchema>;


export default function GestionTransportePage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [proveedores, setProveedores] = useState<ProveedorTransporte[]>([]);
    const [entregas, setEntregas] = useState<Map<string, Entrega>>(new Map());
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { orders: [] }
    });

    const { control, getValues, setValue } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "orders"
    });
    
    const loadData = useCallback(() => {
        const allTransportes = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[]);
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]);
        const entregasMap = new Map(allEntregas.map(e => [e.id, e]));

        const transportesDeEntregas = allTransportes.filter(t => entregasMap.has(t.osId));
        
        form.reset({ orders: transportesDeEntregas.map(o => ({...o, fecha: new Date(o.fecha)})) });
        
        const allProveedores = (JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[]).filter(p => p.tipo === 'Entregas');
        setProveedores(allProveedores);
        setEntregas(entregasMap);
        setIsMounted(true);
    }, [form]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const filteredOrders = useMemo(() => {
        return fields.map((field, index) => ({ field, index })).filter(({ field }) => {
            const os = entregas.get(field.osId);
            const searchMatch =
                searchTerm === '' ||
                (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (os && os.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
                field.lugarEntrega.toLowerCase().includes(searchTerm.toLowerCase());

            let dateMatch = true;
            if (dateRange?.from) {
                const orderDate = field.fecha;
                if (dateRange.to) {
                    dateMatch = isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                } else {
                    dateMatch = isWithinInterval(orderDate, { start: startOfDay(orderDate), end: endOfDay(orderDate) });
                }
            }

            return searchMatch && dateMatch;
        });
    }, [fields, searchTerm, dateRange, entregas]);

    const handleProviderChange = (index: number, proveedorId: string) => {
        if (!proveedorId) return;
        const provider = proveedores.find(p => p.id === proveedorId);
        if (provider) {
            setValue(`orders.${index}.proveedorId`, provider.id, { shouldDirty: true });
            setValue(`orders.${index}.tipoTransporte`, provider.tipoTransporte, { shouldDirty: true });
            setValue(`orders.${index}.precio`, provider.precio, { shouldDirty: true });
        }
    };
    
    const onSubmit = (data: FormValues) => {
        setIsLoading(true);
        const allTransportes = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[]);
        
        const updatedTransportes = data.orders.map(order => ({
            ...order,
            fecha: format(order.fecha, 'yyyy-MM-dd'),
            proveedorNombre: proveedores.find(p => p.id === order.proveedorId)?.nombreProveedor || ''
        }));
        
        const otherTransportes = allTransportes.filter(t => !entregas.has(t.osId));

        localStorage.setItem('transporteOrders', JSON.stringify([...otherTransportes, ...updatedTransportes]));
        
        setTimeout(() => {
            setIsLoading(false);
            form.reset(data);
            toast({ title: "Guardado", description: "Todos los cambios en los transportes han sido guardados."});
        }, 500);
    }
    
    const handleDeleteRow = () => {
        if (rowToDelete !== null) {
            remove(rowToDelete);
            setRowToDelete(null);
            toast({ title: 'Transporte eliminado de la lista. Guarda los cambios para hacerlo permanente.' });
        }
    };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Transporte..." />;
    }

    return (
       <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />Gestión de Transporte de Entregas</h1>
            </div>

            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle>Listado de Transportes</CardTitle>
                        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading || !form.formState.isDirty}>
                             {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar Cambios</span>
                        </Button>
                    </div>
                     <div className="flex flex-col md:flex-row gap-4 pt-4">
                        <Input
                            placeholder="Buscar por OS, cliente, dirección..."
                            className="flex-grow"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="p-2">OS</TableHead>
                                        <TableHead className="p-2">Fecha</TableHead>
                                        <TableHead className="p-2 w-[250px]">Proveedor</TableHead>
                                        <TableHead className="p-2">Hora Recogida</TableHead>
                                        <TableHead className="p-2 min-w-48">Dirección Origen</TableHead>
                                        <TableHead className="p-2">Hora Entrega</TableHead>
                                        <TableHead className="p-2 min-w-48">Dirección Destino</TableHead>
                                        <TableHead className="p-2 text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map(({ field, index }) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="p-1 font-mono">{entregas.get(field.osId)?.serviceNumber}</TableCell>
                                                <TableCell className="p-1">{format(field.fecha, 'dd/MM/yy')}</TableCell>
                                                <TableCell className="p-1">
                                                    <FormField control={control} name={`orders.${index}.proveedorId`} render={({ field: selectField }) => (
                                                        <FormItem>
                                                            <Select onValueChange={(value) => handleProviderChange(index, value)} value={selectField.value}>
                                                                <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.tipoTransporte}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <FormField control={control} name={`orders.${index}.horaRecogida`} render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="h-9"/></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <FormField control={control} name={`orders.${index}.lugarRecogida`} render={({ field: inputField }) => <FormItem><FormControl><Input {...inputField} className="h-9"/></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <FormField control={control} name={`orders.${index}.horaEntrega`} render={({ field: inputField }) => <FormItem><FormControl><Input type="time" {...inputField} className="h-9"/></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <FormField control={control} name={`orders.${index}.lugarEntrega`} render={({ field: inputField }) => <FormItem><FormControl><Input {...inputField} className="h-9"/></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="p-1 text-right">
                                                    <Button variant="ghost" size="icon" className="text-destructive h-9" type="button" onClick={() => setRowToDelete(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={8} className="h-24 text-center">No hay transportes que coincidan con los filtros.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Form>
                </CardContent>
            </Card>

            <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta acción eliminará el registro de transporte de la tabla. El cambio será permanente al guardar.
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
    );
}
