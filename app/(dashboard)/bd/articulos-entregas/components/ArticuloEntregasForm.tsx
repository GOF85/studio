'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articuloEntregasSchema, type ArticuloEntregasFormValues, type ImagenArticulo } from '@/lib/articulos-schemas';
import { useUpsertArticulo, useArticulosERP, useDeleteArticulo } from '@/hooks/use-data-queries';
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
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { PackSelector, type PackItem } from './PackSelector';
import { ImageManager } from '@/components/book/images/ImageManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const DPT_ENTREGAS_OPTIONS = ['ALMACEN', 'CPR', 'PARTNER', 'RRHH'] as const;

interface ArticuloEntregasFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function ArticuloEntregasForm({ initialData, isEditing = false }: ArticuloEntregasFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<PackItem[]>([]);
  const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const upsertArticulo = useUpsertArticulo();
  const deleteArticulo = useDeleteArticulo();
  const { data: articulosERP = [] } = useArticulosERP();

  const form = useForm<ArticuloEntregasFormValues>({
    resolver: zodResolver(articuloEntregasSchema),
    defaultValues: {
      nombre: '',
      categoria: '',
      referenciaArticuloEntregas: '',
      dptEntregas: undefined,
      precioCoste: 0,
      precioCosteAlquiler: 0,
      precioAlquilerEntregas: 0,
      precioVentaEntregas: 0,
      precioVentaEntregasIfema: 0,
      precioAlquilerIfema: 0,
      iva: 10,
      docDriveUrl: '',
      imagenes: [],
      producidoPorPartner: false,
      packs: [],
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id,
        nombre: initialData.nombre,
        categoria: initialData.categoria,
        referenciaArticuloEntregas: initialData.referenciaArticuloEntregas || '',
        dptEntregas: initialData.dptEntregas as any,
        precioCoste: initialData.precioCoste || 0,
        precioCosteAlquiler: initialData.precioCosteAlquiler || 0,
        precioAlquilerEntregas: initialData.precioAlquilerEntregas || 0,
        precioVentaEntregas: initialData.precioVentaEntregas || 0,
        precioVentaEntregasIfema: initialData.precioVentaEntregasIfema || 0,
        precioAlquilerIfema: initialData.precioAlquilerIfema || 0,
        iva: initialData.iva || 10,
        docDriveUrl: initialData.docDriveUrl || '',
        producidoPorPartner: initialData.producidoPorPartner || false,
        packs: initialData.packs || [],
        erpId: initialData.erpId || '',
      });
      if (initialData.imagenes) {
        setImagenes(initialData.imagenes);
      }
    }
  }, [initialData, form]);

  const handlePacksSelect = (packs: PackItem[]) => {
    setSelectedPacks(packs);
    form.setValue('packs', packs.map(p => ({ erpId: p.erpId, cantidad: p.cantidad })), { shouldDirty: true });
    
    if (packs.length > 0) {
      const totalCost = packs.reduce((sum, pack) => {
        const unitPrice = pack.precioCompra / pack.unidadConversion;
        const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
        return sum + priceWithDiscount * pack.cantidad;
      }, 0);
      form.setValue('precioCoste', totalCost, { shouldDirty: true });
    }
  };

  const onSubmit = async (values: ArticuloEntregasFormValues) => {
    try {
      await upsertArticulo.mutateAsync({
        ...values,
        tipoArticulo: 'entregas',
        imagenes: imagenes,
      });
      toast({ title: isEditing ? 'Artículo actualizado' : 'Artículo creado' });
      router.push('/bd/articulos-entregas');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el artículo.' });
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    try {
      await deleteArticulo.mutateAsync(initialData.id);
      toast({ title: 'Artículo eliminado' });
      router.push('/bd/articulos-entregas');
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
            {isEditing ? `Editar: ${initialData?.nombre}` : 'Nuevo Artículo Entregas'}
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
              <CardDescription>Datos básicos del artículo para entregas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <Checkbox id="tipo-entregas" checked={true} disabled />
                <label htmlFor="tipo-entregas" className="text-sm font-bold text-primary uppercase tracking-wider">
                  Artículo de Entregas
                </label>
              </div>

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
                  name="dptEntregas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DPT_ENTREGAS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="referenciaArticuloEntregas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia Entregas</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="producidoPorPartner"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Producido por Partner</FormLabel>
                      <FormDescription>Marcar si este artículo es suministrado por un tercero</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y Costes</CardTitle>
              <CardDescription>Configuración económica del artículo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precioCoste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Coste (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
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
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precioVentaEntregas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venta Estándar (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precioVentaEntregasIfema"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venta IFEMA (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precioAlquilerEntregas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alquiler Estándar (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precioAlquilerIfema"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alquiler IFEMA (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Composición (Packs)</CardTitle>
              <CardDescription>Vincular con artículos del ERP</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => setIsPackSelectorOpen(true)}>
                <Link className="h-4 w-4 mr-2" />
                Gestionar Composición
              </Button>
              {selectedPacks.length > 0 && (
                <div className="mt-4 border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">ERP ID</th>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPacks.map(p => (
                        <tr key={p.erpId} className="border-t">
                          <td className="p-2">{p.erpId}</td>
                          <td className="p-2">{p.nombreProductoERP}</td>
                          <td className="p-2 text-right">{p.cantidad} {p.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
              <CardDescription>Gestionar fotos del producto</CardDescription>
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

      <PackSelector
        isOpen={isPackSelectorOpen}
        onClose={() => setIsPackSelectorOpen(false)}
        onSelect={handlePacksSelect}
        initialPacks={selectedPacks}
      />

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
