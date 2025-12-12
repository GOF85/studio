'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Link as LinkIcon, CircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ARTICULO_CATERING_CATEGORIAS, ALERGENOS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { ErpArticleSelector } from '../components/ErpArticleSelector';
import { ImageManager } from '@/components/book/images/ImageManager';

export interface ImagenArticulo {
    id: string;
    url: string;
    esPrincipal: boolean;
    orden: number;
    descripcion?: string;
}

export const articuloSchema = z.object({
    id: z.string(),
    nombre: z.string().min(1, 'El nombre es requerido'),
    categoria: z.string().min(1, 'La categoría es requerida'),
    tipoArticulo: z.enum(['micecatering', 'entregas'], { required_error: 'El tipo de artículo es obligatorio' }),
    precioVenta: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    precioAlquiler: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    precioReposicion: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    erpId: z.string().optional(),
    producidoPorPartner: z.boolean(),
    esHabitual: z.boolean(),
    stockSeguridad: z.coerce.number().min(0, 'El stock debe ser mayor o igual a 0'),
    unidadVenta: z.coerce.number().min(1, 'La unidad de venta debe ser al menos 1'),
    loc: z.string().optional(),
    pack: z.array(z.object({
        erpId: z.string(),
        cantidad: z.coerce.number().min(1)
    })).default([]),
    audit: z.array(z.object({
        usuario: z.string(),
        fecha: z.string(),
        cambio: z.string()
    })).default([]),
    alergenos: z.array(z.object({
        nombre: z.string(),
        tipo: z.enum(['presente', 'trazas'])
    })).default([]),
    docDriveUrl: z.string().url('URL debe ser válida').or(z.literal('')).optional(),
    iva: z.coerce.number().min(0).default(10),
    dptEntregas: z.enum(['ALMACEN', 'CPR', 'PARTNER', 'RRHH']).optional(),
    precioVentaEntregas: z.coerce.number().min(0).optional(),
    precioVentaEntregasIfema: z.coerce.number().min(0).optional(),
    imagenes: z.array(z.object({
        id: z.string(),
        url: z.string(),
        esPrincipal: z.boolean(),
        orden: z.number(),
        descripcion: z.string().optional()
    })).default([]),
});

export type ArticuloFormValues = z.infer<typeof articuloSchema>;

