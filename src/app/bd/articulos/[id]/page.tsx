'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
import { articuloSchema, type ArticuloFormValues } from '../nuevo/page';

export default function EditarArticuloPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { toast } = useToast();
    const { loadAllData } = useDataStore();

    const form = useForm<ArticuloFormValues>({
        resolver: zodResolver(articuloSchema),
        defaultValues: {
            id: '',
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
                precioVenta: data.precio_venta || 0,
                precioAlquiler: data.precio_alquiler || 0,
                precioReposicion: data.precio_reposicion || 0,
                erpId: data.erp_id || '',
                producidoPorPartner: data.producido_por_partner || false,
                esHabitual: data.es_habitual || false,
                stockSeguridad: data.stock_seguridad || 0,
                unidadVenta: data.unidad_venta || 1,
                loc: data.loc || '',
            });
        }

        loadArticulo();
    }, [id, form, router, toast]);

    async function onSubmit(data: ArticuloFormValues) {
        setIsLoading(true);

        const { error } = await supabase
            .from('articulos')
            .update({
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                    <FormField control={form.control} name="erpId" render={({ field }) => (
                                        <FormItem><FormLabel>ID ERP (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />

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
        </>
    );
}
