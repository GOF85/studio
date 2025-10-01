

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, UserPlus, X, Building2 } from 'lucide-react';
import type { CategoriaPersonal, Proveedor } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const categoriaPersonalSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "Debes seleccionar un proveedor."),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio debe ser positivo'),
});

type CategoriaPersonalFormValues = z.infer<typeof categoriaPersonalSchema>;

const defaultValues: Partial<CategoriaPersonalFormValues> = {
    proveedorId: '',
    categoria: '',
    precioHora: 0,
};

export default function CategoriaPersonalFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const form = useForm<CategoriaPersonalFormValues>({
    resolver: zodResolver(categoriaPersonalSchema),
    defaultValues,
  });

  const selectedProviderId = form.watch('proveedorId');
  const selectedProviderData = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedores(allProveedores.filter(p => p.tipos.includes('Personal')));
    
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el registro.' });
        router.push('/tipos-personal');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: CategoriaPersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Registro actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.proveedorId === data.proveedorId && p.categoria.toLowerCase() === data.categoria.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe esta categoría para este proveedor.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Registro creado correctamente.';
    }

    localStorage.setItem('tiposPersonal', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/tipos-personal');
    }, 1000);
  }

  const providerOptions = useMemo(() => 
    proveedores.map(p => ({
        value: p.id,
        label: p.nombreComercial
    })), [proveedores]);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Categoría de Personal</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/tipos-personal')}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" form="proveedor-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Registro'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="proveedor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Categoría Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="proveedorId" render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                          <FormLabel>Proveedor</FormLabel>
                          <Combobox 
                            options={providerOptions}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Selecciona un proveedor..."
                          />
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
                 {selectedProviderData && (
                    <Accordion type="single" collapsible>
                        <AccordionItem value="fiscal-data">
                            <AccordionTrigger>Ver Información del Proveedor</AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 border rounded-md bg-muted/50 text-sm space-y-2">
                                    <p className="flex items-center gap-2"><Building2 /> <strong>Razón Social:</strong> {selectedProviderData.nombreComercial}</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                     <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría Profesional</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precioHora" render={({ field }) => (
                        <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
