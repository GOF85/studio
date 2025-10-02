

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, PlusCircle, Trash2, TrendingUp, RefreshCw, Star, Link2 } from 'lucide-react';
import type { ProductoVenta, IngredienteERP, Receta, CategoriaProductoVenta, ImagenProducto, Proveedor, TipoProveedor } from '@/types';
import { CATEGORIAS_PRODUCTO_VENTA, TIPO_PROVEEDOR_OPCIONES } from '@/types';
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
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const imagenSchema = z.object({
    id: z.string(),
    url: z.string().url("Debe ser una URL válida."),
    isPrincipal: z.boolean(),
});

export const productoVentaSchema = z.object({
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
  erpId: z.string().optional(),
  exclusivoIfema: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    if (data.producidoPorPartner && !data.erpId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe seleccionar un producto del ERP si es de un partner.",
            path: ["erpId"],
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

function ErpSelectorDialog({ onSelect, searchTerm, setSearchTerm, filteredProducts }: { onSelect: (id: string) => void, searchTerm: string, setSearchTerm: (term: string) => void, filteredProducts: IngredienteERP[] }) {
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
            <Input placeholder="Buscar por nombre, proveedor, referencia..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Proveedor</TableHead><TableHead>Precio</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredProducts.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{p.nombreProductoERP}</TableCell>
                                <TableCell>{p.nombreProveedor}</TableCell>
                                <TableCell>{formatCurrency(p.precio)}/{p.unidad}</TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => onSelect(p.id)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Seleccionar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}

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
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // States for ERP selector dialog
  const [ingredientesERP, setIngredientesERP] = useState<IngredienteERP[]>([]);
  const [erpSearchTerm, setErpSearchTerm] = useState('');
  const [isErpDialogOpen, setIsErpDialogOpen] = useState(false);


  const form = useForm<ProductoVentaFormValues>({
    resolver: zodResolver(productoVentaSchema),
    defaultValues: defaultValues,
  });

  const { control, getValues, setValue, watch, reset } = form;

  const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({
      control,
      name: 'imagenes'
  });
  
  const watchedPvp = form.watch('pvp');
  const watchedPvpIfema = form.watch('pvpIfema');
  const isProducidoPorPartner = form.watch('producidoPorPartner');
  const recetaId = form.watch('recetaId');
  const erpId = form.watch('erpId');
  const categoriaSeleccionada = watch("categoria");

  useEffect(() => {
    if (isProducidoPorPartner) {
        setValue('recetaId', undefined);
    } else {
        setValue('partnerId', undefined);
        setValue('erpId', undefined);
    }
  }, [isProducidoPorPartner, setValue]);
  
  const filteredPartners = useMemo(() => {
    if (!categoriaSeleccionada) return [];
    
    const categoryToTypeMap: Record<string, TipoProveedor> = {
        'Gastronomía': 'Gastronomia',
        'Bodega': 'Otros',
        'Consumibles': 'Otros',
        'Almacen': 'Otros',
        'Transporte': 'Transporte',
    };
    const requiredType = categoryToTypeMap[categoriaSeleccionada];
    if (!requiredType) return [];
    
    return partnersDB.filter(p => p.tipos.includes(requiredType));
  }, [partnersDB, categoriaSeleccionada]);
  
  const costeTotal = useMemo(() => {
    if (isProducidoPorPartner) {
        const erpProduct = ingredientesERP.find(p => p.id === erpId);
        return erpProduct?.precio || 0;
    }
    const receta = recetasDB.find(r => r.id === recetaId);
    return receta?.costeMateriaPrima || 0;
  }, [recetaId, erpId, isProducidoPorPartner, recetasDB, ingredientesERP]);

  const [categorias, setCategorias] = useState<CategoriaProductoVenta[]>(CATEGORIAS_PRODUCTO_VENTA as any);
  
  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    setRecetasDB(storedRecetas);

    const storedPartners = (JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[]);
    setPartnersDB(storedPartners);
    
    const storedErp = (JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[]);
    setIngredientesERP(storedErp);

    if (isEditing) {
        const allProductos = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const producto = allProductos.find(p => p.id === id);
        if (producto) {
            reset(producto);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Producto no encontrado.' });
            router.push('/entregas/productos-venta');
        }
    } else {
         reset({
            ...defaultValues,
            id: Date.now().toString(),
        });
    }
    setIsDataLoaded(true);
  }, [id, isEditing, reset, router, toast]);

  useEffect(() => {
    if (isEditing && isDataLoaded) {
      const initialCategory = getValues('categoria');
      if (categoriaSeleccionada !== initialCategory) {
        setValue('partnerId', undefined);
      }
    } else if (!isEditing && isDataLoaded) {
      setValue('partnerId', undefined);
    }
  }, [categoriaSeleccionada, setValue, isEditing, getValues, isDataLoaded]);

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
        erpId: data.producidoPorPartner ? data.erpId : undefined,
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
  
  const filteredErpProducts = useMemo(() => {
    return ingredientesERP.filter(p => 
        p.nombreProductoERP.toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        p.nombreProveedor.toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        p.referenciaProveedor.toLowerCase().includes(erpSearchTerm.toLowerCase())
    );
  }, [ingredientesERP, erpSearchTerm]);

  const handleErpSelect = (erpId: string) => {
    setValue('erpId', erpId, { shouldDirty: true });
    setIsErpDialogOpen(false);
  }

  const selectedErpProduct = ingredientesERP.find(p => p.id === erpId);

  
  if (!isDataLoaded) {
    return <div>Cargando...</div>
  }

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
                        </div>
                         <div className="pt-2">
                           {!isProducidoPorPartner ? (
                               <FormField control={form.control} name="recetaId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Receta Vinculada (Producción MICE)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'ninguna'}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Vincular a una receta del Book..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="ninguna">Ninguna</SelectItem>
                                                {recetasDB.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )} />
                           ) : (
                             <FormItem>
                                <FormLabel>Producto ERP Vinculado (Coste de Partner)</FormLabel>
                                {selectedErpProduct ? (
                                     <div className="border rounded-md p-2 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                                <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => setValue('erpId', undefined)}><X className="mr-1 h-3 w-3"/>Desvincular</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Dialog open={isErpDialogOpen} onOpenChange={setIsErpDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" className="w-full h-10 border-dashed border-2"><Link2 className="mr-2"/>Vincular Producto ERP</Button>
                                        </DialogTrigger>
                                        <ErpSelectorDialog 
                                            onSelect={handleErpSelect}
                                            searchTerm={erpSearchTerm}
                                            setSearchTerm={setErpSearchTerm}
                                            filteredProducts={filteredErpProducts}
                                        />
                                    </Dialog>
                                )}
                                <FormMessage className="mt-2 text-red-500">{form.formState.errors.erpId?.message}</FormMessage>
                            </FormItem>
                           )}
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
                        <CardDescription className="text-xs">Cálculo de márgenes basado en el coste.</CardDescription>
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
                    <span>Coste:</span>
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

