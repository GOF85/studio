
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import type { StockLote } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ArrowLeft, Save, Trash2, AlertTriangle, CheckCircle, Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatUnit, formatNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormField, FormControl } from '@/components/ui/form';

import { useElaboraciones } from '@/hooks/use-data-queries';
import { useCprStockElaboraciones, useUpdateCprStockElaboracion } from '@/hooks/use-cpr-data';

type FormData = {
    lotes: (StockLote & { initialCantidad: number })[];
    motivoAjuste: string;
};

function ExcedenteDetailPageContent() {
    const router = useRouter();
    const params = useParams() ?? {};
    const { toast } = useToast();
    const elabId = (params.id as string) || '';

    const { data: allElaboraciones = [], isLoading: loadingElabs } = useElaboraciones();
    const { data: allStock = {}, isLoading: loadingStock } = useCprStockElaboraciones();
    const updateStockMutation = useUpdateCprStockElaboracion();

    const elaboracion = useMemo(() => allElaboraciones.find(e => e.id === elabId), [allElaboraciones, elabId]);
    const stockItem = useMemo(() => allStock[elabId] || null, [allStock, elabId]);

    const [showMermaConfirm, setShowMermaConfirm] = useState(false);
    const [mermaAllMotivo, setMermaAllMotivo] = useState('');
    
    const form = useForm<FormData>();
    const { handleSubmit, control, register } = form;
    
    const { fields } = useFieldArray({
        control,
        name: "lotes",
    });

    const watchedLotes = form.watch('lotes');
    const totalCantidad = watchedLotes?.reduce((sum, lote) => sum + lote.cantidad, 0) || 0;

    useEffect(() => {
        if (stockItem) {
            const lotesWithInitial = (stockItem.lotes || []).map((lote: any) => ({ ...lote, initialCantidad: lote.cantidad }));
            form.reset({ lotes: lotesWithInitial, motivoAjuste: '' });
        }
    }, [stockItem, form]);
    
    const onSubmit = async (data: FormData) => {
        if (!elaboracion) return;
        
        const updatedLotes = data.lotes.map(l => ({ ofId: l.ofId, cantidad: l.cantidad, fechaCaducidad: l.fechaCaducidad }));
        const newTotal = updatedLotes.reduce((sum, lote) => sum + lote.cantidad, 0);

        try {
            await updateStockMutation.mutateAsync({
                elaboracionId: elabId,
                cantidadTotal: newTotal,
                unidad: elaboracion.unidadProduccion,
                lotes: updatedLotes
            });

            toast({ title: 'Ajuste Guardado', description: 'El stock de la elaboración ha sido actualizado.' });
            form.reset({ ...data, motivoAjuste: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el stock.' });
        }
    };

    const handleDeclareMermaTotal = async () => {
        if (!elaboracion || !mermaAllMotivo) {
            toast({ variant: 'destructive', title: 'Error', description: 'El motivo es obligatorio para declarar una merma total.'});
            return;
        }

        try {
            await updateStockMutation.mutateAsync({
                elaboracionId: elabId,
                cantidadTotal: 0,
                unidad: elaboracion.unidadProduccion,
                lotes: []
            });

            toast({ title: 'Merma Total Declarada', description: 'El stock ha sido puesto a cero.' });
            setShowMermaConfirm(false);
            setMermaAllMotivo('');
            router.push('/cpr/excedentes');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo declarar la merma.' });
        }
    };

    if (loadingElabs || loadingStock) {
        return <LoadingSkeleton title="Cargando detalles de stock..." />;
    }

    if (!elaboracion) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold">Elaboración no encontrada</h2>
                <Button onClick={() => router.push('/cpr/excedentes')} className="mt-4">Volver al listado</Button>
            </div>
        );
    }

    if (!stockItem || (stockItem.lotes || []).length === 0) {
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
        <main className="container mx-auto px-4 py-8">
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
                <Form {...form}>
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
                            <Button type="submit" disabled={!form.formState.isDirty || updateStockMutation.isPending}>
                                <Save className="mr-2"/>
                                {updateStockMutation.isPending ? 'Guardando...' : 'Guardar Cambios en Stock'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
                </Form>
                
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
                                        Esta acción eliminará este producto del stock de elaboraciones. Es irreversible. Por favor, indica el motivo.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="mermaMotivo">Motivo de la Merma</Label>
                                        <Textarea id="mermaMotivo" value={mermaAllMotivo} onChange={(e) => setMermaAllMotivo(e.target.value)} placeholder="Ej: Rotura de cadena de frío, caducidad..."/>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeclareMermaTotal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Merma Total</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

export default function ExcedenteDetailPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <ExcedenteDetailPageContent />
        </Suspense>
    );
}
