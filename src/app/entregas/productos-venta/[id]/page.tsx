

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, PlusCircle, Trash2, TrendingUp, RefreshCw, Star, Link2 } from 'lucide-react';
import type { ProductoVenta, IngredienteERP, ComponenteProductoVenta, Receta, CategoriaProductoVenta, ImagenProducto } from '@/types';
import { CATEGORIAS_PRODUCTO_VENTA } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import Image from 'next/image';

const componenteSchema = z.object({
    erpId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.001, 'La cantidad debe ser mayor que 0'),
    coste: z.coerce.number().default(0),
});

const imagenSchema = z.object({
    id: z.string(),
    url: z.string().url("Debe ser una URL válida."),
    isPrincipal: z.boolean(),
});

const productoVentaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  ubicacion: z.string().optional(),
  imagenes: z.array(imagenSchema).default([]),
  pvp: z.coerce.number().min(0, 'El PVP debe ser positivo'),
  pvpIfema: z.coerce.number().min(0, 'El PVP IFEMA debe ser positivo').optional(),
  iva: z.coerce.number().min(0).max(100),
  producidoPorPartner: z.boolean().optional().default(false),
  recetaId: z.string().optional(),
  componentes: z.array(componenteSchema),
});

type ProductoVentaFormValues = z.infer<typeof productoVentaSchema>;

const defaultValues: Partial<ProductoVentaFormValues> = {
    nombre: '',
    categoria: '',
    ubicacion: '',
    imagenes: [],
    pvp: 0,
    pvpIfema: 0,
    iva: 21,
    producidoPorPartner: false,
    componentes: []
};


