
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Layers, Trash2 } from 'lucide-react';
import { familiaERPSchema, type FamiliaERPFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFamiliaERP, useUpsertFamiliaERP, useDeleteFamiliaERP } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EditarFamiliaERPPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) || '';

  const { data: familia, isLoading: isLoadingFamilia } = useFamiliaERP(id);
  const upsertFamilia = useUpsertFamiliaERP();
  const deleteFamilia = useDeleteFamiliaERP();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<FamiliaERPFormValues>({
    resolver: zodResolver(familiaERPSchema),
    defaultValues: {
      id: '',
      familiaCategoria: '',
      Familia: '',
      Categoria: '',
    },
  });

  useEffect(() => {
    if (familia) {
      form.reset({
        id: familia.id,
        familiaCategoria: familia.familiaCategoria || '',
        Familia: familia.Familia || '',
        Categoria: familia.Categoria || '',
      });
    }
  }, [familia, form]);

  async function onSubmit(data: FamiliaERPFormValues) {
    upsertFamilia.mutate(data, {
      onSuccess: () => {
        toast({ description: 'Familia ERP actualizada correctamente.' });
        router.push('/bd/familiasERP');
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la familia ERP.' });
      }
    });
  }

  const handleDelete = async () => {
    deleteFamilia.mutate(id, {
      onSuccess: () => {
        toast({ description: 'Familia ERP eliminada correctamente.' });
        router.push('/bd/familiasERP');
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la familia ERP.' });
      }
    });
  };

  if (isLoadingFamilia) {
    return <LoadingSkeleton title="Cargando Familia ERP..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="familia-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Familia ERP</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/bd/familiasERP')}> <X className="mr-2" /> Cancelar</Button>
                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
                <Button type="submit" disabled={upsertFamilia.isPending}>
                  {upsertFamilia.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Información de la Familia ERP</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="familiaCategoria" render={({ field }) => (
                    <FormItem><FormLabel>Código Familia (ERP)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="Familia" render={({ field }) => (
                    <FormItem><FormLabel>Nombre Familia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="Categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría MICE</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro.
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
