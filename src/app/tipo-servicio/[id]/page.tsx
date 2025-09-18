'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, List } from 'lucide-react';
import type { TipoServicio } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const tipoServicioFormSchema = z.object({
  id: z.string(),
  servicio: z.string().min(1, 'El servicio es obligatorio'),
});

type TipoServicioFormValues = z.infer<typeof tipoServicioFormSchema>;

const defaultValues: Partial<TipoServicioFormValues> = {
    servicio: '',
};

export default function TipoServicioFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<TipoServicioFormValues>({
    resolver: zodResolver(tipoServicioFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('tipoServicio') || '[]') as TipoServicio[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el tipo de servicio.' });
        router.push('/tipo-servicio');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: TipoServicioFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('tipoServicio') || '[]') as TipoServicio[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data as TipoServicio;
        message = 'Servicio actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.servicio.toLowerCase() === data.servicio.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un servicio con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data as TipoServicio);
      message = 'Servicio creado correctamente.';
    }

    localStorage.setItem('tipoServicio', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/tipo-servicio');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <List className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Tipo de Servicio</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/tipo-servicio')}>Volver al listado</Button>
            <Button type="submit" form="tipo-servicio-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Servicio'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="tipo-servicio-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Servicio</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="servicio" render={({ field }) => (
                    <FormItem><FormLabel>Servicio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