function ErpSelectorDialog({ onSelect }: { onSelect: (ingrediente: IngredienteERP) => void }) {
    const [ingredientesERP, setIngredientesERP] = useState<IngredienteERP[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
        setIngredientesERP(storedErp);
    }, []);

    const filtered = useMemo(() => {
        return ingredientesERP.filter(i => 
            i.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.IdERP || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [ingredientesERP, searchTerm]);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Seleccionar Componente ERP</DialogTitle></DialogHeader>
            <Input placeholder="Buscar materia prima por nombre o Id. ERP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filtered.map(ing => (
                            <TableRow key={ing.id}>
                                <TableCell>{ing.nombreProductoERP}</TableCell>
                                <TableCell>{formatCurrency(ing.precio)} / {formatUnit(ing.unidad)}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" type="button" onClick={() => onSelect(ing)}>Añadir</Button>
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
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recetasDB, setRecetasDB] = useState<Receta[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const [useIfemaPrices, setUseIfemaPrices] = useState(false);

  const form = useForm<ProductoVentaFormValues>({
    resolver: zodResolver(productoVentaSchema),
    defaultValues: defaultValues,
  });

  const { control, getValues, setValue } = form;

  const { fields, append, remove } = useFieldArray({
      control,
      name: 'componentes',
  });

  const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({
      control,
      name: 'imagenes'
  });
  
  const watchedComponentes = form.watch('componentes');
  const watchedPvp = form.watch('pvp');
  const watchedPvpIfema = form.watch('pvpIfema');
  
  const [costeTotal, setCosteTotal] = useState(0);

  const [categorias, setCategorias] = useState<CategoriaProductoVenta[]>(CATEGORIAS_PRODUCTO_VENTA as any);
  const categoriasOptions = useMemo(() => categorias.map(c => ({ label: c, value: c })), [categorias]);
  
  const recalculateCosts = useCallback(() => {
    const components = getValues('componentes');
    const newTotalCost = components.reduce((total, componente) => {
        return total + (componente.coste || 0) * componente.cantidad;
    }, 0);
    setCosteTotal(newTotalCost);
  }, [getValues]);

  useEffect(() => {
    recalculateCosts();
  }, [watchedComponentes, recalculateCosts]);


  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    setRecetasDB(storedRecetas);
    
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

  const handleSelectComponente = (ingrediente: IngredienteERP) => {
      append({
          erpId: ingrediente.id,
          nombre: ingrediente.nombreProductoERP,
          cantidad: 1,
          coste: ingrediente.precio,
      });
      setIsSelectorOpen(false);
  }
  
  const { margenBruto, margenPct, comisionIfema, margenFinal } = useMemo(() => {
    const pvp = useIfemaPrices ? (watchedPvpIfema || watchedPvp || 0) : (watchedPvp || 0);
    const margen = pvp - costeTotal;
    const porcentaje = pvp > 0 ? (margen / pvp) * 100 : 0;
    const comision = useIfemaPrices ? pvp * 0.1785 : 0;
    const final = margen - comision;
    return { margenBruto: margen, margenPct: porcentaje, comisionIfema: comision, margenFinal: final };
  }, [costeTotal, watchedPvp, watchedPvpIfema, useIfemaPrices]);
  
  const handleRecalculate = () => {
    recalculateCosts();
  }
  
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
    
    const dataToSave = {
        ...data,
        pvpIfema: data.pvpIfema || 0,
        recetaId: data.recetaId === 'ninguna' ? undefined : data.recetaId,
    };

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = dataToSave;
        message = 'Producto actualizado correctamente.';
      }
    } else {
      allItems.push(dataToSave);
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
                         <FormField control={form.control} name="nombre" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid md:grid-cols-4 gap-4 items-center">
                             <FormField control={form.control} name="categoria" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Combobox
                                        options={categoriasOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        onCreated={(value) => setCategorias(prev => [...prev, value as CategoriaProductoVenta])}
                                        placeholder="Seleccionar..."
                                    />
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
                        <div className="grid md:grid-cols-2 gap-4 items-center pt-2">
                             <FormField control={form.control} name="recetaId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Receta Vinculada (Opcional)</FormLabel>
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
                            <FormField control={form.control} name="producidoPorPartner" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-full">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Producido por Partner</FormLabel>
                                </div>
                                </FormItem>
                            )} />
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

                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1" className="border rounded-lg">
                    <Card className="shadow-none">
                      <AccordionTrigger className="p-4 w-full">
                        <div className="flex justify-between items-center w-full">
                           <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp/>Análisis de Rentabilidad</h3>
                           <div className="font-bold text-green-600">
                               <span>{formatCurrency(margenFinal)}</span>
                               <span className="mx-2">-</span>
                               <span>{margenPct.toFixed(2)}%</span>
                           </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <CardContent className="space-y-2 text-sm pt-0">
                           <div className="flex items-center space-x-2 my-4">
                                <Checkbox id="ifema-check" checked={useIfemaPrices} onCheckedChange={(checked) => setUseIfemaPrices(Boolean(checked))} />
                                <label htmlFor="ifema-check" className="font-semibold">Simular con Tarifa y Comisión IFEMA</label>
                            </div>
                          <div className="flex justify-between">
                            <span>Precio de Venta:</span>
                            <span className="font-semibold">{formatCurrency(useIfemaPrices ? (watchedPvpIfema || watchedPvp) : watchedPvp)}</span>
                          </div>
                           <div className="flex justify-between">
                            <span>Coste de Componentes:</span>
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
                        </CardContent>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                </Accordion>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => router.push('/entregas/productos-venta')}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Producto'}</span>
                    </Button>
                </div>
              </div>

              <Card>
                <CardHeader className="py-3 flex-row items-center justify-between">
                    <div className="space-y-1"><CardTitle className="text-lg">Componentes</CardTitle>
                    <CardDescription className="text-xs">Artículos de ERP que componen este producto.</CardDescription></div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800">
                            <span className="text-sm text-green-800 dark:text-green-200">Coste Total: </span>
                            <span className="font-bold text-green-800 dark:text-green-200">{formatCurrency(costeTotal)}</span>
                        </div>
                        <Button variant="outline" type="button" size="sm" onClick={handleRecalculate}>
                            <RefreshCw className="mr-2 h-4 w-4"/>Recalcular
                        </Button>
                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" type="button" size="sm"><PlusCircle className="mr-2"/>Añadir</Button>
                            </DialogTrigger>
                            <ErpSelectorDialog onSelect={handleSelectComponente} />
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg max-h-80 overflow-y-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead className="py-2">Componente</TableHead><TableHead className="w-32 py-2">Cantidad</TableHead><TableHead className="w-12 py-2"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {fields.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">Añade un componente para empezar.</TableCell></TableRow>}
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="font-medium py-1">{field.nombre}</TableCell>
                                        <TableCell className="py-1">
                                            <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                                                <FormItem><FormControl><Input type="number" step="any" {...qField} className="h-8" /></FormControl></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="py-1"><Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                     {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.root?.message}</p>}
                </CardContent>
              </Card>
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
