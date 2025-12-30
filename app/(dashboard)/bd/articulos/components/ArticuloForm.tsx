'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articuloMicecateringSchema, type ArticuloMicecateringFormValues, type ImagenArticulo } from '@/lib/articulos-schemas';
import { useUpsertArticulo, useDeleteArticulo, useProveedores, useArticuloERP, useArticulosCategorias } from '@/hooks/use-data-queries';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link, X, Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';
import { ErpArticleSelector } from './ErpArticleSelector';
import { ImageManager } from '@/components/book/images/ImageManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ArticuloForm({ initialData, isEditing = false }: { initialData?: any, isEditing?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isErpSelectorOpen, setIsErpSelectorOpen] = useState(false);
  const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const upsertArticulo = useUpsertArticulo();
  const deleteArticulo = useDeleteArticulo();
  const { data: proveedoresData } = useProveedores();
  const proveedores = useMemo(() => proveedoresData || [], [proveedoresData]);
  const { data: categoriasData } = useArticulosCategorias('micecatering');
  const categoriasDisponibles = useMemo(() => categoriasData || [], [categoriasData]);

  const form = useForm<ArticuloMicecateringFormValues>({
    resolver: zodResolver(articuloMicecateringSchema),
    defaultValues: {
      id: initialData?.id || '',
      nombre: initialData?.nombre || '',
      categoria: initialData?.categoria || '',
      familia: initialData?.familia || '',
      subcategoria: initialData?.subcategoria || '',
      precioVenta: initialData?.precioVenta || 0,
      precioAlquiler: initialData?.precioAlquiler || 0,
      precioReposicion: initialData?.precioReposicion || 0,
      erpId: initialData?.erpId || '',
      partnerId: initialData?.partnerId || '',
      producidoPorPartner: initialData?.producidoPorPartner || false,
      stockSeguridad: initialData?.stockSeguridad || 0,
      unidadVenta: initialData?.unidadVenta || 1,
      loc: initialData?.loc || '',
      alergenos: initialData?.alergenos || [],
      docDriveUrl: initialData?.docDriveUrl || '',
      iva: initialData?.iva || 10,
      imagenes: initialData?.imagenes || [],
    },
  });

  const erpId = form.watch('erpId');
  const { data: erpData, isLoading: isLoadingErp } = useArticuloERP(erpId);

  const categoria = form.watch('categoria');

  useEffect(() => {
    setIsMounted(true);
    if (initialData?.imagenes) {
      setImagenes(initialData.imagenes);
    }
  }, [initialData]);

  // Actualizar precios y subcategoría si cambia el ERP
  useEffect(() => {
    if (erpData) {
      const basePrice = erpData.precioCompra / (erpData.unidadConversion || 1);
      const discount = erpData.descuento || 0;
      const calculatedPvp = parseFloat((basePrice * (1 - discount / 100)).toFixed(4));
      
      if (form.getValues('precioVenta') !== calculatedPvp) {
        form.setValue('precioVenta', calculatedPvp);
      }
      
      if (form.getValues('precioReposicion') !== calculatedPvp) {
        form.setValue('precioReposicion', calculatedPvp);
      }

      // Autocompletar categoría y subcategoría desde el ERP
      const erpCategoria = erpData.categoriaMice || erpData.categoria;
      const erpSubcategoria = erpData.tipo || erpData.familiaCategoria;

      if (erpCategoria) {
        const categoriaValida = categoriasDisponibles.find(
          c => c.toLowerCase() === erpCategoria.toLowerCase()
        );
        const finalCategoria = categoriaValida || erpCategoria;
        if (form.getValues('categoria') !== finalCategoria) {
          form.setValue('categoria', finalCategoria);
        }
      }

      if (erpSubcategoria && form.getValues('subcategoria') !== erpSubcategoria) {
        form.setValue('subcategoria', erpSubcategoria);
      }
    }
  }, [erpData, form, categoriasDisponibles]);

  const onSubmit = async (values: ArticuloMicecateringFormValues) => {
    try {
      await upsertArticulo.mutateAsync({
        ...(values as any),
        tipoArticulo: 'micecatering',
        imagenes: imagenes,
      });
      toast({ title: isEditing ? 'Artículo actualizado' : 'Artículo creado' });
      router.push('/bd/articulos');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el artículo.' });
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    try {
      await deleteArticulo.mutateAsync(initialData.id);
      toast({ title: 'Artículo eliminado' });
      router.push('/bd/articulos');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? `Editar: ${initialData?.nombre}` : 'Nuevo Artículo MICE'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button onClick={form.handleSubmit(onSubmit)} disabled={upsertArticulo.isPending}>
            {upsertArticulo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoriasDisponibles.map(cat => (
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
                  name="subcategoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategoría</FormLabel>
                      <FormControl><Input {...field} readOnly className="bg-muted" /></FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="erpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ERP ID</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input {...field} readOnly /></FormControl>
                        <Button type="button" variant="outline" onClick={() => setIsErpSelectorOpen(true)}>
                          <Link className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="loc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localización</FormLabel>
                    <FormControl><Input {...field} placeholder="Ej: Pasillo 4, Estantería B" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(categoria === 'Alquiler' || categoria === 'Almacén') && (
                <FormField
                  control={form.control}
                  name="partnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor de Alquiler</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proveedor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {proveedores.map(prov => (
                            <SelectItem key={prov.id} value={prov.id}>
                              {prov.nombreComercial}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Obligatorio para artículos de alquiler
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {erpData && (
            <Card className="bg-muted/30 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Link className="h-4 w-4 text-primary" />
                  Información del ERP
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Nombre ERP</span>
                  <span className="font-bold">{erpData.nombreProductoERP || 'No definido'}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Proveedor</span>
                  <span className="font-bold">{erpData.nombreProveedor || 'No definido'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Precio Compra</span>
                  <span className="font-mono font-bold">{erpData.precioCompra.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Descuento</span>
                  <span className="font-mono font-bold">{erpData.descuento || 0}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Conversión</span>
                  <span className="font-mono font-bold">{erpData.unidadConversion}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Unidad</span>
                  <span className="font-mono font-bold">{erpData.unidad}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Código Familia ERP</span>
                  <span className="font-bold">{erpData.familiaCategoria || 'No definida'}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precioVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Venta (€)</FormLabel>
                      <FormControl><Input type="number" step="0.0001" {...field} readOnly={!!erpId} /></FormControl>
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
                      <FormControl><Input type="number" {...field} readOnly={!!erpId} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {(categoria === 'Alquiler' || categoria === 'Almacén') && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="precioAlquiler"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Alquiler (€)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="precioReposicion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Reposición (€)</FormLabel>
                        <FormControl><Input type="number" step="0.0001" {...field} readOnly={!!erpId} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageManager
                images={imagenes}
                onImagesChange={setImagenes}
                maxImages={5}
              />
            </CardContent>
          </Card>
        </form>
      </Form>

      <ErpArticleSelector
        isOpen={isErpSelectorOpen}
        onClose={() => setIsErpSelectorOpen(false)}
        onSelect={(erpArt) => {
          form.setValue('erpId', erpArt.idreferenciaerp || erpArt.id);
          // El useEffect se encargará de los precios al detectar el cambio en erpId
        }}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
