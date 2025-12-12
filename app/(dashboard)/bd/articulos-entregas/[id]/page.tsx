'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloEntregasSchema, type ArticuloEntregasFormValues } from '@/lib/articulos-schemas';
import { PackSelector, type PackItem } from '../components/PackSelector';

const DPT_ENTREGAS_OPTIONS = ['ALMACEN', 'CPR', 'PARTNER', 'RRHH'] as const;

export default function EditarArticuloEntregasPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { toast } = useToast();
    const { loadAllData } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
    const [selectedPacks, setSelectedPacks] = useState<PackItem[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const form = useForm<ArticuloEntregasFormValues>({
        resolver: zodResolver(articuloEntregasSchema),
    });

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
                referenciaArticuloEntregas: data.referencia_articulo_entregas || '',
                dptEntregas: data.dpt_entregas,
                precioCoste: data.precio_coste || 0,
                precioCosteAlquiler: data.precio_coste_alquiler || 0,
                precioAlquilerEntregas: data.precio_alquiler_entregas || 0,
                precioVentaEntregas: data.precio_venta_entregas || 0,
                precioVentaEntregasIfema: data.precio_venta_entregas_ifema || 0,
                precioAlquilerIfema: data.precio_alquiler_ifema || 0,
                iva: data.iva || 10,
                docDriveUrl: data.doc_drive_url || '',
                producidoPorPartner: data.producido_por_partner || false,
                packs: [],
            });
            setIsLoaded(true);
        }

        loadArticulo();
    }, [id, form, toast]);

    // Load packs for this article
    useEffect(() => {
        async function loadPacks() {
            if (!id) return;
            const { data, error } = await supabase
                .from('articulo_packs')
                .select('*')
                .eq('articulo_id', id);

            if (!error && data) {
                // Fetch ERP details for each pack item
                const packsWithDetails: PackItem[] = [];
                for (const pack of data) {
                    const erpProduct = articulosERP.find(p => p.idreferenciaerp === pack.erp_id);
                    if (erpProduct) {
                        packsWithDetails.push({
                            erpId: pack.erp_id,
                            nombreProductoERP: erpProduct.nombreProductoERP || '',
                            nombreProveedor: erpProduct.nombreProveedor || 'Sin proveedor',
                            precioCompra: erpProduct.precioCompra || 0,
                            unidadConversion: erpProduct.unidadConversion || 1,
                            descuento: erpProduct.descuento || 0,
                            unidad: erpProduct.unidad || 'UD',
                            cantidad: pack.cantidad,
                        });
                    }
                }
                setSelectedPacks(packsWithDetails);
                form.setValue('packs', packsWithDetails.map(p => ({ erpId: p.erpId, cantidad: p.cantidad })));
            }
        }

        loadPacks();
    }, [id, articulosERP, form]);

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
        loadArticulosERP();
    }, []);

    const handlePacksSelect = (packs: PackItem[]) => {
        setSelectedPacks(packs);
        form.setValue('packs', packs.map(p => ({ erpId: p.erpId, cantidad: p.cantidad })), { shouldDirty: true });
        
        // Calcular coste total si hay packs
        if (packs.length > 0) {
            const totalCost = packs.reduce((sum, pack) => {
                const unitPrice = pack.precioCompra / pack.unidadConversion;
                const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
                return sum + priceWithDiscount * pack.cantidad;
            }, 0);
            form.setValue('precioCoste', totalCost, { shouldDirty: true });
        }
    };

    async function onSubmit(data: ArticuloEntregasFormValues) {
        setIsLoading(true);
        try {
            const updateData = {
                nombre: data.nombre,
                categoria: data.categoria,
                referencia_articulo_entregas: data.referenciaArticuloEntregas,
                dpt_entregas: data.dptEntregas,
                precio_coste: data.precioCoste,
                precio_coste_alquiler: data.precioCosteAlquiler,
                precio_alquiler_entregas: data.precioAlquilerEntregas,
                precio_venta_entregas: data.precioVentaEntregas,
                precio_venta_entregas_ifema: data.precioVentaEntregasIfema,
                precio_alquiler_ifema: data.precioAlquilerIfema,
                iva: data.iva,
                doc_drive_url: data.docDriveUrl,
                producido_por_partner: data.producidoPorPartner,
            };

            const { error } = await supabase
                .from('articulos')
                .update(updateData)
                .eq('id', id);

            if (error) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setIsLoading(false);
                return;
            }

            // Update packs in articulo_packs table
            // First delete existing packs
            const { error: deleteError } = await supabase
                .from('articulo_packs')
                .delete()
                .eq('articulo_id', id);

            if (deleteError) {
                console.error('Error deleting old packs:', deleteError);
            }

            // Then insert new packs
            if (data.packs && data.packs.length > 0) {
                const packsToInsert = data.packs.map(pack => ({
                    articulo_id: id,
                    erp_id: pack.erpId,
                    cantidad: pack.cantidad,
                }));
                
                const { error: packsError } = await supabase.from('articulo_packs').insert(packsToInsert);
                if (packsError) {
                    console.error('Error inserting packs:', packsError);
                }
            }

            toast({ description: 'Artículo actualizado correctamente.' });
            await loadAllData();
            router.push('/bd/articulos-entregas');
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

    async function handleDelete() {
        setIsLoading(true);
        try {
            // Delete packs first
            await supabase.from('articulo_packs').delete().eq('articulo_id', id);

            // Then delete article
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setIsLoading(false);
                return;
            }

            toast({ description: 'Artículo eliminado correctamente.' });
            await loadAllData();
            router.push('/bd/articulos-entregas');
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err instanceof Error ? err.message : 'Error desconocido'
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!isLoaded) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

    return (
        <main className="container mx-auto px-4 py-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex items-center justify-end mb-4 gap-2">
                        <Button 
                            variant="destructive" 
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </Button>
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            <X className="mr-2" />Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar</span>
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Información Básica</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg font-bold text-primary">Nombre del Artículo *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Nombre del artículo" className="h-12 text-lg font-semibold" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="categoria"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Categoría *</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona una categoría" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ARTICULO_CATERING_CATEGORIAS.map(cat => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="referenciaArticuloEntregas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-primary font-bold">Referencia Entregas *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ej: ENT-001" disabled />
                                            </FormControl>
                                            <FormDescription>No se puede cambiar</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="dptEntregas"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-primary font-bold">Departamento Entregas *</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona departamento" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {DPT_ENTREGAS_OPTIONS.map(dpt => (
                                                    <SelectItem key={dpt} value={dpt}>{dpt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Vínculo Pack ERP */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Vínculo con Artículos ERP</CardTitle>
                            <CardDescription>Edita los artículos ERP del pack</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedPacks.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="bg-muted p-3 rounded-lg">
                                        <p className="font-semibold text-sm mb-2">Pack seleccionado: {selectedPacks.length} artículos</p>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {selectedPacks.map((pack, idx) => (
                                                <div key={pack.erpId} className="text-xs flex justify-between items-center bg-background p-2 rounded border">
                                                    <div>
                                                        <span className="font-medium">{pack.nombreProductoERP}</span>
                                                        <span className="text-muted-foreground ml-2">x{pack.cantidad}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Button 
                                        variant="secondary" 
                                        type="button" 
                                        className="w-full"
                                        onClick={() => setIsPackSelectorOpen(true)}
                                    >
                                        Editar Pack
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="secondary" 
                                    type="button" 
                                    className="w-full h-16 border-dashed border-2"
                                    onClick={() => setIsPackSelectorOpen(true)}
                                >
                                    Seleccionar Artículos ERP
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Precios */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Precios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="precioCoste"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Coste (€) *</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" disabled={selectedPacks.length > 0} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            {selectedPacks.length > 0 && <FormDescription>Calculado automáticamente del pack</FormDescription>}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precioCosteAlquiler"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Coste Alquiler (€)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* NUEVO CAMPO: Precio Alquiler ENTREGAS (€) */}
                                <FormField
                                    control={form.control}
                                    name="precioAlquilerEntregas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Alquiler ENTREGAS (€)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precioVentaEntregas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Venta Entregas (€)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precioVentaEntregasIfema"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Venta IFEMA (€)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precioAlquilerIfema"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Alquiler IFEMA (€)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="iva"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IVA (%)</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="number" step="0.01" placeholder="10" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información Adicional */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Adicional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="docDriveUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL Documentación Drive</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="https://drive.google.com/..." />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="producidoPorPartner"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Producido por Partner</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </form>
            </Form>

            <PackSelector
                open={isPackSelectorOpen}
                onOpenChange={setIsPackSelectorOpen}
                onApply={handlePacksSelect}
                articulosERP={articulosERP}
                searchTerm={erpSearchTerm}
                setSearchTerm={setErpSearchTerm}
                initialPacks={selectedPacks}
            />

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar artículo</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
