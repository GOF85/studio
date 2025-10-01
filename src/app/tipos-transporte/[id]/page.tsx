

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Truck, X, Building2, Mail, Phone, Hash } from 'lucide-react';
import type { TipoTransporte, Proveedor } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const tipoTransporteSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, "Debes seleccionar un proveedor."),
  descripcion: z.string().min(1, 'La descripción del vehículo es obligatoria'),
  precio: z.coerce.number().min(0, 'El precio debe ser positivo'),
});

type TipoTransporteFormValues = z.infer<typeof tipoTransporteSchema>;

const defaultValues: Partial<TipoTransporteFormValues> = {
    proveedorId: '',
    descripcion: '',
    precio: 0,
};

export default function TipoTransporteFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const form = useForm<TipoTransporteFormValues>({
    resolver: zodResolver(tipoTransporteSchema),
    defaultValues,
  });

  const selectedProviderId = form.watch('proveedorId');
  const selectedProviderData = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedores(allProveedores.filter(p => p.tipos.includes('Transporte')));
    
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('tiposTransporte') || '[]') as TipoTransporte[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el tipo de transporte.' });
        router.push('/tipos-transporte');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: TipoTransporteFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('tiposTransporte') || '[]') as TipoTransporte[];
    let message = '';

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Servicio de transporte actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.proveedorId === data.proveedorId && p.descripcion.toLowerCase() === data.descripcion.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe este servicio para este proveedor.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Servicio de transporte creado correctamente.';
    }

    localStorage.setItem('tiposTransporte', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/tipos-transporte');
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
                <Truck className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Servicio de Transporte</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/tipos-transporte')}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" form="transporte-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Servicio'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="transporte-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Servicio de Transporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="proveedorId" render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                          <FormLabel>Proveedor del Servicio</FormLabel>
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
                     <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><FormLabel>Descripción (ej: Furgoneta Isotermo)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precio" render={({ field }) => (
                        <FormItem><FormLabel>Precio por Servicio</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
