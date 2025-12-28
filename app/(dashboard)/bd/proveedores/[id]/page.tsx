
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
import { useProveedor, useUpsertProveedor, useDeleteProveedor } from '@/hooks/use-data-queries';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

const defaultFormValues: ProveedorFormValues = {
  id: '',
  cif: '',
  IdERP: '',
  nombreFiscal: '',
  nombreComercial: '',
  direccionFacturacion: '',
  codigoPostal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  emailContacto: '',
  telefonoContacto: '',
  contacto: '',
  iban: '',
  formaDePagoHabitual: '',
};

export default function EditarProveedorPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) || '';

  const { data: proveedor, isLoading: isLoadingProveedor } = useProveedor(id);
  const upsertProveedor = useUpsertProveedor();
  const deleteProveedor = useDeleteProveedor();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (proveedor) {
      form.reset(proveedor as ProveedorFormValues);
    }
  }, [proveedor, form]);

  async function onSubmit(data: ProveedorFormValues) {
    try {
      await upsertProveedor.mutateAsync({ ...data, id });
      toast({ description: 'Proveedor actualizado correctamente.' });
      router.push('/bd/proveedores');
    } catch (error: any) {
      console.error('Error updating provider:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al actualizar: ' + error.message });
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProveedor.mutateAsync(id);
      toast({ title: 'Proveedor eliminado' });
      router.push('/bd/proveedores');
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al eliminar: ' + error.message });
    }
  };

  if (isLoadingProveedor) {
    return <LoadingSkeleton title="Cargando Proveedor..." />;
  }

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
                <Button variant="outline" type="button" onClick={() => router.push('/bd/proveedores')}> <X className="mr-2" /> Cancelar</Button>
                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
                <Button type="submit" disabled={upsertProveedor.isPending}>
                  {upsertProveedor.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Información Fiscal y de Contacto</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombreFiscal" render={({ field }) => (
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
                  <FormField control={form.control} name="contacto" render={({ field }) => (
                    <FormItem><FormLabel>Persona de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
