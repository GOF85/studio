'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Link as LinkIcon, CircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ARTICULO_CATERING_CATEGORIAS, ALERGENOS, FamiliaERP } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { ErpArticleSelector } from '../components/ErpArticleSelector';
import { ImageManager } from '@/components/book/images/ImageManager';
import { articuloMicecateringSchema, type ArticuloMicecateringFormValues, type ImagenArticulo } from '@/lib/articulos-schemas';

export default function NuevoArticuloPage() {
    const router = useRouter();
    const { isLoading, setIsLoading } = useLoadingStore();
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false);
    const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
    const [alergenos, setAlergenos] = useState<{nombre: string, tipo: 'presente'|'trazas'}[]>([]);
    const [familias, setFamilias] = useState<FamiliaERP[]>([]);

    const form = useForm<ArticuloMicecateringFormValues>({
        resolver: zodResolver(articuloMicecateringSchema),
        defaultValues: {
            id: crypto.randomUUID(),
            nombre: '',
            categoria: '',
            precioVenta: 0,
            precioAlquiler: 0,
            precioReposicion: 0,
            erpId: '',
            producidoPorPartner: false,
            stockSeguridad: 0,
            unidadVenta: 1,
            loc: '',
            alergenos: [],
            docDriveUrl: '',
            iva: 10,
            imagenes: [],
        },
    });

    const categoria = form.watch('categoria');

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
                    idreferenciaerp: row.erp_id || row.idreferenciaerp || '',
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
    const selectedErpProduct = useMemo(() => {
        return articulosERP.find(p => p.idreferenciaerp === selectedErpId);
    }, [articulosERP, selectedErpId]);

    // Familia automática si ERP
    const familiaAuto = useMemo(() => {
        if (selectedErpProduct && selectedErpProduct.familiaCategoria) {
            const found = familias.find(f => f.familiaCategoria === selectedErpProduct.familiaCategoria);
            return found ? found.Familia : '';
        }
        return '';
    }, [selectedErpProduct, familias]);

    const calculatePrice = useMemo(() => (p: ArticuloERP) => {
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
        const insertData = {
            id: data.id,
            nombre: data.nombre,
            categoria: data.categoria,
            familia: familiaFinal || null,
            tipo_articulo: 'micecatering',
            precio_venta: Number(data.precioVenta) || 0,
            precio_alquiler: Number(data.precioAlquiler) || 0,
            precio_reposicion: Number(data.precioReposicion) || 0,
            erp_id: data.erpId || null,
            producido_por_partner: Boolean(data.producidoPorPartner),
            stock_seguridad: Number(data.stockSeguridad) || 0,
            unidad_venta: Number(data.unidadVenta) || 1,
            loc: data.loc || null,
            alergenos: categoria === 'gastronomía' ? alergenos : [],
            doc_drive_url: data.docDriveUrl || null,
            iva: Number(data.iva) || 10,
            imagenes: imagenes,
        };

        try {
            const { error } = await supabase
                .from('articulos')
                .insert([insertData])
                .select();

            if (error) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Error al guardar', 
                    description: `${error.message}${error.details ? ' - ' + error.details : ''}` 
                });
                setIsLoading(false);
                return;
            }

            toast({ description: 'Nuevo artículo añadido correctamente.' });
            
            await loadAllData();
            router.push('/bd/articulos');
            setIsLoading(false);
        } catch (err) {
            toast({ 
                variant: 'destructive', 
                title: 'Error inesperado', 
                description: err instanceof Error ? err.message : 'Error desconocido' 
            });
            setIsLoading(false);
        }
    }

    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(async (data) => {
                            setIsLoading(true);
                            let familiaFinal = data.familia;
                            if (selectedErpProduct && familiaAuto) {
                                familiaFinal = familiaAuto;
                            }
                            const insertData = {
                                id: data.id,
                                nombre: data.nombre,
                                categoria: data.categoria,
                                familia: familiaFinal || null,
                                tipo_articulo: 'micecatering',
                                precio_venta: Number(data.precioVenta) || 0,
                                precio_alquiler: Number(data.precioAlquiler) || 0,
                                precio_reposicion: Number(data.precioReposicion) || 0,
                                erp_id: data.erpId || null,
                                producido_por_partner: Boolean(data.producidoPorPartner),
                                stock_seguridad: Number(data.stockSeguridad) || 0,
                                unidad_venta: Number(data.unidadVenta) || 1,
                                loc: data.loc || null,
                                alergenos: categoria === 'gastronomía' ? alergenos : [],
                                doc_drive_url: data.docDriveUrl || null,
                                iva: Number(data.iva) || 10,
                                imagenes: imagenes,
                            };
                            try {
                                const { error } = await supabase
                                    .from('articulos')
                                    .insert([insertData])
                                    .select();
                                if (error) {
                                    toast({ 
                                        variant: 'destructive', 
                                        title: 'Error al guardar', 
                                        description: `${error.message}${error.details ? ' - ' + error.details : ''}` 
                                    });
                                    setIsLoading(false);
                                    return;
                                }
                                toast({ description: 'Nuevo artículo añadido correctamente.' });
                                await loadAllData();
                                router.push('/bd/articulos');
                                setIsLoading(false);
                            } catch (err) {
                                toast({ 
                                    variant: 'destructive', 
                                    title: 'Error inesperado', 
                                    description: err instanceof Error ? err.message : 'Error desconocido' 
                                });
                                setIsLoading(false);
                            }
                        }, (errors) => {
                            toast({ variant: 'destructive', title: 'Error de validación', description: 'Revisa los campos obligatorios.' });
                        })}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-end mb-4 gap-2">
                            <Button variant="outline" type="button" onClick={() => router.push('/bd/articulos')}><X className="mr-2" />Cancelar</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar</span>
                            </Button>
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

                                {/* Nombre GRANDE */}
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
                                <div className="mt-4">
                                    <FormField control={form.control} name="categoria" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Categoría <span className="text-destructive">*</span></FormLabel>
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

                                {/* Precios, stock y unidad venta */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
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
                                <div className="mt-4">
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

                                {/* Imágenes (máximo 5) */}
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
