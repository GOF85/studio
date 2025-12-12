'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Package, Trash2, Link as LinkIcon, CircleX } from 'lucide-react';
import { ImageManager } from '@/components/book/images/ImageManager';
import type { ImagenReceta } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloSchema, type ArticuloFormValues } from '../nuevo/page';
import type { ImagenArticulo } from '../nuevo/page';
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
        const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
        const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [activeTab, setActiveTab] = useState<'micecatering' | 'entregas'>('micecatering');
        const [pack, setPack] = useState<any[]>([]);
        const [alergenos, setAlergenos] = useState<any[]>([]);
        const [dptEntregas, setDptEntregas] = useState<'ALMACEN'|'CPR'|'PARTNER'|'RRHH'|undefined>(undefined);
        const [precioVentaEntregas, setPrecioVentaEntregas] = useState<number|undefined>(undefined);
        const [precioVentaEntregasIfema, setPrecioVentaEntregasIfema] = useState<number|undefined>(undefined);
        const [docDriveUrl, setDocDriveUrl] = useState('');
        const [iva, setIva] = useState(10);

        const form = useForm<ArticuloFormValues>({
            resolver: zodResolver(articuloSchema),
        });

        // Cargar datos del artículo
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

                if (data.imagenes) {
                    setImagenes(data.imagenes);
                }
                if (data.pack) {
                    setPack(data.pack);
                }
                if (data.alergenos) {
                    setAlergenos(data.alergenos);
                }
                setActiveTab(data.tipo_articulo || 'micecatering');
                setIsLoaded(true);
            }

            loadArticulo();
        }, [id, form, toast]);

        // Cargar artículos ERP
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
            loadArticulosERP();
        }, []);
        
        const selectedErpId = form.watch('erpId');
        const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);

        const handleErpSelect = useCallback((erpId: string) => {
            form.setValue('erpId', erpId, { shouldDirty: true });
            
            // Auto-populate price from ERP product
            const selectedProduct = articulosERP.find(p => p.idreferenciaerp === erpId);
            if (selectedProduct) {
                const basePrice = selectedProduct.precioCompra / (selectedProduct.unidadConversion || 1);
                const discount = selectedProduct.descuento || 0;
                const calculatedPrice = basePrice * (1 - discount / 100);
                form.setValue('precioVenta', calculatedPrice, { shouldDirty: true });
            }
            
            setIsErpSelectorOpen(false);
        }, [articulosERP, form]);

        const handlePackSelect = useCallback((erpId: string) => {
            const selectedProduct = articulosERP.find(p => p.idreferenciaerp === erpId);
            if (selectedProduct) {
                const newPackItem = {
                    erpId: selectedProduct.idreferenciaerp || '',
                    cantidad: 1,
                    nombre: selectedProduct.nombreProductoERP,
                    precio: selectedProduct.precio || 0,
                    valido: true
                };
                setPack(prev => [...prev, newPackItem] as typeof pack);
            }
            setIsPackSelectorOpen(false);
        }, [articulosERP]);

        const calculatePrice = (p: ArticuloERP) => {
            if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
            const basePrice = p.precioCompra / (p.unidadConversion || 1);
            const discount = p.descuento || 0;
            return basePrice * (1 - discount / 100);
        };

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
        
        // Lista de alérgenos estándar
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
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    {/* Fila 1: Tipo de Artículo y Vínculo ERP */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="md:col-span-1">
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
                                        </div>
                                        <div className="md:col-span-3">
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

                                    {/* Precios y Stock */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <FormField control={form.control} name="precioVenta" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Precio Venta (€)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" {...field} />
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

                                    {/* Checkboxes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="producidoPorPartner" render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="!mt-0 cursor-pointer">Producido por Partner</FormLabel>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="esHabitual" render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="!mt-0 cursor-pointer">Es Habitual</FormLabel>
                                            </FormItem>
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sección de Imágenes */}
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-foreground">Imágenes <span className="text-xs text-muted-foreground">({imagenes.length}/5)</span></label>
                                            {imagenes.length > 0 && (
                                                <div className="flex gap-1">
                                                    {imagenes.map((img) => (
                                                        <div key={img.id} className="flex items-center gap-1">
                                                            <img src={img.url} alt="preview" className="h-10 w-10 rounded border object-cover cursor-pointer" />
                                                            {img.esPrincipal && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">Principal</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-tight">Máximo 5 imágenes. Formatos: JPEG, PNG, HEIC. Selecciona una como imagen principal.</p>
                                    </div>
                                    
                                    <div className="bg-muted/30 rounded-lg p-3 border">
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
                                </CardContent>
                            </Card>

                            {/* Save Button */}
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
                    <ErpArticleSelector
                        open={isPackSelectorOpen}
                        onOpenChange={setIsPackSelectorOpen}
                        onSelect={handlePackSelect}
                        articulosERP={articulosERP}
                        searchTerm={erpSearchTerm}
                        setSearchTerm={setErpSearchTerm}
                    />
                </main>
            </>
        );
}
