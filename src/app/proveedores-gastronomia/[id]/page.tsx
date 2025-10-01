

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Soup, X, Building2, Mail, Phone, Hash } from 'lucide-react';
import type { ProveedorGastronomia, DatosFiscales } from '@/types';
import { TIPO_PROVEEDOR_GASTRONOMIA } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const proveedorGastronomiaSchema = z.object({
  id: z.string(),
  datosFiscalesId: z.string().min(1, "Debes seleccionar un proveedor fiscal."),
  nombreProveedor: z.string(), // This will be handled by the selection
  tipo: z.enum(TIPO_PROVEEDOR_GASTRONOMIA, {
    errorMap: () => ({ message: "Debes seleccionar un tipo" }),
  }),
});

type ProveedorGastronomiaFormValues = z.infer<typeof proveedorGastronomiaSchema>;

const defaultValues: Partial<ProveedorGastronomiaFormValues> = {
    datosFiscalesId: '',
    nombreProveedor: '',
    tipo: 'Gastronomia',
};

export default function ProveedorGastroFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  
  const [datosFiscales, setDatosFiscales] = useState<DatosFiscales[]>([]);

  const form = useForm<ProveedorGastronomiaFormValues>({
    resolver: zodResolver(proveedorGastronomiaSchema),
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
      const items = JSON.parse(localStorage.getItem('proveedoresGastronomia') || '[]') as ProveedorGastronomia[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el proveedor.' });
        router.push('/proveedores-gastronomia');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ProveedorGastronomiaFormValues) {
    setIsLoading(true);
    
    const fiscalData = datosFiscales.find(df => df.id === data.datosFiscalesId);
    if (!fiscalData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un proveedor válido de la lista.' });
        setIsLoading(false);
        return;
    }

    let allItems = JSON.parse(localStorage.getItem('proveedoresGastronomia') || '[]') as ProveedorGastronomia[];
    let message = '';

    const finalData = {
        ...data,
        nombreProveedor: fiscalData.nombreComercial || fiscalData.nombreEmpresa,
    };
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = finalData;
        message = 'Proveedor actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.datosFiscalesId === data.datosFiscalesId);
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Este proveedor ya ha sido añadido.' });
            setIsLoading(false);
            return;
        }
      allItems.push(finalData);
      message = 'Proveedor creado correctamente.';
    }

    localStorage.setItem('proveedoresGastronomia', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/proveedores-gastronomia');
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
                <Soup className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Proveedor de Gastronomía</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/proveedores-gastronomia')}>
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
          <form id="proveedor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Proveedor</CardTitle>
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
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  {TIPO_PROVEEDOR_GASTRONOMIA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                          </Select>
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
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
