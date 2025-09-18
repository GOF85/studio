'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, DollarSign } from 'lucide-react';
import type { Precio, PrecioCategoria } from '@/types';
import { PRECIO_CATEGORIAS } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const precioFormSchema = z.object({
  id: z.string(),
  producto: z.string().min(1, 'El nombre del producto es obligatorio'),
  categoria: z.enum(PRECIO_CATEGORIAS, {
    errorMap: () => ({ message: 'Debes seleccionar una categoría válida' }),
  }),
  loc: z.string().min(1, 'La localización es obligatoria'),
  precioUd: z.coerce.number().min(0, 'El precio debe ser positivo'),
  precioAlquilerUd: z.coerce.number().min(0, 'El precio de alquiler debe ser positivo'),
  imagen: z.string().url('Debe ser una URL válida').or(z.literal('')),
});

type PrecioFormValues = z.infer<typeof precioFormSchema>;

const defaultValues: Partial<PrecioFormValues> = {
    producto: '',
    loc: '',
    precioUd: 0,
    precioAlquilerUd: 0,
    imagen: '',
};

export default function PrecioFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<PrecioFormValues>({
    resolver: zodResolver(precioFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const precios = JSON.parse(localStorage.getItem('precios') || '[]') as Precio[];
      const precio = precios.find(p => p.id === id);
      if (precio) {
        form.reset(precio);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el precio.' });
        router.push('/precios');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: PrecioFormValues) {
    setIsLoading(true);

    let allPrecios = JSON.parse(localStorage.getItem('precios') || '[]') as Precio[];
    let message = '';
    
    if (isEditing) {
      const index = allPrecios.findIndex(p => p.id === id);
      if (index !== -1) {
        allPrecios[index] = data;
        message = 'Precio actualizado correctamente.';
      }
    } else {
       const existing = allPrecios.find(p => p.producto.toLowerCase() === data.producto.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un producto con este nombre.' });
            setIsLoading(false);
            return;
        }
      allPrecios.push(data);
      message = 'Precio creado correctamente.';
    }

    localStorage.setItem('precios', JSON.stringify(allPrecios));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/precios');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Precio</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/precios')}>Volver al listado</Button>
            <Button type="submit" form="precio-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Precio'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="precio-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Producto</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="producto" render={({ field }) => (
                    <FormItem><FormLabel>Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {PRECIO_CATEGORIAS.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="loc" render={({ field }) => (
                    <FormItem><FormLabel>Localización</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precioUd" render={({ field }) => (
                    <FormItem><FormLabel>Precio Ud.</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precioAlquilerUd" render={({ field }) => (
                    <FormItem><FormLabel>Precio Alquiler Ud.</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="imagen" render={({ field }) => (
                    <FormItem><FormLabel>URL de Imagen</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
