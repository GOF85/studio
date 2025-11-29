
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Component, ChefHat, PlusCircle, Trash2, Image as ImageIcon, Link as LinkIcon, Component as SubElabIcon, RefreshCw, Sprout, AlertTriangle } from 'lucide-react';
import type { Elaboracion, IngredienteInterno, UnidadMedida, ArticuloERP, PartidaProduccion, FormatoExpedicion, Alergeno } from '@/types';
import { UNIDADES_MEDIDA, ALERGENOS } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatUnit } from '@/lib/utils';
import Image from 'next/image';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AllergenBadge } from '../icons/allergen-badge';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Switch } from '../ui/switch';

const componenteSchema = z.object({
    id: z.string(),
    tipo: z.enum(['ingrediente', 'elaboracion']),
    componenteId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().positive('La cantidad debe ser mayor que 0'),
    costePorUnidad: z.coerce.number().optional().default(0),
    merma: z.coerce.number().optional().default(0),
});

const elaboracionFormSchema = z.object({
    id: z.string(),
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    produccionTotal: z.coerce.number().min(0.001, 'La producción total es obligatoria'),
    unidadProduccion: z.enum(UNIDADES_MEDIDA),
    partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
    componentes: z.array(componenteSchema).min(1, 'Debe tener al menos un componente'),
    instruccionesPreparacion: z.string().optional().default(''),
    fotosProduccionURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
    videoProduccionURL: z.string().url().or(z.literal('')).optional(),
    formatoExpedicion: z.string().optional().default(''),
    ratioExpedicion: z.coerce.number().optional().default(0),
    tipoExpedicion: z.enum(['REFRIGERADO', 'CONGELADO', 'SECO']),
    requiereRevision: z.boolean().optional().default(false),
    comentarioRevision: z.string().optional().default(''),
    fechaRevision: z.string().optional(),
});

