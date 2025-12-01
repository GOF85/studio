
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, BookHeart, Trash2 } from 'lucide-react';
import type { CategoriaReceta } from '@/types';
import { categoriaRecetaSchema, type CategoriaRecetaFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';

export default function EditarCategoriaRecetaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<CategoriaRecetaFormValues>({
    resolver: zodResolver(categoriaRecetaSchema),
    defaultValues: {
      nombre: '',
      snack: false
    }
  });

  useEffect(() => {
    const fetchCategoria = async () => {
      const { data: item, error } = await supabase
        .from('categorias_recetas')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !item) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la categoría.' });
        router.push('/bd/categorias-recetas');
      } else {
        form.reset(item);
      }
    };
    fetchCategoria();
  }, [id, form, router, toast]);

  async function onSubmit(data: CategoriaRecetaFormValues) {
    setIsLoading(true);

    const { error } = await supabase
      .from('categorias_recetas')
      .update({
        nombre: data.nombre,
        snack: data.snack
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la categoría: ' + error.message });
    } else {
      toast({ description: 'Categoría actualizada correctamente.' });
      router.push('/bd/categorias-recetas');
    }
    setIsLoading(false);
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('categorias_recetas')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la categoría: ' + error.message });
    } else {
      toast({ title: 'Categoría eliminada' });
      router.push('/bd/categorias-recetas');
    }
  };

  return (
    <>
      <Form {...form}>
        <form id="categoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" type="button" onClick={() => router.push('/bd/categorias-recetas')}>
              <X className="mr-2" /> Cancelar
            </Button>
            <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2" /> Borrar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">Guardar Cambios</span>
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
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
