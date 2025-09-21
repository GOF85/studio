'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package } from 'lucide-react';
import type { IngredienteERP, UnidadMedida } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ingredienteErpSchema = z.object({
  id: z.string(),
  IdERP: z.string().optional().default(''),
  nombreProductoERP: z.string().min(1, 'El nombre es obligatorio'),
  referenciaProveedor: z.string().optional().default(''),
  nombreProveedor: z.string().optional().default(''),
  familiaCategoria: z.string().optional().default(''),
  precio: z.coerce.number().min(0, 'El precio debe ser positivo'),
  unidad: z.enum(['KILO', 'LITRO', 'UNIDAD']),
});

type IngredienteErpFormValues = z.infer<typeof ingredienteErpSchema>;

const defaultValues: Partial<IngredienteErpFormValues> = {
    IdERP: '',
    nombreProductoERP: '',
    referenciaProveedor: '',
    nombreProveedor: '',
    familiaCategoria: '',
    precio: 0,
    unidad: 'UNIDAD',
};

export default function IngredienteErpFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<IngredienteErpFormValues>({
    resolver: zodResolver(ingredienteErpSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const ingredientes = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
      const ingrediente = ingredientes.find(p => p.id === id);
      if (ingrediente) {
        form.reset(ingrediente);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el ingrediente.' });
        router.push('/book/ingredientes-erp');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: IngredienteErpFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Ingrediente actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.nombreProductoERP.toLowerCase() === data.nombreProductoERP.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un ingrediente con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Ingrediente creado correctamente.';
    }

    localStorage.setItem('ingredientesERP', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/book/ingredientes-erp');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="ingrediente-erp-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Ingrediente ERP</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/ingredientes-erp')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Ingrediente'}</span>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles de Materia Prima</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="nombreProductoERP" render={({ field }) => (
                        <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="IdERP" render={({ field }) => (
                        <FormItem><FormLabel>Id. ERP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="nombreProveedor" render={({ field }) => (
                        <FormItem><FormLabel>Nombre del Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="referenciaProveedor" render={({ field }) => (
                        <FormItem><FormLabel>Referencia de Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="familiaCategoria" render={({ field }) => (
                        <FormItem><FormLabel>Familia/Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precio" render={({ field }) => (
                        <FormItem><FormLabel>Precio</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="unidad" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unidad</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="KILO">KILO</SelectItem>
                                    <SelectItem value="LITRO">LITRO</SelectItem>
                                    <SelectItem value="UNIDAD">UNIDAD</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

          </form>
        </Form>
      </main>
    </>
  );
}
