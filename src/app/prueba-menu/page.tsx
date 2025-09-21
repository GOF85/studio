'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, PlusCircle, ClipboardCheck, Printer, Loader2, UtensilsCrossed } from 'lucide-react';
import type { ServiceOrder, PruebaMenuData, PruebaMenuItem, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Separator } from '@/components/ui/separator';

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
  costePruebaMenu: z.coerce.number().optional().default(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [asistentesPrueba, setAsistentesPrueba] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], observacionesGenerales: '', costePruebaMenu: 0 },
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
        const pruebaMenuHito = currentBriefing.items.find(item => item.descripcion.toLowerCase() === 'prueba de menu');
        setAsistentesPrueba(pruebaMenuHito?.asistentes || 0);
    }

    const allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const currentMenuTest = allMenuTests.find(mt => mt.osId === osId);
    if (currentMenuTest) {
      form.reset({ 
        items: currentMenuTest.items,
        observacionesGenerales: currentMenuTest.observacionesGenerales || '',
        costePruebaMenu: currentMenuTest.costePruebaMenu || 0,
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

    const newMenuData: PruebaMenuData = { 
        osId, 
        items: data.items, 
        observacionesGenerales: data.observacionesGenerales,
        costePruebaMenu: data.costePruebaMenu
    };

    if (index > -1) {
      allMenuTests[index] = newMenuData;
    } else {
      allMenuTests.push(newMenuData);
    }

    localStorage.setItem('pruebasMenu', JSON.stringify(allMenuTests));
    toast({ title: 'Guardado', description: 'La prueba de menú ha sido guardada.' });
    form.reset(data); // Mark as not dirty
  };
  
const handlePrint = async () => {
    if (!serviceOrder) return;
    setIsPrinting(true);

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;

        // --- DIBUJAR CABECERA ---
        const iconBase64 = 'data:image/png;base64,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8D/wP/A/8D/wP/B/4H/gf+D/wP/A/8D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/4H/gf+B/wP/B/4P/B/wP/B/4H/gf+B/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/B/wP/A/8D/wP/B/wP/A/8D/wP/A/8D/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4P/B/wP/A/8D/wP/B/wP/A/8D/wf+D/wP/B/4P/B/4P/B/4H/gf+D/wP/A/8D/wP/A/8H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4P/B/4H/gf+D/wP/A/8D/wP/A/8H/gf+D/wf+D/wf+D/wf+D/wf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8H/gf+D/wP/B/wP/A/8D/wf+D/wf+F/wP/A/8H/gf+D/wP/A/8H/gf+D/wf+D/wf+D/wP/A/8D/wP/A/8D/wP/A/8H/gf+D/wP/B/wP/A/8D/wf+D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/A/8D/wP/A/8H/gf+D/wf+D/wP/B/wP/B/wP/A/8D/wf+D/wP/A/8D/wP/A/8H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/A/8D/wP/A/8H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/A/8D/wP/A/8H/gf+D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A/8D/wP/A/8D/wf+F/wf+D/wP/A/8H/gf+B/wP/B/wP/A/8D/wP/B/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wP/A/8H/gf+D/wP/B/wP/A/8H/gf+B/wP/B/wP/A/8D/wf+F/wP/A/8D/wP/B/4H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A/8H/gf+D/wP/A/8D/wf+F/wP/A/8H/gf+D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A/8H/gf+D/wP/A/8D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/A/8H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/A/8D/wP/A/8H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/A/8D/wP/A/8H/gf+D/wf+D/wP/B/4H/gf+D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A/8D/wP/A/8D/wf+F/wf+D/wP/A/8H/gf+B/wP/B/wP/A/8D/wP/B/wP/A/8D/wP/A/8D/wf+D/wf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wP/A/8D/wP/A/8H/gf+D/wP/B/wP/A/8H/gf+B/wP/B/wP/A/8D/wf+F/wP/A/8D/wP/B/4H/gf+D/wP/B/4H/gf+B/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A/8H/gf+D/wP/A/8D/wf+F/wP/A/8H/gf+D/wP/A/8D/wP/A/8D/wP/B/4H/gf+D/wP/B/wP/A//i8Z8BvBhSgZ4AAAAASUVORK5CYII=';
        doc.addImage(iconBase64, 'PNG', pageWidth - margin - 15, margin - 5, 15, 15);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#059669'); // Primary color
        doc.text('Prueba de Menú', margin, finalY);
        finalY += 10;
        doc.setLineWidth(0.5);
        doc.setDrawColor('#e5e7eb'); // Border color
        doc.line(margin, finalY, pageWidth - margin, finalY);
        finalY += 8;

        // --- DATOS SERVICIO Y EVENTO ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#374151'); // Gris oscuro
        
        const serviceData = [
            ['Nº Servicio:', serviceOrder.serviceNumber],
            ['Comercial:', serviceOrder.comercial || '-'],
            ['Cliente:', serviceOrder.client],
            ['Cliente Final:', serviceOrder.finalClient || '-']
        ];
        const eventData = [
            ['Fecha Evento:', format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')],
            ['Asistentes:', String(serviceOrder.asistentes)],
            ['Servicios:', briefingItems.map(i => i.descripcion).join(', ') || '-']
        ];

        autoTable(doc, {
            body: serviceData,
            startY: finalY,
            theme: 'plain',
            tableWidth: (pageWidth - margin * 2) / 2 - 5,
            styles: { fontSize: 9, cellPadding: 0.5 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        autoTable(doc, {
            body: eventData,
            startY: finalY,
            theme: 'plain',
            tableWidth: (pageWidth - margin * 2) / 2 - 5,
            margin: { left: pageWidth / 2 + 5 },
            styles: { fontSize: 9, cellPadding: 0.5 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setLineWidth(0.2);
        doc.setDrawColor('#cbd5e1');
        doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5);


        // --- TABLAS DE BODEGA Y GASTRONOMÍA ---
        const addSection = (category: 'BODEGA' | 'GASTRONOMÍA') => {
            const sectionItems = form.getValues('items').filter(item => item.mainCategory === category);
            if(sectionItems.length === 0) return;

            if (finalY + 30 > pageHeight) { // Check if new section fits
                doc.addPage();
                finalY = margin;
            }
            
            doc.line(margin, finalY, pageWidth - margin, finalY);
            finalY += 5;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#059669');
            doc.text(category.charAt(0) + category.slice(1).toLowerCase(), margin, finalY);
            finalY += 8;

            const body = sectionItems.map(item => {
                if(item.type === 'header') {
                    return [{ content: item.referencia, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }];
                }
                return [item.referencia, ''];
            });

            autoTable(doc, {
                head: [['Referencias', 'Observaciones']],
                body,
                startY: finalY,
                theme: 'grid',
                columnStyles: {
                    0: { cellWidth: '*' },
                    1: { cellWidth: '*' },
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle',
                    minCellHeight: 20,
                },
                headStyles: {
                    fillColor: '#e5e7eb',
                    textColor: '#374151',
                    fontStyle: 'bold'
                },
            });
            finalY = (doc as any).lastAutoTable.finalY + 15;
        }

        addSection('BODEGA');
        addSection('GASTRONOMÍA');

        // --- OBSERVACIONES GENERALES ---
        const obsGenerales = form.getValues('observacionesGenerales');
        if (obsGenerales) {
            if (finalY + 30 > pageHeight) {
                doc.addPage();
                finalY = margin;
            }
             doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#059669');
            doc.text('Observaciones Generales', margin, finalY);
            finalY += 8;
            doc.setDrawColor('#e5e7eb');
            doc.rect(margin, finalY, pageWidth - margin * 2, 40);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#374151');
            doc.text(obsGenerales, margin + 2, finalY + 5, { maxWidth: pageWidth - margin * 2 - 4 });
        }


        doc.save(`PruebaMenu_${serviceOrder.serviceNumber}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
    } finally {
        setIsPrinting(false);
    }
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
        <CardHeader className="flex-row items-center justify-between py-4 no-print">
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
                  <TableHead className="w-12 p-2 no-print"></TableHead>
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
                        <TableCell className={cn("py-1 px-2 no-print", field.type === 'header' && "bg-muted/50")}>
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
        <Form {...form}>
             <div className="flex items-start justify-between mb-4">
                <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="no-print">
                    <ArrowLeft className="mr-2" />
                    Volver a la OS
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <ClipboardCheck />
                    Prueba de Menú
                </h1>
                </div>
                <div className="flex gap-2 no-print">
                    <Button variant="outline" type="button" onClick={handlePrint} disabled={isPrinting}>
                    {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />}
                    {isPrinting ? 'Generando...' : 'Imprimir / PDF'}
                    </Button>
                <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!formState.isDirty}>
                    <Save className="mr-2" />
                    Guardar Cambios
                </Button>
                </div>
            </div>
            
            <Card className="mb-4">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <h4 className="font-bold col-span-full mb-1">Datos del Servicio</h4>
                        <div><strong>Nº Servicio:</strong> {serviceOrder.serviceNumber}</div>
                        <div><strong>Comercial:</strong> {serviceOrder.comercial || '-'}</div>
                        <div><strong>Cliente:</strong> {serviceOrder.client}</div>
                        <div><strong>Cliente Final:</strong> {serviceOrder.finalClient || '-'}</div>
                    </div>
                    <Separator className="my-2 md:hidden" />
                    <div>
                        <h4 className="font-bold col-span-full mb-1">Datos del Evento</h4>
                        <div><strong>Fecha:</strong> {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</div>
                        <div><strong>Asistentes:</strong> {serviceOrder.asistentes}</div>
                        <div className="col-span-2"><strong>Servicios:</strong> {briefingItems.map(i => i.descripcion).join(', ') || '-'}</div>
                    </div>
                </CardContent>
            </Card>
            <Separator className="my-6" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="no-print flex items-center gap-6 p-4 border rounded-lg bg-background">
                     <div className="flex items-center gap-2">
                        <FormLabel className="font-semibold text-base whitespace-nowrap">Asistentes a la prueba</FormLabel>
                        <Input value={asistentesPrueba} readOnly className="h-10 w-20 text-center font-bold text-lg"/>
                    </div>
                     <div className="flex items-center gap-2">
                        <FormLabel className="font-semibold text-base flex items-center gap-2 whitespace-nowrap">Coste de la prueba de menú</FormLabel>
                        <FormField
                            control={control}
                            name="costePruebaMenu"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            {...field} 
                                            className="h-10 w-32 font-bold text-lg border-2 border-primary/50 focus-visible:ring-primary"
                                        />
                                    </FormControl>
                                    <span className="text-lg font-bold">€</span>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    {renderSection('BODEGA')}
                    {renderSection('GASTRONOMÍA')}

                    <Card>
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
                </div>
            </form>
        </Form>
      </main>
    </>
  );
}
