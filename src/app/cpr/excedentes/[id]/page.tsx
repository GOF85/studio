'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import type { OrdenFabricacion, ExcedenteProduccion } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type FormData = {
    cantidadAjustada: number;
    motivoAjuste: string;
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
    const { register, handleSubmit, setValue } = form;

    const loadData = useCallback(() => {
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const currentOF = allOFs.find(of => of.id === id);
        setOrden(currentOF || null);

        const allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '[]') as ExcedenteProduccion[];
        const currentExcedente = allExcedentes.find(ex => ex.ofId === id);
        setExcedente(currentExcedente || null);

        if (currentExcedente) {
            setValue('cantidadAjustada', currentExcedente.cantidadAjustada);
            setValue('motivoAjuste', currentExcedente.motivoAjuste || '');
        } else if (currentOF) {
            // This needs calculation, which is complex here. For now, we assume it's pre-calculated and stored.
            // Let's just set a placeholder. The list view is the source of truth for the initial amount.
            // A more robust solution might pass the amount via query params.
        }

        setIsMounted(true);
    }, [id, setValue]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const onSubmit = (data: FormData) => {
        if (!orden) return;
        
        let allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '[]') as ExcedenteProduccion[];
        const index = allExcedentes.findIndex(ex => ex.ofId === id);

        const newExcedenteData: ExcedenteProduccion = {
            ofId: id,
            cantidadAjustada: data.cantidadAjustada,
            motivoAjuste: data.motivoAjuste,
            fechaAjuste: new Date().toISOString(),
        };

        if (index > -1) {
            allExcedentes[index] = newExcedenteData;
        } else {
            allExcedentes.push(newExcedenteData);
        }
        
        localStorage.setItem('excedentesProduccion', JSON.stringify(allExcedentes));
        setExcedente(newExcedenteData);
        toast({ title: 'Ajuste Guardado', description: 'La cantidad del excedente ha sido actualizada.' });
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
            let allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '[]') as ExcedenteProduccion[];
            allExcedentes = allExcedentes.filter(ex => ex.ofId !== id);
            localStorage.setItem('excedentesProduccion', JSON.stringify(allExcedentes));

            toast({ title: 'Merma Declarada', description: 'El lote ha sido movido a incidencias.' });
            router.push('/cpr/excedentes');
        }
    };
    
    if (!isMounted || !orden) {
        return <LoadingSkeleton title="Cargando Excedente..." />;
    }

    const diasDesdeProduccion = differenceInDays(new Date(), new Date(orden.fechaFinalizacion || orden.fechaCreacion));
    const necesitaAtencion = diasDesdeProduccion > 3;

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

            {necesitaAtencion && (
                 <Card className="mb-6 border-amber-500 bg-amber-50">
                    <CardHeader className="flex-row items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-amber-600"/>
                        <div>
                             <CardTitle className="text-amber-800">Alerta de Caducidad Próxima</CardTitle>
                             <CardDescription className="text-amber-700">Este lote fue producido hace {diasDesdeProduccion} días. Se recomienda revisar su estado y darle salida.</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Ajuste de Cantidad</CardTitle>
                            <CardDescription>
                                Si la cantidad real de excedente ha cambiado (por mermas, uso parcial, etc.), ajústala aquí.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cantidadAjustada">Cantidad Real Actual ({orden.unidad})</Label>
                                <Input id="cantidadAjustada" type="number" step="0.01" {...register('cantidadAjustada', { valueAsNumber: true })} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="motivoAjuste">Motivo del Ajuste (Opcional)</Label>
                                <Textarea id="motivoAjuste" {...register('motivoAjuste')} placeholder="Ej: Merma por descongelación, se usaron 0.5kg para prueba interna..."/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit"><Save className="mr-2"/>Guardar Ajuste</Button>
                        </CardFooter>
                    </Card>
                </form>

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

            </div>
        </div>
    );
}
