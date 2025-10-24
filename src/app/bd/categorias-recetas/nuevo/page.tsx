
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, BookHeart } from 'lucide-react';
import type { CategoriaReceta } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const categoriaRecetaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  snack: z.boolean().default(false),
});

export type CategoriaRecetaFormValues = z.infer<typeof categoriaRecetaSchema>;

export default function NuevaCategoriaRecetaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CategoriaRecetaFormValues>({
    resolver: zodResolver(categoriaRecetaSchema),
    defaultValues: {
      id: Date.now().toString(),
      nombre: '',
      snack: false,
    },
  });

  function onSubmit(data: CategoriaRecetaFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
    
    const existing = allItems.find(p => p.nombre.toLowerCase() === data.nombre.toLowerCase());
    if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe una categoría con este nombre.' });
        setIsLoading(false);
        return;
    }

    allItems.push(data);
    localStorage.setItem('categoriasRecetas', JSON.stringify(allItems));
    
    toast({ description: 'Nueva categoría añadida correctamente.' });
    router.push('/bd/categorias-recetas');
    setIsLoading(false);
  }

  return (
    <main>
      <Form {...form}>
        <form id="categoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookHeart className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nueva Categoría de Receta</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/categorias-recetas')}> <X className="mr-2"/> Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Información de la Categoría</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>Nombre de la Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="snack" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Es Snack
                    </FormLabel>
                     <p className="text-sm text-muted-foreground">
                      Marcar si esta categoría se considera un "snack" para los cálculos de ratios de comida.
                    </p>
                  </div>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}