```
- src/types/index.ts
- `ProductoVenta`: added `erpId` as optional string
- `productoVentaSchema` in `productos-venta/[id]/page.tsx`: added `erpId` and updated `superRefine`
```ts
import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  category: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
};

export type OrderCompletionAssistantInput = {
  eventDescription: string;
};

export type OrderCompletionAssistantOutput = {
  itemCode: string;
  description: string;
  price: number;
  quantity: number;
}[];


export type ServiceOrder = {
    id: string;
    serviceNumber: string;
    startDate: string;
    endDate: string;
    client: string;
    tipoCliente?: 'Empresa' | 'Agencia' | 'Particular';
    finalClient: string;
    contact: string;
    phone: string;
    asistentes: number;
    space: string;
    spaceAddress: string;
    spaceContact: string;
    spacePhone: string;
    spaceMail: string;
    respMetre: string;
    respMetrePhone: string;
    respMetreMail: string;
    respCocinaCPR: string;
    respCocinaCPRPhone: string;
    respCocinaCPRMail: string;
    respPase: string;
    respPasePhone: string;
    respPaseMail: string;
    respCocinaPase: string;
    respCocinaPasePhone: string;
    respCocinaPaseMail: string;
    comercialAsiste: boolean;
    comercial: string;
    comercialPhone: string;
    comercialMail: string;
    rrhhAsiste: boolean;
    respRRHH: string;
    respRRHHPhone: string;
    respRRHHMail: string;
    agencyPercentage: number;
    agencyCommissionValue?: number;
    spacePercentage: number;
    spaceCommissionValue?: number;
    comisionesAgencia?: number;
    comisionesCanon?: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado';
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
    direccionPrincipal?: string;
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
};


export type Personal = {
    id: string;
    nombre: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
    dni: string;
    precioHora: number;
}

