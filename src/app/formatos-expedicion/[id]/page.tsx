'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package as PackageIcon } from 'lucide-react';
import type { FormatoExpedicion } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const formatoExpedicionSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre del formato es obligatorio'),
});

type FormatoExpedicionValues = z.infer<typeof formatoExpedicionSchema>;

const defaultValues: Partial<FormatoExpedicionValues> = {
    nombre: '',
};

export default function FormatoExpedicionFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<FormatoExpedicionValues>({
    resolver: zodResolver(formatoExpedicionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el formato.' });
        router.push('/formatos-expedicion');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: FormatoExpedicionValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]') as FormatoExpedicion[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Formato actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.nombre.toLowerCase() === data.nombre.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un formato con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Formato creado correctamente.';
    }

    localStorage.setItem('formatosExpedicionDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/formatos-expedicion');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <PackageIcon className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Formato de Expedición</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/formatos-expedicion')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="formato-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Formato'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="formato-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Formato</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Formato</FormLabel><FormControl><Input {...field} placeholder="Ej: Barqueta 1kg" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
