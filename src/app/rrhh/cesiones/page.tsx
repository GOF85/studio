
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Shuffle, Save, Loader2, Trash2, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import type { Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { calculateHours, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH', 'ALMACEN', 'COMERCIAL', 'DIRECCION', 'MARKETING', 'PASE', 'CPR'] as const;

// Schema for the form inside the modal
const cesionFormSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  centroCoste: z.enum(centroCosteOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  comentarios: z.string().optional().default(''),
});

type CesionFormValues = z.infer<typeof cesionFormSchema>;

// The type for data stored in localStorage and state, where date is a string
type CesionStorage = Omit<CesionFormValues, 'fecha'> & { fecha: string };

function CommentDialog({ comment, onSave }: { comment: string, onSave: (text: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState(comment);
    
    useEffect(() => {
        setText(comment);
    }, [comment, isOpen]);

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                    <Pencil className={cn("h-4 w-4", comment && "text-primary")} />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentarios de la Cesión</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={text} 
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="Añade aquí comentarios..."
                />
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={() => { onSave(text); setIsOpen(false); }}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

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
            fecha: new Date(),
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
                        <FormField control={form.control} name="centroCoste" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dpto. Destino</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="horaEntrada" render={({ field }) => <FormItem><FormLabel>H. Entrada Planificada</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                            <FormField control={form.control} name="horaSalida" render={({ field }) => <FormItem><FormLabel>H. Salida Planificada</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="horaEntradaReal" render={({ field }) => <FormItem><FormLabel>H. Entrada Real</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                            <FormField control={form.control} name="horaSalidaReal" render={({ field }) => <FormItem><FormLabel>H. Salida Real</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
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


export default function CesionesPersonalPage() {
  const [cesiones, setCesiones] = useState<CesionStorage[]>([]);
  const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
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
    setCesiones(storedCesiones ? JSON.parse(storedCesiones) : []);
    setIsMounted(true);
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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Cesiones de Personal..." />;
  }

  return (
    <main>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Shuffle />Cesiones de Personal Interno</h1>
            <Button onClick={handleNewClick}><PlusCircle className="mr-2"/>Añadir Cesión</Button>
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
                        <TableHead className="p-2">Fecha</TableHead>
                        <TableHead className="p-2">Empleado</TableHead>
                        <TableHead className="p-2">Dpto. Origen</TableHead>
                        <TableHead className="p-2">Dpto. Destino</TableHead>
                        <TableHead className="p-2">Horario Planificado</TableHead>
                        <TableHead className="p-2">Horario Real</TableHead>
                        <TableHead className="p-2 text-right">Coste Planificado</TableHead>
                        <TableHead className="p-2 text-right">Coste Real</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCesiones.length > 0 ? filteredCesiones.map((cesion) => {
                        const horasPlan = calculateHours(cesion.horaEntrada, cesion.horaSalida);
                        const costePlanificado = horasPlan * cesion.precioHora;
                        const horasReal = calculateHours(cesion.horaEntradaReal, cesion.horaSalidaReal);
                        const costeReal = (horasReal || horasPlan) * cesion.precioHora;
                        const dptoOrigen = personalMap.get(cesion.nombre)?.departamento || 'N/A';

                        return (
                            <TableRow key={cesion.id} onClick={() => handleRowClick(cesion)} className="cursor-pointer">
                                <TableCell className="p-2 font-semibold">{format(new Date(cesion.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="p-2 font-semibold">{cesion.nombre}</TableCell>
                                <TableCell className="p-2">{dptoOrigen}</TableCell>
                                <TableCell className="p-2"><Badge variant="outline">{cesion.centroCoste}</Badge></TableCell>
                                <TableCell className="p-2">{cesion.horaEntrada} - {cesion.horaSalida} ({horasPlan.toFixed(2)}h)</TableCell>
                                <TableCell className="p-2">{cesion.horaEntradaReal && cesion.horaSalidaReal ? `${cesion.horaEntradaReal} - ${cesion.horaSalidaReal} (${horasReal.toFixed(2)}h)` : '-'}</TableCell>
                                <TableCell className="p-2 font-mono text-right">{formatCurrency(costePlanificado)}</TableCell>
                                <TableCell className="p-2 font-mono font-semibold text-right">{formatCurrency(costeReal)}</TableCell>
                            </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">No hay cesiones de personal que coincidan con los filtros.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

        <CesionModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            onSave={handleSave}
            personalDB={Array.from(personalMap.values())}
            initialData={editingCesion}
            onDelete={handleDelete}
        />
    </main>
  );
}

