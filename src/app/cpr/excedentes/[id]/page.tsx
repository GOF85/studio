
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import type { OrdenFabricacion, StockElaboracion, StockLote, Elaboracion } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Trash2, AlertTriangle, CheckCircle, CalendarIcon, Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatUnit, formatNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FormData = {
    lotes: (StockLote & { initialCantidad: number })[];
    motivoAjuste: string;
};

function ExcedenteDetailPageContent() {
    const [elaboracion, setElaboracion] = useState<Elaboracion | null>(null);
    const [stockItem, setStockItem] = useState<StockElaboracion | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showMermaConfirm, setShowMermaConfirm] = useState(false);
    const [mermaAllMotivo, setMermaAllMotivo] = useState('');
    
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const elabId = params.id as string;
    
    const form = useForm<FormData>();
    const { register, handleSubmit, setValue, getValues, control } = form;
    
    const { fields, update, remove } = useFieldArray({
        control,
        name: "lotes",
    });

    const watchedLotes = form.watch('lotes');
    const totalCantidad = watchedLotes?.reduce((sum, lote) => sum + lote.cantidad, 0) || 0;

    const loadData = useCallback(() => {
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const currentElab = allElaboraciones.find(e => e.id === elabId);
        setElaboracion(currentElab || null);
        
        const allStock = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}') as Record<string, StockElaboracion>;
        const currentStock = allStock[elabId] || null;
        setStockItem(currentStock);

        if (currentStock) {
            const lotesWithInitial = currentStock.lotes.map(lote => ({ ...lote, initialCantidad: lote.cantidad }));
            form.reset({ lotes: lotesWithInitial, motivoAjuste: '' });
        }
        setIsMounted(true);
    }, [elabId, form]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const onSubmit = (data: FormData) => {
        if (!stockItem) return;
        
        let allStock = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}') as Record<string, StockElaboracion>;
        
        const updatedLotes = data.lotes.map(l => ({ ofId: l.ofId, cantidad: l.cantidad, fechaCaducidad: l.fechaCaducidad }));
        const newTotal = updatedLotes.reduce((sum, lote) => sum + lote.cantidad, 0);

        allStock[elabId] = {
            ...stockItem,
            cantidadTotal: newTotal,
            lotes: updatedLotes
        };

        // TODO: Registrar el motivo del ajuste en algún log de movimientos de stock
        
        localStorage.setItem('stockElaboraciones', JSON.stringify(allStock));
        toast({ title: 'Ajuste Guardado', description: 'El stock de la elaboración ha sido actualizado.' });
        loadData(); // Recargar datos para reflejar el estado guardado
        form.reset(data);
    };

    const handleDeclareMermaTotal = () => {
        if (!stockItem || !mermaAllMotivo) {
            toast({ variant: 'destructive', title: 'Error', description: 'El motivo es obligatorio para declarar una merma total.'});
            return;
        }

        // Marcar todas las OFs como incidencia
        let allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        stockItem.lotes.forEach(lote => {
            const index = allOFs.findIndex(of => of.id === lote.ofId);
            if (index > -1) {
                allOFs[index].estado = 'Incidencia';
                allOFs[index].incidencia = true;
                allOFs[index].observacionesIncidencia = `MERMA DE EXCEDENTE: ${mermaAllMotivo}`;
            }
        });
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        
        // Eliminar del stock
        let allStock = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');
        delete allStock[elabId];
        localStorage.setItem('stockElaboraciones', JSON.stringify(allStock));

        toast({ title: 'Merma Total Declarada', description: `Todos los lotes de ${elaboracion?.nombre} han sido movidos a incidencias.` });
        router.push('/cpr/excedentes');
    };
    
    if (!isMounted || !elaboracion) {
        return <LoadingSkeleton title="Cargando Stock..." />;
    }
    
    if (!stockItem || stockItem.lotes.length === 0) {
        return (
            <main className="container mx-auto px-4 py-8">
                 <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/excedentes')} className="mb-4">
                    <ArrowLeft className="mr-2" /> Volver al listado
                </Button>
                <Card>
                    <CardHeader><CardTitle>Sin Stock</CardTitle></CardHeader>
                    <CardContent><p>No hay stock registrado para la elaboración: {elaboracion.nombre}.</p></CardContent>
                </Card>
            </main>
        )
    }

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/excedentes')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        Gestión de Stock: {elaboracion.nombre}
                    </h1>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ajuste de Lotes</CardTitle>
                            <CardDescription>
                                Modifica las cantidades de cada lote si es necesario (ej. por uso interno, merma parcial).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Lote (OF)</TableHead>
                                            <TableHead>Cant. Actual</TableHead>
                                            <TableHead>Fecha Caducidad</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const isCaducado = isBefore(new Date(field.fechaCaducidad), new Date());
                                            return (
                                            <TableRow key={field.id} className={cn(isCaducado && 'bg-destructive/10')}>
                                                <TableCell><Badge variant="secondary">{field.ofId}</Badge></TableCell>
                                                <TableCell>
                                                    <FormField
                                                        control={control}
                                                        name={`lotes.${index}.cantidad`}
                                                        render={({ field }) => (
                                                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="w-24 h-8" />
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>{format(new Date(field.fechaCaducidad), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                     {isCaducado ? <Badge variant="destructive">Caducado</Badge> : <Badge className="bg-green-600">Apto</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Justificación</CardTitle></CardHeader>
                         <CardContent>
                             <div className="space-y-2">
                                <Label htmlFor="motivoAjuste">Motivo del Ajuste Global</Label>
                                <Textarea id="motivoAjuste" {...register('motivoAjuste')} placeholder="Ej: Se usaron 0.5kg para prueba interna del equipo de I+D..."/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={!form.formState.isDirty}><Save className="mr-2"/>Guardar Cambios en Stock</Button>
                        </CardFooter>
                    </Card>
                </form>
                
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{formatNumber(totalCantidad, 2)} <span className="text-lg font-normal text-muted-foreground">{formatUnit(elaboracion.unidadProduccion)}</span></p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                            <CardDescription>
                                Si todo el excedente ya no es utilizable, puedes declararlo como merma. Esta acción es irreversible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog open={showMermaConfirm} onOpenChange={setShowMermaConfirm}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive"><Trash2 className="mr-2"/>Declarar Todo como Merma</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Declarar todo el stock como merma?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta acción marcará las Órdenes de Fabricación originales como "Incidencia" y eliminará este producto del stock de elaboraciones. Es irreversible. Por favor, indica el motivo.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Textarea id="merma-motivo" placeholder="Motivo de la merma (ej: caducado, mal estado, contaminación...)" value={mermaAllMotivo} onChange={e => setMermaAllMotivo(e.target.value)} />
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeclareMermaTotal} className="bg-destructive hover:bg-destructive/80">Sí, reiniciar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function ExcedenteDetailPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Stock..." />}>
            <ExcedenteDetailPageContent />
        </Suspense>
    )
}
