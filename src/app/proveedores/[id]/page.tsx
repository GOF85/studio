

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Users, X } from 'lucide-react';
import type { Proveedor, TipoProveedor } from '@/types';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';

export const proveedorSchema = z.object({
  id: z.string(),
  cif: z.string().min(1, 'El CIF/NIF es obligatorio'),
  nombreEmpresa: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  nombreComercial: z.string().optional(),
  direccionFacturacion: z.string().min(1, 'La dirección es obligatoria'),
  codigoPostal: z.string().min(1, 'El código postal es obligatorio'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  emailContacto: z.string().email('Debe ser un email válido').or(z.literal('')),
  telefonoContacto: z.string().optional(),
  iban: z.string().optional(),
  formaDePagoHabitual: z.string().optional(),
  tipos: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo de proveedor."),
});

type ProveedorFormValues = z.infer<typeof proveedorSchema>;

const defaultValues: Partial<ProveedorFormValues> = {
  cif: '',
  nombreEmpresa: '',
  nombreComercial: '',
  direccionFacturacion: '',
  codigoPostal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  emailContacto: '',
  telefonoContacto: '',
  iban: '',
  formaDePagoHabitual: '',
  tipos: [],
};

export default function ProveedorFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el proveedor.' });
        router.push('/proveedores');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ProveedorFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    let message = '';
    
    const finalData = { ...data, nombreComercial: data.nombreComercial || data.nombreEmpresa };

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = finalData;
        message = 'Proveedor actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.cif.toLowerCase() === data.cif.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un proveedor con este CIF/NIF.' });
            setIsLoading(false);
            return;
        }
      allItems.push(finalData);
      message = 'Proveedor creado correctamente.';
    }

    localStorage.setItem('proveedores', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/proveedores');
    }, 1000);
  }
    
  const tipoOptions = TIPO_PROVEEDOR_OPCIONES.map(t => ({ label: t, value: t }));

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Proveedor</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/proveedores')}>
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
          <form id="proveedor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Proveedor</CardTitle>
                <CardDescription>Introduce la información de contacto, fiscal y el tipo de servicios que ofrece.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <FormField control={form.control} name="tipos" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Tipo(s) de Proveedor</FormLabel>
                          <MultiSelect 
                            options={tipoOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Seleccionar tipo(s)..."
                            />
                          <FormMessage />
                      </FormItem>
                  )} />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombreComercial" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Nombre Comercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="cif" render={({ field }) => (
                    <FormItem><FormLabel>CIF / NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="nombreEmpresa" render={({ field }) => (
                    <FormItem className="lg:col-span-3"><FormLabel>Nombre o Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="direccionFacturacion" render={({ field }) => (
                    <FormItem className="lg:col-span-3"><FormLabel>Dirección de Facturación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="codigoPostal" render={({ field }) => (
                    <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="ciudad" render={({ field }) => (
                    <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="provincia" render={({ field }) => (
                    <FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pais" render={({ field }) => (
                    <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="emailContacto" render={({ field }) => (
                    <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefonoContacto" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Información Bancaria y de Pago</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="iban" render={({ field }) => (
                        <FormItem className="lg:col-span-2"><FormLabel>IBAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="formaDePagoHabitual" render={({ field }) => (
                        <FormItem><FormLabel>Forma de Pago Habitual</FormLabel><FormControl><Input {...field} placeholder="Ej: Transferencia 30 días" /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
