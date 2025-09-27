'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Percent } from 'lucide-react';
import type { CategoriaProductoVenta } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const categoriaProductoVentaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre de la categoría es obligatorio'),
});

type CategoriaProductoVentaFormValues = z.infer<typeof categoriaProductoVentaSchema>;

const defaultValues: Partial<CategoriaProductoVentaFormValues> = {
    nombre: '',
};

export default function CategoriaProductoVentaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<CategoriaProductoVentaFormValues>({
    resolver: zodResolver(categoriaProductoVentaSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('categoriasProductosVenta') || '[]') as CategoriaProductoVenta[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la categoría.' });
        router.push('/categorias-productos-venta');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: CategoriaProductoVentaFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('categoriasProductosVenta') || '[]') as CategoriaProductoVenta[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Categoría actualizada correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.nombre.toLowerCase() === data.nombre.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe una categoría con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Categoría creada correctamente.';
    }

    localStorage.setItem('categoriasProductosVenta', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/categorias-productos-venta');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Percent className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Categoría de Producto</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/categorias-productos-venta')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="categoria-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Categoría'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="categoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Categoría</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre de la Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
