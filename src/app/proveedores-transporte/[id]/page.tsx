
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Truck, X } from 'lucide-react';
import type { ProveedorTransporte } from '@/types';
import { TIPO_PROVEEDOR_TRANSPORTE } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const proveedorTransporteFormSchema = z.object({
  id: z.string(),
  nombreProveedor: z.string().min(1, 'El nombre del proveedor es obligatorio'),
  tipoTransporte: z.string().min(1, 'El tipo de transporte es obligatorio'),
  precio: z.coerce.number().min(0, 'El precio debe ser positivo'),
  tipo: z.enum(TIPO_PROVEEDOR_TRANSPORTE, {
    errorMap: () => ({ message: "Debes seleccionar un tipo" }),
  }),
});

type ProveedorTransporteFormValues = z.infer<typeof proveedorTransporteFormSchema>;

const defaultValues: Partial<ProveedorTransporteFormValues> = {
    nombreProveedor: '',
    tipoTransporte: '',
    precio: 0,
    tipo: 'Catering',
};

export default function ProveedorTransporteFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<ProveedorTransporteFormValues>({
    resolver: zodResolver(proveedorTransporteFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el proveedor.' });
        router.push('/proveedores-transporte');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ProveedorTransporteFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data as ProveedorTransporte;
        message = 'Proveedor actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.nombreProveedor.toLowerCase() === data.nombreProveedor.toLowerCase() && p.tipoTransporte.toLowerCase() === data.tipoTransporte.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un proveedor con este tipo de transporte.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data as ProveedorTransporte);
      message = 'Proveedor creado correctamente.';
    }

    localStorage.setItem('proveedoresTransporte', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/proveedores-transporte');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Truck className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Proveedor de Transporte</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/proveedores-transporte')}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" form="proveedor-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Proveedor'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="proveedor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField control={form.control} name="nombreProveedor" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tipoTransporte" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de Transporte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="precio" render={({ field }) => (
                    <FormItem><FormLabel>Precio</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {TIPO_PROVEEDOR_TRANSPORTE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
