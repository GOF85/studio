'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Save,
  Trash2,
  PlusCircle,
  ClipboardCheck,
  Printer,
  Loader2,
  UtensilsCrossed,
  FileText,
  Calendar,
  Users,
  Euro
} from 'lucide-react'
import type {
  ServiceOrder,
  PruebaMenuData,
  PruebaMenuItem,
  ComercialBriefing,
  ComercialBriefingItem,
} from '@/types'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { cn, formatCurrency } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Separator } from '@/components/ui/separator'
import { useEvento, usePruebaMenu, useUpdatePruebaMenu } from '@/hooks/use-data-queries'
import { useComercialBriefing } from '@/hooks/use-briefing-data'

const pruebaMenuItemSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'item']),
  mainCategory: z.enum(['BODEGA', 'GASTRONOMÍA']),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  observaciones: z.string().optional().default(''),
})

const formSchema = z.object({
  items: z.array(pruebaMenuItemSchema),
  observacionesGenerales: z.string().optional().default(''),
  costePruebaMenu: z.coerce.number().optional().default(0),
})

type FormValues = z.infer<typeof formSchema>

export default function PruebaMenuPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const [isMounted, setIsMounted] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([])
  const [asistentesPrueba, setAsistentesPrueba] = useState(0)

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: currentMenuTest, isLoading: isLoadingTest } = usePruebaMenu(osId)
  const updatePruebaMenu = useUpdatePruebaMenu()
  const { data: briefing } = useComercialBriefing(osId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], observacionesGenerales: '', costePruebaMenu: 0 },
  })

  const { control, handleSubmit, formState, reset } = form
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (briefing) {
      setBriefingItems(briefing.items)
      const pruebaMenuHito = briefing.items.find((item) =>
        item.descripcion.toLowerCase().includes('prueba de menu'),
      )
      setAsistentesPrueba(pruebaMenuHito?.asistentes || 0)
    }
  }, [briefing])

  useEffect(() => {
    if (currentMenuTest) {
      reset({
        items: currentMenuTest.items || [],
        observacionesGenerales: currentMenuTest.observaciones_generales || '',
        costePruebaMenu: currentMenuTest.coste_prueba_menu || 0,
      })
    }
  }, [currentMenuTest, reset])

  const onSubmit = async (data: FormValues) => {
    if (!osId) return

    try {
      await updatePruebaMenu.mutateAsync({ osId, data })
      toast({ title: 'Guardado', description: 'La prueba de menú ha sido guardada.' })
      reset(data)
    } catch (error) {
      console.error('Error saving data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la prueba de menú.',
      })
    }
  }

  const handlePrint = async () => {
    if (!serviceOrder) return
    setIsPrinting(true)

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 15
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      let finalY = margin

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#059669') // Primary color
      doc.text('Prueba de Menú', margin, finalY)
      finalY += 10

      // --- DATOS SERVICIO Y EVENTO ---
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#374151') // Gris oscuro

      const serviceData = [
        ['Nº Servicio:', serviceOrder.serviceNumber],
        ['Comercial:', serviceOrder.comercial || '-'],
        ['Cliente:', serviceOrder.client],
        ['Cliente Final:', serviceOrder.finalClient || '-'],
      ]
      const eventData = [
        ['Fecha Evento:', serviceOrder.startDate ? format(new Date(serviceOrder.startDate), 'dd/MM/yyyy') : '-'],
        ['Asistentes:', String(serviceOrder.asistentes)],
        ['Servicios:', briefingItems.map((i) => i.descripcion).join(', ') || '-'],
      ]

      autoTable(doc, {
        body: serviceData,
        startY: finalY,
        theme: 'plain',
        tableWidth: (pageWidth - margin * 2) / 2 - 5,
        styles: { fontSize: 9, cellPadding: 0.5 },
        columnStyles: { 0: { fontStyle: 'bold' } },
      })
      autoTable(doc, {
        body: eventData,
        startY: finalY,
        theme: 'plain',
        tableWidth: (pageWidth - margin * 2) / 2 - 5,
        margin: { left: pageWidth / 2 + 5 },
        styles: { fontSize: 9, cellPadding: 0.5 },
        columnStyles: { 0: { fontStyle: 'bold' } },
      })

      finalY = (doc as any).lastAutoTable.finalY + 10

      // --- TABLAS DE BODEGA Y GASTRONOMÍA ---
      const addSection = (category: 'BODEGA' | 'GASTRONOMÍA') => {
        const sectionItems = form
          .getValues('items')
          .filter((item) => item.mainCategory === category)
        if (sectionItems.length === 0) return

        doc.setLineWidth(0.2)
        doc.setDrawColor('#cbd5e1')
        doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5)

        if (finalY + 20 > pageHeight) {
          // Check if new section fits
          doc.addPage()
          finalY = margin
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#059669')
        doc.text(category.charAt(0) + category.slice(1).toLowerCase(), margin, finalY)
        finalY += 8

        const body = sectionItems.map((item) => {
          if (item.type === 'header') {
            return [
              {
                content: item.referencia,
                colSpan: 2,
                styles: { fontStyle: 'bold' as 'bold', fillColor: '#f3f4f6' },
              },
            ]
          }
          return [item.referencia, '']
        })

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
            data.cell.styles.minCellHeight = 8
            data.cell.styles.valign = 'middle'
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            valign: 'middle',
          },
          headStyles: {
            fillColor: '#e5e7eb',
            textColor: '#374151',
            fontStyle: 'bold',
          },
        })
        finalY = (doc as any).lastAutoTable.finalY + 15
      }

      addSection('BODEGA')
      addSection('GASTRONOMÍA')

      // --- OBSERVACIONES GENERALES ---
      const obsGenerales = form.getValues('observacionesGenerales')
      if (obsGenerales) {
        if (finalY + 30 > pageHeight) {
          doc.addPage()
          finalY = margin
        }
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#059669')
        doc.text('Observaciones Generales', margin, finalY)
        finalY += 8
        doc.setDrawColor('#e5e7eb')
        doc.rect(margin, finalY, pageWidth - margin * 2, 40)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#374151')
        doc.text(obsGenerales, margin + 2, finalY + 5, { maxWidth: pageWidth - margin * 2 - 4 })
      }

      doc.save(`PruebaMenu_${serviceOrder.serviceNumber}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' })
    } finally {
      setIsPrinting(false)
    }
  }

  const addRow = (mainCategory: 'BODEGA' | 'GASTRONOMÍA', type: 'header' | 'item') => {
    append({
      id: Date.now().toString(),
      type,
      mainCategory,
      referencia: '',
      observaciones: '',
    })
  }

  const renderSection = (mainCategory: 'BODEGA' | 'GASTRONOMÍA') => {
    const sectionItems = fields
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => field.mainCategory === mainCategory)

    const isGastronomia = mainCategory === 'GASTRONOMÍA'

    return (
      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className={cn(
          "flex items-center justify-between p-4 border-b border-border/40",
          isGastronomia ? "bg-orange-500/5" : "bg-blue-500/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("w-1 h-6 rounded-full", isGastronomia ? "bg-orange-500" : "bg-blue-500")} />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">{mainCategory}</CardTitle>
          </div>
          <div className="flex gap-2 no-print">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => addRow(mainCategory, 'header')}
              className="text-[10px] font-black uppercase tracking-widest h-8"
            >
              + Subcategoría
            </Button>
            <Button 
              size="sm" 
              type="button" 
              onClick={() => addRow(mainCategory, 'item')}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest h-8",
                isGastronomia ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              + Referencia
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-r border-border/40">Referencias</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Observaciones</TableHead>
                  <TableHead className="h-10 w-12 p-2 no-print"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionItems.length > 0 ? (
                  sectionItems.map(({ field, index }) => (
                    <TableRow key={field.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                      <TableCell
                        className={cn(
                          'py-2 px-4 border-r border-border/40',
                          field.type === 'header' && 'bg-muted/30'
                        )}
                      >
                        <FormField
                          control={control}
                          name={`items.${index}.referencia`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...formField}
                                  placeholder={field.type === 'header' ? "Nombre de la subcategoría..." : "Referencia..."}
                                  className={cn(
                                    "border-none h-7 p-0 bg-transparent focus-visible:ring-0 text-[11px]",
                                    field.type === 'header' ? "font-black uppercase tracking-widest" : "font-medium"
                                  )}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell
                        className={cn('py-2 px-4', field.type === 'header' && 'bg-muted/30')}
                      >
                        <FormField
                          control={control}
                          name={`items.${index}.observaciones`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...formField}
                                  placeholder="Añadir observaciones..."
                                  className="border-none h-7 p-0 bg-transparent focus-visible:ring-0 text-[11px]"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-2 px-4 no-print text-right',
                          field.type === 'header' && 'bg-muted/30',
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-[11px] text-muted-foreground uppercase tracking-widest">
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
    return <LoadingSkeleton title="Cargando Prueba de Menú..." />
  }

  return (
    <>
      {/* Header Premium */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/os/${osId}/info`)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1" />

          <div className="flex gap-2 no-print">
            <Button 
              variant="outline" 
              type="button" 
              onClick={handlePrint} 
              disabled={isPrinting}
              className="text-[10px] font-black uppercase tracking-widest h-9 px-4"
            >
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {isPrinting ? 'Generando...' : 'PDF'}
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit(onSubmit)} 
              disabled={!formState.isDirty}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest h-9 px-4"
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden mb-8">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Datos del Servicio</h4>
            </div>
            <div className="grid grid-cols-2 gap-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Nº Servicio</p>
                <p className="text-[12px] font-black">{serviceOrder.serviceNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Comercial</p>
                <p className="text-[12px] font-black">{serviceOrder.comercial || '-'}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</p>
                <p className="text-[12px] font-black">{serviceOrder.client}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cliente Final</p>
                <p className="text-[12px] font-black">{serviceOrder.finalClient || '-'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Datos del Evento</h4>
            </div>
            <div className="grid grid-cols-2 gap-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</p>
                <p className="text-[12px] font-black">{serviceOrder.startDate ? format(new Date(serviceOrder.startDate), 'dd/MM/yyyy') : '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Asistentes</p>
                <p className="text-[12px] font-black">{serviceOrder.asistentes}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Servicios</p>
                <p className="text-[11px] font-medium leading-relaxed">
                  {briefingItems.map((i) => i.descripcion).join(', ') || '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-border/40 rounded-xl bg-background/60 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asistentes Prueba</p>
                  <p className="text-2xl font-black tracking-tight">{asistentesPrueba}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <Euro className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coste de la Prueba</p>
                  <FormField
                    control={control}
                    name="costePruebaMenu"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-1">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-8 w-24 font-black text-xl border-none bg-transparent p-0 focus-visible:ring-0"
                          />
                        </FormControl>
                        <span className="text-xl font-black">€</span>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {renderSection('BODEGA')}
            {renderSection('GASTRONOMÍA')}
          </div>

          <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border/40 bg-muted/30">
              <div className="w-1 h-6 rounded-full bg-muted-foreground" />
              <CardTitle className="text-[12px] font-black uppercase tracking-widest">Observaciones Generales</CardTitle>
            </div>
            <CardContent className="p-4">
              <FormField
                control={control}
                name="observacionesGenerales"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Añade notas adicionales sobre la prueba de menú..."
                        className="min-h-[120px] bg-muted/20 border-border/40 focus-visible:ring-emerald-500/30 text-[12px] font-medium leading-relaxed"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </>
  )
}
