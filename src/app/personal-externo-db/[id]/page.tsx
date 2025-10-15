
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, UserPlus, X, Building2 } from 'lucide-react';
import type { PersonalExternoDB, Proveedor } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const personalExternoDBSchema = z.object({
  id: z.string().min(1, 'El DNI es obligatorio.'),
  proveedorId: z.string().min(1, "Debes seleccionar un proveedor."),
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio.'),
  apellido2: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  email: z.string().email("Debe ser un email válido").or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof personalExternoDBSchema>;

const defaultValues: Partial<FormValues> = {
  nombre: '',
  apellido1: '',
  apellido2: '',
  proveedorId: '',
  id: '',
  telefono: '',
  email: '',
};

export default function PersonalExternoDBFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(personalExternoDBSchema),
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
      const items = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el trabajador.' });
        router.push('/personal-externo-db');
      }
    } else {
      form.reset({ ...defaultValues });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: FormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
    let message = '';
    
    const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2}`.trim();
    const nombreCompacto = `${data.nombre}.${data.apellido1.charAt(0).toUpperCase()}`;

    const finalData: PersonalExternoDB = {
        ...data,
        nombreCompleto,
        nombreCompacto,
    };

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = finalData;
        message = 'Trabajador actualizado correctamente.';
      }
    } else {
      const existing = allItems.find(p => p.id.toLowerCase() === data.id.toLowerCase());
      if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un trabajador con este DNI.' });
        setIsLoading(false);
        return;
      }
      allItems.push(finalData);
      message = 'Trabajador creado correctamente.';
    }

    localStorage.setItem('personalExternoDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/personal-externo-db');
    }, 1000);
  }
  
  const providerOptions = useMemo(() => 
    proveedores.map(p => ({
        value: p.id,
        label: p.nombreComercial
    })), [proveedores]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <UserPlus className="h-8 w-8" />
          <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Trabajador Externo</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => router.push('/personal-externo-db')}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" form="personal-externo-db-form" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
            <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Trabajador'}</span>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="personal-externo-db-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Trabajador</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField control={form.control} name="id" render={({ field }) => (
                <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="proveedorId" render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Proveedor (ETT)</FormLabel>
                  <Combobox 
                    options={providerOptions}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Selecciona un proveedor..."
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="apellido1" render={({ field }) => (
                <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="apellido2" render={({ field }) => (
                <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}
