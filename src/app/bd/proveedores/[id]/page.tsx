
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, Building2, Trash2 } from 'lucide-react';
import type { Proveedor, PortalUserRole } from '@/types';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';
import { proveedorSchema, type ProveedorFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';

const defaultFormValues: ProveedorFormValues = {
    id: '',
    cif: '',
    IdERP: '',
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

export default function EditarProveedorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: defaultFormValues,
  });
  
  useEffect(() => {
    const allItems = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    const item = allItems.find(p => p.id === id);
    if (item) {
        // Merge the loaded item with defaults to ensure all fields are controlled
        form.reset({
            ...defaultFormValues,
            ...item,
        });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el proveedor.' });
      router.push('/bd/proveedores');
    }
  }, [id, form, router, toast]);

  function onSubmit(data: ProveedorFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
      // Reconstruct the full object before saving
      const fullItem: Proveedor = {
          ...allItems[index], // Keep old fields
          ...data, // Overwrite with new form data
      };
      allItems[index] = fullItem;
      localStorage.setItem('proveedores', JSON.stringify(allItems));
      toast({ description: 'Proveedor actualizado correctamente.' });
    }
    
    router.push('/bd/proveedores');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('proveedores', JSON.stringify(updatedItems));
    toast({ title: 'Proveedor eliminado' });
    router.push('/bd/proveedores');
  };

  const tiposOptions = TIPO_PROVEEDOR_OPCIONES.map(t => ({ label: t, value: t }));

  return (
    <>
      <main>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Proveedor</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/proveedores')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>
            
             <Card>
            <CardHeader><CardTitle className="text-lg">Información Fiscal y de Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="nombreEmpresa" render={({ field }) => (
                  <FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nombreComercial" render={({ field }) => (
                  <FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cif" render={({ field }) => (
                  <FormItem><FormLabel>CIF/NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="direccionFacturacion" render={({ field }) => (
                <FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="codigoPostal" render={({ field }) => (
                  <FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="emailContacto" render={({ field }) => (
                  <FormItem><FormLabel>Email Contacto</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="telefonoContacto" render={({ field }) => (
                  <FormItem><FormLabel>Teléfono Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="text-lg">Información de Servicio y Facturación</CardTitle>
                <CardDescription>Selecciona los tipos de servicio que ofrece este proveedor para que aparezca en los módulos correspondientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <FormField control={form.control} name="tipos" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipos de Servicio</FormLabel>
                        <MultiSelect 
                            options={tiposOptions}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Seleccionar tipos..."
                        />
                        <FormMessage />
                    </FormItem>
                 )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="IdERP" render={({ field }) => (
                        <FormItem><FormLabel>ID en ERP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="iban" render={({ field }) => (
                        <FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="formaDePagoHabitual" render={({ field }) => (
                        <FormItem><FormLabel>Forma de Pago Habitual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </CardContent>
          </Card>
          </form>
        </Form>
      </main>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el registro del proveedor.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
