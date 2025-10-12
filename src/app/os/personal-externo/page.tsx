'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Loader2 } from 'lucide-react';
import type { PersonalExternoOrder, CategoriaPersonal } from '@/types';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';


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

const personalExternoSchema = z.object({
  id: z.string(),
  osId: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: "La fecha es obligatoria."}),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  solicitadoPor: z.enum(solicitadoPorOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

const formSchema = z.object({
    personal: z.array(personalExternoSchema)
})

type PersonalExternoFormValues = z.infer<typeof formSchema>;


export default function PersonalExternoPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [proveedoresDB, setProveedoresDB] = useState<CategoriaPersonal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<PersonalExternoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue, trigger } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "personal",
  });
  
 const handleProviderChange = useCallback((index: number, proveedorId: string) => {
    if (!proveedorId) return;
    const tipoPersonal = proveedoresDB.find(p => p.id === proveedorId);
    if (tipoPersonal) {
      setValue(`personal.${index}.proveedorId`, tipoPersonal.id, { shouldDirty: true });
      setValue(`personal.${index}.categoria`, tipoPersonal.categoria, { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, tipoPersonal.precioHora || 0, { shouldDirty: true });
      trigger(`personal.${index}`);
    }
}, [proveedoresDB, setValue, trigger]);

  useEffect(() => {
    const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setProveedoresDB(dbProveedores);
    setIsMounted(true);
  }, []);

 const onSubmit = (data: PersonalExternoFormValues) => {
    // This is a placeholder, as the main logic is now handled in the parent OS layout
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        proveedorId: '',
        categoria: '',
        precioHora: 0,
        fecha: new Date(),
        horaEntrada: '09:00',
        horaSalida: '17:00',
        solicitadoPor: 'Sala',
        tipoServicio: 'Servicio',
        observaciones: '',
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

  const providerOptions = useMemo(() => {
    return proveedoresDB
        .filter(p => p.nombreProveedor)
        .map(p => ({ label: `${p.nombreProveedor} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }

  return (
    <>
        <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                                        <TableHead className="px-2 py-2">Fecha</TableHead>
                                        <TableHead className="px-2 py-2">Solicitado Por</TableHead>
                                        <TableHead className="px-2 py-2 min-w-48">Proveedor - Categoría</TableHead>
                                        <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                        <TableHead className="px-1 py-2 bg-muted/30">H. Entrada</TableHead>
                                        <TableHead className="px-1 py-2 bg-muted/30">H. Salida</TableHead>
                                        <TableHead className="px-1 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                        <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {fields.length > 0 ? (
                                    fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell className="px-2 py-1">
                                                <FormField control={control} name={`personal.${index}.fecha`} render={({ field: dateField }) => (
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
                                                <FormField control={control} name={`personal.${index}.solicitadoPor`} render={({ field: selectField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue/></SelectTrigger></FormControl>
                                                            <SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}/>
                                            </TableCell>
                                            <TableCell className="px-2 py-1 min-w-48">
                                                <FormField
                                                    control={control}
                                                    name={`personal.${index}.proveedorId`}
                                                    render={({ field }) => (
                                                    <FormItem>
                                                        <Combobox
                                                            options={providerOptions}
                                                            value={field.value}
                                                            onChange={(value) => handleProviderChange(index, value)}
                                                            placeholder="Proveedor..."
                                                        />
                                                    </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="px-2 py-1">
                                                <FormField control={control} name={`personal.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={selectField.onChange} value={selectField.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}/>
                                            </TableCell>
                                            <TableCell className="px-1 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-1 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9" /></FormControl></FormItem>} />
                                            </TableCell>
                                            <TableCell className="px-1 py-1 bg-muted/30">
                                                <FormField control={control} name={`personal.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9" readOnly /></FormControl></FormItem>} />
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
                                    <TableCell colSpan={8} className="h-24 text-center">
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
                                <TableHead>Categoría</TableHead>
                                <TableHead>H. Entrada Real</TableHead>
                                <TableHead>H. Salida Real</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-semibold">{'-- Asignado por ETT --'}</TableCell>
                                <TableCell>{field.categoria}</TableCell>
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
                            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay personal planificado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <div className="mt-8">
                <Card>
                    <CardHeader className="py-2"><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-8 p-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Coste Total Planificado:</span>
                                <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Coste Total Real (Horas):</span>
                                <span className="font-bold">{formatCurrency(totalReal)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-base">
                                <span>Coste Total Real (con Ajustes):</span>
                                <span className={finalTotalReal > totalPlanned ? 'text-destructive' : 'text-green-600'}>
                                    {formatCurrency(finalTotalReal)}
                                </span>
                            </div>
                            <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-base">
                                <span>Desviación (Plan vs Real):</span>
                                <span className={finalTotalReal > totalPlanned ? 'text-destructive' : 'text-green-600'}>
                                    {formatCurrency(finalTotalReal - totalPlanned)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground">AJUSTE DE COSTES</h4>
                            {ajustes.map((ajuste, index) => (
                                <div key={ajuste.id} className="flex gap-2 items-center">
                                    <Input 
                                        placeholder="Concepto" 
                                        value={ajuste.concepto} 
                                        onChange={(e) => updateAjuste(index, 'concepto', e.target.value)}
                                        className="h-9"
                                    />
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        placeholder="Importe"
                                        value={ajuste.ajuste}
                                        onChange={(e) => updateAjuste(index, 'ajuste', e.target.value)}
                                        className="w-32 h-9"
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => removeAjusteRow(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                            <Button size="xs" variant="outline" className="w-full" type="button" onClick={addAjusteRow}>Añadir Ajuste</Button>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold">
                                    <span>Total Ajustes:</span>
                                    <span>{formatCurrency(totalAjustes)}</span>
                                </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
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
