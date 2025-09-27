
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, PlusCircle, Trash2 } from 'lucide-react';
import type { ProductoVenta, IngredienteERP, ComponenteProductoVenta, CategoriaProductoVenta } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { labels as GASTO_LABELS } from '@/app/cta-explotacion/page';

const componenteSchema = z.object({
    erpId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.001, 'La cantidad debe ser mayor que 0'),
    coste: z.coerce.number().default(0),
});

const productoVentaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  pvp: z.coerce.number().min(0, 'El PVP debe ser positivo'),
  iva: z.coerce.number().min(0).max(100),
  componentes: z.array(componenteSchema).min(1, 'Debe tener al menos un componente'),
});

type ProductoVentaFormValues = z.infer<typeof productoVentaSchema>;

const defaultValues: Partial<ProductoVentaFormValues> = {
    nombre: '',
    categoria: '',
    pvp: 0,
    iva: 21,
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
  const { toast } = useToast();

  const form = useForm<ProductoVentaFormValues>({
    resolver: zodResolver(productoVentaSchema),
    defaultValues: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'componentes',
  });
  
  const watchedComponentes = form.watch('componentes');
  const categorias = useMemo(() => Object.values(GASTO_LABELS), []);

  useEffect(() => {
    if (isEditing) {
        const allProductos = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const producto = allProductos.find(p => p.id === id);
        if (producto) {
            form.reset(producto);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Producto no encontrado.' });
            router.push('/productos-venta');
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

  const costeTotal = useMemo(() => {
    return watchedComponentes.reduce((total, componente) => {
        return total + (componente.coste || 0) * componente.cantidad;
    }, 0);
  }, [watchedComponentes]);

  function onSubmit(data: ProductoVentaFormValues) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Producto actualizado correctamente.';
      }
    } else {
      allItems.push(data);
      message = 'Producto creado correctamente.';
    }

    localStorage.setItem('productosVenta', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/productos-venta');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Producto de Venta</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/productos-venta')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Producto'}</span>
                    </Button>
                </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <div className="space-y-4">
                <Card>
                    <CardHeader><CardTitle className="text-lg">Información General</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="nombre" render={({ field }) => (
                            <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-3 gap-4">
                          <FormField control={form.control} name="categoria" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="pvp" render={({ field }) => (
                              <FormItem><FormLabel>PVP (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                           <FormField control={form.control} name="iva" render={({ field }) => (
                              <FormItem><FormLabel>IVA (%)</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                    </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between py-3">
                    <div className="space-y-1"><CardTitle className="text-lg">Componentes del Producto</CardTitle>
                    <CardDescription className="text-xs">Artículos de Materia Prima (ERP) que componen este producto.</CardDescription></div>
                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" type="button"><PlusCircle className="mr-2"/>Añadir</Button>
                        </DialogTrigger>
                        <ErpSelectorDialog onSelect={handleSelectComponente} />
                    </Dialog>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead className="w-32">Cantidad</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {fields.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">Añade un componente para empezar.</TableCell></TableRow>}
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="font-medium">{field.nombre}</TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                                                <FormItem><FormControl><Input type="number" step="any" {...qField} className="h-8" /></FormControl></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                     {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.message}</p>}
                </CardContent>
                <CardFooter className="flex justify-end font-bold text-lg">
                    Coste Total: {formatCurrency(costeTotal)}
                </CardFooter>
            </Card>
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
