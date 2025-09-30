
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Landmark, X } from 'lucide-react';
import type { DatosFiscales } from '@/types';
import { TIPO_ENTIDAD_FISCAL } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const datosFiscalesSchema = z.object({
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
  tipo: z.enum(TIPO_ENTIDAD_FISCAL, {
    errorMap: () => ({ message: "Debes seleccionar un tipo" }),
  }),
});

type DatosFiscalesFormValues = z.infer<typeof datosFiscalesSchema>;

const defaultValues: Partial<DatosFiscalesFormValues> = {
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
  tipo: 'Cliente',
};

export default function DatosFiscalesFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<DatosFiscalesFormValues>({
    resolver: zodResolver(datosFiscalesSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('datosFiscales') || '[]') as DatosFiscales[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontraron los datos fiscales.' });
        router.push('/datos-fiscales');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: DatosFiscalesFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('datosFiscales') || '[]') as DatosFiscales[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Datos fiscales actualizados correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.cif.toLowerCase() === data.cif.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe una entidad con este CIF/NIF.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Nueva entidad fiscal creada correctamente.';
    }

    localStorage.setItem('datosFiscales', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/datos-fiscales');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevos'} Datos Fiscales</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/datos-fiscales')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="datos-fiscales-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Datos'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="datos-fiscales-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Entidad</CardTitle>
                <CardDescription>Rellena los datos identificativos y de contacto de la empresa o cliente.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <FormField control={form.control} name="nombreEmpresa" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Nombre o Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="cif" render={({ field }) => (
                    <FormItem><FormLabel>CIF / NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="nombreComercial" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Nombre Comercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Entidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {TIPO_ENTIDAD_FISCAL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
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
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Información Bancaria y de Pago</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
