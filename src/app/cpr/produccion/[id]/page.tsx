

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, CheckCircle, Info, ChefHat, Package, Timer, Camera } from 'lucide-react';
import Image from 'next/image';
import type { OrdenFabricacion, Elaboracion, ComponenteElaboracion, IngredienteInterno, ArticuloERP } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatUnit } from '@/lib/utils';
import { cn } from '@/lib/utils';


type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

type ConsumoReal = {
    componenteId: string;
    cantidadReal: number;
}

export default function ProduccionDetallePage() {
    const [orden, setOrden] = useState<OrdenFabricacion | null>(null);
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
    const [cantidadReal, setCantidadReal] = useState<number | string>('');
    const [elapsedTime, setElapsedTime] = useState<string | null>(null);
    const [consumosReales, setConsumosReales] = useState<ConsumoReal[]>([]);


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

            const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
            const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
            const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
            const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
            setIngredientesData(new Map(combinedIngredientes.map(i => [i.id, i])));
        }
        setIsMounted(true);
    }, [id]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (orden?.estado === 'En Proceso' && orden.fechaInicioProduccion) {
            const updateElapsedTime = () => {
                const startTime = new Date(orden.fechaInicioProduccion!);
                setElapsedTime(formatDistanceToNowStrict(startTime, { locale: es, addSuffix: false }));
            }
            updateElapsedTime();
            timer = setInterval(updateElapsedTime, 1000);
        } else if (orden?.estado === 'Finalizado' && orden.fechaInicioProduccion && orden.fechaFinalizacion) {
             const startTime = new Date(orden.fechaInicioProduccion!);
             const endTime = new Date(orden.fechaFinalizacion!);
             setElapsedTime(formatDistanceToNowStrict(startTime, { locale: es, unit: 'minute', roundingMethod: 'ceil' }).replace('aproximadamente', ''));
        }

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [orden]);

    const handleUpdateStatus = (newStatus: 'En Proceso' | 'Finalizado') => {
        if (!orden) return;
        
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === id);

        if (index > -1) {
            let updatedOF = { ...allOFs[index], estado: newStatus };
            if (newStatus === 'En Proceso') {
                updatedOF.fechaInicioProduccion = new Date().toISOString();
                toast({ title: 'Producción Iniciada', description: 'El cronómetro ha comenzado.' });
                 setOrden(updatedOF); // Optimistically update state to show timer
            }
            if (newStatus === 'Finalizado') {
                const finalQuantity = typeof cantidadReal === 'string' ? parseFloat(cantidadReal) : cantidadReal;
                if (!finalQuantity || finalQuantity <= 0) {
                    toast({ variant: 'destructive', title: 'Error', description: 'La cantidad real producida debe ser mayor que cero.' });
                    return;
                }
                updatedOF.fechaFinalizacion = new Date().toISOString();
                updatedOF.cantidadReal = finalQuantity;
                // updatedOF.consumosReales = consumosReales; // Future implementation
                setShowFinalizeDialog(false);
                router.push('/cpr/produccion');
            }

            allOFs[index] = updatedOF;
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            setOrden(updatedOF);
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
    
    const ratioProduccion = useMemo(() => {
        if (!orden || !elaboracion || !elaboracion.produccionTotal) return 1;
        return orden.cantidadTotal / elaboracion.produccionTotal;
    }, [orden, elaboracion]);

    const handleConsumoChange = (componenteId: string, cantidad: number) => {
        setConsumosReales(prev => {
            const existingIndex = prev.findIndex(c => c.componenteId === componenteId);
            if (existingIndex > -1) {
                const newConsumos = [...prev];
                newConsumos[existingIndex] = { ...newConsumos[existingIndex], cantidadReal: cantidad };
                return newConsumos;
            }
            return [...prev, { componenteId, cantidadReal: cantidad }];
        });
    }

    const ceilToTwoDecimals = (num?: number | null) => {
        if (num === null || num === undefined) return '0,00';
        return formatNumber(num, 2);
    }


    if (!isMounted || !orden) {
        return <LoadingSkeleton title="Cargando Orden de Fabricación..." />;
    }

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Badge variant="secondary" className="w-fit mb-2">{orden.id}</Badge>
                        <CardTitle className="text-4xl font-headline">{orden.elaboracionNombre}</CardTitle>
                        <div className="flex justify-between items-baseline">
                            <CardDescription className="text-lg">Cantidad a producir: <span className="font-bold text-primary">{ceilToTwoDecimals(orden.cantidadTotal)} {orden.unidad}</span></CardDescription>
                            {elapsedTime && (
                                <div className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                                    <Timer />
                                    <span>{elapsedTime}</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                 <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ChefHat/> Escandallo Interactivo</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <div className="p-0 border rounded-lg bg-white">
                                {elaboracion ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead className="text-right">Cant. Teórica</TableHead><TableHead className="w-32 text-right">Cant. Real</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {elaboracion.componentes.map(comp => {
                                                const ingrediente = ingredientesData.get(comp.componenteId);
                                                const unidad = ingrediente?.erp?.unidad || 'UD';
                                                const cantNecesaria = comp.cantidad * ratioProduccion;
                                                const consumo = consumosReales.find(c => c.componenteId === comp.id);
                                                const desviacion = consumo ? consumo.cantidadReal - cantNecesaria : 0;

                                                return (
                                                    <TableRow key={comp.id} className={cn(desviacion !== 0 && "bg-amber-50")}>
                                                        <TableCell>{comp.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{ceilToTwoDecimals(cantNecesaria)} {formatUnit(unidad)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Input 
                                                              type="number" 
                                                              step="0.01" 
                                                              placeholder={ceilToTwoDecimals(cantNecesaria)}
                                                              className="h-8 text-right"
                                                              onChange={(e) => handleConsumoChange(comp.id, parseFloat(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-muted-foreground text-center p-4">No se encontró la elaboración en el Book.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     {elaboracion?.instruccionesPreparacion && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Info /> Instrucciones de Preparación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none whitespace-pre-wrap">{elaboracion.instruccionesPreparacion}</div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                 {(elaboracion?.fotosProduccionURLs && elaboracion.fotosProduccionURLs.length > 0) || elaboracion?.videoProduccionURL ? (
                     <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Camera/> Guía Multimedia</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {elaboracion.fotosProduccionURLs.map((foto, index) => (
                                <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                                    <Image src={foto.value} alt={`Foto de producción ${index + 1}`} fill className="object-cover" />
                                </div>
                            ))}
                            {elaboracion.videoProduccionURL && (
                                <div className="aspect-video">
                                    <iframe 
                                        className="w-full h-full rounded-lg"
                                        src={elaboracion.videoProduccionURL.replace("watch?v=", "embed/")} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen>
                                    </iframe>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : null}

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
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Orden de Fabricación</AlertDialogTitle>
                        <AlertDialogDescription>
                            Introduce la cantidad real que has producido. Esta cifra se utilizará para el control de calidad y el stock.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Cantidad Planificada</p>
                                <p className="text-xl font-bold">{orden.cantidadTotal} {orden.unidad}</p>
                            </div>
                             <div>
                                <Label htmlFor="cantidad-real" className="text-sm text-muted-foreground">Cantidad Real Producida ({orden.unidad})</Label>
                                <Input 
                                    id="cantidad-real" 
                                    type="number"
                                    step="0.01"
                                    value={cantidadReal}
                                    onChange={(e) => setCantidadReal(e.target.value)}
                                    className="mt-1 text-2xl h-12 text-center font-bold"
                                />
                            </div>
                        </div>

                         <div>
                            <h4 className="font-semibold mb-2">Resumen de Consumo de Componentes</h4>
                            <div className="border rounded-md max-h-48 overflow-y-auto">
                               <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Componente</TableHead>
                                        <TableHead className="text-right">Teórico</TableHead>
                                        <TableHead className="text-right">Real</TableHead>
                                        <TableHead className="text-right">Desviación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elaboracion?.componentes.map(comp => {
                                        const cantNecesaria = comp.cantidad * ratioProduccion;
                                        const consumo = consumosReales.find(c => c.componenteId === comp.id);
                                        const cantReal = consumo?.cantidadReal ?? cantNecesaria; // Use real if available, otherwise theoretical
                                        const desviacion = cantReal - cantNecesaria;
                                        const unidad = (ingredientesData.get(comp.componenteId) as IngredienteConERP)?.erp?.unidad || 'UD';
                                        
                                        return (
                                            <TableRow key={comp.id}>
                                                <TableCell className="text-xs">{comp.nombre}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{ceilToTwoDecimals(cantNecesaria)} {formatUnit(unidad)}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{ceilToTwoDecimals(cantReal)} {formatUnit(unidad)}</TableCell>
                                                <TableCell className={cn("text-right text-xs font-mono", desviacion > 0 ? 'text-destructive' : 'text-green-600')}>
                                                    {desviacion.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                               </Table>
                            </div>
                        </div>

                        <div>
                             <Label htmlFor="observaciones-final">Observaciones</Label>
                             <Textarea id="observaciones-final" placeholder="Añade aquí cualquier comentario sobre la producción (opcional)..." />
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
