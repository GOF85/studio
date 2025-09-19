
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, PlusCircle, GripVertical, ClipboardCheck } from 'lucide-react';
import type { ServiceOrder, PruebaMenuData, PruebaMenuItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/dnd/sortable-item';
import { cn } from '@/lib/utils';

const pruebaMenuItemSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'item']),
  mainCategory: z.enum(['BODEGA', 'GASTRONOMÍA']),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  observaciones: z.string().optional().default(''),
});

const formSchema = z.object({
  items: z.array(pruebaMenuItemSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [] },
  });

  const { control, handleSubmit, formState } = form;
  const { fields, append, remove, move } = useFieldArray({
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

    const allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const currentMenuTest = allMenuTests.find(mt => mt.osId === osId);
    if (currentMenuTest) {
      form.reset({ items: currentMenuTest.items });
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

    const newMenuData: PruebaMenuData = { osId, items: data.items };

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
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
    }
  }

  const renderSection = (mainCategory: 'BODEGA' | 'GASTRONOMÍA') => {
    const sectionItems = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.mainCategory === mainCategory);

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{mainCategory.charAt(0) + mainCategory.slice(1).toLowerCase()}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="outline" onClick={() => addRow(mainCategory, 'header')}>+ Subcategoría</Button>
            <Button size="sm" type="button" onClick={() => addRow(mainCategory, 'item')}>+ Referencia</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Referencias</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {sectionItems.length > 0 ? sectionItems.map(({ field, index }) => (
                      <SortableItem key={field.id} id={field.id}>
                        {(listeners, attributes, dragHandleProps) => (
                          <>
                            <TableCell className="py-1" {...dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </TableCell>
                            <TableCell className={cn("py-1 font-medium", field.type === 'header' && "bg-muted/50 font-bold")}>
                              <FormField
                                control={control}
                                name={`items.${index}.referencia`}
                                render={({ field: formField }) => (
                                  <FormItem>
                                    <FormControl><Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" /></FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className={cn("py-1", field.type === 'header' && "bg-muted/50")}>
                              <FormField
                                control={control}
                                name={`items.${index}.observaciones`}
                                render={({ field: formField }) => (
                                  <FormItem>
                                    <FormControl><Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" /></FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className={cn("py-1", field.type === 'header' && "bg-muted/50")}>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </SortableItem>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Añade una referencia o subcategoría para empezar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </SortableContext>
              </DndContext>
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
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
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
              <Button type="submit" disabled={!formState.isDirty}>
                <Save className="mr-2" />
                Guardar Cambios
              </Button>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Datos del Servicio</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                <div><strong>Nº Servicio:</strong> {serviceOrder.serviceNumber}</div>
                <div><strong>Cliente:</strong> {serviceOrder.client}</div>
                <div><strong>Cliente Final:</strong> {serviceOrder.finalClient || '-'}</div>
                <div><strong>Comercial:</strong> {serviceOrder.comercial || '-'}</div>
                <div><strong>Metre:</strong> {serviceOrder.respMetre || '-'}</div>
                <div><strong>Nº PAX:</strong> {serviceOrder.pax}</div>
              </CardContent>
            </Card>
            
            <div className="space-y-8">
                {renderSection('BODEGA')}
                {renderSection('GASTRONOMÍA')}
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
