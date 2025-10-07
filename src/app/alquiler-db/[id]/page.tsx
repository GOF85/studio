
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Truck, X } from 'lucide-react';
import type { AlquilerDBItem, Proveedor } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Combobox } from '@/components/ui/combobox';

export const alquilerFormSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  precioAlquiler: z.coerce.number().min(0, 'El precio debe ser positivo'),
  precioReposicion: z.coerce.number().min(0, 'El precio de reposición debe ser positivo'),
  imagen: z.string().url('Debe ser una URL válida').or(z.literal('')),
});

type AlquilerFormValues = z.infer<typeof alquilerFormSchema>;

const defaultValues: Partial<AlquilerFormValues> = {
    proveedorId: '',
    concepto: '',
    precioAlquiler: 0,
    precioReposicion: 0,
    imagen: '',
};

export default function AlquilerFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<AlquilerFormValues>({
    resolver: zodResolver(alquilerFormSchema),
    defaultValues,
  });
  
  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedores(allProveedores.filter(p => p.tipos.includes('Alquiler')));
  }, []);

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('alquilerDB') || '[]') as AlquilerDBItem[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el artículo.' });
        router.push('/alquiler-db');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: AlquilerFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('alquilerDB') || '[]') as AlquilerDBItem[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Artículo actualizado correctamente.';
      }
    } else {
      allItems.push(data);
      message = 'Artículo creado correctamente.';
    }

    localStorage.setItem('alquilerDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/alquiler-db');
    }, 1000);
  }
  
  const proveedorOptions = useMemo(() => 
    proveedores.map(p => ({
        value: p.id,
        label: p.nombreComercial
    })), [proveedores]);


  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Truck className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Artículo de Alquiler</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/alquiler-db')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="alquiler-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Artículo'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="alquiler-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Artículo</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <FormField control={form.control} name="proveedorId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <Combobox 
                          options={proveedorOptions}
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Selecciona un proveedor..."
                        />
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="concepto" render={({ field }) => (
                    <FormItem><FormLabel>Concepto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div></div>
                 <FormField control={form.control} name="precioAlquiler" render={({ field }) => (
                    <FormItem><FormLabel>Precio Alquiler</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precioReposicion" render={({ field }) => (
                    <FormItem><FormLabel>Precio Reposición</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
