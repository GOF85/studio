
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Percent } from 'lucide-react';
import type { MargenCategoria } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const margenSchema = z.object({
  id: z.string(),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  margen: z.coerce.number().min(0, 'El margen debe ser un número positivo'),
});

type FormValues = z.infer<typeof margenSchema>;

const defaultValues: Partial<FormValues> = {
    categoria: '',
    margen: 0,
};

export default function MargenFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(margenSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('margenesCategoria') || '[]') as MargenCategoria[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el margen.' });
        router.push('/margenes-categoria');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: FormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('margenesCategoria') || '[]') as MargenCategoria[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Margen actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.categoria.toLowerCase() === data.categoria.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un margen para esta categoría.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Margen creado correctamente.';
    }

    localStorage.setItem('margenesCategoria', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/margenes-categoria');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Percent className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Margen de Beneficio</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/margenes-categoria')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="margen-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Margen'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="margen-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Margen</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <FormControl><Input {...field} placeholder="Ej: BODEGA, GASTRONOMIA_ENTREGAS" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="margen" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Margen (%)</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
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