export default function NuevoArticuloPage() {
    const router = useRouter();
    const { isLoading, setIsLoading } = useLoadingStore();
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false);
    const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
    const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
    const [pack, setPack] = useState<{erpId: string, cantidad: number, nombre?: string, precio?: number, valido?: boolean}[]>([]);
    const [alergenos, setAlergenos] = useState<{nombre: string, tipo: 'presente'|'trazas'}[]>([]);
    const [docDriveUrl, setDocDriveUrl] = useState('');
    const [audit, setAudit] = useState<{usuario: string, fecha: string, cambio: string}[]>([]);
    const [iva, setIva] = useState(10);
    const [dptEntregas, setDptEntregas] = useState<'ALMACEN'|'CPR'|'PARTNER'|'RRHH'|undefined>(undefined);
    const [precioVentaEntregas, setPrecioVentaEntregas] = useState<number|undefined>(undefined);
    const [precioVentaEntregasIfema, setPrecioVentaEntregasIfema] = useState<number|undefined>(undefined);
    const [precioCosteAlquiler, setPrecioCosteAlquiler] = useState<number|undefined>(undefined);
    const [precioAlquilerIfema, setPrecioAlquilerIfema] = useState<number|undefined>(undefined);
    const [precioVentaIfema, setPrecioVentaIfema] = useState<number|undefined>(undefined);

    const form = useForm<ArticuloFormValues>({
        resolver: zodResolver(articuloSchema),
        defaultValues: {
            id: crypto.randomUUID(),
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
            pack: [],
            audit: [],
            alergenos: [],
            docDriveUrl: '',
            iva: 10,
            dptEntregas: undefined,
            precioVentaEntregas: undefined,
            precioVentaEntregasIfema: undefined,
            imagenes: [],
        },
    });

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
        loadArticulosERP();
    }, []);

    const selectedErpId = form.watch('erpId');
    const selectedErpProduct = useMemo(() => {
        return articulosERP.find(p => p.idreferenciaerp === selectedErpId);
    }, [articulosERP, selectedErpId]);

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

    const calculatePrice = useMemo(() => (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }, []);

    const packTotalPrice = useMemo(() => pack.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0), [pack]);

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

        let precioCoste = null;
        if (data.tipoArticulo === 'entregas') {
            precioCoste = pack.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0);
        }

        const insertData = {
            id: data.id,
            nombre: data.nombre,
            categoria: data.categoria,
            tipo_articulo: data.tipoArticulo,
            precio_venta: Number(data.precioVenta) || 0,
            precio_alquiler: Number(data.precioAlquiler) || 0,
            precio_reposicion: Number(data.precioReposicion) || 0,
            erp_id: data.erpId || null,
            producido_por_partner: Boolean(data.producidoPorPartner),
            es_habitual: Boolean(data.esHabitual),
            stock_seguridad: Number(data.stockSeguridad) || 0,
            unidad_venta: Number(data.unidadVenta) || 1,
            loc: data.loc || null,
            pack: data.tipoArticulo === 'entregas' ? pack.map(({erpId, cantidad, nombre, precio}) => ({erpId, cantidad: Number(cantidad), nombre, precio: Number(precio)})) : [],
            alergenos: data.categoria === 'gastronomía' ? alergenos : [],
            doc_drive_url: docDriveUrl || null,
            iva: Number(iva) || 10,
            dpt_entregas: dptEntregas || null,
            precio_venta_entregas: precioVentaEntregas ? Number(precioVentaEntregas) : null,
            precio_venta_entregas_ifema: precioVentaEntregasIfema ? Number(precioVentaEntregasIfema) : null,
            precio_coste: precioCoste,
            precio_coste_alquiler: precioCosteAlquiler ? Number(precioCosteAlquiler) : null,
            precio_alquiler_ifema: precioAlquilerIfema ? Number(precioAlquilerIfema) : null,
            precio_venta_ifema: precioVentaIfema ? Number(precioVentaIfema) : null,
            imagenes: imagenes,
        };

        try {
            const { data: result, error } = await supabase
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
                        onSubmit={form.handleSubmit(onSubmit, (errors) => {
                            toast({ variant: 'destructive', title: 'Error de validación', description: 'Revisa los campos obligatorios.' });
                        })}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-end mb-4 gap-2">
                            <Button variant="outline" type="button" onClick={() => router.push('/bd/articulos')}><X className="mr-2" />Cancelar</Button>
                            <Button type="submit" disabled={isLoading || pack.some(p => p.valido === false)}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar</span>
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                {/* Fila 1: Tipo de Artículo y Vínculo ERP (reducido) */}
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

                                {/* Fila 2: Nombre GRANDE */}
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

                                {/* Fila de precios, stock y unidad venta */}
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

                                {/* Packs de referencias ERP (solo para Entregas) */}
                                {form.watch('tipoArticulo') === 'entregas' && (
                                    <div className="mt-4">
                                        <h2 className="text-base font-bold mb-2">Pack de referencias ERP</h2>
                                        {pack.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 mb-2 border rounded-md p-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{item.nombre || item.erpId}</p>
                                                    <p className="text-xs text-muted-foreground">Ref: {item.erpId}</p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.cantidad}
                                                    onChange={e => {
                                                        const cantidad = Number(e.target.value);
                                                        setPack(prev => prev.map((p, i) => i === idx ? { ...p, cantidad } : p));
                                                    }}
                                                    placeholder="Cantidad"
                                                    className="w-24"
                                                />
                                                <span className="font-mono text-sm">{item.precio ? `${item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : ''}</span>
                                                <Button type="button" size="icon" variant="ghost" onClick={() => setPack(prev => prev.filter((_, i) => i !== idx))}>🗑️</Button>
                                            </div>
                                        ))}
                                        <Button type="button" size="sm" variant="secondary" onClick={() => setIsPackSelectorOpen(true)}>+ Añadir producto ERP</Button>
                                        <div className="mt-2 font-bold">Precio total pack: {packTotalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                                    </div>
                                )}

                                {/* Alérgenos (solo si categoría es gastronomía) */}
                                {form.watch('categoria') === 'gastronomía' && (
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

                                {/* Campos de Entregas */}
                                {form.watch('tipoArticulo') === 'entregas' && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <FormLabel>Responsable Entregas</FormLabel>
                                            <Select value={dptEntregas} onValueChange={v => setDptEntregas(v as any)}>
                                                <SelectTrigger><SelectValue placeholder="Selecciona responsable" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALMACEN">ALMACEN</SelectItem>
                                                    <SelectItem value="CPR">CPR</SelectItem>
                                                    <SelectItem value="PARTNER">PARTNER</SelectItem>
                                                    <SelectItem value="RRHH">RRHH</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <FormLabel>% IVA</FormLabel>
                                            <Input type="number" value={iva} onChange={e => setIva(Number(e.target.value))} min={0} max={21} />
                                        </div>
                                        <div>
                                            <FormLabel>Precio venta Entregas</FormLabel>
                                            <Input type="number" value={precioVentaEntregas ?? ''} onChange={e => setPrecioVentaEntregas(Number(e.target.value))} min={0} />
                                        </div>
                                        <div>
                                            <FormLabel>Precio venta Entregas IFEMA</FormLabel>
                                            <Input type="number" value={precioVentaEntregasIfema ?? ''} onChange={e => setPrecioVentaEntregasIfema(Number(e.target.value))} min={0} />
                                        </div>
                                        <div>
                                            <FormLabel>Precio coste alquiler</FormLabel>
                                            <Input type="number" value={precioCosteAlquiler ?? ''} onChange={e => setPrecioCosteAlquiler(Number(e.target.value))} min={0} />
                                        </div>
                                        <div>
                                            <FormLabel>Precio alquiler IFEMA</FormLabel>
                                            <Input type="number" value={precioAlquilerIfema ?? ''} onChange={e => setPrecioAlquilerIfema(Number(e.target.value))} min={0} />
                                        </div>
                                        <div>
                                            <FormLabel>Precio venta IFEMA</FormLabel>
                                            <Input type="number" value={precioVentaIfema ?? ''} onChange={e => setPrecioVentaIfema(Number(e.target.value))} min={0} />
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

                                {/* Documentación Drive */}
                                <div className="mt-4 pt-4 border-t">
                                    <FormLabel>URL documentación Drive</FormLabel>
                                    <Input value={docDriveUrl} onChange={e => setDocDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                                </div>

                                {/* Imágenes (máximo 5) */}
                                <div className="mt-6 pt-6 border-t">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-foreground">Imágenes <span className="text-xs text-muted-foreground">({imagenes.length}/5)</span></label>
                                            {imagenes.length > 0 && (
                                                <div className="flex gap-1">
                                                    {imagenes.map((img, i) => (
                                                        <div key={img.id} className="flex items-center gap-1">
                                                            <img src={img.url} alt="preview" className="h-10 w-10 rounded border object-cover cursor-pointer" onClick={() => { /* open gallery */ }} />
                                                            {img.esPrincipal && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">Principal</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
            <ErpArticleSelector
                open={isPackSelectorOpen}
                onOpenChange={setIsPackSelectorOpen}
                onSelect={handlePackSelect}
                articulosERP={articulosERP}
                searchTerm={erpSearchTerm}
                setSearchTerm={setErpSearchTerm}
            />
        </>
    );
}
