'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, Link as LinkIcon, CircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { ErpArticleSelector } from '../components/ErpArticleSelector';



export default function NuevoArticuloPage() {
    const router = useRouter();
    const { isLoading, setIsLoading } = useLoadingStore();
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false);

    const form = useForm<ArticuloFormValues>({
        resolver: zodResolver(articuloSchema),
        defaultValues: {
            id: crypto.randomUUID(),
            nombre: '',
            categoria: '',
            precioVenta: 0,
            precioAlquiler: 0,
            precioReposicion: 0,
            erpId: '',
            producidoPorPartner: false,
            esHabitual: false,
            stockSeguridad: 0,
            unidadVenta: 1,
            loc: '',
        },
    });

    useEffect(() => {
        async function loadArticulosERP() {
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('*');

            if (error) {
                console.error('Error loading articulos_erp:', error);
                setArticulosERP([]);
            } else {
                const mappedArticulos = (data || []).map((row: any) => ({
                    id: row.id,
                    idreferenciaerp: row.erp_id || row.idreferenciaerp || '',
                    idProveedor: row.proveedor_id || '',
                    nombreProveedor: row.nombre_proveedor || 'Sin proveedor',
                    nombreProductoERP: row.nombre || '',
                    referenciaProveedor: row.referencia_proveedor || '',
                    familiaCategoria: row.familia_categoria || '',
                    precioCompra: row.precio_compra || 0,
                    descuento: row.descuento || 0,
                    unidadConversion: row.unidad_conversion || 1,
                    precio: row.precio || 0,
                    precioAlquiler: row.precio_alquiler || 0,
                    unidad: row.unidad_medida || 'UD',
                    tipo: row.tipo || '',
                    categoriaMice: row.categoria_mice || '',
                    alquiler: row.alquiler || false,
                    observaciones: row.observaciones || '',
                })) as ArticuloERP[];
                setArticulosERP(mappedArticulos);
            }
        }
        loadArticulosERP();
    }, []);

    const selectedErpId = form.watch('erpId');
    const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);

    const handleErpSelect = (erpId: string) => {
        form.setValue('erpId', erpId, { shouldDirty: true });
        setIsErpSelectorOpen(false);
    };

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    };

    async function onSubmit(data: ArticuloFormValues) {
        setIsLoading(true);

        const { error } = await supabase
            .from('articulos')
            .insert({
                id: data.id,
                nombre: data.nombre,
                categoria: data.categoria,
                precio_venta: data.precioVenta,
                precio_alquiler: data.precioAlquiler,
                precio_reposicion: data.precioReposicion,
                erp_id: data.erpId || null,
                producido_por_partner: data.producidoPorPartner,
                es_habitual: data.esHabitual,
                stock_seguridad: data.stockSeguridad || 0,
                unidad_venta: data.unidadVenta || 1,
                loc: data.loc || null,
            });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el artículo.' });
            setIsLoading(false);
            return;
        }

        toast({ description: 'Nuevo artículo añadido correctamente.' });
        await loadAllData();
        router.push('/bd/articulos');
        setIsLoading(false);
    }

    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Package className="h-8 w-8" />
                                <h1 className="text-3xl font-headline font-bold">Nuevo Artículo</h1>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" type="button" onClick={() => router.push('/bd/articulos')}> <X className="mr-2" /> Cancelar</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                    <span className="ml-2">Guardar</span>
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <CardHeader><CardTitle className="text-lg">Información del Artículo</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />

                                    <FormField control={form.control} name="categoria" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoría</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona una categoría" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ARTICULO_CATERING_CATEGORIAS.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div>
                                        <FormLabel>Vínculo con Artículo ERP</FormLabel>
                                        {selectedErpProduct ? (
                                            <div className="border rounded-md p-2 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                                        <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" type="button" onClick={() => form.setValue('erpId', '', { shouldDirty: true })}><CircleX className="mr-1 h-3 w-3" />Desvincular</Button>
                                                </div>
                                                <p className="font-bold text-primary text-sm">{calculatePrice(selectedErpProduct).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {selectedErpProduct.unidad}</p>
                                            </div>
                                        ) : (
                                            <Button variant="secondary" type="button" className="w-full h-16 border-dashed border-2" onClick={() => setIsErpSelectorOpen(true)}>
                                                <LinkIcon className="mr-2" />Vincular Artículo ERP
                                            </Button>
                                        )}
                                    </div>

                                    <FormField control={form.control} name="loc" render={({ field }) => (
                                        <FormItem><FormLabel>Ubicación (LOC)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="precioVenta" render={({ field }) => (
                                        <FormItem><FormLabel>Precio Venta (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="precioAlquiler" render={({ field }) => (
                                        <FormItem><FormLabel>Precio Alquiler (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="precioReposicion" render={({ field }) => (
                                        <FormItem><FormLabel>Precio Reposición (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="stockSeguridad" render={({ field }) => (
                                        <FormItem><FormLabel>Stock Seguridad</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="unidadVenta" render={({ field }) => (
                                        <FormItem><FormLabel>Unidad Venta</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="flex gap-6 pt-2">
                                    <FormField control={form.control} name="producidoPorPartner" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Producido por Partner</FormLabel>
                                                <FormDescription>Marcar si este artículo es suministrado por un tercero.</FormDescription>
                                            </div>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="esHabitual" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Es Habitual</FormLabel>
                                                <FormDescription>Marcar si es un artículo de uso frecuente.</FormDescription>
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            </main>
            <ErpArticleSelector
                open={isErpSelectorOpen}
                onOpenChange={setIsErpSelectorOpen}
                onSelect={handleErpSelect}
                articulosERP={articulosERP}
                searchTerm={erpSearchTerm}
                setSearchTerm={setErpSearchTerm}
            />
        </>
    );
}
