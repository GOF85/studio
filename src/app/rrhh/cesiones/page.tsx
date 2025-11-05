
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, Save, Loader2, Pencil, Shuffle } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
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
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { calculateHours, formatCurrency } from '@/lib/utils';


const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH', 'ALMACEN', 'COMERCIAL', 'DIRECCION', 'MARKETING', 'PASE', 'CPR'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga', 'Limpieza', 'Apoyo Oficina'] as const;


const cesionSchema = z.object({
  id: z.string(),
  osId: z.string().optional(), // No es obligatorio para cesiones internas
  centroCoste: z.enum(centroCosteOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  comentarios: z.string().optional().default(''),
});

const formSchema = z.object({
    cesiones: z.array(cesionSchema)
});

type FormValues = z.infer<typeof formSchema>;

function CommentDialog({ index, form, onSave }: { index: number; form: any, onSave: (data: FormValues) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const { getValues, setValue } = form;

    const fieldName = `cesiones.${index}.comentarios`;
    const dialogTitle = `Observaciones para: ${getValues(`cesiones.${index}.nombre`)}`;

    const [comment, setComment] = useState(getValues(fieldName) || '');

    const handleSave = () => {
        setValue(fieldName, comment, { shouldDirty: true });
        onSave(getValues());
        setIsOpen(false);
    };
    
    useEffect(() => {
        if(isOpen) {
            setComment(getValues(fieldName) || '');
        }
    }, [isOpen, getValues, fieldName]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                    <Pencil className={cn("h-4 w-4", getValues(fieldName) && "text-primary")} />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Añade aquí comentarios..."
                />
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CesionesPersonalPage() {
  const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { cesiones: [] }
  });

  const { control, getValues, setValue, handleSubmit, reset, formState } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cesiones",
  });

  const loadData = useCallback(() => {
    let storedPersonal = localStorage.getItem('personal');
    const pMap = new Map<string, Personal>();
     if (storedPersonal) {
        (JSON.parse(storedPersonal) as Personal[]).forEach(p => pMap.set(p.nombreCompleto, p));
    }
    setPersonalMap(pMap);
    
    let storedCesiones = localStorage.getItem('cesionesPersonal');
    reset({ cesiones: storedCesiones ? JSON.parse(storedCesiones) : [] });
    setIsMounted(true);
  }, [reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handlePersonalChange = useCallback((index: number, name: string) => {
    const person = personalMap.get(name);
    if (person) {
      setValue(`cesiones.${index}.nombre`, person.nombreCompleto, { shouldDirty: true });
      setValue(`cesiones.${index}.dni`, person.dni || '', { shouldDirty: true });
      setValue(`cesiones.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true });
    }
  }, [personalMap, setValue]);


  const filteredCesiones = useMemo(() => {
    return fields.map((field, index) => ({ field, index })).filter(({ field }) => {
      const searchMatch = searchTerm === '' ||
        field.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (field.comentarios || '').toLowerCase().includes(searchTerm.toLowerCase());

      return searchMatch;
    }).sort((a,b) => {
        return a.field.nombre.localeCompare(b.field.nombre);
    });
  }, [fields, searchTerm]);
  
  const personalOptions = useMemo(() => Array.from(personalMap.keys()).map(p => ({ label: p, value: p})), [personalMap]);

  const addRow = () => {
    const newId = Date.now().toString();
    append({
        id: newId,
        centroCoste: 'CPR',
        nombre: '',
        dni: '',
        tipoServicio: 'Producción',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        precioHora: 0,
        horaEntradaReal: '',
        horaSalidaReal: '',
        comentarios: '',
    });
  };

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    localStorage.setItem('cesionesPersonal', JSON.stringify(data.cesiones));
    setTimeout(() => {
        setIsLoading(false);
        toast({ title: "Guardado", description: "Las cesiones de personal han sido guardadas." });
        reset(data);
    }, 500);
  }

  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
        remove(rowToDelete);
        setRowToDelete(null);
        toast({ title: 'Fila eliminada', description: 'La fila se ha eliminado. Guarda los cambios para hacerlo permanente.' });
    }
  }
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Cesiones de Personal..." />;
  }

  return (
    <main>
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Shuffle />Cesiones de Personal Interno</h1>
                <div className="flex gap-2">
                    <Button onClick={addRow}><PlusCircle className="mr-2"/>Añadir Cesión</Button>
                    <Button type="submit" disabled={isLoading || !formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <Input 
                placeholder="Buscar por empleado, departamento, comentario..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm"
                />
            </div>
            
            <div className="border rounded-lg overflow-x-auto">
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="p-1 min-w-48">Empleado</TableHead>
                            <TableHead className="p-1">Dpto. Origen</TableHead>
                            <TableHead className="p-1">Dpto. Destino</TableHead>
                            <TableHead className="p-1 min-w-40">Tipo Servicio</TableHead>
                            <TableHead className="p-1 w-24">H. Entrada</TableHead>
                            <TableHead className="p-1 w-24">H. Salida</TableHead>
                            <TableHead className="p-1 w-24">H. Entrada Real</TableHead>
                            <TableHead className="p-1 w-24">H. Salida Real</TableHead>
                            <TableHead className="p-1 text-right">Coste Planificado</TableHead>
                            <TableHead className="p-1 text-right">Coste Real</TableHead>
                            <TableHead className="p-1 text-center">Comentarios</TableHead>
                            <TableHead className="p-1 text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCesiones.length > 0 ? filteredCesiones.map(({ field, index }) => {
                            const cesion = field; // Use field directly
                            const horasPlan = calculateHours(cesion.horaEntrada, cesion.horaSalida);
                            const costePlanificado = horasPlan * (cesion.precioHora || 0);
                            const horasReal = calculateHours(cesion.horaEntradaReal, cesion.horaSalidaReal);
                            const costeReal = (horasReal || horasPlan) * (cesion.precioHora || 0);
                            const dptoOrigen = personalMap.get(cesion.nombre)?.departamento || 'N/A';

                            return (
                                <TableRow key={field.id}>
                                    <TableCell className="p-1">
                                         <FormField control={control} name={`cesiones.${index}.nombre`} render={({field}) => (
                                            <Combobox options={personalOptions} value={field.value} onChange={(value) => { field.onChange(value); handlePersonalChange(index, value); }} placeholder="Seleccionar empleado..."/>
                                        )}/>
                                    </TableCell>
                                    <TableCell className="p-1 font-semibold">{dptoOrigen}</TableCell>
                                    <TableCell className="p-1">
                                        <FormField control={control} name={`cesiones.${index}.centroCoste`} render={({field}) => (
                                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        )}/>
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <FormField control={control} name={`cesiones.${index}.tipoServicio`} render={({field}) => (
                                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        )}/>
                                    </TableCell>
                                    <TableCell className="p-1"><FormField control={control} name={`cesiones.${index}.horaEntrada`} render={({field}) => <Input type="time" {...field} className="h-8 text-xs"/>}/></TableCell>
                                    <TableCell className="p-1"><FormField control={control} name={`cesiones.${index}.horaSalida`} render={({field}) => <Input type="time" {...field} className="h-8 text-xs"/>}/></TableCell>
                                    <TableCell className="p-1"><FormField control={control} name={`cesiones.${index}.horaEntradaReal`} render={({field}) => <Input type="time" {...field} className="h-8 text-xs"/>}/></TableCell>
                                    <TableCell className="p-1"><FormField control={control} name={`cesiones.${index}.horaSalidaReal`} render={({field}) => <Input type="time" {...field} className="h-8 text-xs"/>}/></TableCell>
                                    <TableCell className="p-2 font-mono text-right">{formatCurrency(costePlanificado)}</TableCell>
                                    <TableCell className="p-2 font-mono font-semibold text-right">{formatCurrency(costeReal)}</TableCell>
                                    <TableCell className="p-1 text-center">
                                       <CommentDialog index={index} form={form} onSave={handleSubmit(onSubmit)} />
                                    </TableCell>
                                    <TableCell className="p-1 text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" type="button" onClick={() => setRowToDelete(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow>
                                <TableCell colSpan={12} className="h-24 text-center">No hay cesiones de personal que coincidan con los filtros.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            </form>
       </FormProvider>
       <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción eliminará la fila de la tabla. El cambio será permanente al guardar.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteRow}
                >
                Eliminar Fila
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}
