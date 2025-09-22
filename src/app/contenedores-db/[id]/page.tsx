
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package as PackageIcon } from 'lucide-react';
import type { ContenedorIsotermo } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const contenedorFormSchema = z.object({
  id: z.string().min(1, 'El ID del contenedor es obligatorio (ej. ISO-001)'),
  nombre: z.string().min(1, 'El nombre/descripción es obligatorio'),
});

type ContenedorFormValues = z.infer<typeof contenedorFormSchema>;

const defaultValues: Partial<ContenedorFormValues> = {
    id: '',
    nombre: '',
};

export default function ContenedorFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;
  const isEditing = formId !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<ContenedorFormValues>({
    resolver: zodResolver(contenedorFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
      const item = items.find(p => p.id === formId);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el contenedor.' });
        router.push('/contenedores-db');
      }
    } else {
        form.reset(defaultValues);
    }
  }, [formId, isEditing, form, router, toast]);

  function onSubmit(data: ContenedorFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === formId);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Contenedor actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.id.toLowerCase() === data.id.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un contenedor con este ID.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Contenedor creado correctamente.';
    }

    localStorage.setItem('contenedoresDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/contenedores-db');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <PackageIcon className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Contenedor Isotérmico</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/contenedores-db')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="contenedor-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Contenedor'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="contenedor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Contenedor</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem><FormLabel>ID Contenedor (ej. ISO-001)</FormLabel><FormControl><Input {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Nombre / Descripción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
