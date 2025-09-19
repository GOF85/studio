'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, PlusCircle, ClipboardCheck, Printer } from 'lucide-react';
import type { ServiceOrder, PruebaMenuData, PruebaMenuItem, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import Link from 'next/link';


const pruebaMenuItemSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'item']),
  mainCategory: z.enum(['BODEGA', 'GASTRONOMÍA']),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  observaciones: z.string().optional().default(''),
});

const formSchema = z.object({
  items: z.array(pruebaMenuItemSchema),
  observacionesGenerales: z.string().optional().default(''),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], observacionesGenerales: '' },
  });

  const { control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const loadData = useCallback(() => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
      return;
    }

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    if (currentBriefing) {
        setBriefingItems(currentBriefing.items);
    }

    const allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const currentMenuTest = allMenuTests.find(mt => mt.osId === osId);
    if (currentMenuTest) {
      form.reset({ 
        items: currentMenuTest.items,
        observacionesGenerales: currentMenuTest.observacionesGenerales || '',
       });
    }

    setIsMounted(true);
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onSubmit = (data: FormValues) => {
    if (!osId) return;

    let allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const index = allMenuTests.findIndex(mt => mt.osId === osId);

    const newMenuData: PruebaMenuData = { osId, items: data.items, observacionesGenerales: data.observacionesGenerales };

    if (index > -1) {
      allMenuTests[index] = newMenuData;
    } else {
      allMenuTests.push(newMenuData);
    }

    localStorage.setItem('pruebasMenu', JSON.stringify(allMenuTests));
    toast({ title: 'Guardado', description: 'La prueba de menú ha sido guardada.' });
    form.reset(data); // Mark as not dirty
  };
  
  const addRow = (mainCategory: 'BODEGA' | 'GASTRONOMÍA', type: 'header' | 'item') => {
    append({
      id: Date.now().toString(),
      type,
      mainCategory,
      referencia: '',
      observaciones: '',
    });
  };

  const renderSection = (mainCategory: 'BODEGA' | 'GASTRONOMÍA') => {
    const sectionItems = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.mainCategory === mainCategory);

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <CardTitle>{mainCategory.charAt(0) + mainCategory.slice(1).toLowerCase()}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="outline" onClick={() => addRow(mainCategory, 'header')}>+ Subcategoría</Button>
            <Button size="sm" type="button" onClick={() => addRow(mainCategory, 'item')}>+ Referencia</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 border-r">Referencias</TableHead>
                  <TableHead className="p-2">Observaciones</TableHead>
                  <TableHead className="w-12 p-2"></TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                {sectionItems.length > 0 ? sectionItems.map(({ field, index }) => (
                    <TableRow key={field.id}>
                        <TableCell className={cn("py-1 px-2 font-medium border-r", field.type === 'header' && "bg-muted/50 font-bold")}>
                            <FormField
                            control={control}
                            name={`items.${index}.referencia`}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormControl>
                                    <Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell className={cn("py-1 px-2", field.type === 'header' && "bg-muted/50")}>
                             <FormField
                            control={control}
                            name={`items.${index}.observaciones`}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormControl>
                                    <Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell className={cn("py-1 px-2", field.type === 'header' && "bg-muted/50")}>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                )) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                    Añade una referencia o subcategoría para empezar.
                    </TableCell>
                </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Prueba de Menú..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
              <ArrowLeft className="mr-2" />
              Volver a la OS
            </Button>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <ClipboardCheck />
              Prueba de Menú
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/prueba-menu/informe?osId=${osId}`}>
                  <Printer className="mr-2" />
                  Generar Informe
              </Link>
            </Button>
            <Button form="prueba-menu-form" type="submit" disabled={!formState.isDirty}>
              <Save className="mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>

        <Form {...form}>
            <form id="prueba-menu-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-0">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-base">Datos del Servicio</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-0 text-sm p-4 pt-0">
                    <div><strong>Nº Servicio:</strong> {serviceOrder.serviceNumber}</div>
                    <div><strong>Comercial:</strong> {serviceOrder.comercial || '-'}</div>
                    <div><strong>Cliente:</strong> {serviceOrder.client}</div>
                    <div><strong>Cliente Final:</strong> {serviceOrder.finalClient || '-'}</div>
                </CardContent>
                </Card>
                <Card className="p-0">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-base">Datos del Evento</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-0 text-sm p-4 pt-0">
                    <div><strong>Fecha:</strong> {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</div>
                    <div><strong>Nº PAX:</strong> {serviceOrder.pax}</div>
                    <div className="col-span-2"><strong>Servicios:</strong> {briefingItems.map(i => i.descripcion).join(', ') || '-'}</div>
                </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                {renderSection('BODEGA')}
                {renderSection('GASTRONOMÍA')}
            </div>

            <Card className="mt-6">
                <CardHeader className="py-4">
                <CardTitle>Observaciones Generales</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <FormField
                    control={control}
                    name="observacionesGenerales"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Textarea
                            placeholder="Añade aquí cualquier comentario o nota adicional sobre la prueba de menú..."
                            rows={4}
                            {...field}
                            />
                        </FormControl>
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>
            </form>
        </Form>
      </main>
    </>
  );
}
