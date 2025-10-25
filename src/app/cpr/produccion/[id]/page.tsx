
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, CheckCircle, Info, ChefHat, Package } from 'lucide-react';
import Image from 'next/image';
import type { OrdenFabricacion, Elaboracion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProduccionDetallePage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [cantidadReal, setCantidadReal] = useState<number | string>('');

    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    useEffect(() => {
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const currentOF = allOFs.find(of => of.id === id);
        setOrden(currentOF || null);
        
        if (currentOF) {
            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            const currentElab = allElaboraciones.find(e => e.id === currentOF.elaboracionId);
            setElaboracion(currentElab || null);
        }
        setIsMounted(true);
    }, [id]);

    const handleUpdateStatus = (newStatus: 'En Proceso' | 'Finalizado') => {
        if (!orden) return;
        
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === id);

        if (index > -1) {
            let updatedOF = { ...allOFs[index], estado: newStatus };
            if (newStatus === 'En Proceso') {
                updatedOF.fechaInicioProduccion = new Date().toISOString();
            }
            if (newStatus === 'Finalizado') {
                const finalQuantity = typeof cantidadReal === 'string' ? parseFloat(cantidadReal) : cantidadReal;
                if (!finalQuantity || finalQuantity <= 0) {
                    toast({ variant: 'destructive', title: 'Error', description: 'La cantidad real producida debe ser mayor que cero.' });
                    return;
                }
                updatedOF.fechaFinalizacion = new Date().toISOString();
                updatedOF.cantidadReal = finalQuantity;
            }

            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
            setShowFinalizeDialog(false);
            router.push('/cpr/produccion');
        }
    };
    
    const barquetas = useMemo(() => {
      if (!elaboracion?.ratioExpedicion || elaboracion.ratioExpedicion === 0) {
        return 0;
      }
      
      const cantidad = orden?.estado === 'Finalizado' ? orden.cantidadReal : orden?.cantidadTotal;
      if (!cantidad) return 0;
      
      return Math.ceil(cantidad / elaboracion.ratioExpedicion);
    }, [orden, elaboracion]);


    if (!isMounted || !orden) {
        return <LoadingSkeleton title="Cargando Orden de Fabricación..." />;
    }

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => router.push('/cpr/produccion')}>
                    <ArrowLeft className="mr-2"/> Volver a mis tareas
                </Button>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Badge variant="secondary" className="w-fit mb-2">{orden.id}</Badge>
                        <CardTitle className="text-4xl font-headline">{orden.elaboracionNombre}</CardTitle>
                        <CardDescription className="text-lg">Cantidad a producir: <span className="font-bold text-primary">{orden.cantidadTotal} {orden.unidad}</span></CardDescription>
                    </CardHeader>
                </Card>

                 {elaboracion?.instruccionesPreparacion && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ChefHat/> Instrucciones de Preparación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose max-w-none whitespace-pre-wrap">{elaboracion.instruccionesPreparacion}</div>
                        </CardContent>
                    </Card>
                )}
                
                {elaboracion?.fotosProduccionURLs && elaboracion.fotosProduccionURLs.length > 0 && (
                     <Card>
                        <CardHeader><CardTitle>Imágenes de Referencia</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {elaboracion.fotosProduccionURLs.map((foto, index) => (
                                <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                                    <Image src={foto.value} alt={`Foto de producción ${index + 1}`} fill className="object-cover" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package/> Información de Expedición</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Formato</h4>
                            <p className="text-lg font-bold">{elaboracion?.formatoExpedicion || 'No definido'}</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Ratio</h4>
                            <p className="text-lg font-bold">{elaboracion?.ratioExpedicion || 'N/A'} {orden.unidad} / formato</p>
                        </div>
                         <div className="p-4 bg-secondary rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground">Barquetas Necesarias</h4>
                            <p className="text-lg font-bold">{barquetas > 0 ? barquetas : 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="mt-8">
                {orden.estado === 'Asignada' && (
                    <Button size="lg" className="w-full h-16 text-xl" onClick={() => handleUpdateStatus('En Proceso')}>
                        <Play className="mr-3 h-8 w-8"/> Iniciar Producción
                    </Button>
                )}
                {orden.estado === 'En Proceso' && (
                    <Button size="lg" className="w-full h-16 text-xl" onClick={() => setShowFinalizeDialog(true)}>
                        <CheckCircle className="mr-3 h-8 w-8"/> Finalizar Producción
                    </Button>
                )}
            </div>

            <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Orden de Fabricación</AlertDialogTitle>
                        <AlertDialogDescription>
                            Introduce la cantidad real que has producido. Esta cifra se utilizará para el control de calidad y el stock.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Cantidad Planificada</p>
                            <p className="text-xl font-bold">{orden.cantidadTotal} {orden.unidad}</p>
                        </div>
                        <div>
                            <Label htmlFor="cantidad-real" className="text-lg">Cantidad Real Producida ({orden.unidad})</Label>
                            <Input 
                                id="cantidad-real" 
                                type="number"
                                step="0.01"
                                value={cantidadReal}
                                onChange={(e) => setCantidadReal(e.target.value)}
                                className="mt-2 text-2xl h-16 text-center font-bold"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUpdateStatus('Finalizado')}>Confirmar y Finalizar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
