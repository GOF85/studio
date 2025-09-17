'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Utensils } from 'lucide-react';
import type { GastronomiaDBItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';

export const gastronomiaFormSchema = z.object({
  id: z.string(),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  imagenRef: z.string().url('Debe ser una URL válida').or(z.literal('')),
  imagenEmpl: z.string().url('Debe ser una URL válida').or(z.literal('')),
  precio: z.coerce.number().min(0, 'El precio debe ser positivo'),
  gramaje: z.coerce.number().min(0, 'El gramaje debe ser positivo').optional().default(0),
});

type GastronomiaFormValues = z.infer<typeof gastronomiaFormSchema>;

const defaultValues: Partial<GastronomiaFormValues> = {
    referencia: '',
    categoria: '',
    imagenRef: '',
    imagenEmpl: '',
    precio: 0,
    gramaje: 0,
};

export default function GastronomiaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<GastronomiaFormValues>({
    resolver: zodResolver(gastronomiaFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const gastronomia = JSON.parse(localStorage.getItem('gastronomiaDB') || '[]') as GastronomiaDBItem[];
      const item = gastronomia.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el plato.' });
        router.push('/gastronomia-db');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: GastronomiaFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('gastronomiaDB') || '[]') as GastronomiaDBItem[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data as GastronomiaDBItem;
        message = 'Plato actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.referencia.toLowerCase() === data.referencia.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un plato con esta referencia.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data as GastronomiaDBItem);
      message = 'Plato creado correctamente.';
    }

    localStorage.setItem('gastronomiaDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/gastronomia-db');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Utensils className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Plato</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/gastronomia-db')}>Volver al listado</Button>
            <Button type="submit" form="gastronomia-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Plato'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="gastronomia-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Plato</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="referencia" render={({ field }) => (
                    <FormItem><FormLabel>Referencia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precio" render={({ field }) => (
                    <FormItem><FormLabel>Precio</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gramaje" render={({ field }) => (
                    <FormItem><FormLabel>Gramaje (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="imagenRef" render={({ field }) => (
                    <FormItem><FormLabel>URL de Imagen (Referencia)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="imagenEmpl" render={({ field }) => (
                    <FormItem><FormLabel>URL de Imagen (Emplatado)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
