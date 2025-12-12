'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articuloEntregasSchema, type ArticuloEntregasFormValues } from '@/lib/articulos-schemas';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';
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
import { Link, X, Loader2 } from 'lucide-react';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { PackSelector, type PackItem } from '../components/PackSelector';
import type { ArticuloERP } from '@/types';
import { ImageManager } from '@/components/book/images/ImageManager';
import { type ImagenArticulo } from '@/lib/articulos-schemas';

const DPT_ENTREGAS_OPTIONS = ['ALMACEN', 'CPR', 'PARTNER', 'RRHH'] as const;

export default function NuevoArticuloEntregasPage() {
  const router = useRouter();
  const { loadAllData } = useDataStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
  const [erpSearchTerm, setErpSearchTerm] = useState('');
  const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<PackItem[]>([]);
  const [imagenes, setImagenes] = useState<ImagenArticulo[]>([]);

  useEffect(() => {
    setIsMounted(true);
    loadArticulosERP();
  }, []);

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

  const form = useForm<ArticuloEntregasFormValues>({
    resolver: zodResolver(articuloEntregasSchema),
    defaultValues: {
      nombre: '',
      categoria: '',
      referenciaArticuloEntregas: '',
      dptEntregas: undefined,
      precioCoste: undefined,
      precioCosteAlquiler: undefined,
      precioAlquilerEntregas: undefined,
      precioVentaEntregas: undefined,
      precioVentaEntregasIfema: undefined,
      precioAlquilerIfema: undefined,
      iva: 10,
      docDriveUrl: '',
      imagenes: [],
      producidoPorPartner: false,
      packs: [],
    },
  });

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

  const handleImageUpload = (url: string, filename: string) => {
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
  };

  const handleImageReorder = (newOrder: any[]) => {
    setImagenes(newOrder.map((img, index) => ({ ...img, orden: index })));
  };

  const handleImageDelete = (id: string) => {
    const newImages = imagenes.filter((img) => img.id !== id);
    if (imagenes.find((img) => img.id === id)?.esPrincipal && newImages.length > 0) {
      newImages[0].esPrincipal = true;
    }
    setImagenes(newImages);
  };

  const handleSetPrincipal = (id: string) => {
    setImagenes(imagenes.map((img) => ({ ...img, esPrincipal: img.id === id })));
  };

  async function onSubmit(data: ArticuloEntregasFormValues) {
    setIsSubmitting(true);
    try {
      const insertData = {
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
        imagenes: imagenes,
        producido_por_partner: data.producidoPorPartner,
        tipo_articulo: 'entregas',
      };

      const { data: insertedData, error } = await supabase.from('articulos').insert([insertData]).select();
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        return;
      }

      // Insertar packs en tabla articulo_packs
      if (data.packs && data.packs.length > 0 && insertedData && insertedData[0]) {
        const packsToInsert = data.packs.map(pack => ({
          articulo_id: insertedData[0].id,
          erp_id: pack.erpId,
          cantidad: pack.cantidad,
        }));
        
        const { error: packsError } = await supabase.from('articulo_packs').insert(packsToInsert);
        if (packsError) {
          console.error('Error inserting packs:', packsError);
          // No interrumpir el flujo si falla
        }
      }

      await loadAllData();
      toast({ title: 'Artículo creado', description: `${data.nombre} ha sido creado correctamente.` });
      router.push('/bd/articulos-entregas');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Error inesperado.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isMounted) return <div>Cargando...</div>;

  return (
    <main className="container mx-auto px-4 py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-end mb-4 gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}><X className="mr-2" />Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              <span className="ml-2">{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
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
                        <Input {...field} placeholder="Ej: ENT-001" />
                      </FormControl>
                      <FormDescription>Debe ser única para cada artículo</FormDescription>
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
              <CardDescription>Selecciona uno o más artículos ERP para crear un pack</CardDescription>
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
                    <Link className="mr-2" />Editar Pack
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  type="button" 
                  className="w-full h-16 border-dashed border-2"
                  onClick={() => setIsPackSelectorOpen(true)}
                >
                  <Link className="mr-2" />Seleccionar Artículos ERP
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

          {/* Imágenes (máximo 5) */}
          <Card>
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground">Imágenes <span className="text-xs text-muted-foreground">({imagenes.length}/5)</span></label>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">Máximo 5 imágenes. Formatos: JPEG, PNG, HEIC. Selecciona una como imagen principal.</p>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 border">
                <ImageManager 
                  images={imagenes} 
                  onUpload={handleImageUpload}
                  onReorder={handleImageReorder}
                  onDelete={handleImageDelete}
                  onSetPrincipal={handleSetPrincipal}
                  folder="articulosEntregas" 
                  enableCamera={true} 
                  label="Añadir imagen" 
                />
              </div>
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
    </main>
  );
}
