

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, PlusCircle, Trash2, TrendingUp, RefreshCw, Star, Link2 } from 'lucide-react';
import type { ProductoVenta, IngredienteERP, Receta, CategoriaProductoVenta, ImagenProducto, Proveedor } from '@/types';
import { CATEGORIAS_PRODUCTO_VENTA } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';

const imagenSchema = z.object({
    id: z.string(),
    url: z.string().url("Debe ser una URL válida."),
    isPrincipal: z.boolean(),
});

const productoVentaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  nombre_en: z.string().optional(),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  ubicacion: z.string().optional(),
  imagenes: z.array(imagenSchema).default([]),
  pvp: z.coerce.number().min(0, 'El PVP debe ser positivo'),
  pvpIfema: z.coerce.number().min(0, 'El PVP IFEMA debe ser positivo').optional(),
  iva: z.coerce.number().min(0).max(100),
  producidoPorPartner: z.boolean().optional().default(false),
  partnerId: z.string().optional(),
  recetaId: z.string().optional(),
  exclusivoIfema: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    if (data.producidoPorPartner && !data.partnerId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe seleccionar un partner.",
            path: ["partnerId"],
        });
    }
    if (!data.producidoPorPartner && !data.recetaId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe seleccionar una receta si no es producido por un partner.",
            path: ["recetaId"],
        });
    }
});

type ProductoVentaFormValues = z.infer<typeof productoVentaSchema>;

const defaultValues: Partial<ProductoVentaFormValues> = {
    nombre: '',
    nombre_en: '',
    categoria: '',
    ubicacion: '',
    imagenes: [],
    pvp: 0,
    pvpIfema: 0,
    iva: 21,
    producidoPorPartner: false,
    exclusivoIfema: false,
};

