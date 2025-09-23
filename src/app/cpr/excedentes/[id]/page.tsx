'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import type { OrdenFabricacion, ExcedenteProduccion } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Trash2, AlertTriangle, CheckCircle, CalendarIcon, Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type FormData = {
    cantidadAjustada: number;
    motivoAjuste: string;
    diasCaducidad?: number;
};

export default function ExcedenteDetailPage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [excedente, setExcedente] = useState<ExcedenteProduccion | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string; // OF ID
    
    const form = useForm<FormData>();
    const { register, handleSubmit, setValue, watch } = form;
    
    const diasCaducidadWatch = watch('diasCaducidad');

    const loadData = useCallback(() => {
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const currentOF = allOFs.find(of => of.id === id);
        setOrden(currentOF || null);

        const allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}') as {[key: string]: ExcedenteProduccion};
        const currentExcedente = allExcedentes[id] || null;
        setExcedente(currentExcedente);

        if (currentExcedente) {
            setValue('cantidadAjustada', currentExcedente.cantidadAjustada);
            setValue('motivoAjuste', currentExcedente.motivoAjuste || '');
            setValue('diasCaducidad', currentExcedente.diasCaducidad);
        } else if (currentOF) {
             const diferencia = (currentOF.cantidadReal || currentOF.cantidadTotal) - (currentOF.necesidadTotal || 0);
            setValue('cantidadAjustada', diferencia > 0 ? diferencia : 0);
            setValue('diasCaducidad', 7); // Default caducidad
        }

        setIsMounted(true);
    }, [id, setValue]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const onSubmit = (data: FormData) => {
        if (!orden) return;
        
        let allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}') as {[key: string]: ExcedenteProduccion};
        
        const newExcedenteData: ExcedenteProduccion = {
            ofId: id,
            fechaProduccion: orden.fechaFinalizacion || orden.fechaCreacion,
            diasCaducidad: data.diasCaducidad,
            cantidadAjustada: data.cantidadAjustada,
            motivoAjuste: data.motivoAjuste,
            fechaAjuste: new Date().toISOString(),
        };

        allExcedentes[id] = newExcedenteData;
        
        localStorage.setItem('excedentesProduccion', JSON.stringify(allExcedentes));
        setExcedente(newExcedenteData);
        toast({ title: 'Ajuste Guardado', description: 'La información del excedente ha sido actualizada.' });
        form.reset(data); // mark as not dirty
    };

    const handleDeclareMerma = (motivo: string) => {
        if (!orden || !motivo) {
            toast({ variant: 'destructive', title: 'Error', description: 'El motivo es obligatorio para declarar una merma.'});
            return;
        }

        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === id);
        if (index > -1) {
            allOFs[index] = {
                ...allOFs[index],
                estado: 'Incidencia',
                incidenciaObservaciones: `MERMA DE EXCEDENTE: ${motivo}`,
            };
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            
            // Remove from excedentes
            let allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}') as {[key: string]: ExcedenteProduccion};
            delete allExcedentes[id];
            localStorage.setItem('excedentesProduccion', JSON.stringify(allExcedentes));

            toast({ title: 'Merma Declarada', description: 'El lote ha sido movido a incidencias.' });
            router.push('/cpr/excedentes');
        }
    };

    const fechaProduccion = orden?.fechaFinalizacion || orden?.fechaCreacion;
    const fechaCaducidad = fechaProduccion && diasCaducidadWatch ? addDays(new Date(fechaProduccion), diasCaducidadWatch) : null;
    const isCaducado = fechaCaducidad ? new Date() > fechaCaducidad : false;
    
    if (!isMounted || !orden) {
        return <LoadingSkeleton title="Cargando Excedente..." />;
    }

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/excedentes')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        Gestión de Excedente: {orden.elaboracionNombre}
                    </h1>
                    <p className="text-muted-foreground">Del Lote de Origen: {orden.id}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ajuste y Caducidad</CardTitle>
                            <CardDescription>
                                Ajusta la cantidad real y define la vida útil del excedente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cantidadAjustada">Cantidad Real Actual ({orden.unidad})</Label>
                                    <Input id="cantidadAjustada" type="number" step="0.01" {...register('cantidadAjustada', { valueAsNumber: true })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="diasCaducidad">Días de Caducidad</Label>
                                    <Input id="diasCaducidad" type="number" {...register('diasCaducidad', { valueAsNumber: true })} placeholder="Ej: 7" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="motivoAjuste">Motivo del Ajuste (Opcional)</Label>
                                <Textarea id="motivoAjuste" {...register('motivoAjuste')} placeholder="Ej: Merma por descongelación, se usaron 0.5kg para prueba interna..."/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={!form.formState.isDirty}><Save className="mr-2"/>Guardar Cambios</Button>
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                            <CardDescription>
                                Si el excedente ya no es utilizable, puedes declararlo como merma. Esta acción es irreversible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive"><Trash2 className="mr-2"/>Declarar como Merma</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Declarar todo el excedente como merma?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta acción marcará la Orden de Fabricación original como "Incidencia" y la eliminará de la lista de excedentes. Es irreversible. Por favor, indica el motivo.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Textarea id="merma-motivo" placeholder="Motivo de la merma (ej: caducado, mal estado, contaminación...)" />
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            const motivo = (document.getElementById('merma-motivo') as HTMLTextAreaElement).value;
                                            handleDeclareMerma(motivo);
                                        }}>Confirmar Merma</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </form>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Lote</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon size={14}/> Fecha Producción:</span>
                                <span className="font-semibold">{fechaProduccion ? format(new Date(fechaProduccion), 'dd/MM/yyyy') : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><Watch size={14}/> Días de Vida Útil:</span>
                                <span className="font-semibold">{diasCaducidadWatch ?? 'No definido'} días</span>
                            </div>
                             <Separator />
                             <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon size={14}/> Fecha Caducidad:</span>
                                <span className="font-semibold">{fechaCaducidad ? format(fechaCaducidad, 'dd/MM/yyyy') : 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={cn(
                        isCaducado ? "border-amber-500 bg-amber-50 text-amber-900" : "border-emerald-500 bg-emerald-50 text-emerald-900"
                    )}>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                {isCaducado ? <AlertTriangle/> : <CheckCircle />}
                                Estado: {isCaducado ? 'Revisar' : 'Apto'}
                            </CardTitle>
                        </CardHeader>
                         <CardContent>
                            <p className="text-sm">
                                {isCaducado 
                                ? 'La fecha de caducidad teórica ha pasado. Se recomienda revisar el estado del producto antes de usarlo.' 
                                : 'El producto se encuentra dentro de su vida útil teórica.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
