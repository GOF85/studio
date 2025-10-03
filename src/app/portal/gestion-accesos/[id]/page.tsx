
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, UserCog, X, Building2, Mail, Phone, Hash } from 'lucide-react';
import type { PortalUser, Proveedor, PortalUserRole } from '@/types';
import { PORTAL_ROLES } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';


export const portalUserSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre es obligatorio."),
  email: z.string().email("Debe ser un email válido."),
  roles: z.array(z.string()).min(1, "Debe seleccionar al menos un rol."),
  proveedorId: z.string().optional(),
});

type PortalUserFormValues = z.infer<typeof portalUserSchema>;

const defaultValues: Partial<PortalUserFormValues> = {
  nombre: '',
  email: '',
  roles: [],
};

export default function PortalUserFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const form = useForm<PortalUserFormValues>({
    resolver: zodResolver(portalUserSchema),
    defaultValues,
  });

  const selectedProviderId = form.watch('proveedorId');
  const selectedFiscalData = useMemo(() => {
    // This logic needs to be adapted as we don't have fiscal data directly on the provider anymore
    // For now, we can just show the provider name.
    return proveedores.find(df => df.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  useEffect(() => {
    const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedores(allProveedores);

    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('portalUsers') || '[]') as PortalUser[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el usuario.' });
        router.push('/portal/gestion-accesos');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: PortalUserFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('portalUsers') || '[]') as PortalUser[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data as PortalUser;
        message = 'Usuario actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.email.toLowerCase() === data.email.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un usuario con este email.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data as PortalUser);
      message = 'Usuario creado correctamente.';
    }

    localStorage.setItem('portalUsers', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/portal/gestion-accesos');
    }, 1000);
  }
  
  const proveedorOptions = useMemo(() => 
    proveedores.map(p => ({
        value: p.id,
        label: p.nombreComercial
    })), [proveedores]);
    
  const rolesOptions = PORTAL_ROLES.map(r => ({ label: r, value: r }));

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Usuario de Portal</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/portal/gestion-accesos')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="user-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Crear y Autorizar'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Datos de Acceso</CardTitle>
                <CardDescription>Introduce la información del usuario y asígnale uno o más roles y un proveedor si es necesario.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email (será su login)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div></div>
                <FormField control={form.control} name="roles" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Rol(es) / Portal(es) de Acceso</FormLabel>
                        <MultiSelect
                            options={rolesOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Seleccionar rol(es)..."
                            />
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="proveedorId" render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                        <FormLabel>Proveedor Asociado</FormLabel>
                        <Combobox 
                            options={proveedorOptions}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Selecciona un proveedor..."
                        />
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
