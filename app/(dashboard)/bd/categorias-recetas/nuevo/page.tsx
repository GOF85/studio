
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUpsertCategoriaReceta } from '@/hooks/use-data-queries';

export const categoriaRecetaSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  snack: z.boolean().default(false),
});

export type CategoriaRecetaFormValues = z.infer<typeof categoriaRecetaSchema>;

export default function NuevaCategoriaRecetaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const upsertMutation = useUpsertCategoriaReceta();

  const form = useForm<CategoriaRecetaFormValues>({
    resolver: zodResolver(categoriaRecetaSchema),
    defaultValues: {
      nombre: '',
      snack: false,
    },
  });

  async function onSubmit(data: CategoriaRecetaFormValues) {
    try {
      await upsertMutation.mutateAsync({
        ...data,
        id: data.id || crypto.randomUUID(),
      });
      toast({ description: 'Nueva categoría añadida correctamente.' });
      router.push('/bd/categorias-recetas');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la categoría: ' + error.message });
    }
  }

  const isLoading = upsertMutation.isPending;

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
