
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Loader2, Users, Pencil } from 'lucide-react';
import type { PersonalExternoOrder, CategoriaPersonal, Proveedor, PersonalExternoAjuste } from '@/types';
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
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        return 0;
    }
}

const formatDuration = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [ajustes, setAjustes] = useState<PersonalExternoAjuste[]>([]);

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
  
  const loadData = useCallback(() => {
    try {
        const dbProveedores = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        setProveedoresDB(dbProveedores);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setProveedoresMap(new Map(allProveedores.map(p => [p.id, p.nombreComercial])));
        
        const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const turnosDelPedido = allTurnos.filter(p => p.osId === osId);
        
        form.reset({ 
            personal: turnosDelPedido.map(t => ({
                ...t,
                fecha: new Date(t.fecha),
                horaEntradaReal: t.horaEntradaReal || '',
                horaSalidaReal: t.horaSalidaReal || '',
            }))
        });

        const storedAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
        setAjustes(storedAjustes[osId] || []);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de personal externo.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast, form]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
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

  const watchedFields = useWatch({ control, name: 'personal' });

  const { totalPlanned, totalReal, totalAjustes, finalTotalReal } = useMemo(() => {
    const planned = watchedFields?.reduce((acc, order) => {
      const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
      return acc + plannedHours * (order.precioHora || 0);
    }, 0) || 0;

    const real = watchedFields?.reduce((acc, order) => {
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        if (realHours > 0) {
            return acc + realHours * (order.precioHora || 0);
        }
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
        return acc + plannedHours * (order.precioHora || 0);
    }, 0) || 0;
    
    const aj = ajustes.reduce((sum, ajuste) => sum + ajuste.importe, 0);

    return { totalPlanned: planned, totalReal: real, totalAjustes: aj, finalTotalReal: real + aj };
  }, [watchedFields, ajustes]);


 const onSubmit = (data: PersonalExternoFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    const allTurnos = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const otherOsOrders = allTurnos.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalExternoOrder[] = data.personal.map(t => ({
        ...t,
        osId,
        fecha: format(t.fecha, 'yyyy-MM-dd'),
    }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedAllOrders));
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
        toast({ title: 'Personal guardado', description: 'La planificación del personal ha sido guardada.' });
        setIsLoading(false);
        form.reset(data); 
    }, 500);
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

  const saveAjustes = (newAjustes: PersonalExternoAjuste[]) => {
      if (!osId) return;
      const allAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
      allAjustes[osId] = newAjustes;
      localStorage.setItem('personalExternoAjustes', JSON.stringify(allAjustes));
      setAjustes(newAjustes);
  }

  const addAjusteRow = () => {
      const newAjustes = [...ajustes, { id: Date.now().toString(), proveedorId: '', concepto: '', importe: 0 }];
      saveAjustes(newAjustes);
  };

  const updateAjuste = (index: number, field: keyof PersonalExternoAjuste, value: string | number) => {
      const newAjustes = [...ajustes];
      if (field === 'importe') {
          (newAjustes[index] as any)[field] = parseFloat(value as string) || 0;
      } else {
          (newAjustes[index] as any)[field] = value as string;
      }
      setAjustes(newAjustes);
      saveAjustes(newAjustes);
  };

  const removeAjusteRow = (index: number) => {
      const newAjustes = ajustes.filter((_, i) => i !== index);
      saveAjustes(newAjustes);
  };

  const providerOptions = useMemo(() => {
    return proveedoresDB
        .filter(p => proveedoresMap.has(p.proveedorId)) 
        .map(p => ({ label: `${proveedoresMap.get(p.proveedorId)} - ${p.categoria}`, value: p.id }));
}, [proveedoresDB, proveedoresMap]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
  }

  return (
    <main>
      <TooltipProvider>
        <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs defaultValue="planificacion">
                     <div className="flex items-center justify-between mb-4">
                        <TabsList className="grid grid-cols-2">
                            <TabsTrigger value="planificacion">Planificación de Turnos</TabsTrigger>
                            <TabsTrigger value="aprobados">Cierre y Horas Reales</TabsTrigger>
                        </TabsList>
                        <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar Cambios</span>
                        </Button>
                    </div>
                    <TabsContent value="planificacion">
                        <Card>
                            <CardHeader className="py-3 flex-row items-center justify-between">
                                <CardTitle className="text-lg">Planificación de Turnos</CardTitle>
                                <Button type="button" onClick={addRow} size="sm">
                                    <PlusCircle className="mr-2" />
                                    Añadir Turno
                                </Button>
                            </CardHeader>
                            <CardContent className="p-2">
                                <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-1">Fecha</TableHead>
                                            <TableHead className="px-2 py-1">Solicitado Por</TableHead>
                                            <TableHead className="px-2 py-1 min-w-48">Proveedor - Categoría</TableHead>
                                            <TableHead className="px-2 py-1">Tipo Servicio</TableHead>
                                            <TableHead colSpan={4} className="text-center border-l border-r px-2 py-1 bg-muted/30">Planificado</TableHead>
                                            <TableHead className="text-right px-2 py-1">Acción</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
                                            <TableHead className="border-l px-2 py-1 bg-muted/30 w-24">H. Entrada</TableHead>
                                            <TableHead className="px-2 py-1 bg-muted/30 w-24">H. Salida</TableHead>
                                            <TableHead className="px-2 py-1 bg-muted/30">Horas Plan.</TableHead>
                                            <TableHead className="border-r px-2 py-1 bg-muted/30 w-20">€/Hora</TableHead>
                                            <TableHead className="px-2 py-1"></TableHead>
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
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{solicitadoPorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1 min-w-48">
                                                    <FormField
                                                        control={control}
                                                        name={`personal.${index}.proveedorId`}
                                                        render={({ field: f }) => (
                                                        <FormItem>
                                                            <Combobox
                                                                options={providerOptions}
                                                                value={f.value}
                                                                onChange={(value) => handleProviderChange(index, value)}
                                                                placeholder="Proveedor..."
                                                            />
                                                        </FormItem>
                                                        )}/>
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    <FormField control={control} name={`personal.${index}.tipoServicio`} render={({ field: selectField }) => (
                                                        <FormItem><Select onValueChange={selectField.onChange} value={selectField.value}><FormControl><SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </TableCell>
                                                <TableCell className="border-l px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`personal.${index}.horaEntrada`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                <TableCell className="px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`personal.${index}.horaSalida`} render={({ field: f }) => <FormItem><FormControl><Input type="time" {...f} className="w-24 h-9 text-xs" /></FormControl></FormItem>} />
                                                </TableCell>
                                                 <TableCell className="px-1 py-1 bg-muted/30 font-mono text-center">
                                                    {formatDuration(calculateHours(watchedFields[index].horaEntrada, watchedFields[index].horaSalida))}h
                                                </TableCell>
                                                <TableCell className="border-r px-2 py-1 bg-muted/30">
                                                    <FormField control={control} name={`personal.${index}.precioHora`} render={({ field: f }) => <FormItem><FormControl><Input type="number" step="0.01" {...f} className="w-20 h-9 text-xs" readOnly /></FormControl></FormItem>} />
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
                        </Card>
                    </TabsContent>
                    <TabsContent value="aprobados">
                        <Card>
                            <CardHeader className="py-3"><CardTitle className="text-lg">Cierre y Horas Reales</CardTitle></CardHeader>
                            <CardContent className="p-2">
                                 <p className="text-sm text-muted-foreground p-2">Esta sección será completada por el responsable en el evento. Los datos aquí introducidos se usarán para el cálculo del coste real.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
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
                                            value={ajuste.importe}
                                            onChange={(e) => updateAjuste(index, 'importe', e.target.value)}
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
        </TooltipProvider>

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
```
- src/app/page.tsx:
```tsx


'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, BookHeart, Factory, Settings, ChefHat, Component, Package, GlassWater, ChevronRight, ClipboardCheck, ListChecks, History, AlertTriangle, PackagePlus, BarChart3, ShieldCheck, LifeBuoy, Sprout, Warehouse, FileText, Printer, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { almacenNav } from '@/app/almacen/layout';

type SubLink = {
    title: string;
    href: string;
    icon: LucideIcon;
}

type MenuItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    description: string;
    sublinks?: SubLink[];
}

const mainMenuItems: MenuItem[] = [
    { 
        title: 'Book Gastronómico', 
        href: '/book', 
        icon: BookHeart, 
        description: 'Define recetas, elaboraciones e ingredientes.',
        sublinks: [
            { title: 'Recetas', href: '/book/recetas', icon: BookHeart },
            { title: 'Elaboraciones', href: '/book/elaboraciones', icon: Component },
            { title: 'Ingredientes', href: '/book/ingredientes', icon: ChefHat },
            { title: 'Materia Prima (ERP)', href: '/bd/erp', icon: Package },
            { title: 'Menaje', href: '/menaje-db', icon: GlassWater },
            { title: 'Información de Alérgenos', href: '/book/alergenos', icon: Sprout },
        ]
    },
    { 
        title: 'Producción (CPR)', 
        href: '/cpr', 
        icon: Factory, 
        description: 'Planifica, produce y controla la logística de cocina.',
        sublinks: [
            { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardCheck },
            { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory },
            { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks },
            { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus },
            { title: 'Control de Calidad', href: '/cpr/calidad', icon: ShieldCheck },
            { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3 },
            { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: FileText },
            { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History },
            { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle },
        ]
    },
    { 
        title: 'Almacen', 
        href: '/almacen', 
        icon: Warehouse, 
        description: 'Gestiona picking, retornos y logística de material.',
        sublinks: almacenNav,
    },
     { 
        title: 'Bases de Datos', 
        href: '/bd', 
        icon: Package, 
        description: 'Gestiona proveedores, personal y catálogos.',
        sublinks: [
            { title: 'Proveedores', href: '/proveedores', icon: Users },
            { title: 'Personal Interno', href: '/personal', icon: Users },
            { title: 'Tipos de Servicio', href: '/tipo-servicio', icon: ClipboardList },
        ]
    },
     { 
        title: 'Configuración', 
        href: '/configuracion', 
        icon: Settings, 
        description: 'Administra las plantillas y el sistema.',
        sublinks: [
            { title: 'Documentación', href: '/docs', icon: LifeBuoy },
        ]
    },
]

export default function DashboardPage() {
  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow container mx-auto px-4 py-8">
          <section className="mb-10">
            <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4 text-center">Planificación de Servicios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Link href="/pes">
                    <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <ClipboardList className="w-8 h-8 text-primary flex-shrink-0" />
                            <CardTitle>Previsión de Servicios</CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/calendario">
                    <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <Calendar className="w-8 h-8 text-primary flex-shrink-0" />
                            <CardTitle>Calendario</CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
          </section>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainMenuItems.map(item => (
                  <Card key={item.href} className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                      <Link href={item.href} className="flex-grow">
                          <CardHeader className="flex-row items-start gap-4 space-y-0 pb-3">
                              <item.icon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                              <div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CardTitle>{item.title}</CardTitle>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{item.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                          </CardHeader>
                      </Link>
                      {item.sublinks && (
                          <CardContent className="flex-grow pt-0">
                              <div className="border-t pt-2 mt-2">
                                  {item.sublinks.map(sublink => (
                                      <Button key={sublink.href} asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                                          <Link href={sublink.href}>
                                              <sublink.icon className="w-4 h-4 mr-2" />
                                              {sublink.title}
                                              <ChevronRight className="w-4 h-4 ml-auto" />
                                          </Link>
                                      </Button>
                                  ))}
                              </div>
                          </CardContent>
                      )}
                  </Card>
              ))}
          </div>
        </main>
        <footer className="py-4 border-t mt-auto">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MICE Catering. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

```
- src/lib/cpr-nav.ts:
```ts


'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Visión general del taller de producción.' },
    { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardList, description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory, description: 'Gestiona la producción en cocina.' },
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Organiza la expedición para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];

```
- src/lib/constants.ts:
```ts

import type { ObjetivosGasto } from './types';

export const GASTO_LABELS: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Bio',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
};

```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number, decimals: number = 2) {
    return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnit(unit: string) {
    const unitMap: Record<string, string> = {
        'KILO': 'kg',
        'LITRO': 'l',
        'UNIDAD': 'ud',
    }
    return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function calculateHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
        let startTime = parse(start, 'HH:mm', new Date());
        let endTime = parse(end, 'HH:mm', new Date());

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;

        // Si la hora de fin es anterior a la de inicio, asumimos que es del día siguiente
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        console.error("Error calculating hours:", e);
        return 0;
    }
}
```
- src/types/index.ts:
```ts


import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  category: string;
  tipo?: string;
  unidadVenta?: number;
};

export type OrderItem = CateringItem & {
  quantity: number;
  orderId?: string;
  tipo?: string;
  ajustes?: {
      tipo: 'merma' | 'exceso' | 'ajuste manual' | 'devolucion';
      cantidad: number;
      fecha: string;
      comentario: string;
  }[];
};

export type OrderCompletionAssistantInput = {
  eventDescription: string;
};

export type OrderCompletionAssistantOutput = {
  itemCode: string;
  description: string;
  price: number;
  quantity: number;
}[];


export type ServiceOrder = {
    id: string;
    serviceNumber: string;
    startDate: string;
    endDate: string;
    client: string;
    tipoCliente?: 'Empresa' | 'Agencia' | 'Particular';
    finalClient: string;
    contact: string;
    phone: string;
    asistentes: number;
    space: string;
    spaceAddress: string;
    spaceContact: string;
    spacePhone: string;
    spaceMail: string;
    respMetre: string;
    respMetrePhone: string;
    respMetreMail: string;
    respCocinaCPR: string;
    respCocinaCPRPhone: string;
    respCocinaCPRMail: string;
    respPase: string;
    respPasePhone: string;
    respPaseMail: string;
    respCocinaPase: string;
    respCocinaPasePhone: string;
    respCocinaPaseMail: string;
    comercialAsiste: boolean;
    comercial: string;
    comercialPhone: string;
    comercialMail: string;
    rrhhAsiste: boolean;
    respRRHH: string;
    respRRHHPhone: string;
    respRRHHMail: string;
    agencyPercentage: number;
    agencyCommissionValue?: number;
    spacePercentage: number;
    spaceCommissionValue?: number;
    comisionesAgencia?: number;
    comisionesCanon?: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado' | 'Anulado';
    anulacionMotivo?: string;
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
    direccionPrincipal?: string;
    isVip?: boolean;
    email?: string;
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
};


export const DEPARTAMENTOS_PERSONAL = ['Sala', 'Pase', 'CPR', 'RRHH', 'Almacén', 'Comercial', 'Operaciones', 'Marketing', 'HQ'] as const;
export type DepartamentoPersonal = typeof DEPARTAMENTOS_PERSONAL[number];

export type Personal = {
    id: string;
    nombre: string;
    apellidos: string;
    iniciales: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
    dni: string;
    precioHora: number;
}

export const TIPO_ESPACIO = ['Hotel', 'Espacio Singular', 'Finca', 'Restaurante', 'Auditorio', 'Corporativo', 'Centro de Congresos', 'Exterior'] as const;
export const ESTILOS_ESPACIO = ['Clásico', 'Industrial', 'Moderno', 'Rústico', 'Lujoso', 'Minimalista', 'Tecnológico', 'Exterior/Jardín'] as const;
export const TAGS_ESPACIO = ['Con Vistas', 'Terraza', 'Jardín', 'Piscina', 'Discoteca', 'Exclusividad Total', 'Pet-Friendly', 'Parking Propio', 'Luz Natural'] as const;
export const IDEAL_PARA = ['Bodas', 'Eventos Corporativos', 'Presentaciones de producto', 'Rodajes', 'Fiestas Privadas', 'Congresos', 'Ferias'] as const;
export type RelacionComercial = 'Exclusividad' | 'Homologado Preferente' | 'Homologado' | 'Puntual' | 'Sin Relación';


export type Sala = {
  id: string;
  nombreSala: string;
  m2?: number;
  dimensiones?: string;
  alturaMax?: number;
  alturaMin?: number;
  aforoTeatro?: number;
  aforoEscuela?: number;
  aforoCabaret?: number;
  aforoCocktailSala?: number;
  esDiafana: boolean;
  tieneLuzNatural: boolean;
};

export type ContactoEspacio = {
    id: string;
    nombre: string;
    cargo: string;
    telefono: string;
    email: string;
};

export type CuadroElectrico = {
    id: string;
    ubicacion: string;
    potencia: string;
};

export type ImagenEspacio = {
    id: string;
    url: string;
    isPrincipal: boolean;
}

export type MultimediaEspacio = {
    imagenes?: ImagenEspacio[];
    carpetaDRIVE?: string;
    visitaVirtual?: string;
}

export type MetricasOperativas = {
    dificultadMontaje: 1 | 2 | 3 | 4 | 5; // De Fácil a Muy Complejo
    penalizacionPersonalMontaje: number; // Porcentaje extra de personal estimado
    notasDificultadMontaje?: string;
    valoracionOperaciones: 1 | 2 | 3 | 4 | 5; // Calificación interna del equipo de operaciones
    factoresCriticosExito: string[]; // Qué debe salir bien sí o sí
    riesgosPotenciales: string[]; // Qué suele fallar o qué riesgos hay
    notasInternasOperaciones?: string;
};

export type FlowInvitado = {
    accesoPrincipal: string; // Ej: "Recepción principal del hotel", "Entrada directa desde la calle"
    recorridoInvitado: string; // Ej: "Subida en ascensor panorámico a planta 33"
    aparcamiento: string; // Ej: "Valet parking", "Parking público de pago a 200m", "Zona de fácil aparcamiento"
    transportePublico: string; // Paradas de metro/bus/tren cercanas
    accesibilidadAsistentes: string; // Ej: "Acceso y baños adaptados para sillas de ruedas"
    guardarropa: boolean;
    seguridadPropia: boolean;
};

export type Espacio = {
  id: string;
  
  identificacion: {
    nombreEspacio: string;
    tipoDeEspacio: (typeof TIPO_ESPACIO[number])[];
    descripcionCorta?: string;
    descripcionLarga?: string;
    ciudad: string;
    provincia: string;
    calle: string;
    codigoPostal: string;
    zona?: string; 
    estilos: (typeof ESTILOS_ESPACIO[number])[];
    tags: (typeof TAGS_ESPACIO[number])[];
    idealPara: (typeof IDEAL_PARA[number])[];
  };
  
  capacidades: {
    aforoMaximoCocktail: number;
    aforoMaximoBanquete: number;
    salas: Sala[];
  };

  logistica: {
    accesoVehiculos?: string;
    horarioMontajeDesmontaje?: string;
    montacargas: boolean;
    dimensionesMontacargas?: string;
    accesoServicioIndependiente: boolean;
    potenciaTotal?: string;
    cuadrosElectricos?: CuadroElectrico[];
    tomasAgua?: string[];
    desagues?: string[];
    tipoCocina: 'Cocina completa' | 'Office de regeneración' | 'Sin cocina';
    equipamientoCocina?: string[];
    potenciaElectricaCocina?: string;
    tomasAguaCocina: boolean;
    desaguesCocina: boolean;
    extraccionHumos: boolean;
    descripcionOffice?: string;
    zonaAlmacenaje?: string;
    limitadorSonido: boolean;
    permiteMusicaExterior: boolean;
    politicaDecoracion?: string;
    puntosAnclaje: boolean;
    metricasOperativas?: {
        dificultadMontaje: number;
        penalizacionPersonalMontaje: number;
        notasDificultadMontaje?: string;
    };
  };

  evaluacionMICE: {
    proveedorId?: string;
    relacionComercial: RelacionComercial;
    valoracionComercial: number; 
    puntosFuertes: string[];
    puntosDebiles: string[];
    perfilClienteIdeal?: string;
    argumentarioVentaRapido?: string[];
    exclusividadMusica: boolean;
    exclusividadAudiovisuales: boolean;
    otrosProveedoresExclusivos?: string;
    notasComerciales?: string;
    resumenEjecutivoIA?: string;
    valoracionOperaciones: number; 
    factoresCriticosExito: string[];
    riesgosPotenciales: string[];
  };

  experienciaInvitado: {
    flow: FlowInvitado;
    equipamientoAudiovisuales?: string;
    pantalla?: string;
    sistemaSonido?: string;
    escenario?: string;
    conexionWifi?: string;
  };

  contactos: ContactoEspacio[];
  multimedia?: MultimediaEspacio;
  
  espacio: string; 
  escaparateMICE?: string;
  carpetaDRIVE?: string;
  nombreContacto1?: string;
  telefonoContacto1?: string;
  emailContacto1?: string;
  canonEspacioPorcentaje?: number;
  canonEspacioFijo?: number;
  canonMcPorcentaje?: number;
  canonMcFijo?: number;
  comisionAlquilerMcPorcentaje?: number;
  precioOrientativoAlquiler?: string;
  horaLimiteCierre?: string;
  aforoCocktail?: number;
  aforoBanquete?: number;
  auditorio?: string;
  aforoAuditorio?: number;
  zonaExterior?: string;
  capacidadesPorSala?: string;
  numeroDeSalas?: number;
  directorio?: string;
  comentariosVarios?: string;
  cocina?: string;
  plato?: string; 
  homologacion?: string;
  comentariosMarketing?: string;
};


export const ARTICULO_CATERING_CATEGORIAS = ['Bodega', 'Almacen', 'Bio', 'Hielo', 'Alquiler', 'Menaje', 'Decoracion', 'Servicios', 'Otros'] as const;
export type ArticuloCateringCategoria = typeof ARTICULO_CATERING_CATEGORIAS[number];

export type ArticuloCatering = {
    id: string;
    erpId?: string;
    nombre: string;
    categoria: ArticuloCateringCategoria;
    esHabitual?: boolean;
    precioVenta: number;
    precioAlquiler: number;
    precioReposicion: number;
    unidadVenta?: number;
    stockSeguridad?: number;
    tipo?: string;
    loc?: string;
    imagen?: string;
    producidoPorPartner?: boolean;
    partnerId?: string;
    recetaId?: string; 
    subcategoria?: string;
}


export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    tipoTransporte: string; // Ej. "Furgoneta Isotermo"
    precio: number;
    tipo: 'Catering' | 'Entregas';
}

export type CategoriaPersonal = {
  id: string;
  proveedorId: string;
  nombreProveedor: string;
  categoria: string;
  precioHora: number;
};

export type ComercialBriefingItem = {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    conGastronomia: boolean;
    descripcion: string;
    comentarios: string;
    sala: string;
    asistentes: number;
    precioUnitario: number;
    importeFijo?: number;
    bebidas?: string;
    matBebida?: string;
    materialGastro?: string;
    manteleria?: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
}

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    descripcion: string;
    fecha: string;
    horaInicio: string;
    asistentes: number;
    comentarios?: string;
    sala?: string;
    items: GastronomyOrderItem[];
    total: number;
}

export type TransporteOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoTransporte: string;
    precio: number;
    lugarRecogida: string;
    horaRecogida: string;
    lugarEntrega: string;
    horaEntrega: string;
    observaciones?: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string;
    firmadoPor?: string;
    dniReceptor?: string;
    fechaFirma?: string;
    hitosIds?: string[]; // For Entregas, to link multiple deliveries
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: { id: string; producto: string; precio: number; cantidad: number }[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
};

export type DecoracionDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type DecoracionOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  precio: number;
  observaciones?: string;
};

export type AtipicoDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type AtipicoOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  observaciones?: string;
  precio: number;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
};

export type PersonalMiceOrder = {
    id: string;
    osId: string;
    centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
    nombre: string;
    dni: string;
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal: string;
    horaSalidaReal: string;
}

export type PersonalExternoOrder = {
  id: string;
  osId: string;
  proveedorId: string;
  categoria: string;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  solicitadoPor: 'Sala' | 'Pase' | 'Otro';
  tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
  observaciones?: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
};

export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
    referencia: string;
    observaciones?: string;
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales: string;
    costePruebaMenu?: number;
};

export type CtaExplotacionObjetivos = {
    gastronomia: number;
    bodega: number;
    consumibles: number;
    hielo: number;
    almacen: number;
    alquiler: number;
    transporte: number;
    decoracion: number;
    atipicos: number;
    personalMice: number;
    personalExterno: number;
    costePruebaMenu: number;
}

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
};

export type PersonalExternoAjuste = {
    id: string;
    proveedorId: string;
    concepto: string;
    importe: number;
}
export const UNIDADES_MEDIDA = ['UNIDAD', 'KILO', 'LITRO', 'GRAMO', 'BOTELLA', 'CAJA', 'PACK'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  idProveedor: z.string().optional(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string().optional(),
  nombreProveedor: z.string().optional(),
  familiaCategoria: z.string().optional(),
  precioCompra: z.coerce.number().min(0, "Debe ser un valor positivo."),
  unidadConversion: z.coerce.number().min(1, "Debe ser mayor que 0.").default(1),
  precio: z.coerce.number().min(0),
  precioAlquiler: z.coerce.number().min(0).optional(),
  unidad: z.enum(UNIDADES_MEDIDA),
  tipo: z.string().optional(),
  alquiler: z.boolean().default(false),
  observaciones: z.string().optional(),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: string[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: 'KILO' | 'LITRO' | 'UNIDAD';
  merma: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Receta = {
    id: string;
    numeroReceta?: string;
    nombre: string;
    nombre_en?: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    descripcionComercial_en?: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: { id: string; menajeId: string; descripcion: string; ratio: number }[];
    instruccionesMiseEnPlace: string;
    fotosMiseEnPlaceURLs?: string[];
    instruccionesRegeneracion: string;
    fotosRegeneracionURLs?: string[];
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: string[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO';
    tecnicaCoccionPrincipal?: string;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL', 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    // Calculated fields
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
}

export type OrdenFabricacion = {
    id: string;
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadReal?: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    responsable?: string;
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    osIDs: string[];
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsableCalidad?: string;
    fechaValidacionCalidad?: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
}

export type PickingItemState = {
    itemCode: string;
    checked: boolean;
    pickedQuantity: number;
    incidentComment?: string;
    resolved?: boolean;
};

export type MaterialOrderType = 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';

export type PickingSheet = {
    id: string; // Composite key: osId + fechaNecesidad
    osId: string;
    fechaNecesidad: string;
    items: (OrderItem & { type: MaterialOrderType })[];
    status: 'Pendiente' | 'En Proceso' | 'Listo';
    checkedItems?: string[];
    itemStates?: Record<string, Omit<PickingItemState, 'itemCode'>>;
    os?: ServiceOrder;
    solicitante?: 'Sala' | 'Cocina';
};

export type ReturnItemState = {
    returnedQuantity: number;
    incidentComment?: string;
    isReviewed?: boolean;
};

export type ReturnSheet = {
    id: string; // osId
    osId: string;
    items: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrderType; })[];
    status: 'Pendiente' | 'Procesando' | 'Completado';
    itemStates: Record<string, ReturnItemState>; // Key is `${orderId}_${itemCode}`
    os?: ServiceOrder;
}

export type ContenedorIsotermo = {
    id: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type LoteAsignado = {
    allocationId: string;
    ofId: string;
    containerId: string;
    quantity: number;
    hitoId: string
}
export type ContenedorDinamico = {
    id: string;
    hitoId: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';
export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
};
export type PedidoPlantillaItem = {
    itemCode: string;
    quantity: number;
    description: string;
};
export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: PedidoPlantillaItem[];
};
export type FormatoExpedicion = {
  id: string;
  nombre: string;
};

export type StockLote = {
    ofId: string;
    cantidad: number;
    fechaCaducidad: string;
};

export type StockElaboracion = {
    elaboracionId: string;
    cantidadTotal: number;
    unidad: UnidadMedida;
    lotes: StockLote[];
}

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Packs', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ImagenProducto = {
  id: string;
  url: string;
  isPrincipal: boolean;
}

export type ProductoVentaComponente = {
    erpId: string;
    nombre: string;
    cantidad: number;
    coste?: number;
};

export type ProductoVenta = {
    id: string;
    nombre: string;
    nombre_en?: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    partnerId?: string;
    recetaId?: string;
    erpId?: string;
    exclusivoIfema?: boolean;
    componentes?: ProductoVentaComponente[];
}

export type PedidoEntregaItem = {
    id: string; // ProductoVenta ID
    nombre: string;
    quantity: number;
    pvp: number;
    coste: number;
    categoria: CategoriaProductoVenta;
};
export type EntregaHito = {
    id: string;
    fecha: string;
    hora: string;
    lugarEntrega: string;
    localizacion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    observaciones?: string;
    items: PedidoEntregaItem[];
    portes?: number;
    horasCamarero?: number;
}
export type PedidoEntrega = {
    osId: string;
    hitos: EntregaHito[];
};
export type Entrega = ServiceOrder & {
    vertical: 'Entregas';
    tarifa: 'Empresa' | 'IFEMA';
};
export type PedidoPartner = {
    id: string; // hitoId-productoId
    osId: string;
    serviceNumber: string;
    expedicionNumero: string;
    cliente: string;
    fechaEntrega: string; // En CPR MICE
    horaEntrega: string;  // En CPR MICE
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
}
export type PedidoPartnerStatus = 'Pendiente' | 'En Producción' | 'Listo para Entrega';
export type PickingIncidencia = {
  itemId: string;
  comment: string;
  timestamp: string;
};
export type PickingEntregaState = {
  hitoId: string;
  status: 'Pendiente' | 'En Proceso' | 'Preparado';
  checkedItems: Set<string>;
  incidencias: PickingIncidencia[];
  fotoUrl: string | null;
  ordenItems?: string[];
};

export const TIPO_PROVEEDOR_OPCIONES = ['Transporte', 'Hielo', 'Gastronomia', 'Personal', 'Atipicos', 'Decoracion', 'Servicios', 'Otros', 'Alquiler'] as const;
export type TipoProveedor = typeof TIPO_PROVEEDOR_OPCIONES[number];

export type Proveedor = {
  id: string;
  cif: string;
  IdERP?: string;
  nombreEmpresa: string;
  nombreComercial: string;
  direccionFacturacion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  emailContacto: string;
  telefonoContacto: string;
  iban?: string;
  formaDePagoHabitual?: string;
  tipos: TipoProveedor[];
};

export const ESTADO_PERSONAL_ENTREGA = ['Pendiente', 'Asignado'] as const;
export type EstadoPersonalEntrega = typeof ESTADO_PERSONAL_ENTREGA[number];

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
  comentarios: string;
  comentariosMice?: string;
  rating?: number;
  horaEntradaReal: string;
  horaSalidaReal: string;
};

export type PersonalEntregaTurno = {
  id: string;
  proveedorId: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  categoria: string;
  precioHora: number;
  observaciones: string;
  statusPartner: 'Pendiente Asignación' | 'Gestionado';
  asignaciones: AsignacionPersonal[];
  requiereActualizacion?: boolean;
};

export type PersonalEntrega = {
    osId: string;
    turnos: PersonalEntregaTurno[];
    status: EstadoPersonalEntrega;
    observacionesGenerales?: string;
};


// --- PORTAL & AUTH ---
export const PORTAL_ROLES = ['Partner Gastronomia', 'Partner Personal', 'Transporte', 'Admin', 'Comercial', 'CPR', 'Pase', 'Dirección', 'Almacen', 'Operaciones', 'Project Manager'] as const;
export type PortalUserRole = typeof PORTAL_ROLES[number];

export type PortalUser = {
  id: string;
  email: string;
  nombre: string;
  roles: PortalUserRole[];
  proveedorId?: string; // Linked to Proveedor DB
}

export type ActivityLog = {
    id: string;
    timestamp: string; // ISO 8601
    userId: string;
    userName: string;
    userRole: PortalUserRole;
    action: string;
    details: string;
    entityId: string; // ID of the entity being acted upon (e.g., OS ID, Turno ID)
}

export type ComercialAjuste = {
    id: string;
    concepto: string;
    importe: number;
}
export type Precio = {
    id: string;
    categoria: string;
    producto: string;
    precioUd: number;
    precioAlquilerUd: number;
    unidad: string;
    observaciones: string;
    loc: string;
    imagen: string;
    unidadVenta?: number;
}

export type MenajeDB = {
    id: string;
    descripcion: string;
    categoria: string;
    imagen: string;
}

export type TipoCocina = {
    id: string;
    nombre: string;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}
```
- tailwind.config.ts:
```ts

import type {Config} from 'tailwindcss';
const {fontFamily} = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-body)', ...fontFamily.sans],
        headline: ['var(--font-headline)', ...fontFamily.sans],
        code: ['monospace'],
      },
      typography: (theme: (arg0: string) => any) => ({
        DEFAULT: {
          css: {
            h1: {
              fontFamily: theme('fontFamily.headline'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
            },
            '--tw-prose-bullets': theme('colors.primary.DEFAULT'),
          },
        },
      }),
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;


```
- tsconfig.json:
```json

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types/index.ts"],
      "@/dnd/*": ["components/dnd/*"]
    },
    "types": ["node", "@types/papaparse", "@types/nprogress", "jspdf-autotable", "@types/react-signature-canvas"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```
