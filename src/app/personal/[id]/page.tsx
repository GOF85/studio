
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Users } from 'lucide-react';
import type { Personal } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const personalFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  telefono: z.string().optional(),
  mail: z.string().email('Debe ser un email válido').or(z.literal('')),
  dni: z.string().optional(),
  precioHora: z.coerce.number().min(0, 'El precio debe ser positivo').optional(),
});

type PersonalFormValues = z.infer<typeof personalFormSchema>;

const defaultValues: Partial<PersonalFormValues> = {
    nombre: '',
    departamento: '',
    categoria: '',
    telefono: '',
    mail: '',
    dni: '',
    precioHora: 0,
};

export default function PersonalFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const personal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
      const person = personal.find(p => p.id === id);
      if (person) {
        form.reset(person);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el empleado.' });
        router.push('/personal');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    let allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    let message = '';
    
    const finalData = {
        ...data,
        precioHora: data.precioHora || 0,
        dni: data.dni || '',
    };

    if (isEditing) {
      const index = allPersonal.findIndex(p => p.id === id);
      if (index !== -1) {
        allPersonal[index] = finalData as Personal;
        message = 'Empleado actualizado correctamente.';
      }
    } else {
       const existing = allPersonal.find(p => p.nombre.toLowerCase() === data.nombre.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un empleado con este nombre.' });
            setIsLoading(false);
            return;
        }
      allPersonal.push(finalData as Personal);
      message = 'Empleado creado correctamente.';
    }

    localStorage.setItem('personal', JSON.stringify(allPersonal));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/personal');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Empleado</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/personal')}>Volver al listado</Button>
            <Button type="submit" form="personal-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Empleado'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Empleado</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="departamento" render={({ field }) => (
                    <FormItem><FormLabel>Departamento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="mail" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="dni" render={({ field }) => (
                    <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="precioHora" render={({ field }) => (
                    <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
