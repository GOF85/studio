'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import type { ArticuloERP } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloSchema, type ArticuloFormValues } from '../nuevo/page';
import { ErpArticleSelector } from '../components/ErpArticleSelector';

export default function EditarArticuloPage() {
        // Lista de alérgenos estándar
        return (
            <>
                <main className="container mx-auto px-4 py-8">
                    <Form {...form}>
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
                                {/* ...formulario y campos para micecatering... */}
                            </TabsContent>
                            <TabsContent value="entregas" className="space-y-4 m-0 focus-visible:ring-0">
                                {/* ...formulario y campos para entregas... */}
                            </TabsContent>
                        </Tabs>
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
                            {/* ...formulario y campos para micecatering... */}
                            {/* Puedes reutilizar el contenido del form actual aquí, mostrando solo los campos relevantes para micecatering */}
                        </TabsContent>
                        <TabsContent value="entregas" className="space-y-4 m-0 focus-visible:ring-0">
                            {/* ...formulario y campos para entregas... */}
                            {/* Puedes reutilizar el contenido del form actual aquí, mostrando solo los campos relevantes para entregas */}
                        </TabsContent>
                    </Tabs>
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
