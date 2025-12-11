'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Package, Trash2, Link as LinkIcon, CircleX } from 'lucide-react';
import { ImageManager } from '@/components/book/images/ImageManager';
import type { ImagenReceta } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloSchema, type ArticuloFormValues } from '../nuevo/page';
import { ErpArticleSelector } from '../components/ErpArticleSelector';

export default function EditarArticuloPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]); // New state
    const [erpSearchTerm, setErpSearchTerm] = useState(''); // New state
    const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false); // New state

    const [imagenes, setImagenes] = useState<ImagenReceta[]>([]);
    const form = useForm<ArticuloFormValues>({
        resolver: zodResolver(articuloSchema),
        defaultValues: {
            id: '',
            nombre: '',
            categoria: '',
            tipoArticulo: 'micecatering',
            precioVenta: 0,
            precioAlquiler: 0,
            precioReposicion: 0,
            erpId: '',
            producidoPorPartner: false,
            esHabitual: false,
            stockSeguridad: 0,
            unidadVenta: 1,
            loc: '',
            imagenes: [],
        },
    });

    // Effect to load the current article data
    useEffect(() => {
        async function loadArticulo() {
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el artículo.' });
                router.push('/bd/articulos');
                return;
            }

            form.reset({
                id: data.id,
                nombre: data.nombre,
                categoria: data.categoria,
                tipoArticulo: data.tipo_articulo || 'micecatering',
                precioVenta: data.precio_venta || 0,
                precioAlquiler: data.precio_alquiler || 0,
                precioReposicion: data.precio_reposicion || 0,
                erpId: data.erp_id || '',
                producidoPorPartner: data.producido_por_partner || false,
                esHabitual: data.es_habitual || false,
                stockSeguridad: data.stock_seguridad || 0,
                unidadVenta: data.unidad_venta || 1,
                loc: data.loc || '',
                imagenes: data.imagenes || [],
            });
            setImagenes(data.imagenes || []);
        }
        loadArticulo();
    }, [id, form, router, toast]);

    // Effect to load ERP articles
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
    }, []); // Run only once on mount

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
            .update({
                nombre: data.nombre,
                categoria: data.categoria,
                tipo_articulo: data.tipoArticulo,
                precio_venta: data.precioVenta,
                precio_alquiler: data.precioAlquiler,
                precio_reposicion: data.precioReposicion,
                erp_id: data.erpId || null,
                producido_por_partner: data.producidoPorPartner,
                es_habitual: data.esHabitual,
                stock_seguridad: data.stockSeguridad || 0,
                unidad_venta: data.unidadVenta || 1,
                loc: data.loc || null,
                imagenes: imagenes,
            })
            .eq('id', id);

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el artículo.' });
            setIsLoading(false);
            return;
        }

        toast({ description: 'Artículo actualizado correctamente.' });
        await loadAllData();
        router.push('/bd/articulos');
        setIsLoading(false);
    }

    const handleDelete = async () => {
        const { error } = await supabase
            .from('articulos')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
            return;
        }

        toast({ title: 'Artículo eliminado' });
        await loadAllData();
        router.push('/bd/articulos');
    };

    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Package className="h-8 w-8" />
                                <h1 className="text-3xl font-headline font-bold">Editar Artículo</h1>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" type="button" onClick={() => router.push('/bd/articulos')}> <X className="mr-2" /> Cancelar</Button>
                                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                    <span className="ml-2">Guardar Cambios</span>
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <CardHeader><CardTitle className="text-lg">Información del Artículo</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                                                {/* Gestión de imágenes */}
                                                                <div className="pt-6">
                                                                    <h2 className="text-lg font-bold mb-2">Imágenes del artículo (máx. 5)</h2>
                                                                    <ImageManager
                                                                        images={imagenes}
                                                                        onUpload={(url, filename) => {
                                                                            if (imagenes.length >= 5) {
                                                                                toast({ variant: 'destructive', title: 'Máximo 5 imágenes', description: 'No puedes subir más de 5 imágenes.' });
                                                                                return;
                                                                            }
                                                                            setImagenes(prev => {
                                                                                const newImgs = [...prev, { id: `img-${Date.now()}`, url, descripcion: filename, esPrincipal: prev.length === 0, orden: prev.length }];
                                                                                return newImgs;
                                                                            });
                                                                        }}
                                                                        onReorder={newOrder => setImagenes(newOrder.map((img, idx) => ({ ...img, orden: idx })))}
                                                                        onDelete={id => setImagenes(prev => {
                                                                            const filtered = prev.filter(img => img.id !== id);
                                                                            // Si se borra la principal, marcar la primera como principal
                                                                            if (filtered.length > 0 && !filtered.some(img => img.esPrincipal)) filtered[0].esPrincipal = true;
                                                                            return filtered;
                                                                        })}
                                                                        onSetPrincipal={id => setImagenes(prev => prev.map(img => ({ ...img, esPrincipal: img.id === id })))}
                                                                        folder={form.getValues('id')}
                                                                        bucket="articulosMice"
                                                                        enableCamera={true}
                                                                        label="imagen"
                                                                    />
                                                                    <p className="text-xs text-muted-foreground mt-2">Se permiten PNG, JPEG y HEIC. Si la conversión de HEIC falla, usa PNG/JPEG.</p>
                                                                </div>
                                    <FormField control={form.control} name="tipoArticulo" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-lg font-bold text-primary">Tipo de Artículo <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-14 text-lg border-2 border-primary bg-primary/10 font-bold">
                                                        <SelectValue placeholder="Selecciona un tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="micecatering">Micecatering</SelectItem>
                                                    <SelectItem value="entregas">Entregas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />

                                    <FormField control={form.control} name="categoria" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoría</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
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
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            </main>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el registro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
