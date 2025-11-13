

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Database, Trash2, MapPin } from 'lucide-react';
import type { ArticuloERP, UnidadMedida, Proveedor, FamiliaERP, Ubicacion } from '@/types';
import { UNIDADES_MEDIDA, articuloErpSchema } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';

// We extend the base schema locally to include the location field for the form,
// but the core ArticuloERP type in `types/index.ts` remains clean.
const formSchemaWithLocation = articuloErpSchema.extend({
    ubicaciones: z.array(z.string()).optional(),
});
type FormValuesWithLocation = z.infer<typeof formSchemaWithLocation>;


export default function EditarArticuloERPPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [familias, setFamilias] = useState<FamiliaERP[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValuesWithLocation>({
    resolver: zodResolver(formSchemaWithLocation),
  });

  useEffect(() => {
    // Load related data
    setProveedores(JSON.parse(localStorage.getItem('proveedores') || '[]'));
    setFamilias(JSON.parse(localStorage.getItem('familiasERP') || '[]'));
    setUbicaciones(JSON.parse(localStorage.getItem('ubicaciones') || '[]'));
    
    // Load item to edit
    const allItems = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const item = allItems.find(p => p.id === id);
    if (item) {
      // Find locations for this item from the StockArticuloUbicacion table
      const stockLocations = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}');
      const itemLocations = Object.values(stockLocations)
        .filter((slu: any) => slu.articuloErpId === item.id)
        .map((slu: any) => slu.ubicacionId);

      form.reset({
        ...item,
        ubicaciones: Array.from(new Set(itemLocations)) // Ensure unique locations
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el artículo ERP.' });
      router.push('/bd/erp');
    }
  }, [id, form, router, toast]);

  function onSubmit(data: FormValuesWithLocation) {
    setIsLoading(true);

    const { ubicaciones: formUbicaciones, ...erpData } = data;

    // --- Save ArticuloERP data ---
    let allItems = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
      allItems[index] = erpData;
      localStorage.setItem('articulosERP', JSON.stringify(allItems));
    }

    // --- Save StockArticuloUbicacion data ---
    const allStockLocations = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}');
    
    // Remove old locations not in the new list
    Object.keys(allStockLocations).forEach(key => {
        const slu = allStockLocations[key];
        if (slu.articuloErpId === id && !(formUbicaciones || []).includes(slu.ubicacionId)) {
            delete allStockLocations[key];
        }
    });

    // Add new locations
    (formUbicaciones || []).forEach(ubicacionId => {
        const key = `${id}_${ubicacionId}`;
        if (!allStockLocations[key]) {
            allStockLocations[key] = {
                id: key,
                articuloErpId: id,
                ubicacionId: ubicacionId,
                stockTeorico: 0, // Default to 0 when assigning
                lotes: []
            };
        }
    });
    localStorage.setItem('stockArticuloUbicacion', JSON.stringify(allStockLocations));


    toast({ description: 'Artículo actualizado correctamente.' });
    router.push('/bd/erp');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('articulosERP', JSON.stringify(updatedItems));

     // Also remove from stock locations
    const allStockLocations = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}');
    Object.keys(allStockLocations).forEach(key => {
        if (allStockLocations[key].articuloErpId === id) {
            delete allStockLocations[key];
        }
    });
    localStorage.setItem('stockArticuloUbicacion', JSON.stringify(allStockLocations));

    toast({ title: 'Artículo ERP eliminado' });
    router.push('/bd/erp');
  };
  
  const ubicacionOptions = ubicaciones.map(u => ({ label: u.nombre, value: u.id }));

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="erp-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Artículo ERP</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/erp')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Producto</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="idreferenciaerp" render={({ field }) => (
                      <FormItem><FormLabel>ID Referencia (ERP)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="nombreProductoERP" render={({ field }) => (
                      <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="referenciaProveedor" render={({ field }) => (
                      <FormItem><FormLabel>Ref. Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="idProveedor" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Proveedor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {proveedores.map(p => <SelectItem key={p.id} value={p.IdERP || p.id}>{p.nombreComercial}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="familiaCategoria" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Familia (según ERP)</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {familias.map(f => <SelectItem key={f.id} value={f.familiaCategoria}>{f.familiaCategoria} - {f.Familia}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="ubicaciones" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2"><MapPin/> Ubicaciones en Almacén</FormLabel>
                        <MultiSelect 
                            options={ubicacionOptions}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Asignar a una o más ubicaciones..."
                        />
                        <FormMessage />
                    </FormItem>
                 )} />
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-lg">Precios y Unidades</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField control={form.control} name="precioCompra" render={({ field }) => (
                            <FormItem><FormLabel>Precio Compra</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="descuento" render={({ field }) => (
                            <FormItem><FormLabel>Descuento (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="unidadConversion" render={({ field }) => (
                            <FormItem><FormLabel>Factor Conversión</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="unidad" render={({ field }) => (
                            <FormItem><FormLabel>Unidad Base</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="stockMinimo" render={({ field }) => (
                            <FormItem><FormLabel>Stock Mínimo de Seguridad</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gestionLote" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Activar Gestión de Lotes y Caducidad</FormLabel>
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
                        Esta acción no se puede deshacer. Se eliminará permanentemente el artículo.
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