export default function ProductoVentaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recetasDB, setRecetasDB] = useState<Receta[]>([]);
  const [partnersDB, setPartnersDB] = useState<Proveedor[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const [useIfemaPrices, setUseIfemaPrices] = useState(false);

  const form = useForm<ProductoVentaFormValues>({
    resolver: zodResolver(productoVentaSchema),
    defaultValues: defaultValues,
  });

  const { control, getValues, setValue } = form;

  const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({
      control,
      name: 'imagenes'
  });
  
  const watchedPvp = form.watch('pvp');
  const watchedPvpIfema = form.watch('pvpIfema');
  const isProducidoPorPartner = form.watch('producidoPorPartner');
  const recetaId = form.watch('recetaId');
  
  const costeTotal = useMemo(() => {
    if (isProducidoPorPartner) return 0; // Cost is manual for partner products for now
    const receta = recetasDB.find(r => r.id === recetaId);
    return receta?.costeMateriaPrima || 0;
  }, [recetaId, isProducidoPorPartner, recetasDB]);

  const [categorias, setCategorias] = useState<CategoriaProductoVenta[]>(CATEGORIAS_PRODUCTO_VENTA as any);
  const categoriasOptions = useMemo(() => categorias.map(c => ({ label: c, value: c })), [categorias]);
  
  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    setRecetasDB(storedRecetas);

    const storedPartners = (JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[]).filter(p => p.tipos.includes('Gastronomia'));
    setPartnersDB(storedPartners);
    
    if (isEditing) {
        const allProductos = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const producto = allProductos.find(p => p.id === id);
        if (producto) {
            form.reset(producto);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Producto no encontrado.' });
            router.push('/entregas/productos-venta');
        }
    } else {
         form.reset({
            ...defaultValues,
            id: Date.now().toString(),
        });
    }
  }, [id, isEditing, form, router, toast]);

  const { margenBruto, margenPct, comisionIfema, margenFinal } = useMemo(() => {
    const pvp = useIfemaPrices ? (watchedPvpIfema || watchedPvp || 0) : (watchedPvp || 0);
    const margen = pvp - costeTotal;
    const porcentaje = pvp > 0 ? (margen / pvp) * 100 : 0;
    const comision = useIfemaPrices ? pvp * 0.1785 : 0;
    const final = margen - comision;
    return { margenBruto: margen, margenPct: porcentaje, comisionIfema: comision, margenFinal: final };
  }, [costeTotal, watchedPvp, watchedPvpIfema, useIfemaPrices]);
  
  const handleAddImage = () => {
    try {
        const url = new URL(newImageUrl);
        appendImage({
            id: Date.now().toString(),
            url: url.href,
            isPrincipal: imageFields.length === 0,
        });
        setNewImageUrl('');
    } catch(e) {
        toast({ variant: 'destructive', title: 'URL no válida', description: 'Por favor, introduce una URL de imagen válida.'});
    }
  };

  const handleSetPrincipalImage = (indexToSet: number) => {
    imageFields.forEach((_, index) => {
        updateImage(index, { ...getValues(`imagenes.${index}`), isPrincipal: index === indexToSet });
    });
  };

  function onSubmit(data: ProductoVentaFormValues) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    let message = '';
    
    const dataToSave: ProductoVenta = {
        ...data,
        nombre_en: data.nombre_en || '',
        pvpIfema: data.pvpIfema || 0,
        recetaId: data.producidoPorPartner ? undefined : data.recetaId,
        partnerId: data.producidoPorPartner ? data.partnerId : undefined,
    };

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = dataToSave as ProductoVenta;
        message = 'Producto actualizado correctamente.';
      }
    } else {
      allItems.push(dataToSave as ProductoVenta);
      message = 'Producto creado correctamente.';
    }

    localStorage.setItem('productosVenta', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/entregas/productos-venta');
    }, 1000);
  }
  
  const handleDelete = () => {
    if (!isEditing) return;

    let allItems = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('productosVenta', JSON.stringify(updatedItems));
    
    toast({ title: 'Producto eliminado', description: 'El producto de venta ha sido eliminado permanentemente.' });
    setShowDeleteConfirm(false);
    router.push('/entregas/productos-venta');
  };

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Producto de Venta</h1>
                </div>
                <div className="flex gap-2">
                    {isEditing && (
                        <Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 />
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="grid lg:grid-cols-[1fr_500px] gap-6 items-start">
              <div className="space-y-4">
                <Card>
                    <CardHeader className="py-4"><CardTitle className="text-lg">Información General</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="nombre" render={({ field }) => (
                                <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="nombre_en" render={({ field }) => (
                                <FormItem><FormLabel>Nombre (Inglés)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                        <div className="grid md:grid-cols-4 gap-4 items-center">
                             <FormField control={form.control} name="categoria" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {CATEGORIAS_PRODUCTO_VENTA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="ubicacion" render={({ field }) => (
                                <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input {...field} placeholder="Ej: Alm. Seco P3-E4" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="pvp" render={({ field }) => (
                                <FormItem><FormLabel>PVP (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem>
                            )} />
                             <FormField control={form.control} name="pvpIfema" render={({ field }) => (
                                <FormItem><FormLabel>PVP IFEMA (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem>
                            )} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 items-start pt-2">
                             <div className="space-y-4">
                                <FormField control={form.control} name="producidoPorPartner" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-[40px]">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Producido por Partner</FormLabel>
                                    </div>
                                    </FormItem>
                                )} />
                                {isProducidoPorPartner && (
                                    <FormField control={form.control} name="partnerId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Partner Productor</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar Partner..."/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {partnersDB.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                )}
                             </div>
                             <div className="space-y-4">
                                <FormField control={form.control} name="exclusivoIfema" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-[40px]">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Exclusivo IFEMA</FormLabel>
                                    </div>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="recetaId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Receta Vinculada</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'ninguna'} disabled={isProducidoPorPartner}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Vincular a una receta del Book..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="ninguna">Ninguna</SelectItem>
                                                {recetasDB.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )} />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="py-4"><CardTitle className="text-lg">Imágenes del Producto</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="Pega una URL de imagen..." value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} />
                            <Button type="button" variant="outline" onClick={handleAddImage}><Link2 className="mr-2"/>Añadir URL</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {imageFields.map((field, index) => (
                                <div key={field.id} className="relative group aspect-square">
                                    <Image src={field.url} alt={`Imagen ${index + 1}`} fill className="object-cover rounded-md" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <Button type="button" size="icon" variant="ghost" className="text-destructive-foreground hover:text-destructive-foreground" onClick={() => handleSetPrincipalImage(index)}>
                                            <Star className={cn("h-5 w-5", field.isPrincipal && "fill-yellow-400 text-yellow-400")}/>
                                        </Button>
                                        <Button type="button" size="icon" variant="ghost" className="text-destructive-foreground hover:text-destructive-foreground" onClick={() => removeImage(index)}>
                                            <Trash2 className="h-5 w-5"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-3 flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2"><TrendingUp/>Análisis de Rentabilidad</CardTitle>
                        <CardDescription className="text-xs">Cálculo de márgenes basado en el coste de la receta.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 my-4">
                        <Checkbox id="ifema-check" checked={useIfemaPrices} onCheckedChange={(checked) => setUseIfemaPrices(Boolean(checked))} />
                        <label htmlFor="ifema-check" className="font-semibold">Simular con Tarifa y Comisión IFEMA</label>
                    </div>
                    <div className="flex justify-between">
                    <span>Precio de Venta:</span>
                    <span className="font-semibold">{formatCurrency(useIfemaPrices ? (watchedPvpIfema || watchedPvp) : watchedPvp)}</span>
                    </div>
                    <div className="flex justify-between">
                    <span>Coste (Receta):</span>
                    <span className="font-semibold">{formatCurrency(costeTotal)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                    <span>Margen Bruto:</span>
                    <span className={cn(margenBruto < 0 && "text-destructive")}>{formatCurrency(margenBruto)}</span>
                    </div>
                    {useIfemaPrices && (
                    <>
                        <div className="flex justify-between text-sm pl-2">
                        <span>Comisión IFEMA (17.85%)</span>
                        <span className="text-destructive">- {formatCurrency(comisionIfema)}</span>
                        </div>
                        <Separator className="my-2"/>
                        <div className="flex justify-between font-bold text-base text-green-600">
                        <span>Margen Final:</span>
                        <span>{formatCurrency(margenFinal)}</span>
                        </div>
                    </>
                    )}
                     <Separator className="my-2" />
                     <div className="flex justify-between font-bold text-lg text-primary">
                        <span>Margen Porcentual:</span>
                        <span>{margenPct.toFixed(2)}%</span>
                    </div>
                </CardContent>
              </Card>
            </div>
             <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => router.push('/entregas/productos-venta')}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Producto'}</span>
                </Button>
            </div>
          </form>
        </Form>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta acción es irreversible. Se eliminará permanentemente el producto de venta.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                        Eliminar Producto
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
