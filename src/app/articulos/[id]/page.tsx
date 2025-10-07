

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Package, X, Star, Link as LinkIcon, Check, CircleX } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import type { ArticuloCatering, Proveedor, IngredienteERP } from '@/types';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


export const articuloCateringSchema = z.object({
  id: z.string(),
  erpId: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  categoria: z.enum(ARTICULO_CATERING_CATEGORIAS, { errorMap: () => ({ message: "Categoría no válida" }) }),
  subcategoria: z.string().optional(),
  esHabitual: z.boolean().default(false),
  precioVenta: z.coerce.number().min(0, 'Debe ser un número positivo').default(0),
  precioAlquiler: z.coerce.number().min(0, 'Debe ser un número positivo').default(0),
  precioReposicion: z.coerce.number().min(0, 'Debe ser un número positivo').default(0),
  stockSeguridad: z.coerce.number().min(0, 'Debe ser un número positivo').default(0),
  tipo: z.string().optional(),
  loc: z.string().optional(),
  imagen: z.string().url("Debe ser una URL válida.").or(z.literal("")).optional(),
  producidoPorPartner: z.boolean().default(false),
  partnerId: z.string().optional(),
});

type ArticuloCateringFormValues = z.infer<typeof articuloCateringSchema>;

const defaultValues: Partial<ArticuloCateringFormValues> = {
    nombre: '',
    esHabitual: false,
    precioVenta: 0,
    precioAlquiler: 0,
    precioReposicion: 0,
    producidoPorPartner: false,
    stockSeguridad: 0,
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
                                        <Check className="mr-2" />
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

export default function ArticuloFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [partners, setPartners] = useState<Proveedor[]>([]);
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [ingredientesERP, setIngredientesERP] = useState<IngredienteERP[]>([]);
  const [erpSearchTerm, setErpSearchTerm] = useState('');
  const [isErpDialogOpen, setIsErpDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  const form = useForm<ArticuloCateringFormValues>({
    resolver: zodResolver(articuloCateringSchema),
    defaultValues,
  });
  
  const selectedErpId = form.watch('erpId');
  const selectedCategoria = form.watch('categoria');
  const selectedErpProduct = useMemo(() => ingredientesERP.find(p => p.id === selectedErpId), [ingredientesERP, selectedErpId]);
  
  const filteredErpProducts = useMemo(() => {
    return ingredientesERP.filter(p => 
        p.nombreProductoERP.toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        p.nombreProveedor.toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        p.referenciaProveedor.toLowerCase().includes(erpSearchTerm.toLowerCase())
    );
  }, [ingredientesERP, erpSearchTerm]);
  
  useEffect(() => {
    if (selectedErpProduct) {
        form.setValue('tipo', selectedErpProduct.tipo);
        if (selectedCategoria === 'Almacen') {
            form.setValue('precioReposicion', selectedErpProduct.precio);
        } else {
            form.setValue('precioVenta', selectedErpProduct.precio);
        }
    }
  }, [selectedErpProduct, selectedCategoria, form.setValue]);


  useEffect(() => {
    const allPartners = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setPartners(allPartners);
    
    const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    setIngredientesERP(storedErp);

    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('articulos') || '[]') as ArticuloCatering[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset({
            ...defaultValues,
            ...item,
        });
        setImageUrl(item.imagen || '');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el artículo.' });
        router.push('/articulos');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ArticuloCateringFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('articulos') || '[]') as ArticuloCatering[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Artículo actualizado correctamente.';
      }
    } else {
      allItems.push(data);
      message = 'Artículo creado correctamente.';
    }

    localStorage.setItem('articulos', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/articulos');
    }, 1000);
  }
  
  const partnerOptions = partners.map(p => ({ value: p.id, label: p.nombreComercial }));

  const handleErpSelect = (erpId: string) => {
    form.setValue('erpId', erpId, { shouldDirty: true });
    setIsErpDialogOpen(false);
  }
  
  const handleImageSave = () => {
    form.setValue('imagen', imageUrl, { shouldDirty: true });
    setIsImageDialogOpen(false);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Package className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Artículo MICE</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/articulos')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="articulo-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Artículo'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="articulo-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Artículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField control={form.control} name="nombre" render={({ field }) => (
                        <FormItem className="lg:col-span-2"><FormLabel>Nombre del Artículo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                            <SelectContent>{ARTICULO_CATERING_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="loc" render={({ field }) => (
                        <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input {...field} placeholder="Ej: P4-E2-A1" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="flex items-center space-x-4">
                     <FormField control={form.control} name="esHabitual" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <FormLabel className="flex items-center gap-2 !mt-0 font-semibold"><Star className="h-5 w-5 text-amber-400 fill-amber-400"/> Marcar como habitual</FormLabel>
                        </FormItem>
                     )} />
                    <FormField control={form.control} name="producidoPorPartner" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <FormLabel className="!mt-0 font-semibold">Producido por Partner</FormLabel>
                        </FormItem>
                     )} />
                </div>
                {form.watch('producidoPorPartner') && (
                    <FormField control={form.control} name="partnerId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Partner Productor</FormLabel>
                             <Combobox
                                options={partnerOptions}
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Selecciona un partner..."
                            />
                            <FormMessage />
                        </FormItem>
                     )} />
                )}
                 <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" type="button"><LinkIcon className="mr-2"/>Gestionar URL de Imagen</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>URL de la Imagen</DialogTitle></DialogHeader>
                        <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg"/>
                        {imageUrl && <img src={imageUrl} alt="Previsualización" className="rounded-md mt-2 max-h-60 object-contain mx-auto" />}
                        <DialogFooter><Button onClick={handleImageSave}>Guardar URL</Button></DialogFooter>
                    </DialogContent>
                 </Dialog>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 items-start">
             <Card>
                <CardHeader><CardTitle>Información de Precios</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    {selectedCategoria === 'Almacen' ? (
                        <>
                         <FormField control={form.control} name="precioAlquiler" render={({ field }) => (
                            <FormItem><FormLabel>Precio Alquiler</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="precioReposicion" render={({ field }) => (
                            <FormItem><FormLabel>Precio Reposición</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                        )} />
                        </>
                    ) : (
                         <FormField control={form.control} name="precioVenta" render={({ field }) => (
                            <FormItem><FormLabel>Precio Venta</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                    <FormField control={form.control} name="stockSeguridad" render={({ field }) => (
                        <FormItem><FormLabel>Stock de Seguridad</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
             </Card>

              <Card>
                <CardHeader><CardTitle>Vínculo con Materia Prima</CardTitle></CardHeader>
                <CardContent>
                     <FormItem>
                        <FormLabel>Producto ERP Vinculado</FormLabel>
                        {selectedErpProduct ? (
                            <div className="border rounded-md p-2 space-y-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                        <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => form.setValue('erpId', '')}><CircleX className="mr-1 h-3 w-3"/>Desvincular</Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                     <FormField control={form.control} name="tipo" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs">Tipo</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly className="h-8 bg-muted"/></FormControl></FormItem>
                                     )} />
                                </div>
                            </div>
                        ) : (
                            <Dialog open={isErpDialogOpen} onOpenChange={setIsErpDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="w-full h-16 border-dashed border-2"><LinkIcon className="mr-2"/>Vincular Producto ERP</Button>
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
                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
    

