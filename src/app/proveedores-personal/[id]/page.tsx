

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, UserPlus, X, Building2, Mail, Phone, Hash } from 'lucide-react';
import type { ProveedorPersonal, DatosFiscales } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const proveedorPersonalFormSchema = z.object({
  id: z.string(),
  datosFiscalesId: z.string().min(1, "Debes seleccionar un proveedor fiscal."),
  nombreProveedor: z.string(), // This will be handled by the selection
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio debe ser positivo'),
});

type ProveedorPersonalFormValues = z.infer<typeof proveedorPersonalFormSchema>;

const defaultValues: Partial<ProveedorPersonalFormValues> = {
    datosFiscalesId: '',
    nombreProveedor: '',
    categoria: '',
    precioHora: 0,
};

export default function ProveedorPersonalFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [datosFiscales, setDatosFiscales] = useState<DatosFiscales[]>([]);

  const form = useForm<ProveedorPersonalFormValues>({
    resolver: zodResolver(proveedorPersonalFormSchema),
    defaultValues,
  });

  const selectedFiscalId = form.watch('datosFiscalesId');
  const selectedFiscalData = useMemo(() => {
    return datosFiscales.find(df => df.id === selectedFiscalId);
  }, [selectedFiscalId, datosFiscales]);

  useEffect(() => {
    const fiscalData = JSON.parse(localStorage.getItem('datosFiscales') || '[]') as DatosFiscales[];
    setDatosFiscales(fiscalData.filter(df => df.tipo === 'Proveedor'));
    
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]') as ProveedorPersonal[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el registro.' });
        router.push('/proveedores-personal');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ProveedorPersonalFormValues) {
    setIsLoading(true);
    
    const fiscalData = datosFiscales.find(df => df.id === data.datosFiscalesId);
    if (!fiscalData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un proveedor válido de la lista.' });
        setIsLoading(false);
        return;
    }

    let allItems = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]') as ProveedorPersonal[];
    let message = '';

    const finalData = {
        ...data,
        nombreProveedor: fiscalData.nombreComercial || fiscalData.nombreEmpresa,
    };
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = finalData;
        message = 'Registro actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.datosFiscalesId === data.datosFiscalesId && p.categoria.toLowerCase() === data.categoria.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe esta categoría para este proveedor.' });
            setIsLoading(false);
            return;
        }
      allItems.push(finalData);
      message = 'Registro creado correctamente.';
    }

    localStorage.setItem('proveedoresPersonal', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/proveedores-personal');
    }, 1000);
  }

  const fiscalOptions = useMemo(() => 
    datosFiscales.map(df => ({
        value: df.id,
        label: df.nombreComercial || df.nombreEmpresa
    })), [datosFiscales]);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Registro de Proveedor de Personal</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/proveedores-personal')}>
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
                <CardTitle>Detalles del Proveedor y Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="datosFiscalesId" render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                          <FormLabel>Nombre del Proveedor</FormLabel>
                          <Combobox 
                            options={fiscalOptions}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Selecciona un proveedor fiscal..."
                          />
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
                 {selectedFiscalData && (
                    <Accordion type="single" collapsible>
                        <AccordionItem value="fiscal-data">
                            <AccordionTrigger>Ver Información Fiscal</AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 border rounded-md bg-muted/50 text-sm space-y-2">
                                    <p className="flex items-center gap-2"><Hash /> <strong>CIF/NIF:</strong> {selectedFiscalData.cif}</p>
                                    <p className="flex items-center gap-2"><Building2 /> <strong>Dirección:</strong> {selectedFiscalData.direccionFacturacion}, {selectedFiscalData.codigoPostal} {selectedFiscalData.ciudad}</p>
                                    <p className="flex items-center gap-2"><Mail /> <strong>Email:</strong> {selectedFiscalData.emailContacto}</p>
                                    <p className="flex items-center gap-2"><Phone /> <strong>Teléfono:</strong> {selectedFiscalData.telefonoContacto}</p>
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
