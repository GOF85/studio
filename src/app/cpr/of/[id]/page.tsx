
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { OrdenFabricacion, Personal, Elaboracion, ComponenteElaboracion, IngredienteInterno, IngredienteERP } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Factory, Info, Check, X, AlertTriangle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';


const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

type FormData = {
    elaboracionId: string;
    cantidadTotal: number;
    fechaProduccionPrevista: Date;
    responsable?: string;
    cantidadReal: number | null;
    incidenciaObservaciones?: string;
}

type IngredienteConERP = IngredienteInterno & { erp?: IngredienteERP };

export default function OfDetailPage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
    const [dbElaboraciones, setDbElaboraciones] = useState<Elaboracion[]>([]);
    const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string;
    const isEditing = id !== 'nuevo';
    
    const form = useForm<FormData>({
        defaultValues: {
            responsable: '',
            cantidadReal: null,
            incidenciaObservaciones: '',
            fechaProduccionPrevista: new Date(),
        }
    });

    const selectedElaboracionId = form.watch('elaboracionId');
    const selectedElaboracion = useMemo(() => dbElaboraciones.find(e => e.id === selectedElaboracionId), [dbElaboraciones, selectedElaboracionId]);

    useEffect(() => {
        const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        setDbElaboraciones(allElaboraciones);
        
        // Cargar datos de ingredientes para el escandallo
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
        const erpMap = new Map(storedErp.map(i => [i.id, i]));
        const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
        setIngredientesData(new Map(combined.map(i => [i.id, i])));
        
        if (isEditing) {
            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const currentOF = allOFs.find(of => of.id === id);
            setOrden(currentOF || null);
            
            if (currentOF) {
                form.reset({
                    elaboracionId: currentOF.elaboracionId,
                    cantidadTotal: currentOF.cantidadTotal,
                    fechaProduccionPrevista: new Date(currentOF.fechaProduccionPrevista),
                    responsable: currentOF.responsable,
                    cantidadReal: currentOF.cantidadReal ?? null,
                    incidenciaObservaciones: currentOF.incidenciaObservaciones || '',
                });
                const elabData = allElaboraciones.find(e => e.id === currentOF.elaboracionId);
                setElaboracion(elabData || null);
            }
        }
        setIsMounted(true);
    }, [id, form, isEditing]);

    const ratioProduccion = useMemo(() => {
        if (!isEditing || !orden || !elaboracion || !elaboracion.produccionTotal) return 1;
        return orden.cantidadTotal / elaboracion.produccionTotal;
    }, [orden, elaboracion, isEditing]);
    
    const handleSave = (newStatus?: OrdenFabricacion['estado'], newResponsable?: string) => {
        if (!isEditing || !orden) return;

        const formData = form.getValues();
        let updatedOF: OrdenFabricacion = { ...orden };

        if (newStatus) {
            updatedOF.estado = newStatus;
            if (newStatus === 'Asignada' && newResponsable) {
                updatedOF.responsable = newResponsable;
                updatedOF.fechaAsignacion = new Date().toISOString();
            }
            if (newStatus === 'En Proceso') {
                if (!updatedOF.responsable) updatedOF.responsable = formData.responsable || 'Sin asignar';
                updatedOF.fechaInicioProduccion = new Date().toISOString();
            }
            if (newStatus === 'Finalizado') {
                updatedOF.cantidadReal = formData.cantidadReal || updatedOF.cantidadTotal;
                updatedOF.fechaFinalizacion = new Date().toISOString();
            }
            if (newStatus === 'Incidencia') {
                updatedOF.incidenciaObservaciones = formData.incidenciaObservaciones;
            }
        } else { // Generic save
             updatedOF = {
                ...orden,
                responsable: formData.responsable,
                cantidadReal: formData.cantidadReal,
                incidenciaObservaciones: formData.incidenciaObservaciones,
             };
        }

        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === orden.id);
        if (index !== -1) {
            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
            form.reset({ ...form.getValues(), responsable: updatedOF.responsable, cantidadReal: updatedOF.cantidadReal, incidenciaObservaciones: updatedOF.incidenciaObservaciones || '' });
            toast({ title: 'Guardado', description: `La Orden de Fabricación ha sido actualizada.` });
        }
    };

    const handleCreate = (data: FormData) => {
        if (!selectedElaboracion) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar una elaboración.' });
            return;
        }

        const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const lastIdNumber = allOFs.reduce((max, of) => {
            const numPart = of.id.split('-')[2];
            const num = numPart ? parseInt(numPart) : 0;
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        const newOF: OrdenFabricacion = {
            id: `OF-${new Date().getFullYear()}-${(lastIdNumber + 1).toString().padStart(3, '0')}`,
            fechaCreacion: new Date().toISOString(),
            fechaProduccionPrevista: data.fechaProduccionPrevista.toISOString(),
            elaboracionId: selectedElaboracion.id,
            elaboracionNombre: selectedElaboracion.nombre,
            cantidadTotal: data.cantidadTotal,
            unidad: selectedElaboracion.unidadProduccion,
            partidaAsignada: selectedElaboracion.partidaProduccion,
            estado: 'Pendiente',
            osIDs: [],
        };
        
        allOFs.push(newOF);
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        toast({ title: 'OF Manual Creada', description: `Se ha creado la Orden de Fabricación ${newOF.id}.`});
        router.push('/cpr/of');
    }
    
    const handleDelete = () => {
        if (!orden) return;
        let allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const updatedOFs = allOFs.filter(of => of.id !== orden.id);
        localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
        toast({ title: 'Orden Eliminada', description: `La OF ${orden.id} ha sido eliminada.`});
        router.push('/cpr/of');
    }


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Orden de Fabricación..." />;
    }

    if (isEditing && !orden) {
        return (
            <div className="text-center py-10">
                <h1 className="text-2xl font-bold">Orden de Fabricación no encontrada</h1>
                <p className="text-muted-foreground">No se pudo encontrar la OF con el ID: {id}</p>
                <Button onClick={() => router.push('/cpr/of')} className="mt-4">
                    <ArrowLeft className="mr-2"/> Volver al listado
                </Button>
            </div>
        )
    }

    const canBeAssigned = orden?.estado === 'Pendiente';
    const canStart = orden?.estado === 'Asignada';
    const canFinish = orden?.estado === 'En Proceso';

    const ceilToTwoDecimals = (num?: number | null) => {
        if (num === null || num === undefined) return '0.00';
        const factor = Math.pow(10, 2);
        return (Math.ceil(num * factor) / factor).toFixed(2);
    }
    
    const pageTitle = isEditing ? `Orden de Fabricación: ${orden?.id}` : 'Nueva Orden de Fabricación Manual';
    const elabNombre = isEditing ? orden?.elaboracionNombre : selectedElaboracion?.nombre;
    const elabPartida = isEditing ? orden?.partidaAsignada : selectedElaboracion?.partidaProduccion;
    const elabUnidad = isEditing ? orden?.unidad : selectedElaboracion?.unidadProduccion;
    const elabCantidad = form.watch('cantidadTotal') || (isEditing ? orden?.cantidadTotal : 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/of')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Factory />
                        {pageTitle}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing && orden && <Badge variant={statusVariant[orden.estado]} className="text-base px-4 py-2">{orden.estado}</Badge>}
                    {isEditing && <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive"><Trash2 className="mr-2"/>Eliminar OF</Button>}
                    <Button onClick={form.handleSubmit(isEditing ? () => handleSave() : handleCreate)} disabled={!form.formState.isDirty && isEditing}>
                        <Save className="mr-2" />
                        {isEditing ? 'Guardar Cambios' : 'Crear OF'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{elabNombre || 'Seleccione una elaboración'}</CardTitle>
                    <CardDescription>
                        {elabPartida ? `Planificada para el ${format(form.watch('fechaProduccionPrevista'), 'dd/MM/yyyy')} en la partida de ${elabPartida}` : 'Complete los datos de la OF'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <div className={cn("grid md:grid-cols-3 gap-6", !isEditing && "items-end")}>
                            {!isEditing ? (
                                <>
                                    <FormField control={form.control} name="elaboracionId" render={({ field }) => (
                                        <FormItem>
                                            <Label>Elaboración</Label>
                                            <Combobox options={dbElaboraciones.map(e => ({ value: e.id, label: e.nombre }))} value={field.value} onChange={field.onChange} placeholder="Buscar elaboración..." />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="cantidadTotal" render={({ field }) => (
                                        <FormItem>
                                            <Label>Cantidad a Producir ({elabUnidad})</Label>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="fechaProduccionPrevista" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <Label>Fecha Prevista</Label>
                                            <Popover><PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover>
                                        </FormItem>
                                    )} />
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-muted-foreground">Cantidad a Producir</h4>
                                        <p className="font-bold text-2xl">{ceilToTwoDecimals(elabCantidad)} <span className="text-lg font-normal">{elabUnidad}</span></p>
                                    </div>
                                    {orden && orden.osIDs.length > 0 && 
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-muted-foreground">Órdenes de Servicio</h4>
                                            <p className="flex items-center gap-1.5"><Info className="h-4 w-4"/> Afecta a {orden.osIDs.length} evento(s)</p>
                                        </div>
                                    }
                                    <div className="space-y-1">
                                        <Label htmlFor="responsable">Responsable</Label>
                                        <Controller name="responsable" control={form.control} render={({ field }) => (
                                            <Select onValueChange={(value) => { field.onChange(value); if(canBeAssigned) { handleSave('Asignada', value); }}} value={field.value} disabled={!canBeAssigned}>
                                                <SelectTrigger id="responsable"><SelectValue placeholder="Asignar responsable..." /></SelectTrigger>
                                                <SelectContent>{personalCPR.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                </>
                            )}
                        </div>
                    </Form>
                     {isEditing && orden?.incidenciaObservaciones && (
                        <div className="mt-6">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-destructive"><AlertTriangle/>Observaciones de Incidencia</h4>
                            <div className="p-4 border rounded-lg bg-destructive/10 text-destructive-foreground border-destructive/30">
                                <p className="text-black font-bold">{orden.incidenciaObservaciones}</p>
                            </div>
                        </div>
                    )}
                    <Separator className="my-6" />
                     <div className="grid md:grid-cols-2 gap-6">
                         <div>
                            <h4 className="font-semibold mb-4">Escandallo para {ceilToTwoDecimals(elabCantidad)} {elabUnidad}</h4>
                            <div className="p-4 border rounded-lg bg-muted/50">
                                {elaboracion ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead className="text-right">Cantidad Necesaria</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {elaboracion.componentes.map(comp => {
                                                const ingrediente = ingredientesData.get(comp.componenteId);
                                                const unidad = ingrediente?.erp?.unidad || 'uds';
                                                return (
                                                    <TableRow key={comp.id}>
                                                        <TableCell>{comp.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{ceilToTwoDecimals(comp.cantidad * ratioProduccion)} {unidad}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-muted-foreground text-center">No se encontró la elaboración en el Book.</p>
                                )}
                            </div>
                        </div>
                         <div>
                             <h4 className="font-semibold mb-4">Instrucciones de Preparación</h4>
                            <div className="p-4 border rounded-lg bg-muted/50 h-full">
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {elaboracion?.instruccionesPreparacion || 'No hay instrucciones para esta elaboración.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
                {isEditing && (
                    <CardFooter className="flex-col items-start gap-4">
                        <h4 className="font-semibold">Registro de Producción</h4>
                        <div className="grid md:grid-cols-3 gap-6 w-full">
                            <Card className={!canStart ? 'bg-muted/30' : ''}>
                                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2">1. Iniciar Producción</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Pulsa para cambiar el estado a "En Proceso" una vez asignado el responsable.
                                    </p>
                                    <Button className="w-full" variant="secondary" disabled={!canStart} onClick={() => handleSave('En Proceso')}>Empezar Producción</Button>
                                </CardContent>
                            </Card>
                            <Card className={!canFinish ? 'bg-muted/30' : ''}>
                                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Check />2. Finalizar Producción</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="cantidadReal">Cantidad Real Producida ({orden?.unidad})</Label>
                                        <Controller name="cantidadReal" control={form.control} render={({ field }) => <Input id="cantidadReal" type="number" step="0.01" {...field} value={field.value ?? ''} disabled={!canFinish}/>}/>
                                    </div>
                                    <Button className="w-full" variant="default" disabled={!canFinish} onClick={() => handleSave('Finalizado')}>Marcar como Finalizada</Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2 text-destructive"><AlertTriangle/>Registrar Incidencia</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Si hubo un problema (ej. producto quemado, error de cantidad), regístralo aquí.
                                    </p>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full" variant="destructive">Declarar Incidencia</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Describir la Incidencia</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Explica brevemente qué ha ocurrido con esta producción. Esta información quedará registrada.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <Controller name="incidenciaObservaciones" control={form.control} render={({ field }) => <Textarea {...field} placeholder="Ej: Se quemó parte de la producción, solo se pudieron salvar 5kg..." />}/>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleSave('Incidencia')}>Guardar Incidencia</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </div>
                    </CardFooter>
                )}
            </Card>

            {isEditing && (
                 <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Orden de Fabricación?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta acción es irreversible. La OF será eliminada y la necesidad de producción volverá a aparecer en la pantalla de Planificación.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={handleDelete}
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
