
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Users, Save, PlusCircle, Trash2, Loader2, Building, Phone } from 'lucide-react';
import type { Entrega, PedidoEntrega, EntregaHito, Personal, ProveedorPersonal, PersonalEntrega } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
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


const personalAsignadoSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  dni: z.string().optional(),
});

const asignacionSchema = z.object({
  id: z.string(),
  osId: z.string(),
  proveedorId: z.string().min(1, 'El proveedor es obligatorio.'),
  turno: z.object({
    fecha: z.date(),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  }),
  trabajadores: z.array(personalAsignadoSchema).min(1, "Debe haber al menos un trabajador."),
  status: z.enum(['Pendiente', 'Asignado a ETT', 'Confirmado']),
});

const formSchema = z.object({
  asignaciones: z.array(asignacionSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function GestionPersonalEntregaPage() {
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [hitos, setHitos] = useState<EntregaHito[]>([]);
    const [personalDB, setPersonalDB] = useState<Personal[]>([]);
    const [proveedoresDB, setProveedoresDB] = useState<ProveedorPersonal[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<{ asignacionIndex: number; trabajadorIndex: number } | null>(null);


    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { asignaciones: [] },
    });
    
    const { control, setValue, getValues, watch } = form;

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "asignaciones",
    });

    const loadData = useCallback(() => {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(e => e.id === osId);
        setEntrega(currentEntrega || null);

        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        setHitos(currentPedido?.hitos || []);
        
        const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalDB(allPersonal);
        
        const allProveedores = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]') as ProveedorPersonal[];
        setProveedoresDB(allProveedores);
        
        const allAsignaciones = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
        const relatedAsignaciones = allAsignaciones.filter(a => a.osId === osId).map(a => ({...a, turno: {...a.turno, fecha: new Date(a.turno.fecha)}}));
        form.reset({ asignaciones: relatedAsignaciones });

        setIsMounted(true);
    }, [osId, form]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const addTurno = () => {
        if (!entrega) return;
        append({
            id: Date.now().toString(),
            osId,
            proveedorId: '',
            turno: {
                fecha: new Date(entrega.startDate),
                horaInicio: '08:00',
                horaFin: '12:00'
            },
            trabajadores: [],
            status: 'Pendiente',
        });
    }

    const addTrabajador = (asignacionIndex: number) => {
        const asignaciones = getValues('asignaciones');
        const updatedAsignaciones = [...asignaciones];
        updatedAsignaciones[asignacionIndex].trabajadores.push({ id: Date.now().toString(), nombre: '', dni: '' });
        setValue('asignaciones', updatedAsignaciones, { shouldDirty: true });
    }
    
    const handlePersonalChange = (asignacionIndex: number, trabajadorIndex: number, name: string) => {
        const person = personalDB.find(p => p.nombre.toLowerCase() === name.toLowerCase());
        setValue(`asignaciones.${asignacionIndex}.trabajadores.${trabajadorIndex}.nombre`, name, { shouldDirty: true });
        if (person) {
            setValue(`asignaciones.${asignacionIndex}.trabajadores.${trabajadorIndex}.dni`, person.dni || '', { shouldDirty: true });
        }
    }
    
     const handleDeleteRow = () => {
        if (rowToDelete !== null) {
            const { asignacionIndex, trabajadorIndex } = rowToDelete;
            const asignaciones = getValues('asignaciones');
            const updatedAsignaciones = [...asignaciones];
            updatedAsignaciones[asignacionIndex].trabajadores.splice(trabajadorIndex, 1);
            setValue('asignaciones', updatedAsignaciones, { shouldDirty: true });
            setRowToDelete(null);
        }
    };


    const onSubmit = (data: FormValues) => {
        setIsLoading(true);
        const allAsignaciones = JSON.parse(localStorage.getItem('personalEntregas') || '[]') as PersonalEntrega[];
        const otherOsAsignaciones = allAsignaciones.filter(a => a.osId !== osId);
        
        const currentOsAsignaciones = data.asignaciones.map(a => ({
            ...a,
            proveedorNombre: proveedoresDB.find(p => p.id === a.proveedorId)?.nombreProveedor || '',
            turno: {
                ...a.turno,
                fecha: format(a.turno.fecha, 'yyyy-MM-dd')
            }
        }));

        const updatedAllAsignaciones = [...otherOsAsignaciones, ...currentOsAsignaciones];
        localStorage.setItem('personalEntregas', JSON.stringify(updatedAllAsignaciones));
        
        setTimeout(() => {
            toast({ title: "Guardado", description: "Las asignaciones de personal han sido guardadas." });
            setIsLoading(false);
            form.reset(data);
        }, 500);
    }
    
    const personalOptions = useMemo(() => {
        return personalDB.map(p => ({ label: p.nombre, value: p.nombre.toLowerCase() }));
    }, [personalDB]);

    const proveedoresOptions = useMemo(() => {
        const uniqueProviders = new Map<string, string>();
        proveedoresDB.forEach(p => {
            if (!uniqueProviders.has(p.nombreProveedor)) {
                uniqueProviders.set(p.nombreProveedor, p.id);
            }
        });
        return Array.from(uniqueProviders.entries()).map(([nombre, id]) => ({ label: nombre, value: id }));
    }, [proveedoresDB]);

    if (!isMounted || !entrega) {
        return <LoadingSkeleton title="Cargando Gestión de Personal..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')} className="mb-2">
                            <ArrowLeft className="mr-2" /> Volver al cuadrante
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <Users />Asignación de Personal: {entrega.serviceNumber}
                        </h1>
                         <p className="text-muted-foreground">{entrega.client}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar Cambios</span>
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <Button type="button" onClick={addTurno}><PlusCircle className="mr-2"/>Añadir Turno / Proveedor</Button>
                    {fields.map((field, asignacionIndex) => (
                        <Card key={field.id}>
                            <CardHeader>
                                <CardTitle>Turno de Trabajo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-4 gap-4 mb-4 items-end">
                                     <FormField
                                        control={control}
                                        name={`asignaciones.${asignacionIndex}.proveedorId`}
                                        render={({ field: formField }) => (
                                            <FormItem>
                                                <FormLabel>Proveedor (ETT)</FormLabel>
                                                <Select onValueChange={formField.onChange} value={formField.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {proveedoresDB.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.categoria}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    {/* ... turno fields ... */}
                                </div>
                                <h4 className="font-semibold mt-6 mb-2">Trabajadores Asignados</h4>
                                {field.trabajadores.map((trabajador, trabajadorIndex) => (
                                   <div key={trabajador.id} className="flex items-end gap-2 mb-2">
                                         <FormField
                                            control={control}
                                            name={`asignaciones.${asignacionIndex}.trabajadores.${trabajadorIndex}.nombre`}
                                            render={({ field: nameField }) => (
                                                <FormItem className="flex-grow">
                                                    <FormLabel>Nombre</FormLabel>
                                                    <Combobox
                                                        options={personalOptions}
                                                        value={nameField.value}
                                                        onChange={(value) => handlePersonalChange(asignacionIndex, trabajadorIndex, value)}
                                                        placeholder="Nombre del trabajador..."
                                                    />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name={`asignaciones.${asignacionIndex}.trabajadores.${trabajadorIndex}.dni`}
                                            render={({ field: dniField }) => (
                                                <FormItem>
                                                    <FormLabel>DNI</FormLabel>
                                                    <FormControl><Input {...dniField} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setRowToDelete({asignacionIndex, trabajadorIndex})}><Trash2/></Button>
                                   </div>
                                ))}
                                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => addTrabajador(asignacionIndex)}>
                                    <PlusCircle className="mr-2"/>Añadir Trabajador
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </form>
            </Form>
             <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar trabajador?</AlertDialogTitle>
                    <AlertDialogDescription>Se quitará a este trabajador de la asignación.</AlertDialogDescription>
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
