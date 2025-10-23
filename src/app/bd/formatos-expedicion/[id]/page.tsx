
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package, Trash2 } from 'lucide-react';
import type { FormatoExpedicion } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const formatoExpedicionSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
});

type FormValues = z.infer<typeof formatoExpedicionSchema>;

export default function EditarFormatoExpedicionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formatoExpedicionSchema),
  });

  useEffect(() => {
    const allItems = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
    const item = allItems.find(p => p.id === id);
    if (item) {
      form.reset(item);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el formato.' });
      router.push('/bd/formatos-expedicion');
    }
  }, [id, form, router, toast]);

  function onSubmit(data: FormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
      allItems[index] = data;
      localStorage.setItem('formatosExpedicionDB', JSON.stringify(allItems));
      toast({ description: 'Formato actualizado correctamente.' });
    }
    
    router.push('/bd/formatos-expedicion');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('formatosExpedicionDB', JSON.stringify(updatedItems));
    toast({ title: 'Formato eliminado' });
    router.push('/bd/formatos-expedicion');
  };

  return (
    <>
      <main>
        <Form {...form}>
          <form id="formato-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Formato de Expedición</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/formatos-expedicion')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Formato</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre del Formato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
