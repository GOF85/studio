
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, BookHeart, Trash2 } from 'lucide-react';
import { categoriaRecetaSchema, type CategoriaRecetaFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCategoriaReceta, useUpsertCategoriaReceta, useDeleteCategoriaReceta } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EditarCategoriaRecetaPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) || '';

  const { data: item, isLoading: isLoadingData } = useCategoriaReceta(id);
  const upsertMutation = useUpsertCategoriaReceta();
  const deleteMutation = useDeleteCategoriaReceta();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<CategoriaRecetaFormValues>({
    resolver: zodResolver(categoriaRecetaSchema),
  });

  useEffect(() => {
    if (item) {
      form.reset(item);
    }
  }, [item, form]);

  async function onSubmit(data: CategoriaRecetaFormValues) {
    try {
      await upsertMutation.mutateAsync({
        ...data,
        id
      });
      toast({ description: 'Categoría actualizada correctamente.' });
      router.push('/bd/categorias-recetas');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la categoría: ' + error.message });
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Categoría eliminada' });
      router.push('/bd/categorias-recetas');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la categoría: ' + error.message });
    }
  };

  if (isLoadingData) {
    return <LoadingSkeleton title="Cargando Categoría..." />;
  }

  return (
    <>
      <main>
        <Form {...form}>
          <form id="categoria-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookHeart className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Categoría de Receta</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/bd/categorias-recetas')}> <X className="mr-2" /> Cancelar</Button>
                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
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
