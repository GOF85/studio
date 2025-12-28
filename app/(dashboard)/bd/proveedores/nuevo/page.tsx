
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Building2 } from 'lucide-react';
import type { Proveedor } from '@/types';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUpsertProveedor } from '@/hooks/use-data-queries';
import { MultiSelect } from '@/components/ui/multi-select';

export const proveedorSchema = z.object({
  id: z.string(),
  cif: z.string().min(1, "El CIF es obligatorio."),
  IdERP: z.string().optional(),
  nombreFiscal: z.string().optional(),
  nombreComercial: z.string().min(1, "El nombre comercial es obligatorio."),
  direccionFacturacion: z.string().min(1, "La dirección es obligatoria."),
  codigoPostal: z.string().min(1, "El código postal es obligatorio."),
  ciudad: z.string().min(1, "La ciudad es obligatoria."),
  provincia: z.string().min(1, "La provincia es obligatoria."),
  pais: z.string().min(1, "El país es obligatorio."),
  emailContacto: z.string().email("Debe ser un email válido."),
  telefonoContacto: z.string(),
  contacto: z.string().optional(),
  iban: z.string().optional(),
  formaDePagoHabitual: z.string().optional(),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;

export default function NuevoProveedorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const upsertProveedor = useUpsertProveedor();

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      id: Date.now().toString(),
      pais: 'España',
      cif: '',
      IdERP: '',
      nombreFiscal: '',
      nombreComercial: '',
      direccionFacturacion: '',
      codigoPostal: '',
      ciudad: '',
      provincia: '',
      emailContacto: '',
      telefonoContacto: '',
      contacto: '',
      iban: '',
      formaDePagoHabitual: '',
    },
  });

  async function onSubmit(data: ProveedorFormValues) {
    try {
      await upsertProveedor.mutateAsync(data);
      toast({ description: 'Nuevo proveedor añadido correctamente.' });
      router.push('/bd/proveedores');
    } catch (error: any) {
      console.error('Error creating provider:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al guardar el proveedor: ' + error.message });
    }
  }

  const tiposOptions = TIPO_PROVEEDOR_OPCIONES.map(t => ({ label: t, value: t }));

  return (
    <main>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nuevo Proveedor</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/proveedores')}> <X className="mr-2" /> Cancelar</Button>
              <Button type="submit" disabled={upsertProveedor.isPending}>
                {upsertProveedor.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar Proveedor</span>
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
  );
}
