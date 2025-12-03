
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X } from 'lucide-react';
import type { CategoriaReceta } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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

  async function onSubmit(data: CategoriaRecetaFormValues) {
    setIsLoading(true);

    // Check if category exists
    const { data: existing, error: checkError } = await supabase
      .from('categorias_recetas')
      .select('id')
      .ilike('nombre', data.nombre)
      .single();

    if (existing) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ya existe una categoría con este nombre.' });
      setIsLoading(false);
      return;
    }

    const newCategory = {
      id: crypto.randomUUID(),
      nombre: data.nombre,
      snack: data.snack
    };

    const { data: insertedData, error } = await supabase
      .from('categorias_recetas')
      .insert(newCategory)
      .select();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la categoría: ' + error.message });
    } else {
      toast({ description: 'Nueva categoría añadida correctamente.' });
      router.push('/bd/categorias-recetas');
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form id="categoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" type="button" onClick={() => router.push('/bd/categorias-recetas')}>
            <X className="mr-2" /> Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
            <span className="ml-2">Guardar</span>
          </Button>
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
  );
}