export type Espacio = {
    id: string;
    espacio: string;
    escaparateMICE: string;
    carpetaDRIVE: string;
    calle: string;
    nombreContacto1: string;
    telefonoContacto1: string;
    emailContacto1: string;
    canonEspacioPorcentaje: number;
    canonEspacioFijo: number;
    canonMcPorcentaje: number;
    canonMcFijo: number;
    comisionAlquilerMcPorcentaje: number;
    precioOrientativoAlquiler: string;
    horaLimiteCierre: string;
    aforoCocktail: number;
    aforoBanquete: number;
    auditorio: string;
    aforoAuditorio: number;
    zonaExterior: string;
    capacidadesPorSala: string;
    numeroDeSalas: number;
    tipoDeEspacio: string;
    tipoDeEventos: string;
    ciudad: string;
    directorio: string;
    descripcion: string;
    comentariosVarios: string;
    equipoAudiovisuales: string;
    cocina: string;
    accesibilidadAsistentes: string;
    pantalla: string;
    plato: string;
aparcamiento: string;
  accesoVehiculos: string;
  conexionWifi: string;
  homologacion: string;
  comentariosMarketing: string;
}

export const PRECIO_CATEGORIAS = ['Bebida', 'Menaje', 'Vajilla', 'Cristalería', 'Mantelería', 'Mobiliario', 'Decoración', 'Maquinaria', 'Transporte', 'Hielo'] as const;
export type PrecioCategoria = typeof PRECIO_CATEGORIAS[number];

export type Precio = {
    id: string;
    producto: string;
    categoria: PrecioCategoria;
    loc: string;
    precioUd: number;
    precioAlquilerUd: number;
    pvp: number;
    iva: number;
    imagen: string;
    isDeliveryProduct?: boolean;
}

export type AlquilerDBItem = {
  id: string;
  concepto: string;
  precioAlquiler: number;
  precioReposicion: number;
  imagen: string;
};

export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    tipoTransporte: string; // Ej. "Furgoneta Isotermo"
    precio: number;
    tipo: 'Catering' | 'Entregas';
}

export type CategoriaPersonal = {
  id: string;
  proveedorId: string;
  nombreProveedor: string;
  categoria: string;
  precioHora: number;
};

export type ComercialBriefingItem = {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    conGastronomia: boolean;
    descripcion: string;
    comentarios: string;
    sala: string;
    asistentes: number;
    precioUnitario: number;
    importeFijo?: number;
    bebidas?: string;
    matBebida?: string;
    materialGastro?: string;
    manteleria?: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
}

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    descripcion: string;
    fecha: string;
    horaInicio: string;
    asistentes: number;
    comentarios?: string;
    sala?: string;
    items: GastronomyOrderItem[];
    total: number;
}

export type TransporteOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoTransporte: string;
    precio: number;
    lugarRecogida: string;
    horaRecogida: string;
    lugarEntrega: string;
    horaEntrega: string;
    observaciones?: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string;
    firmadoPor?: string;
    dniReceptor?: string;
    fechaFirma?: string;
    hitosIds?: string[]; // For Entregas, to link multiple deliveries
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: { id: string; producto: string; precio: number; cantidad: number }[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
};

export type DecoracionDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type DecoracionOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  precio: number;
  observaciones?: string;
};

export type AtipicoDBItem = {
  id: string;
  concepto: string;
  precio: number;
};

export type AtipicoOrder = {
  id: string;
  osId: string;
  fecha: string;
  concepto: string;
  observaciones?: string;
  precio: number;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
};

export type PersonalMiceOrder = {
    id: string;
    osId: string;
    centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
    nombre: string;
    dni: string;
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
}

export type PersonalExternoOrder = {
  id: string;
  osId: string;
  proveedorId: string;
  categoria: string;
  cantidad: number;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  observaciones?: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
};

export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
    referencia: string;
    observaciones?: string;
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales: string;
    costePruebaMenu?: number;
};

export type CtaExplotacionObjetivos = {
    gastronomia: number;
    bodega: number;
    consumibles: number;
    hielo: number;
    almacen: number;
    alquiler: number;
    transporte: number;
    decoracion: number;
    atipicos: number;
    personalMice: number;
    personalExterno: number;
    costePruebaMenu: number;
}

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
};

