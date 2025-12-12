'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Trash2, Link as LinkIcon, CircleX } from 'lucide-react';
import { ImageManager } from '@/components/book/images/ImageManager';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS, ALERGENOS, FamiliaERP } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloMicecateringSchema, type ArticuloMicecateringFormValues, type ImagenArticulo } from '@/lib/articulos-schemas';
import { ErpArticleSelector } from '../components/ErpArticleSelector';

export default function EditarArticuloPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false);
    const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
    const [alergenos, setAlergenos] = useState<{nombre: string, tipo: 'presente'|'trazas'}[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [familias, setFamilias] = useState<FamiliaERP[]>([]);

    const form = useForm<ArticuloMicecateringFormValues>({
        resolver: zodResolver(articuloMicecateringSchema),
    });

    const categoria = form.watch('categoria');

    // Load article data
    useEffect(() => {
        async function loadArticulo() {
            if (!id) return;
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el artículo.' });
                return;
            }

            form.reset({
                id: data.id,
                nombre: data.nombre,
                categoria: data.categoria,
                familia: data.familia || '',
                precioVenta: data.precio_venta || 0,
                precioAlquiler: data.precio_alquiler || 0,
                precioReposicion: data.precio_reposicion || 0,
                erpId: data.erp_id || '',
                producidoPorPartner: data.producido_por_partner || false,
                stockSeguridad: data.stock_seguridad || 0,
                unidadVenta: data.unidad_venta || 1,
                loc: data.loc || '',
                alergenos: data.alergenos || [],
                docDriveUrl: data.doc_drive_url || '',
                iva: data.iva || 10,
                imagenes: data.imagenes || [],
            });

            if (data.imagenes) {
                setImagenes(data.imagenes);
            }
            if (data.alergenos) {
                setAlergenos(data.alergenos);
            }
            setIsLoaded(true);
        }

        loadArticulo();
    }, [id, form, toast]);

    // Load ERP articles
    useEffect(() => {
        async function loadArticulosERP() {
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('id, erp_id, proveedor_id, nombre_proveedor, nombre, referencia_proveedor, familia_categoria, precio_compra, descuento, unidad_conversion, precio, precio_alquiler, unidad_medida, tipo, categoria_mice, alquiler, observaciones')
                .limit(5000);
            if (error) {
                setArticulosERP([]);
            } else {
                const mappedArticulos = (data || []).map((row: any) => ({
                    id: row.id,
                    idreferenciaerp: row.erp_id || '',
                    idProveedor: row.proveedor_id || '',
                    nombreProveedor: row.nombre_proveedor || 'Sin proveedor',
                    nombreProductoERP: row.nombre || '',
                    referenciaProveedor: row.referencia_proveedor || '',
                    familiaCategoria: row.familia_categoria || '',
                    precioCompra: Number(row.precio_compra) || 0,
                    descuento: Number(row.descuento) || 0,
                    unidadConversion: Number(row.unidad_conversion) || 1,
                    precio: Number(row.precio) || 0,
                    precioAlquiler: Number(row.precio_alquiler) || 0,
                    unidad: row.unidad_medida || 'UD',
                    tipo: row.tipo || '',
                    categoriaMice: row.categoria_mice || '',
                    alquiler: Boolean(row.alquiler),
                    observaciones: row.observaciones || '',
                })) as ArticuloERP[];
                setArticulosERP(mappedArticulos);
            }
        }
        async function loadFamilias() {
            const { data, error } = await supabase
                .from('familias')
                .select('id, codigo, nombre, categoria_padre');
            if (!error && data) {
                setFamilias(data.map((f: any) => ({
                    id: f.id,
                    familiaCategoria: f.codigo,
                    Familia: f.nombre,
                    Categoria: f.categoria_padre || ''
                })));
            }
        }
        loadArticulosERP();
        loadFamilias();
    }, []);
        
    const selectedErpId = form.watch('erpId');
    const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);
    // Familia automática si ERP
    const familiaAuto = useMemo(() => {
        if (selectedErpProduct && selectedErpProduct.familiaCategoria) {
            const found = familias.find(f => f.familiaCategoria === selectedErpProduct.familiaCategoria);
            return found ? found.Familia : '';
        }
        return '';
    }, [selectedErpProduct, familias]);

    const calculatePrice = useCallback((p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }, []);

    const handleErpSelect = useCallback((erpId: string) => {
        form.setValue('erpId', erpId, { shouldDirty: true });
        setIsErpSelectorOpen(false);
    }, [form]);

    const handleImageUpload = useCallback((url: string, filename: string) => {
        if (imagenes.length >= 5) {
            toast({ variant: 'destructive', title: 'Límite alcanzado', description: 'Máximo 5 imágenes' });
            return;
        }
        const newImage: ImagenArticulo = { 
            id: `img-${Date.now()}`, 
            url, 
            esPrincipal: imagenes.length === 0, 
            orden: imagenes.length, 
            descripcion: filename 
        };
        setImagenes([...imagenes, newImage]);
    }, [imagenes, toast]);

    const handleImageReorder = useCallback((newOrder: any[]) => {
        setImagenes(newOrder.map((img, index) => ({ ...img, orden: index })));
    }, []);

    const handleImageDelete = useCallback((id: string) => {
        const newImages = imagenes.filter((img) => img.id !== id);
        if (imagenes.find((img) => img.id === id)?.esPrincipal && newImages.length > 0) {
            newImages[0].esPrincipal = true;
        }
        setImagenes(newImages);
    }, [imagenes]);

    const handleSetPrincipal = useCallback((id: string) => {
        setImagenes(imagenes.map((img) => ({ ...img, esPrincipal: img.id === id })));
    }, [imagenes]);

    async function onSubmit(data: ArticuloMicecateringFormValues) {
        setIsLoading(true);
        let familiaFinal = data.familia;
        if (selectedErpProduct && familiaAuto) {
            familiaFinal = familiaAuto;
        }
        const { error } = await supabase
            .from('articulos')
            .update({
                nombre: data.nombre,
                categoria: data.categoria,
                familia: familiaFinal || null,
                precio_venta: data.precioVenta,
                precio_alquiler: data.precioAlquiler,
                precio_reposicion: data.precioReposicion,
                erp_id: data.erpId || null,
                producido_por_partner: data.producidoPorPartner,
                stock_seguridad: data.stockSeguridad || 0,
                unidad_venta: data.unidadVenta || 1,
                loc: data.loc || null,
                alergenos: categoria === 'gastronomía' ? alergenos : [],
                doc_drive_url: data.docDriveUrl || null,
                iva: data.iva || 10,
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
        
    if (!isLoaded) {
        return (
            <>
                <main className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-screen">
                        <Loader2 className="animate-spin h-12 w-12 text-primary" />
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Header with actions */}
                        <div className="flex items-center justify-between gap-2">
                            <h1 className="text-2xl font-bold">Editar Artículo</h1>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                    <span className="ml-2">Guardar</span>
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    <X className="mr-2 h-4 w-4" />Cancelar
                                </Button>
                                <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="ml-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />Eliminar
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                {/* Vínculo ERP */}
                                <div className="w-full">
                                    <FormLabel className="text-sm">Vínculo con Artículo ERP</FormLabel>
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

                                {/* Nombre */}
                                <div className="w-full">
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-lg font-bold text-primary">Nombre <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input {...field} className="h-12 text-lg font-semibold" placeholder="Nombre del artículo" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Categoría */}
                                <div>
                                    <FormField control={form.control} name="categoria" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Categoría <span className="text-destructive">*</span></FormLabel>
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
                                </div>

                                {/* Familia */}
                                <div className="mt-4">
                                    {selectedErpProduct && familiaAuto ? (
                                        <FormItem>
                                            <FormLabel>Familia</FormLabel>
                                            <Input value={familiaAuto} disabled readOnly />
                                        </FormItem>
                                    ) : (
                                        <FormField control={form.control} name="familia" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Familia</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona una familia" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {familias.map(f => (
                                                            <SelectItem key={f.Familia} value={f.Familia}>{f.Familia}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    )}
                                </div>

                                {/* Precios y Stock */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <FormField control={form.control} name="precioVenta" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Venta (€)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} disabled={!!selectedErpProduct} value={selectedErpProduct ? calculatePrice(selectedErpProduct) : field.value} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="precioAlquiler" render={({ field }) => (
                                        <FormItem><FormLabel>Precio Alquiler (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="precioReposicion" render={({ field }) => (
                                        <FormItem><FormLabel>Precio Reposición (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="stockSeguridad" render={({ field }) => (
                                        <FormItem><FormLabel>Stock Seguridad</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="unidadVenta" render={({ field }) => (
                                        <FormItem><FormLabel>Unidad Venta</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                {/* Ubicación */}
                                <div>
                                    <FormField control={form.control} name="loc" render={({ field }) => (
                                        <FormItem><FormLabel>Ubicación (LOC)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                {/* Alérgenos (solo si categoría es gastronomía) */}
                                {categoria === 'gastronomía' && (
                                    <div className="mt-4">
                                        <h2 className="text-base font-bold mb-2">Alérgenos</h2>
                                        <div className="flex flex-wrap gap-4">
                                            {ALERGENOS.map(al => {
                                                const estado = alergenos.find(a => a.nombre === al)?.tipo || '';
                                                return (
                                                    <div key={al} className="flex flex-col items-start">
                                                        <span className="text-xs font-semibold mb-1">{al}</span>
                                                        <div className="flex gap-1">
                                                            <Button type="button" size="sm" variant={estado === 'presente' ? 'default' : 'outline'} onClick={() => setAlergenos(prev => {
                                                                const filtered = prev.filter(a => a.nombre !== al);
                                                                return [...filtered, { nombre: al, tipo: 'presente' }];
                                                            })}>Presente</Button>
                                                            <Button type="button" size="sm" variant={estado === 'trazas' ? 'default' : 'outline'} onClick={() => setAlergenos(prev => {
                                                                const filtered = prev.filter(a => a.nombre !== al);
                                                                return [...filtered, { nombre: al, tipo: 'trazas' }];
                                                            })}>Trazas</Button>
                                                            <Button type="button" size="sm" variant={estado === '' ? 'default' : 'outline'} onClick={() => setAlergenos(prev => prev.filter(a => a.nombre !== al))}>Ninguno</Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Checkbox Producido por Partner */}
                                <div className="mt-4">
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

                                {/* IVA */}
                                <div className="mt-4">
                                    <FormField control={form.control} name="iva" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>% IVA</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} min={0} max={21} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Documentación Drive */}
                                <div className="mt-4 pt-4 border-t">
                                    <FormField control={form.control} name="docDriveUrl" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>URL documentación Drive</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="https://drive.google.com/..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Imágenes */}
                                <div className="mt-6 pt-6 border-t">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-foreground">Imágenes <span className="text-xs text-muted-foreground">({imagenes.length}/5)</span></label>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-tight">Máximo 5 imágenes. Formatos: JPEG, PNG, HEIC. Selecciona una como imagen principal.</p>
                                    </div>
                                    
                                    <div className="bg-muted/30 rounded-lg p-3 border mt-3">
                                        <ImageManager 
                                            images={imagenes} 
                                            onUpload={handleImageUpload}
                                            onReorder={handleImageReorder}
                                            onDelete={handleImageDelete}
                                            onSetPrincipal={handleSetPrincipal}
                                            folder="articulosMice" 
                                            enableCamera={true} 
                                            label="Añadir imagen" 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
                
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
            </main>
        </>
    );
}
