
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Shuffle, Save, Loader2, Trash2, Pencil, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import type { Personal, CesionStorage, EstadoCesionPersonal, CentroCoste } from '@/types';
import { ESTADO_CESION_PERSONAL, CENTRO_COSTE_OPCIONES } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { calculateHours, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const cesionFormSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  centroCoste: z.enum(CENTRO_COSTE_OPCIONES),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.string().optional(),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  comentarios: z.string().optional().default(''),
  estado: z.enum(ESTADO_CESION_PERSONAL),
});

type CesionFormValues = z.infer<typeof cesionFormSchema>;

function CesionModal({ open, onOpenChange, onSave, personalDB, initialData, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (data: CesionStorage) => void; personalDB: Personal[]; initialData?: Partial<CesionStorage> | null; onDelete?: (id: string) => void; }) {
    const form = useForm<CesionFormValues>({
        resolver: zodResolver(cesionFormSchema),
    });

    useEffect(() => {
        const defaults: Partial<CesionFormValues> = {
            id: Date.now().toString(),
            centroCoste: 'CPR',
            horaEntrada: '09:00',
            horaSalida: '17:00',
            estado: 'Solicitado',
            ...initialData,
            fecha: initialData?.fecha ? new Date(initialData.fecha) : new Date(),
        };
        form.reset(defaults);
    }, [initialData, open, form]);

    const handlePersonalChange = (name: string) => {
        const person = personalDB.find(p => p.nombreCompleto === name);
        if (person) {
            form.setValue('nombre', person.nombreCompleto, { shouldDirty: true });
            form.setValue('dni', person.dni || '', { shouldDirty: true });
            form.setValue('precioHora', person.precioHora || 0, { shouldDirty: true });
        }
    };

    const personalOptions = useMemo(() => {
        return personalDB.map(p => ({ label: p.nombreCompleto, value: p.nombreCompleto }));
    }, [personalDB]);

    const onSubmit = (data: CesionFormValues) => {
        const dataToSave: CesionStorage = {
            ...data,
            fecha: format(data.fecha, 'yyyy-MM-dd'),
        };
        onSave(dataToSave);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar' : 'Nueva'} Cesión de Personal</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel>
                                    <Popover><PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="nombre" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Empleado</FormLabel>
                                    <Combobox options={personalOptions} value={field.value} onChange={(value) => { field.onChange(value); handlePersonalChange(value); }} placeholder="Seleccionar empleado..." />
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="centroCoste" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dpto. Destino</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{CENTRO_COSTE_OPCIONES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="estado" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{ESTADO_CESION_PERSONAL.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="horaEntrada" render={({ field }) => <FormItem><FormLabel>H. Entrada Planificada</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                            <FormField control={form.control} name="horaSalida" render={({ field }) => <FormItem><FormLabel>H. Salida Planificada</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                        </div>
                        <FormField control={form.control} name="comentarios" render={({ field }) => <FormItem><FormLabel>Comentarios</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                        <DialogFooter>
                            {initialData && onDelete && (
                                <Button type="button" variant="destructive" onClick={() => { onDelete(initialData.id!); onOpenChange(false); }}>
                                    <Trash2 className="mr-2" />Eliminar
                                </Button>
                            )}
                            <div className="flex-grow"></div>
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit"><Save className="mr-2" />Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const statusVariant: { [key in EstadoCesionPersonal]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobado': 'outline',
  'Asignado': 'default',
  'Cerrado': 'success',
  'Rechazado': 'destructive',
};

export default function CesionesPersonalPage() {
  const [cesiones, setCesiones] = useState<CesionStorage[]>([]);
  const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCesion, setEditingCesion] = useState<Partial<CesionStorage> | null>(null);

  const loadData = useCallback(() => {
    let storedPersonal = localStorage.getItem('personal');
    const pMap = new Map<string, Personal>();
    if (storedPersonal) {
        (JSON.parse(storedPersonal) as Personal[]).forEach(p => pMap.set(p.nombreCompleto, p));
    }
    setPersonalMap(pMap);

    let storedCesiones = localStorage.getItem('cesionesPersonal');
    const parsedCesiones = (storedCesiones ? JSON.parse(storedCesiones) : []);
    setCesiones(parsedCesiones);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSave = (data: CesionStorage) => {
    let allCesiones = [...cesiones];
    const index = allCesiones.findIndex(c => c.id === data.id);

    if (index > -1) {
        allCesiones[index] = data;
        toast({title: "Cesión actualizada"});
    } else {
        allCesiones.push(data);
        toast({title: "Cesión creada"});
    }
    
    localStorage.setItem('cesionesPersonal', JSON.stringify(allCesiones));
    setCesiones(allCesiones);
  };
  
  const handleDelete = (id: string) => {
    const updatedCesiones = cesiones.filter(c => c.id !== id);
    localStorage.setItem('cesionesPersonal', JSON.stringify(updatedCesiones));
    setCesiones(updatedCesiones);
    toast({ title: 'Cesión eliminada' });
  };
  
  const handleRowClick = (cesion: CesionStorage) => {
    setEditingCesion(cesion);
    setIsModalOpen(true);
  }
  
  const handleNewClick = () => {
    setEditingCesion(null);
    setIsModalOpen(true);
  }

  const filteredCesiones = useMemo(() => {
    return cesiones.filter(({ nombre, centroCoste, comentarios }) => {
      const term = searchTerm.toLowerCase();
      return (
        nombre.toLowerCase().includes(term) ||
        centroCoste.toLowerCase().includes(term) ||
        (comentarios || '').toLowerCase().includes(term)
      );
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.nombre.localeCompare(b.nombre));
  }, [cesiones, searchTerm]);