export type PersonalExternoAjuste = {
    id: string;
    concepto: string;
    ajuste: number;
}
export const UNIDADES_MEDIDA = ['UNIDAD', 'KILO', 'LITRO', 'GRAMO', 'BOTELLA', 'CAJA', 'PACK'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  IdERP: z.string(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string(),
  nombreProveedor: z.string(),
  familiaCategoria: z.string(),
  precio: z.coerce.number().min(0),
  unidad: z.enum(UNIDADES_MEDIDA),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: string[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: 'KILO' | 'LITRO' | 'UNIDAD';
  merma: number;
}

export type MenajeDB = {
    id: string;
    descripcion: string;
    fotoURL?: string;
}

export type MenajeEnReceta = {
    id: string;
    menajeId: string;
    descripcion: string;
    ratio: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Receta = {
    id: string;
    nombre: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: MenajeEnReceta[];
    instruccionesMiseEnPlace: string;
    instruccionesRegeneracion: string;
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: string[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO' | 'AMBIENTE' | 'FRIO' | 'HELADO';
    tecnicaCoccionPrincipal?: string;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL' | 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    // Calculated fields
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}
export type TipoCocina = {
    id: string;
    nombre: string;
}

export type OrdenFabricacion = {
    id: string;
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadReal?: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    responsable?: string;
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    osIDs: string[];
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsableCalidad?: string;
    fechaValidacionCalidad?: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
}
export type ContenedorIsotermo = {
    id: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type LoteAsignado = {
    allocationId: string;
    ofId: string;
    containerId: string;
    quantity: number;
    hitoId: string;
}
export type ContenedorDinamico = {
    id: string;
    hitoId: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';
export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
};
export type PedidoPlantillaItem = {
    itemCode: string;
    quantity: number;
    description: string;
};
export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: PedidoPlantillaItem[];
};
export type MaterialOrderType = 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
export type FormatoExpedicion = {
  id: string;
  nombre: string;
};

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Personal', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ImagenProducto = {
  id: string;
  url: string;
  isPrincipal: boolean;
}

export type ProductoVenta = {
    id: string;
    nombre: string;
    nombre_en?: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    partnerId?: string;
    recetaId?: string;
    erpId?: string;
    exclusivoIfema?: boolean;
}

export type PedidoEntregaItem = {
    id: string; // ProductoVenta ID
    nombre: string;
    quantity: number;
    pvp: number;
    coste: number;
    categoria: CategoriaProductoVenta;
};
export type EntregaHito = {
    id: string;
    fecha: string;
    hora: string;
    lugarEntrega: string;
    localizacion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    observaciones?: string;
    items: PedidoEntregaItem[];
    portes?: number;
    horasCamarero?: number;
}
export type PedidoEntrega = {
    osId: string;
    hitos: EntregaHito[];
};
export type Entrega = ServiceOrder & {
    vertical: 'Entregas';
    tarifa: 'Empresa' | 'IFEMA';
};
export type PedidoPartner = {
    id: string; // hitoId-productoId
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEntrega: string; // En CPR MICE
    horaEntrega: string;  // En CPR MICE
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
}
export type PedidoPartnerStatus = 'Pendiente' | 'En Producción' | 'Listo para Entrega';
export type PickingIncidencia = {
  itemId: string;
  comment: string;
  timestamp: string;
};
export type PickingEntregaState = {
  hitoId: string;
  status: 'Pendiente' | 'En Proceso' | 'Preparado';
  checkedItems: Set<string>;
  incidencias: PickingIncidencia[];
  fotoUrl: string | null;
  ordenItems?: string[];
};

export const TIPO_ENTIDAD_FISCAL = ['Cliente', 'Proveedor', 'Propia'] as const;
export type TipoEntidadFiscal = typeof TIPO_ENTIDAD_FISCAL[number];

export type DatosFiscales = {
    id: string;
    cif: string;
    nombreEmpresa: string;
    nombreComercial?: string;
    direccionFacturacion: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
    emailContacto: string;
    telefonoContacto: string;
    iban?: string;
    formaDePagoHabitual?: string;
    tipo: TipoEntidadFiscal;
}

export const TIPO_PROVEEDOR_OPCIONES = ['Transporte', 'Hielo', 'Gastronomia', 'Personal', 'Atipicos', 'Decoracion', 'Servicios', 'Otros'] as const;
export type TipoProveedor = typeof TIPO_PROVEEDOR_OPCIONES[number];

export type Proveedor = {
  id: string;
  datosFiscalesId: string;
  nombreComercial: string;
  tipos: TipoProveedor[];
}

export const ESTADO_PERSONAL_ENTREGA = ['Pendiente', 'Asignado'] as const;
export type EstadoPersonalEntrega = typeof ESTADO_PERSONAL_ENTREGA[number];

export type AsignacionPersonal = {
  id: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  comentarios?: string;
  comentariosMice?: string;
  rating?: number;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
};

export type PersonalEntregaTurno = {
  id: string;
  proveedorId: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  categoria: string;
  precioHora: number;
  observaciones: string;
  statusPartner: 'Pendiente Asignación' | 'Gestionado';
  asignaciones: AsignacionPersonal[];
  requiereActualizacion?: boolean;
};

export type PersonalEntrega = {
    osId: string;
    turnos: PersonalEntregaTurno[];
    status: EstadoPersonalEntrega;
    observacionesGenerales?: string;
};

    
