'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, Link as LinkIcon, CircleX } from 'lucide-react';
import { ImageManager } from '@/components/book/images/ImageManager';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ARTICULO_CATERING_CATEGORIAS, ALERGENOS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { ErpArticleSelector } from '../components/ErpArticleSelector';

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
    // Packs: lista de referencias ERP y cantidades
    pack: z.array(z.object({
        erpId: z.string(),
        cantidad: z.coerce.number().min(1)
    })).default([]),
    // Auditoría
    audit: z.array(z.object({
        usuario: z.string(),
        fecha: z.string(),
        cambio: z.string()
    })).default([]),
    // Alérgenos
    alergenos: z.array(z.enum(ALERGENOS)).default([]),
    // Documentación
    docDriveUrl: z.string().url().optional(),
    // IVA y campos entregas
    iva: z.coerce.number().min(0).default(10),
    dptEntregas: z.enum(['ALMACEN', 'CPR', 'PARTNER', 'RRHH']).optional(),
    precioVentaEntregas: z.coerce.number().min(0).optional(),
    precioVentaEntregasIfema: z.coerce.number().min(0).optional(),
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

    const [imagenes, setImagenes] = useState<ImagenReceta[]>([]);
    const [pack, setPack] = useState<{erpId: string, cantidad: number, nombre?: string, precio?: number, valido?: boolean}[]>([]);
    const [alergenos, setAlergenos] = useState<string[]>([]);
    const [docDriveUrl, setDocDriveUrl] = useState('');
    const [audit, setAudit] = useState<{usuario: string, fecha: string, cambio: string}[]>([]);
    const [iva, setIva] = useState(10);
    const [dptEntregas, setDptEntregas] = useState<'ALMACEN'|'CPR'|'PARTNER'|'RRHH'|undefined>(undefined);
    const [precioVentaEntregas, setPrecioVentaEntregas] = useState<number|undefined>(undefined);
    const [precioVentaEntregasIfema, setPrecioVentaEntregasIfema] = useState<number|undefined>(undefined);
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
            imagenes: [],
            pack: [],
            audit: [],
            alergenos: [],
            docDriveUrl: '',
            iva: 10,
            dptEntregas: undefined,
            precioVentaEntregas: undefined,
            precioVentaEntregasIfema: undefined,
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
            });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el artículo.' });
            setIsLoading(false);
            return;
        }
                    imagenes: imagenes,

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
                        <div className="flex items-center justify-end mb-4 gap-2">
                            <Button variant="outline" type="button" onClick={() => router.push('/bd/articulos')}> <X className="mr-2" /> Cancelar</Button>
                            <Button type="submit" disabled={isLoading || pack.some(p => p.valido === false)}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar</span>
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {/* Packs de referencias ERP */}
                                                                        <div className="col-span-2">
                                                                            <h2 className="text-base font-bold mb-2">Pack de referencias ERP</h2>
                                                                            {pack.map((item, idx) => (
                                                                                <div key={idx} className={`flex items-center gap-2 mb-2 ${item.valido === false ? 'bg-red-50 border border-red-400' : ''}`}>
                                                                                    <Input
                                                                                        value={item.erpId}
                                                                                        onChange={e => {
                                                                                            const erpId = e.target.value;
                                                                                            setPack(prev => prev.map((p, i) => i === idx ? { ...p, erpId } : p));
                                                                                        }}
                                                                                        placeholder="Referencia ERP"
                                                                                        className="w-32"
                                                                                    />
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
                                                                                    <span className="text-xs text-muted-foreground">{item.nombre || ''}</span>
                                                                                    <span className="font-mono text-xs">{item.precio ? `${item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : ''}</span>
                                                                                    <Button type="button" size="icon" variant="ghost" onClick={() => setPack(prev => prev.filter((_, i) => i !== idx))}>🗑️</Button>
                                                                                    {item.valido === false && <span className="text-red-600 text-xs ml-2">Referencia inválida o inactiva</span>}
                                                                                </div>
                                                                            ))}
                                                                            <Button type="button" size="sm" variant="secondary" onClick={() => setPack(prev => [...prev, { erpId: '', cantidad: 1, valido: true }])}>Añadir referencia</Button>
                                                                            {/* Precio total pack */}
                                                                            <div className="mt-2 font-bold">Precio total pack: {pack.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                                                                        </div>
                                                                        {/* Alérgenos */}
                                                                        <div className="col-span-2">
                                                                            <h2 className="text-base font-bold mb-2">Alérgenos</h2>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {ALERGENOS.map(al => (
                                                                                    <Button key={al} type="button" size="sm" variant={alergenos.includes(al) ? 'default' : 'outline'} onClick={() => setAlergenos(prev => prev.includes(al) ? prev.filter(a => a !== al) : [...prev, al])}>{al}</Button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        {/* Documentación Drive */}
                                                                        <div className="col-span-2">
                                                                            <FormLabel>URL documentación Drive</FormLabel>
                                                                            <Input value={docDriveUrl} onChange={e => setDocDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                                                                        </div>
                                                                        {/* Auditoría (solo para admins, no visible en UI principal) */}
                                                                        {/* Campos entregas solo si tipoArticulo === 'entregas' */}
                                                                        {form.watch('tipoArticulo') === 'entregas' && (
                                                                            <>
                                                                                <div className="col-span-1">
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
                                                                                <div className="col-span-1">
                                                                                    <FormLabel>% IVA</FormLabel>
                                                                                    <Input type="number" value={iva} onChange={e => setIva(Number(e.target.value))} min={0} max={21} />
                                                                                </div>
                                                                                <div className="col-span-1">
                                                                                    <FormLabel>Precio venta Entregas</FormLabel>
                                                                                    <Input type="number" value={precioVentaEntregas ?? ''} onChange={e => setPrecioVentaEntregas(Number(e.target.value))} min={0} />
                                                                                </div>
                                                                                <div className="col-span-1">
                                                                                    <FormLabel>Precio venta Entregas IFEMA</FormLabel>
                                                                                    <Input type="number" value={precioVentaEntregasIfema ?? ''} onChange={e => setPrecioVentaEntregasIfema(Number(e.target.value))} min={0} />
                                                                                </div>
                                                                            </>
                                                                        )}
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
                                                    <Tabs value={activeTab} onValueChange={tab => { setActiveTab(tab as any); form.setValue('tipoArticulo', tab as any); }} className="w-full">
                                                        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
                                                            <TabsList className="w-full justify-start bg-transparent p-0 h-10 gap-6 border-none">
                                                                <TabsTrigger value="micecatering" className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all">
                                                                    MICE Catering
                                                                    <Badge variant="secondary" className="ml-2">{pack.length}</Badge>
                                                                </TabsTrigger>
                                                                <TabsTrigger value="entregas" className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all">
                                                                    Entregas
                                                                    <Badge variant="secondary" className="ml-2">{pack.length}</Badge>
                                                                </TabsTrigger>
                                                            </TabsList>
                                                        </div>
                                                        <TabsContent value="micecatering" className="space-y-4 m-0 focus-visible:ring-0">
                                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {/* Packs de referencias ERP */}
                                                                    <div className="col-span-2">
                                                                        <h2 className="text-base font-bold mb-2">Pack de referencias ERP</h2>
                                                                        {pack.map((item, idx) => (
                                                                            <div key={idx} className={`flex items-center gap-2 mb-2 ${item.valido === false ? 'bg-red-50 border border-red-400' : ''}`}>
                                                                                <Input
                                                                                    value={item.erpId}
                                                                                    onChange={e => {
                                                                                        const erpId = e.target.value;
                                                                                        setPack(prev => prev.map((p, i) => i === idx ? { ...p, erpId } : p));
                                                                                    }}
                                                                                    placeholder="Referencia ERP"
                                                                                    className="w-32"
                                                                                />
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
                                                                                <span className="text-xs text-muted-foreground">{item.nombre || ''}</span>
                                                                                <span className="font-mono text-xs">{item.precio ? `${item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : ''}</span>
                                                                                <Button type="button" size="icon" variant="ghost" onClick={() => setPack(prev => prev.filter((_, i) => i !== idx))}>🗑️</Button>
                                                                                {item.valido === false && <span className="text-red-600 text-xs ml-2">Referencia inválida o inactiva</span>}
                                                                            </div>
                                                                        ))}
                                                                        <Button type="button" size="sm" variant="secondary" onClick={() => setPack(prev => [...prev, { erpId: '', cantidad: 1, valido: true }])}>Añadir referencia</Button>
                                                                        {/* Precio total pack */}
                                                                        <div className="mt-2 font-bold">Precio total pack: {pack.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                                                                    </div>
                                                                    {/* ...resto de campos comunes... */}
                                                                </div>
                                                                {/* ...resto de la UI... */}
                                                            </form>
                                                        </TabsContent>
                                                        <TabsContent value="entregas" className="space-y-4 m-0 focus-visible:ring-0">
                                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                                                {/* ...campos comunes y packs... */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {/* Packs de referencias ERP */}
                                                                    <div className="col-span-2">
                                                                        <h2 className="text-base font-bold mb-2">Pack de referencias ERP</h2>
                                                                        {pack.map((item, idx) => (
                                                                            <div key={idx} className={`flex items-center gap-2 mb-2 ${item.valido === false ? 'bg-red-50 border border-red-400' : ''}`}>
                                                                                <Input
                                                                                    value={item.erpId}
                                                                                    onChange={e => {
                                                                                        const erpId = e.target.value;
                                                                                        setPack(prev => prev.map((p, i) => i === idx ? { ...p, erpId } : p));
                                                                                    }}
                                                                                    placeholder="Referencia ERP"
                                                                                    className="w-32"
                                                                                />
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
                                                                                <span className="text-xs text-muted-foreground">{item.nombre || ''}</span>
                                                                                <span className="font-mono text-xs">{item.precio ? `${item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : ''}</span>
                                                                                <Button type="button" size="icon" variant="ghost" onClick={() => setPack(prev => prev.filter((_, i) => i !== idx))}>🗑️</Button>
                                                                                {item.valido === false && <span className="text-red-600 text-xs ml-2">Referencia inválida o inactiva</span>}
                                                                            </div>
                                                                        ))}
                                                                        <Button type="button" size="sm" variant="secondary" onClick={() => setPack(prev => [...prev, { erpId: '', cantidad: 1, valido: true }])}>Añadir referencia</Button>
                                                                        {/* Precio total pack */}
                                                                        <div className="mt-2 font-bold">Precio total pack: {pack.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 1)), 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
                                                                    </div>
                                                                    {/* ...campos específicos de entregas... */}
                                                                </div>
                                                                {/* ...resto de la UI... */}
                                                            </form>
                                                        </TabsContent>
                                                    </Tabs>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
