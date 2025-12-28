'use client';

import { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Calendar as CalendarIcon, Save, Loader2, Trash2, X, MapPin, Clock } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { TransporteOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

import { useTransporteOrders, useEntregas, useTiposTransporte } from '@/hooks/use-data-queries';
import { useUpdateTransporteOrder, useDeleteTransporteOrder } from '@/hooks/mutations/use-transporte-mutations';

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
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    // Supabase Hooks
    const { data: transportesData, isLoading: loadingTransportes } = useTransporteOrders();
    const { data: entregasData, isLoading: loadingEntregas } = useEntregas();
    const { data: proveedoresData } = useTiposTransporte();
    
    const updateTransporte = useUpdateTransporteOrder();
    const deleteTransporte = useDeleteTransporteOrder();

    const proveedores = useMemo(() => (proveedoresData || []) as any[], [proveedoresData]);
    const entregas = useMemo(() => {
        const map = new Map<string, any>();
        (entregasData || []).forEach((e: any) => map.set(e.id, e));
        return map;
    }, [entregasData]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { orders: [] }
    });

    const { control, setValue, reset } = form;

    const { fields, remove } = useFieldArray({
        control,
        name: "orders"
    });

    useEffect(() => {
        if (loadingTransportes || loadingEntregas || !transportesData) return;

        const transportesDeEntregas = transportesData.filter(t => entregas.has(t.osId));
        reset({ orders: transportesDeEntregas.map(o => ({...o, fecha: new Date(o.fecha)})) });
        setIsMounted(true);
    }, [transportesData, entregas, loadingTransportes, loadingEntregas, reset]);
    
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
    
    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        try {
            await Promise.all(data.orders.map(order => 
                updateTransporte.mutateAsync({
                    id: order.id,
                    updates: {
                        ...order,
                        fecha: format(order.fecha, 'yyyy-MM-dd'),
                    }
                })
            ));
            
            form.reset(data);
            toast({ title: "Guardado", description: "Todos los cambios en los transportes han sido guardados."});
        } catch (error) {
            console.error('Error saving transport orders:', error);
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleDeleteRow = async () => {
        if (rowToDelete !== null) {
            const order = fields[rowToDelete];
            if (order.id) {
                try {
                    await deleteTransporte.mutateAsync(order.id);
                    remove(rowToDelete);
                    toast({ title: 'Transporte eliminado correctamente.' });
                } catch (error) {
                    console.error('Error deleting transport order:', error);
                    toast({ title: 'Error al eliminar el transporte.', variant: 'destructive' });
                }
            } else {
                remove(rowToDelete);
            }
            setRowToDelete(null);
        }
    };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Transporte..." />;
    }

    return (
        <main className="min-h-screen bg-background/30 pb-20">
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Truck className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="flex-1 hidden md:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                            <Input
                                placeholder="Buscar OS, cliente o dirección..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50", dateRange?.from && "border-amber-500/50 bg-amber-500/5 text-amber-700")}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>{format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM", { locale: es })}</>
                                    ) : format(dateRange.from, "dd MMM", { locale: es })
                                ) : "Filtrar Fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl border-border/40 shadow-2xl" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>

                    {(searchTerm || dateRange) && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSearchTerm(''); setDateRange(undefined); }}
                            className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-amber-600"
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Limpiar
                        </Button>
                    )}

                    <div className="h-4 w-[1px] bg-border/40 mx-1" />

                    <Button 
                        size="sm" 
                        onClick={form.handleSubmit(onSubmit)} 
                        disabled={isLoading || !form.formState.isDirty}
                        className="h-8 rounded-lg font-black px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                    >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </div>

            <div className="max-w-[1600px] mx-auto px-4">
                <Form {...form}>
                    <div className="bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/40">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">OS / Cliente</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Fecha</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 w-[250px]">Proveedor / Tipo</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Recogida</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Entrega</TableHead>
                                    <TableHead className="w-10 h-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map(({ field, index }) => (
                                        <TableRow key={field.id} className="hover:bg-amber-500/[0.02] border-border/40 transition-colors group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Badge variant="outline" className="w-fit font-black text-[9px] border-amber-500/20 bg-amber-500/5 text-amber-700 mb-1">
                                                        {entregas.get(field.osId)?.serviceNumber}
                                                    </Badge>
                                                    <span className="text-[11px] font-bold truncate max-w-[150px]">
                                                        {entregas.get(field.osId)?.client}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[11px] font-medium">{format(field.fecha, 'dd/MM/yy')}</span>
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={control} name={`orders.${index}.proveedorId`} render={({ field: selectField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={(value) => handleProviderChange(index, value)} value={selectField.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 text-[11px] bg-background/50 border-border/40 rounded-lg">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/80">
                                                                {proveedores.map(p => (
                                                                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                                                                        {p.nombreProveedor} - {p.tipoTransporte}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3 text-amber-500" />
                                                        <FormField control={control} name={`orders.${index}.horaRecogida`} render={({ field: inputField }) => (
                                                            <FormItem className="flex-grow">
                                                                <FormControl>
                                                                    <Input type="time" {...inputField} className="h-7 text-[11px] bg-background/50 border-border/40 rounded-md px-2"/>
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        <FormField control={control} name={`orders.${index}.lugarRecogida`} render={({ field: inputField }) => (
                                                            <FormItem className="flex-grow">
                                                                <FormControl>
                                                                    <Input {...inputField} className="h-7 text-[10px] bg-background/50 border-border/40 rounded-md px-2" placeholder="Origen..."/>
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3 text-amber-500" />
                                                        <FormField control={control} name={`orders.${index}.horaEntrega`} render={({ field: inputField }) => (
                                                            <FormItem className="flex-grow">
                                                                <FormControl>
                                                                    <Input type="time" {...inputField} className="h-7 text-[11px] bg-background/50 border-border/40 rounded-md px-2"/>
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        <FormField control={control} name={`orders.${index}.lugarEntrega`} render={({ field: inputField }) => (
                                                            <FormItem className="flex-grow">
                                                                <FormControl>
                                                                    <Input {...inputField} className="h-7 text-[10px] bg-background/50 border-border/40 rounded-md px-2" placeholder="Destino..."/>
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 w-8" type="button" onClick={() => setRowToDelete(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Truck className="h-8 w-8 opacity-20" />
                                                <p className="text-[11px] font-medium uppercase tracking-widest">No hay transportes que coincidan con los filtros</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Form>
            </div>

            <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent className="rounded-2xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/95">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-[16px] font-black uppercase tracking-widest">¿Eliminar transporte?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[12px] text-muted-foreground">
                        Esta acción eliminará el registro de transporte de la tabla. El cambio será permanente al guardar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRowToDelete(null)} className="rounded-xl text-[10px] font-black uppercase tracking-widest">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
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