export type ElaborationFormValues = z.infer<typeof elaboracionFormSchema>;
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export function ElaborationForm({ initialData, onSave, isSubmitting }: { initialData: Partial<ElaborationFormValues> | null, onSave: (data: ElaborationFormValues, costePorUnidad: number) => void | Promise<void>, isSubmitting: boolean }) {
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
    const [elaboracionesData, setElaboracionesData] = useState<Map<string, Elaboracion>>(new Map());
    const [newImageUrl, setNewImageUrl] = useState('');
    const [formatosExpedicion, setFormatosExpedicion] = useState<FormatoExpedicion[]>([]);
    const { toast } = useToast();

    const form = useForm<ElaborationFormValues>({
        resolver: zodResolver(elaboracionFormSchema),
        defaultValues: initialData || {}
    });

    const { fields, append, remove, control } = useFieldArray({
        control: form.control,
        name: 'componentes',
    });

    const { fields: fotosFields, append: appendFoto, remove: removeFoto } = useFieldArray({
        control: form.control,
        name: 'fotosProduccionURLs',
    });

    const watchedComponentes = form.watch('componentes');
    const watchedProduccionTotal = form.watch('produccionTotal');

    useEffect(() => {
        form.reset(initialData || {});
    }, [initialData, form]);

    useEffect(() => {
        const loadData = async () => {
            const storedFormatos = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
            setFormatosExpedicion(storedFormatos);

            const { supabase } = await import('@/lib/supabase');

            const [ingredientesResult, erpResult] = await Promise.all([
                supabase.from('ingredientes_internos').select('*'),
                supabase.from('articulos_erp').select('*')
            ]);

            const storedInternos = (ingredientesResult.data || []).map((row: any) => ({
                id: row.id,
                nombreIngrediente: row.nombre_ingrediente,
                productoERPlinkId: row.producto_erp_link_id,
                alergenosPresentes: row.alergenos_presentes || [],
                alergenosTrazas: row.alergenos_trazas || [],
                historialRevisiones: row.historial_revisiones || [],
            })) as IngredienteInterno[];

            const storedErp = (erpResult.data || []).map((row: any) => ({
                idreferenciaerp: row.erp_id,
                nombreProductoERP: row.nombre,
                precioCompra: parseFloat(row.precio_compra || '0'),
                unidad: row.unidad_medida,
                unidadConversion: parseFloat(row.unidad_conversion || '1'),
                descuento: parseFloat(row.descuento || '0'),
                nombreProveedor: row.nombre_proveedor,
                referenciaProveedor: row.referencia_proveedor,
                categoriaMice: row.categoria_mice,
                tipo: row.tipo,
            })) as ArticuloERP[];

            const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
            const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
            setIngredientesData(new Map(combinedIngredientes.map(i => [i.id, i])));

            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            setElaboracionesData(new Map(allElaboraciones.map(e => [e.id, e])));
        };
        loadData();
    }, []);

    const handleSelectIngrediente = (ingrediente: IngredienteConERP) => {
        const erpItem = ingrediente.erp;
        let costeReal = 0;
        if (erpItem) {
            const unidadConversion = (erpItem.unidadConversion && erpItem.unidadConversion > 0) ? erpItem.unidadConversion : 1;
            costeReal = (erpItem.precioCompra / unidadConversion) * (1 - (erpItem.descuento || 0) / 100);
        }

        append({
            id: `${ingrediente.id}-${Date.now()}`,
            tipo: 'ingrediente',
            componenteId: ingrediente.id,
            nombre: ingrediente.nombreIngrediente,
            cantidad: 1,
            costePorUnidad: costeReal,
            merma: 0,
        });
        toast({ title: 'Ingrediente añadido', duration: 1000 });
    }

    const handleSelectElaboracion = (elab: Elaboracion) => {
        append({
            id: `${elab.id}-${Date.now()}`,
            tipo: 'elaboracion',
            componenteId: elab.id,
            nombre: elab.nombre,
            cantidad: 1,
            costePorUnidad: elab.costePorUnidad || 0,
            merma: 0,
        });
        toast({ title: 'Elaboración añadida', duration: 1000 });
    }

    const handleAddImageUrl = () => {
        try {
            const url = new URL(newImageUrl);
            appendFoto({ value: url.href });
            setNewImageUrl('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'URL inválida', description: 'Por favor, introduce una URL de imagen válida.' });
        }
    }

    const { costeTotal, costePorUnidad, alergenosPresentes, alergenosTrazas } = useMemo(() => {
        let total = 0;
        const presentes = new Set<Alergeno>();
        const trazas = new Set<Alergeno>();

        const getElabAllergens = (elabId: string): { presentes: Alergeno[], trazas: Alergeno[] } => {
            const elaboracion = elaboracionesData.get(elabId);
            if (!elaboracion) return { presentes: [], trazas: [] };

            const elabPresentes = new Set<Alergeno>();
            const elabTrazas = new Set<Alergeno>();

            (elaboracion.componentes || []).forEach(comp => {
                if (comp.tipo === 'ingrediente') {
                    const ing = ingredientesData.get(comp.componenteId);
                    if (ing) {
                        (ing.alergenosPresentes || []).forEach(a => elabPresentes.add(a));
                        (ing.alergenosTrazas || []).forEach(a => elabTrazas.add(a));
                    }
                } else if (comp.tipo === 'elaboracion') {
                    const subElabAllergens = getElabAllergens(comp.componenteId);
                    subElabAllergens.presentes.forEach(a => elabPresentes.add(a));
                    subElabAllergens.trazas.forEach(a => elabTrazas.add(a));
                }
            });
            return { presentes: Array.from(elabPresentes), trazas: Array.from(elabTrazas) };
        }

        (watchedComponentes || []).forEach(componente => {
            // Recalcular el coste real desde los datos fuente
            let costeReal = componente.costePorUnidad || 0;

            if (componente.tipo === 'ingrediente') {
                const ingData = ingredientesData.get(componente.componenteId);
                if (ingData) {
                    // Recalcular desde ERP si el coste está en 0 o no existe
                    if (costeReal === 0 && ingData.erp) {
                        const unidadConversion = (ingData.erp.unidadConversion && ingData.erp.unidadConversion > 0) ? ingData.erp.unidadConversion : 1;
                        costeReal = (ingData.erp.precioCompra / unidadConversion) * (1 - (ingData.erp.descuento || 0) / 100);
                    }
                    // Alérgenos
                    (ingData.alergenosPresentes || []).forEach(a => presentes.add(a));
                    (ingData.alergenosTrazas || []).forEach(a => trazas.add(a));
                }
            } else if (componente.tipo === 'elaboracion') {
                const elabData = elaboracionesData.get(componente.componenteId);
                if (elabData) {
                    // Usar el coste de la elaboración si existe
                    if (costeReal === 0 && elabData.costePorUnidad) {
                        costeReal = elabData.costePorUnidad;
                    }
                }
                // Alérgenos de sub-elaboración
                const subElabAllergens = getElabAllergens(componente.componenteId);
                subElabAllergens.presentes.forEach(a => presentes.add(a));
                subElabAllergens.trazas.forEach(a => trazas.add(a));
            }

            // Calcular coste con merma
            const costeConMerma = costeReal * (1 + (componente.merma || 0) / 100);
            total += costeConMerma * (componente.cantidad || 0);
        });

        // Remove trazas if they are also present
        trazas.forEach(traza => {
            if (presentes.has(traza)) {
                trazas.delete(traza);
            }
        })

        const produccionTotal = watchedProduccionTotal > 0 ? watchedProduccionTotal : 1;
        const porUnidad = produccionTotal > 0 ? total / produccionTotal : 0;

        return {
            costeTotal: total,
            costePorUnidad: porUnidad,
            alergenosPresentes: Array.from(presentes).sort((a, b) => ALERGENOS.indexOf(a) - ALERGENOS.indexOf(b)),
            alergenosTrazas: Array.from(trazas).sort((a, b) => ALERGENOS.indexOf(a) - ALERGENOS.indexOf(b)),
        };
    }, [watchedComponentes, watchedProduccionTotal, ingredientesData, elaboracionesData]);

    const handleFormSubmit = async (data: ElaborationFormValues) => {
        if (onSave) {
            if (data.requiereRevision && !data.fechaRevision) {
                data.fechaRevision = new Date().toISOString();
            }

            // Recalculate cost right before saving to ensure it's up-to-date
            let finalCosteTotal = 0;
            (data.componentes || []).forEach(componente => {
                const costeConMerma = (componente.costePorUnidad || 0) * (1 + (componente.merma || 0) / 100);
                finalCosteTotal += costeConMerma * componente.cantidad;
            });
            const finalProduccionTotal = data.produccionTotal > 0 ? data.produccionTotal : 1;
            const finalCostePorUnidad = finalProduccionTotal > 0 ? finalCosteTotal / finalProduccionTotal : 0;

            await onSave(data, finalCostePorUnidad);
        }
    };

    const forceRecalculate = () => {
        // This is a hack, but it forces the useMemo to re-run by "touching" its dependencies
        const currentValues = form.getValues('componentes');
        form.setValue('componentes', [...currentValues]);
        toast({ title: 'Cálculo forzado', description: 'Los costes y alérgenos han sido recalculados.' });
    }

    return (
        <TooltipProvider>
            <Form {...form}>
                <form id="elaboration-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <Tabs defaultValue="general">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">Info. General</TabsTrigger>
                            <TabsTrigger value="componentes">Componentes</TabsTrigger>
                            <TabsTrigger value="preparacion">Info. preparación</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general" className="mt-4">
                            <Card>
                                <CardHeader className="flex-row justify-between items-start py-3">
                                    <div><CardTitle className="text-lg">Información General</CardTitle></div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <FormField control={form.control} name="nombre" render={({ field }) => (
                                            <FormItem className="flex-1 flex items-center gap-2"><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                                            <FormItem className="flex-1 flex items-center gap-2"><FormLabel>Partida</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="FRIO">FRIO</SelectItem>
                                                        <SelectItem value="CALIENTE">CALIENTE</SelectItem>
                                                        <SelectItem value="PASTELERIA">PASTELERIA</SelectItem>
                                                        <SelectItem value="EXPEDICION">EXPEDICION</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="space-y-4 pt-4 border-t">
                                        <FormField control={form.control} name="requiereRevision" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Requiere Revisión</FormLabel>
                                                    <p className="text-sm text-muted-foreground">Marca esta opción si la elaboración necesita ser revisada.</p>
                                                </div>
                                            </FormItem>
                                        )} />
                                        {form.watch('requiereRevision') && (
                                            <FormField control={form.control} name="comentarioRevision" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Comentario de Revisión</FormLabel>
                                                    <FormControl><Textarea {...field} placeholder="Describe por qué necesita revisión..." rows={2} /></FormControl>
                                                </FormItem>
                                            )} />
                                        )}
                                    </div>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Coste de la Elaboración</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Columna izquierda: Datos de producción (50%) */}
                                                <div className="space-y-1.5 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Producción: </span>
                                                        <span className="font-semibold">{watchedProduccionTotal} {formatUnit(form.watch('unidadProduccion'))}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Valoración: </span>
                                                        <span className="font-semibold">{formatCurrency(costeTotal)}</span>
                                                    </div>
                                                </div>

                                                {/* Columna derecha: Precio/kg destacado (50%) */}
                                                <div className="flex flex-col items-center justify-center px-3 py-2 bg-primary/5 rounded border">
                                                    <p className="text-xs text-muted-foreground">€ / {formatUnit(form.watch('unidadProduccion'))}</p>
                                                    <p className="font-bold text-2xl text-primary">{formatCurrency(costePorUnidad)}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2"><Sprout />Alérgenos</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground mb-1">Presentes:</p>
                                                <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                                    {alergenosPresentes.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {alergenosPresentes.map(a => <AllergenBadge key={a} allergen={a} />)}
                                                        </div>
                                                    ) : <p className="text-xs text-muted-foreground italic">Ninguno</p>}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground mb-1">Trazas:</p>
                                                <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                                    {alergenosTrazas.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {alergenosTrazas.map(a => <AllergenBadge key={a} allergen={a} isTraza />)}
                                                        </div>
                                                    ) : <p className="text-xs text-muted-foreground italic">Ninguna</p>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="componentes" className="mt-4">
                            <Card>
                                <CardHeader className="flex-row items-center justify-between py-3">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2 text-lg"><Component />Componentes</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <FormField control={form.control} name="produccionTotal" render={({ field }) => (
                                            <FormItem className="flex items-center gap-2"><FormLabel>Producir</FormLabel><FormControl><Input type="number" step="any" {...field} className="w-24 h-9" /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="unidadProduccion" render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{formatUnit(u)}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" type="button"><PlusCircle className="mr-2" />Añadir</Button>
                                            </DialogTrigger>
                                            <ComponenteSelector
                                                onSelectIngrediente={handleSelectIngrediente}
                                                onSelectElaboracion={handleSelectElaboracion}
                                                allElaboraciones={Array.from(elaboracionesData.values())}
                                            />
                                        </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader><TableRow><TableHead className="py-2 px-3">Componente</TableHead><TableHead className="w-32 py-2 px-3">Cantidad</TableHead><TableHead className="w-24 py-2 px-3">% Merma</TableHead><TableHead className="w-28 py-2 px-3">Unidad</TableHead><TableHead className="w-32 py-2 px-3 text-right">Coste Total</TableHead><TableHead className="w-12 py-2 px-3"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {fields.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center">Añade un componente para empezar.</TableCell></TableRow>}
                                                {fields.map((field, index) => {
                                                    const componenteData = field.tipo === 'ingrediente'
                                                        ? ingredientesData.get(field.componenteId)
                                                        : elaboracionesData.get(field.componenteId);

                                                    const unidad = field.tipo === 'ingrediente'
                                                        ? ((componenteData as IngredienteConERP)?.erp?.unidadConversion && (componenteData as IngredienteConERP).erp!.unidadConversion > 1 ? 'Ud' : (componenteData as IngredienteConERP)?.erp?.unidad || 'UD')
                                                        : (componenteData as Elaboracion)?.unidadProduccion || 'UD';

                                                    // Recalcular coste si es necesario
                                                    let currentCost = field.costePorUnidad || 0;
                                                    if (field.tipo === 'ingrediente' && currentCost === 0) {
                                                        const erpData = (componenteData as IngredienteConERP)?.erp;
                                                        if (erpData) {
                                                            const unidadConversion = (erpData.unidadConversion && erpData.unidadConversion > 0) ? erpData.unidadConversion : 1;
                                                            currentCost = (erpData.precioCompra / unidadConversion) * (1 - (erpData.descuento || 0) / 100);
                                                        }
                                                    }

                                                    // Calcular coste total de este componente
                                                    const costeConMermaComponente = currentCost * (1 + (field.merma || 0) / 100);
                                                    const costeTotalComponente = costeConMermaComponente * (field.cantidad || 0);

                                                    // Verificar si ingrediente necesita revisión (más de 6 meses)
                                                    let needsReview = false;
                                                    if (field.tipo === 'ingrediente') {
                                                        const ingData = componenteData as IngredienteConERP;
                                                        if (ingData?.historialRevisiones && ingData.historialRevisiones.length > 0) {
                                                            const lastReview = new Date(ingData.historialRevisiones[ingData.historialRevisiones.length - 1].fecha);
                                                            const sixMonthsAgo = new Date();
                                                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                                                            needsReview = lastReview < sixMonthsAgo;
                                                        } else {
                                                            needsReview = true; // Sin revisiones
                                                        }
                                                    }

                                                    // Tooltip mejorado y estructurado
                                                    const tooltipLines = [
                                                        `💰 COSTES`,
                                                        `  • Unitario: ${formatCurrency(currentCost)} / ${formatUnit(unidad)}`,
                                                        `  • Con merma (${field.merma || 0}%): ${formatCurrency(costeConMermaComponente)} / ${formatUnit(unidad)}`,
                                                        `  • Total línea: ${formatCurrency(costeTotalComponente)}`,
                                                    ];

                                                    if (field.tipo === 'ingrediente') {
                                                        const erpData = (componenteData as IngredienteConERP)?.erp;
                                                        if (erpData) {
                                                            tooltipLines.push(`\n📦 DATOS ERP`);
                                                            tooltipLines.push(`  • Precio: ${formatCurrency(erpData.precioCompra)} / ${formatUnit(erpData.unidad)}`);
                                                            if (erpData.descuento) tooltipLines.push(`  • Descuento: ${erpData.descuento}%`);
                                                            if (erpData.nombreProveedor) tooltipLines.push(`  • Proveedor: ${erpData.nombreProveedor}`);
                                                            if (erpData.referenciaProveedor) tooltipLines.push(`  • Ref: ${erpData.referenciaProveedor}`);
                                                        }
                                                    }

                                                    const tooltipText = tooltipLines.join('\n');

                                                    return (
                                                        <TableRow key={field.id}>
                                                            <TableCell className="font-medium py-1 px-3">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-2">
                                                                            {field.tipo === 'ingrediente' ? <ChefHat size={16} className="text-muted-foreground" /> : <SubElabIcon size={16} className="text-muted-foreground" />}
                                                                            {field.nombre}
                                                                            {needsReview && <AlertTriangle size={14} className="text-amber-500" />}
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="font-mono text-xs whitespace-pre-wrap max-w-sm">
                                                                        {tooltipText}
                                                                        {needsReview && <p className="mt-2 text-amber-500 font-bold">⚠️ Requiere revisión de alérgenos</p>}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell className="py-1 px-3">
                                                                <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                                                                    <FormItem><FormControl><Input
                                                                        type="number"
                                                                        step="any"
                                                                        {...qField}
                                                                        onChange={(e) => qField.onChange(parseFloat(e.target.value) || 0)}
                                                                        className="h-8"
                                                                    /></FormControl></FormItem>
                                                                )} />
                                                            </TableCell>
                                                            <TableCell className="py-1 px-3">
                                                                <FormField control={form.control} name={`componentes.${index}.merma`} render={({ field: mField }) => (
                                                                    <FormItem><FormControl><Input
                                                                        type="number"
                                                                        step="any"
                                                                        {...mField}
                                                                        onChange={(e) => mField.onChange(parseFloat(e.target.value) || 0)}
                                                                        className="h-8"
                                                                    /></FormControl></FormItem>
                                                                )} />
                                                            </TableCell>
                                                            <TableCell className="py-1 px-3">
                                                                {formatUnit(unidad)}
                                                            </TableCell>
                                                            <TableCell className="py-1 px-3 text-right font-semibold">
                                                                {formatCurrency(costeTotalComponente)}
                                                            </TableCell>
                                                            <TableCell className="py-1 px-3"><Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.message}</p>}
                                </CardContent>
                                <CardFooter className="flex-col items-start gap-3 mt-4">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout />Resumen de Alérgenos</h4>
                                    <div className="w-full space-y-2">
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground mb-1">Presentes:</p>
                                            <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                                {alergenosPresentes.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {alergenosPresentes.map(a => <AllergenBadge key={a} allergen={a} />)}
                                                    </div>
                                                ) : <p className="text-xs text-muted-foreground italic">Ninguno</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground mb-1">Trazas:</p>
                                            <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                                {alergenosTrazas.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {alergenosTrazas.map(a => <AllergenBadge key={a} allergen={a} isTraza />)}
                                                    </div>
                                                ) : <p className="text-xs text-muted-foreground italic">Ninguna</p>}
                                            </div>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                        <TabsContent value="preparacion" className="mt-4">
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-lg">Instrucciones y Medios</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="instruccionesPreparacion" render={({ field }) => (
                                        <FormItem><FormLabel>Instrucciones de Preparación</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="videoProduccionURL" render={({ field }) => (
                                        <FormItem><FormLabel>URL Vídeo Producción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="space-y-2">
                                        <FormLabel>Fotos de Producción</FormLabel>
                                        <div className="flex gap-2">
                                            <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega una URL de imagen..." />
                                            <Button type="button" variant="outline" onClick={handleAddImageUrl}><LinkIcon className="mr-2" />Añadir URL</Button>
                                        </div>
                                        {form.formState.errors.fotosProduccionURLs && <p className="text-sm font-medium text-destructive">{(form.formState.errors.fotosProduccionURLs as any).message}</p>}
                                        <div className="grid grid-cols-3 gap-2 pt-2">
                                            {fotosFields.map((field, index) => (
                                                <div key={field.id} className="relative aspect-video rounded-md overflow-hidden group">
                                                    <Image src={(field as any).value} alt={`Foto de producción ${index + 1}`} fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button type="button" variant="destructive" size="icon" onClick={() => removeFoto(index)}><Trash2 /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-base">Datos de Expedición</CardTitle>
                                            <CardDescription className="text-xs">Define cómo se empaqueta y conserva esta elaboración.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField control={form.control} name="formatoExpedicion" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Formato Expedición</FormLabel>
                                                    <Combobox
                                                        options={formatosExpedicion.map(f => ({ value: f.nombre, label: f.nombre }))}
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        placeholder="Ej: Barqueta 1kg"
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="ratioExpedicion" render={({ field }) => (
                                                    <FormItem><FormLabel>Ratio Expedición</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={form.control} name="tipoExpedicion" render={({ field }) => (
                                                    <FormItem><FormLabel>Tipo de Expedición</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="REFRIGERADO">Refrigerado</SelectItem>
                                                                <SelectItem value="CONGELADO">Congelado</SelectItem>
                                                                <SelectItem value="SECO">Seco</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage /></FormItem>
                                                )} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </form>
            </Form>
        </TooltipProvider>
    );
}
