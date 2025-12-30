'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articuloEntregasSchema, type ArticuloEntregasFormValues, type ImagenArticulo } from '@/lib/articulos-schemas';
import { useUpsertArticulo, useArticulosERPByIds, useDeleteArticulo, useProveedores } from '@/hooks/use-data-queries';
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
import { PackSelector, type PackItem } from './PackSelector';
import { ImageManager } from '@/components/book/images/ImageManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const DPT_ENTREGAS_OPTIONS = ['ALMACEN', 'CPR', 'PARTNER', 'RRHH'] as const;
export const CATEGORIAS_ENTREGAS = ['ALMACEN', 'BIO', 'BODEGA', 'GASTRONOMIA', 'OTROS'] as const;

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
  
  // Obtener IDs de los packs iniciales para cargar solo esos artículos ERP
  const initialPackIds = useMemo(() => 
    initialData?.packs?.map((p: any) => p.erpId).filter(Boolean) || [], 
    [initialData?.packs]
  );
  
  const { data: articulosERP = [] } = useArticulosERPByIds(initialPackIds);
  const { data: proveedores = [] } = useProveedores();

  // Mapa para búsqueda rápida de artículos ERP
  const articulosERPMap = useMemo(() => {
    const map = new Map<string, any>();
    articulosERP.forEach(erp => {
      map.set(erp.id, erp);
      if (erp.idreferenciaerp) map.set(erp.idreferenciaerp, erp);
    });
    return map;
  }, [articulosERP]);

  const form = useForm<ArticuloEntregasFormValues>({
    resolver: zodResolver(articuloEntregasSchema),
    defaultValues: {
      nombre: '',
      categoria: 'OTROS',
      referenciaArticuloEntregas: '',
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
      partnerId: '',
      packs: [],
      loc: '',
      unidadVenta: 1,
      stockSeguridad: 0,
      erpId: '',
      dptEntregas: 'ALMACEN',
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
        partnerId: initialData.partnerId || '',
        packs: initialData.packs || [],
        erpId: initialData.erpId || '',
        loc: initialData.loc || '',
        unidadVenta: initialData.unidadVenta || 1,
        stockSeguridad: initialData.stockSeguridad || 0,
      });
      if (initialData.imagenes) {
        setImagenes(initialData.imagenes);
      }
    }
  }, [initialData, form]);

  // Limpiar partnerId si se desmarca Producido por Partner
  const producidoPorPartner = form.watch('producidoPorPartner');
  useEffect(() => {
    if (!producidoPorPartner) {
      form.setValue('partnerId', '');
    }
  }, [producidoPorPartner, form]);

  // Sincronizar selectedPacks cuando articulosERP e initialData.packs estén disponibles
  useEffect(() => {
    if (initialData?.packs && initialData.packs.length > 0 && articulosERP.length > 0 && selectedPacks.length === 0) {
      const mappedPacks = initialData.packs.map((p: { erpId: string; cantidad: number }) => {
        const erpProduct = articulosERPMap.get(p.erpId);
        if (erpProduct) {
          return {
            erpId: erpProduct.id,
            nombreProductoERP: erpProduct.nombreProductoERP,
            nombreProveedor: erpProduct.nombreProveedor || '',
            precioCompra: erpProduct.precioCompra || 0,
            unidadConversion: erpProduct.unidadConversion || 1,
            descuento: erpProduct.descuento || 0,
            cantidad: p.cantidad,
            unidad: erpProduct.unidad || 'UD'
          };
        }
        return null;
      }).filter(Boolean) as PackItem[];
      
      if (mappedPacks.length > 0) {
        setSelectedPacks(mappedPacks);
      }
    }
  }, [initialData?.packs, articulosERP, articulosERPMap, selectedPacks.length]);

  // Recalcular coste cuando cambian los packs o la unidad de venta
  const watchedUnidadVenta = form.watch('unidadVenta') || 1;
  useEffect(() => {
    if (selectedPacks.length > 0) {
      const baseCost = selectedPacks.reduce((sum, pack) => {
        const unitPrice = pack.precioCompra / pack.unidadConversion;
        const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
        return sum + priceWithDiscount * pack.cantidad;
      }, 0);
      
      const totalCost = baseCost * watchedUnidadVenta;
      // Solo actualizar si el valor es diferente para evitar bucles
      const currentCost = form.getValues('precioCoste');
      if (Math.abs((currentCost || 0) - totalCost) > 0.0001) {
        form.setValue('precioCoste', totalCost, { shouldDirty: true });
      }
    }
  }, [selectedPacks, watchedUnidadVenta, form]);

  const handlePacksSelect = (packs: PackItem[]) => {
    setSelectedPacks(packs);
    form.setValue('packs', packs.map(p => ({ erpId: p.erpId, cantidad: p.cantidad })), { shouldDirty: true });
  };

  const onSubmit = async (values: ArticuloEntregasFormValues) => {
    try {
      const payload = {
        ...values,
        categoria: values.categoria as any,
        tipoArticulo: 'entregas',
        imagenes: imagenes,
      };
      await upsertArticulo.mutateAsync(payload as any);
      toast({ title: isEditing ? 'Artículo actualizado' : 'Artículo creado' });
      router.push('/bd/articulos-entregas');
    } catch (error: any) {
      console.error('Error in ArticuloEntregasForm onSubmit:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar el artículo.' });
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
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl font-bold">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={upsertArticulo.isPending}
            className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20"
          >
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
              <div className="flex items-center space-x-2 p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                <Checkbox id="tipo-entregas" checked={true} disabled className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
                <label htmlFor="tipo-entregas" className="text-sm font-bold text-orange-600 uppercase tracking-wider">
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
                          {CATEGORIAS_ENTREGAS.map(cat => (
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unidadVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de Venta</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stockSeguridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Seguridad</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="producidoPorPartner"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Producido por Partner</FormLabel>
                      <FormDescription>Marcar si este artículo es suministrado por un tercero</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('producidoPorPartner') && (
                <FormField
                  control={form.control}
                  name="partnerId"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormLabel>Proveedor / Partner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-border/40 bg-background/40">
                            <SelectValue placeholder="Seleccionar proveedor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                          {proveedores.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="rounded-lg">
                              {p.nombreComercial || p.nombreFiscal}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
              <Button type="button" variant="outline" onClick={() => setIsPackSelectorOpen(true)} className="rounded-xl font-bold hover:bg-orange-500/5 hover:text-orange-600 hover:border-orange-500/30 transition-all">
                <Link className="h-4 w-4 mr-2" />
                Gestionar Composición
              </Button>
              {selectedPacks.length > 0 && (
                <div className="mt-4 border rounded-xl overflow-hidden border-border/40">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-500/5">
                      <tr>
                        <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest text-orange-600/70">Proveedor</th>
                        <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest text-orange-600/70">Nombre</th>
                        <th className="p-3 text-right font-black text-[10px] uppercase tracking-widest text-orange-600/70">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPacks.map(p => (
                        <tr key={p.erpId} className="border-t border-border/40 hover:bg-orange-500/[0.02] transition-colors">
                          <td className="p-3 font-medium">{p.nombreProveedor}</td>
                          <td className="p-3 font-bold">{p.nombreProductoERP}</td>
                          <td className="p-3 text-right font-black text-orange-600">{p.cantidad} {p.unidad}</td>
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
        open={isPackSelectorOpen}
        onOpenChange={setIsPackSelectorOpen}
        onApply={handlePacksSelect}
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
