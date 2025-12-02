
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
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#059669'); // Primary color
        doc.text('Prueba de Menú', margin, finalY);
        finalY += 10;
        
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
        
        // --- TABLAS DE BODEGA Y GASTRONOMÍA ---
        const addSection = (category: 'BODEGA' | 'GASTRONOMÍA') => {
            const sectionItems = form.getValues('items').filter(item => item.mainCategory === category);
            if(sectionItems.length === 0) return;

             doc.setLineWidth(0.2);
            doc.setDrawColor('#cbd5e1');
            doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5);


            if (finalY + 20 > pageHeight) { // Check if new section fits
                doc.addPage();
                finalY = margin;
            }
            
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
                    0: { cellWidth: category === 'GASTRONOMÍA' ? (pageWidth - margin * 2) / 2 : 'auto' },
                    1: { cellWidth: category === 'GASTRONOMÍA' ? (pageWidth - margin * 2) / 2 : 'auto' },
                },
                didParseCell: (data) => {
                    data.cell.styles.minCellHeight = 8;
                    data.cell.styles.valign = 'middle';
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle',
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

    <Form {...form}>
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
    </>
  );
}
