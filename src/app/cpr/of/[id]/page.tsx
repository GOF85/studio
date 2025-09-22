'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { OrdenFabricacion, Personal } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Factory, Info, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

type FormData = {
    responsable?: string;
    cantidadReal: number | null;
}

export default function OfDetailPage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string;
    
    const form = useForm<FormData>({
        defaultValues: {
            responsable: '',
            cantidadReal: null
        }
    });

    useEffect(() => {
        if(id) {
            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const currentOF = allOFs.find(of => of.id === id);
            setOrden(currentOF || null);
            if (currentOF) {
                form.reset({
                    responsable: currentOF.responsable,
                    cantidadReal: currentOF.cantidadReal ?? null
                })
            }
            
            const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
            setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));
        }
        setIsMounted(true);
    }, [id, form]);

    const handleSave = (newStatus?: OrdenFabricacion['estado']) => {
        if (!orden) return;

        const formData = form.getValues();
        let updatedOF: OrdenFabricacion = { ...orden };

        if (newStatus) {
            updatedOF.estado = newStatus;
            if (newStatus === 'En Proceso' && !updatedOF.responsable) {
                updatedOF.responsable = formData.responsable || 'Sin asignar';
            }
            if (newStatus === 'Finalizado') {
                updatedOF.cantidadReal = formData.cantidadReal || updatedOF.cantidadTotal;
                updatedOF.fechaFinalizacion = new Date().toISOString();
            }
        } else {
             updatedOF = {
                ...orden,
                responsable: formData.responsable,
                cantidadReal: formData.cantidadReal ?? undefined,
             };
        }

        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === orden.id);
        if (index !== -1) {
            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
            form.reset({ responsable: updatedOF.responsable, cantidadReal: updatedOF.cantidadReal ?? null });
            toast({ title: 'Guardado', description: `La Orden de Fabricación ha sido actualizada.` });
        }
    };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Orden de Fabricación..." />;
    }

    if (!orden) {
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

    const canStart = orden.estado === 'Pendiente';
    const canFinish = orden.estado === 'En Proceso';

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/of')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Factory />
                        Orden de Fabricación: {orden.id}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[orden.estado]} className="text-base px-4 py-2">{orden.estado}</Badge>
                    <Button onClick={() => handleSave()} disabled={!form.formState.isDirty}>
                        <Save className="mr-2" />
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{orden.elaboracionNombre}</CardTitle>
                    <CardDescription>
                        Planificada para el {format(new Date(orden.fechaProduccionPrevista), 'dd/MM/yyyy')} en la partida de <strong>{orden.partidaAsignada}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <h4 className="font-semibold text-muted-foreground">Cantidad a Producir</h4>
                            <p className="font-bold text-2xl">{orden.cantidadTotal} <span className="text-lg font-normal">{orden.unidad}</span></p>
                        </div>
                        <div className="space-y-1">
                             <h4 className="font-semibold text-muted-foreground">Órdenes de Servicio</h4>
                            <p className="flex items-center gap-1.5"><Info className="h-4 w-4"/> Afecta a {orden.osIDs.length} evento(s)</p>
                        </div>
                         <div className="space-y-1">
                             <Label htmlFor="responsable">Responsable</Label>
                              <Controller
                                name="responsable"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!canStart}>
                                        <SelectTrigger id="responsable">
                                            <SelectValue placeholder="Asignar responsable..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {personalCPR.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                    <Separator className="my-6" />
                    <div>
                         <h4 className="font-semibold mb-4">Escandallo de la Elaboración</h4>
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <p className="text-muted-foreground text-center">
                                (Aquí se mostrará el escandallo de la elaboración para guiar al cocinero)
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                     <h4 className="font-semibold">Registro de Producción</h4>
                     <div className="grid md:grid-cols-3 gap-6 w-full">
                        <Card className={!canStart && !canFinish ? 'bg-muted/30' : ''}>
                            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2">1. Iniciar Producción</CardTitle></CardHeader>
                            <CardContent>
                                 <p className="text-sm text-muted-foreground mb-4">
                                    Asigna un responsable y pulsa para cambiar el estado a "En Proceso".
                                </p>
                                <Button className="w-full" variant="secondary" disabled={!canStart} onClick={() => handleSave('En Proceso')}>Empezar Producción</Button>
                            </CardContent>
                        </Card>
                        <Card className={!canFinish ? 'bg-muted/30' : ''}>
                            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Check />2. Finalizar Producción</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="cantidadReal">Cantidad Real Producida ({orden.unidad})</Label>
                                    <Controller
                                        name="cantidadReal"
                                        control={form.control}
                                        render={({ field }) => <Input id="cantidadReal" type="number" step="0.01" {...field} value={field.value ?? ''} disabled={!canFinish}/>}
                                    />
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
                                <Button className="w-full" variant="destructive" onClick={() => handleSave('Incidencia')}>Declarar Incidencia</Button>
                            </CardContent>
                        </Card>
                     </div>
                </CardFooter>
            </Card>
        </div>
    );
}
