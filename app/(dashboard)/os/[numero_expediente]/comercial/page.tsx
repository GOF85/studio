'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray, useWatch, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Trash2, Save, Pencil, Check, Utensils, Euro } from 'lucide-react'
import { format, differenceInMinutes, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useEvento } from '@/hooks/use-data-queries'
import {
  useComercialBriefing,
  useComercialAjustes,
  useUpdateComercialBriefing,
  useAddComercialAjuste,
  useDeleteComercialAjuste,
} from '@/hooks/use-briefing-data'

import type {
  ServiceOrder,
  ComercialBriefing,
  ComercialBriefingItem,
  TipoServicio,
  ComercialAjuste,
} from '@/types'
import { osFormSchema, type OsFormValues } from '@/app/(dashboard)/os/[numero_expediente]/info/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { Separator } from '@/components/ui/separator'
import { Combobox } from '@/components/ui/combobox'

const briefingItemSchema = z.object({
  id: z.string(),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  conGastronomia: z.boolean().default(false),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  comentarios: z.string().optional(),
  sala: z.string().optional(),
  asistentes: z.coerce.number().min(0),
  precioUnitario: z.coerce.number().min(0),
  importeFijo: z.coerce.number().optional().default(0),
})

type BriefingItemFormValues = z.infer<typeof briefingItemSchema>

const financialSchema = osFormSchema.pick({
  agencyPercentage: true,
  spacePercentage: true,
  agencyCommissionValue: true,
  spaceCommissionValue: true,
})

type FinancialFormValues = z.infer<typeof financialSchema>

const FinancialSummary = memo(({ totalBriefing, totalAjustes, facturacionFinal, onSave }: { 
  totalBriefing: number, 
  totalAjustes: number, 
  facturacionFinal: number,
  onSave: (data: any) => void
}) => {
  const { control } = useFormContext()
  const agencyPercentage = useWatch({ control, name: 'agencyPercentage' })
  const spacePercentage = useWatch({ control, name: 'spacePercentage' })

  const facturacionNeta = useMemo(() => {
    const totalPercentage = (agencyPercentage || 0) + (spacePercentage || 0)
    return facturacionFinal * (1 - totalPercentage / 100)
  }, [facturacionFinal, agencyPercentage, spacePercentage])

  return (
    <Card className="bg-background/60 backdrop-blur-md border-border/40 shadow-sm overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="financial-summary" className="border-none">
          <AccordionTrigger className="hover:no-underline py-4 px-6 border-b border-border/40">
            <div className="flex items-center justify-between w-full pr-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
                Resumen Económico
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neta:</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                  {facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Briefing</span>
                <span className="text-xs font-bold">{totalBriefing.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Ajustes</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{totalAjustes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <Separator className="bg-border/40" />
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black uppercase tracking-[0.1em] text-foreground">Facturación Total</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {facturacionFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>

            <Separator className="bg-border/40" />

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comisión Agencia</span>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={control}
                        name="agencyPercentage"
                        render={({ field }) => (
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              {...field}
                              className="h-8 text-xs font-bold bg-background/50 pr-6"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={control}
                    name="agencyCommissionValue"
                    render={({ field }) => (
                      <div className="relative">
                        <Input
                          type="number"
                          {...field}
                          className="h-8 text-xs font-bold bg-background/50 pr-6"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">€</span>
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Canon Espacio</span>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={control}
                        name="spacePercentage"
                        render={({ field }) => (
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              {...field}
                              className="h-8 text-xs font-bold bg-background/50 pr-6"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={control}
                    name="spaceCommissionValue"
                    render={({ field }) => (
                      <div className="relative">
                        <Input
                          type="number"
                          {...field}
                          className="h-8 text-xs font-bold bg-background/50 pr-6"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">€</span>
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Facturación Neta</span>
                  <Euro className="h-3 w-3 text-blue-500/50" />
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {facturacionNeta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>

              <Button
                type="button"
                onClick={onSave}
                className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]"
              >
                Actualizar Financieros
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
})

FinancialSummary.displayName = 'FinancialSummary'

export default function ComercialPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [editingItem, setEditingItem] = useState<ComercialBriefingItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([])

  const nuevoAjusteConceptoRef = useRef<HTMLInputElement>(null)
  const nuevoAjusteImporteRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  // Load specific OS from Supabase
  const { data: currentOS, isLoading: isLoadingOS } = useEvento(osId)

  // Hooks para Supabase (React Query)
  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    currentOS?.id || osId,
  )
  const { data: ajustes, isLoading: isLoadingAjustes } = useComercialAjustes(currentOS?.id || osId)

  const updateBriefing = useUpdateComercialBriefing()
  const addAjuste = useAddComercialAjuste()
  const deleteAjuste = useDeleteComercialAjuste()

  const totalBriefing = useMemo(() => {
    return (
      briefing?.items.reduce(
        (acc, item) => acc + item.asistentes * item.precioUnitario + (item.importeFijo || 0),
        0,
      ) || 0
    )
  }, [briefing])

  const totalAjustes = useMemo(() => {
    const safeAjustes = ajustes || []
    return safeAjustes.reduce((acc, ajuste) => acc + ajuste.importe, 0)
  }, [ajustes])

  const facturacionFinal = useMemo(
    () => totalBriefing + totalAjustes,
    [totalBriefing, totalAjustes],
  )

  const financialForm = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      agencyPercentage: 0,
      spacePercentage: 0,
      agencyCommissionValue: 0,
      spaceCommissionValue: 0,
    },
  })

  const saveFinancials = useCallback(async () => {
    if (!serviceOrder) return

    try {
      const data = financialForm.getValues()
      const agencyCommission =
        (facturacionFinal * (data.agencyPercentage || 0)) / 100 + (data.agencyCommissionValue || 0)
      const spaceCommission =
        (facturacionFinal * (data.spacePercentage || 0)) / 100 + (data.spaceCommissionValue || 0)

      // Guardar en Supabase
      const { error } = await supabase
        .from('eventos')
        .update({
          facturacion: facturacionFinal,
          agency_percentage: data.agencyPercentage,
          space_percentage: data.spacePercentage,
          agency_commission_value: data.agencyCommissionValue,
          space_commission_value: data.spaceCommissionValue,
          comisiones_agencia: agencyCommission,
          comisiones_canon: spaceCommission,
        })
        .eq('id', serviceOrder.id)

      if (error) throw error

      setServiceOrder({
        ...serviceOrder,
        agencyPercentage: data.agencyPercentage,
        spacePercentage: data.spacePercentage,
        agencyCommissionValue: data.agencyCommissionValue,
        spaceCommissionValue: data.spaceCommissionValue,
        comisionesAgencia: agencyCommission,
        comisionesCanon: spaceCommission,
        facturacion: facturacionFinal,
      })
    } catch (error) {
      console.error('Error saving financials:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron guardar los datos financieros',
      })
    }
  }, [serviceOrder, osId, facturacionFinal, financialForm, toast])

  useEffect(() => {
    const loadTiposServicio = async () => {
      try {
        const { data } = await supabase
          .from('tipos_servicio_briefing')
          .select('id, servicio')
          .order('servicio')

        if (data) {
          setTiposServicio(data.map((t) => ({ id: t.id, servicio: t.servicio })))
        }
      } catch (error) {
        console.error('Error loading service types:', error)
      }
    }
    loadTiposServicio()

    if (currentOS) {
      setServiceOrder(currentOS)
      financialForm.reset({
        agencyPercentage: currentOS.agencyPercentage || 0,
        spacePercentage: currentOS.spacePercentage || 0,
        agencyCommissionValue: currentOS.agencyCommissionValue || 0,
        spaceCommissionValue: currentOS.spaceCommissionValue || 0,
      })
    } else if (!isLoadingOS && osId) {
      toast({
        title: 'Orden de servicio no encontrada',
        description: 'No existe la OS con ese número de expediente',
        variant: 'destructive',
      })
    }
    setIsMounted(true)
  }, [osId, router, financialForm, currentOS, isLoadingOS, toast])

  useEffect(() => {
    if (serviceOrder && facturacionFinal !== serviceOrder.facturacion) {
      saveFinancials()
    }
  }, [facturacionFinal, serviceOrder, saveFinancials])

  const sortedBriefingItems = useMemo(() => {
    if (!briefing?.items) return []
    return [...briefing.items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha)
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [briefing])

  const saveBriefing = async (newBriefing: ComercialBriefing) => {
    try {
      await updateBriefing.mutateAsync(newBriefing)
    } catch (error) {
      console.error('Error saving briefing:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar el briefing',
      })
    }
  }

  const handleSaveFinancials = (data: FinancialFormValues) => {
    saveFinancials()
    toast({ title: 'Datos financieros actualizados' })
  }

  const handleRowClick = (item: ComercialBriefingItem) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const handleNewClick = () => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }

  const handleSaveItem = (data: BriefingItemFormValues) => {
    if (!briefing) return false
    let newItems
    if (editingItem) {
      newItems = briefing.items.map((item) => (item.id === editingItem.id ? data : item))
      toast({ title: 'Servicio actualizado' })
    } else {
      newItems = [...briefing.items, { ...data, id: Date.now().toString() }]
      toast({ title: 'Servicio añadido' })
    }
    saveBriefing({ ...briefing, items: newItems })
    setEditingItem(null)
    return true // Indicate success to close dialog
  }

  const handleDeleteItem = (itemId: string) => {
    if (!briefing) return
    const newItems = briefing.items.filter((item) => item.id !== itemId)
    saveBriefing({ ...briefing, items: newItems })
    toast({ title: 'Servicio eliminado' })
  }

  const calculateDuration = (start: string, end: string) => {
    try {
      const startTime = parse(start, 'HH:mm', new Date())
      const endTime = parse(end, 'HH:mm', new Date())
      const diff = differenceInMinutes(endTime, startTime)
      if (diff < 0) return 'N/A'
      const hours = Math.floor(diff / 60)
      const minutes = diff % 60
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch (e) {
      return 'N/A'
    }
  }

  const handleAddAjuste = async () => {
    const concepto = nuevoAjusteConceptoRef.current?.value
    const importe = nuevoAjusteImporteRef.current?.value

    if (!concepto || !importe) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El concepto y el importe son obligatorios.',
      })
      return
    }

    try {
      await addAjuste.mutateAsync({
        osId: currentOS?.id || osId,
        concepto,
        importe: parseFloat(importe),
      })
      toast({ title: 'Ajuste añadido' })

      if (nuevoAjusteConceptoRef.current) nuevoAjusteConceptoRef.current.value = ''
      if (nuevoAjusteImporteRef.current) nuevoAjusteImporteRef.current.value = ''
    } catch (error) {
      console.error('Error adding ajuste:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo añadir el ajuste' })
    }
  }

  const handleDeleteAjuste = async (id: string) => {
    try {
      await deleteAjuste.mutateAsync({ id, osId: currentOS?.id || osId })
      toast({ title: 'Ajuste eliminado' })
    } catch (error) {
      console.error('Error deleting ajuste:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el ajuste',
      })
    }
  }

  const handleAddLocation = async (newLocation: string) => {
    if (!serviceOrder) return

    const updatedLocations = [...(serviceOrder.deliveryLocations || []), newLocation]
    const updatedOS = {
      ...serviceOrder,
      deliveryLocations: updatedLocations,
    }

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('eventos')
        .update({ delivery_locations: JSON.stringify(updatedLocations) })
        .eq('id', serviceOrder.id)

      if (error) throw error

      // Update local state
      setServiceOrder(updatedOS)
      toast({
        title: 'Sala añadida',
        description: `Se ha guardado "${newLocation}" en la Orden de Servicio.`,
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la sala' })
    }
  }

  const handleDeleteLocation = async (locationToDelete: string) => {
    if (!serviceOrder) return

    const updatedLocations = (serviceOrder.deliveryLocations || []).filter(
      (loc) => loc !== locationToDelete,
    )
    const updatedOS = {
      ...serviceOrder,
      deliveryLocations: updatedLocations,
    }

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('eventos')
        .update({ delivery_locations: JSON.stringify(updatedLocations) })
        .eq('id', serviceOrder.id)

      if (error) throw error

      // Update local state
      setServiceOrder(updatedOS)
      toast({
        title: 'Sala eliminada',
        description: `Se ha eliminado "${locationToDelete}" de la Orden de Servicio.`,
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la sala' })
    }
  }

  if (!isMounted || isLoadingOS || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo Comercial..." />
  }

  return (
    <main className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Briefing Section */}
        <Card className="lg:col-span-2 bg-background/60 backdrop-blur-md border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b border-border/40">
            <div className="flex flex-col">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
                Briefing del Evento
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                Cronograma y servicios
              </p>
            </div>
            <Button
              onClick={handleNewClick}
              size="sm"
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest transition-all duration-200 active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Añadir Servicio
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6">Fecha</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Horario</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Descripción</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sala</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">PAX</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">P.U.</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBriefingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs font-medium italic">
                        No hay servicios definidos para este evento
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedBriefingItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="group cursor-pointer hover:bg-muted/10 transition-colors border-b border-border/20"
                        onClick={() => handleRowClick(item)}
                      >
                        <TableCell className="py-3 pl-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-foreground">
                              {format(new Date(item.fecha), 'dd MMM', { locale: es })}
                            </span>
                            <span className="text-[9px] font-medium text-muted-foreground uppercase">
                              {format(new Date(item.fecha), 'eeee', { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                              {item.horaInicio}
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground/50">-</span>
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {item.horaFin}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                                {item.descripcion}
                              </span>
                              {item.conGastronomia && (
                                <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-tighter text-emerald-600">
                                  Gastro
                                </div>
                              )}
                            </div>
                            {item.comentarios && (
                              <span className="text-[10px] text-muted-foreground italic line-clamp-1">
                                {item.comentarios}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {item.sala || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-[11px] font-black text-foreground">
                            {item.asistentes}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {item.precioUnitario.toLocaleString('es-ES', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-6">
                          <span className="text-[11px] font-black text-foreground">
                            {(
                              item.asistentes * item.precioUnitario +
                              (item.importeFijo || 0)
                            ).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {sortedBriefingItems.length > 0 && (
                  <TableFooter className="bg-transparent border-t border-border/40">
                    <TableRow>
                      <TableCell colSpan={6} className="py-3 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        Subtotal Briefing
                      </TableCell>
                      <TableCell className="py-3 text-right pr-6 text-sm font-black text-foreground">
                        {totalBriefing.toLocaleString('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Section */}
        <div className="space-y-6">
          <FormProvider {...financialForm}>
            <FinancialSummary 
              totalBriefing={totalBriefing}
              totalAjustes={totalAjustes}
              facturacionFinal={facturacionFinal}
              onSave={saveFinancials}
            />
          </FormProvider>

          {/* Ajustes Section */}
          <Card className="bg-background/60 backdrop-blur-md border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/40">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
                Ajustes y Extras
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6">Concepto</TableHead>
                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right pr-6">Importe</TableHead>
                    <TableHead className="h-10 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ajustes?.map((ajuste) => (
                    <TableRow key={ajuste.id} className="hover:bg-muted/10 border-b border-border/20">
                      <TableCell className="py-2 pl-6 text-[11px] font-medium">{ajuste.concepto}</TableCell>
                      <TableCell className="py-2 text-right pr-6 text-[11px] font-bold">
                        {ajuste.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                      <TableCell className="py-2 pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAjuste(ajuste.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-transparent border-t border-border/40">
                    <TableCell className="py-3 pl-6">
                      <Input
                        placeholder="Nuevo concepto..."
                        ref={nuevoAjusteConceptoRef}
                        className="h-8 text-[11px] bg-background/50 border-border/40"
                      />
                    </TableCell>
                    <TableCell className="py-3 pr-6">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          ref={nuevoAjusteImporteRef}
                          className="h-8 text-[11px] bg-background/50 border-border/40 pr-6 text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">€</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={handleAddAjuste}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComercialBriefingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        onSave={handleSaveItem}
        serviceOrder={serviceOrder}
        onAddLocation={handleAddLocation}
        onDeleteLocation={handleDeleteLocation}
        tiposServicio={tiposServicio}
      />
    </main>
  )
}

const ComercialBriefingDialog = memo(({
  open,
  onOpenChange,
  item,
  onSave,
  serviceOrder,
  onAddLocation,
  onDeleteLocation,
  tiposServicio,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Partial<ComercialBriefingItem> | null
  onSave: (data: BriefingItemFormValues) => boolean
  serviceOrder: ServiceOrder | null
  onAddLocation: (location: string) => Promise<void>
  onDeleteLocation: (location: string) => Promise<void>
  tiposServicio: TipoServicio[]
}) => {
  const form = useForm<BriefingItemFormValues>({
    resolver: zodResolver(briefingItemSchema),
    defaultValues: {
      id: item?.id || '',
      fecha:
        item?.fecha ||
        (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
      horaInicio: item?.horaInicio || '09:00',
      horaFin: item?.horaFin || '10:00',
      conGastronomia: item?.conGastronomia || false,
      descripcion: item?.descripcion || '',
      comentarios: item?.comentarios || '',
      sala: item?.sala || '',
      asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
      precioUnitario: item?.precioUnitario || 0,
      importeFijo: item?.importeFijo || 0,
    },
  })

  const [localDeliveryLocations, setLocalDeliveryLocations] = useState<string[]>(
    serviceOrder?.deliveryLocations || [],
  )
  const prevItemRef = useRef<Partial<ComercialBriefingItem> | null>(null)
  const prevServiceOrderRef = useRef<ServiceOrder | null>(null)

  useEffect(() => {
    if (prevItemRef.current !== item || prevServiceOrderRef.current !== serviceOrder) {
      form.reset({
        id: item?.id || '',
        fecha:
          item?.fecha ||
          (serviceOrder?.startDate ? format(new Date(serviceOrder.startDate), 'yyyy-MM-dd') : ''),
        horaInicio: item?.horaInicio || '09:00',
        horaFin: item?.horaFin || '10:00',
        conGastronomia: item?.conGastronomia || false,
        descripcion: item?.descripcion || '',
        comentarios: item?.comentarios || '',
        sala: item?.sala || '',
        asistentes: item?.asistentes || serviceOrder?.asistentes || 0,
        precioUnitario: item?.precioUnitario || 0,
        importeFijo: item?.importeFijo || 0,
      })
      setLocalDeliveryLocations(serviceOrder?.deliveryLocations || [])
      prevItemRef.current = item
      prevServiceOrderRef.current = serviceOrder
    }
  }, [item, serviceOrder, form])

  const asistentes = useWatch({ control: form.control, name: 'asistentes' })
  const precioUnitario = useWatch({ control: form.control, name: 'precioUnitario' })
  const importeFijo = useWatch({ control: form.control, name: 'importeFijo' })
  
  const total = useMemo(
    () => (asistentes || 0) * (precioUnitario || 0) + (importeFijo || 0),
    [asistentes, precioUnitario, importeFijo],
  )

  const locationOptions = useMemo(() => {
    return localDeliveryLocations.map((loc) => ({ label: loc, value: loc }))
  }, [localDeliveryLocations])

  const handleLocationSelect = useCallback(
    (value: string) => {
      form.setValue('sala', value, { shouldDirty: true })
    },
    [form],
  )

  const handleAddNewSala = useCallback(
    async (salaName: string) => {
      if (!salaName || !salaName.trim()) return
      const trimmedName = salaName.trim()
      if (localDeliveryLocations.includes(trimmedName)) {
        form.setValue('sala', trimmedName, { shouldDirty: true })
        return
      }
      try {
        await onAddLocation(trimmedName)
        setLocalDeliveryLocations((prev) => [...prev, trimmedName])
        form.setValue('sala', trimmedName, { shouldDirty: true })
      } catch (error) {
        console.error('Error al crear sala:', error)
      }
    },
    [localDeliveryLocations, form, onAddLocation],
  )

  const handleDeleteSala = useCallback(
    async (salaName: string) => {
      try {
        await onDeleteLocation(salaName)
        setLocalDeliveryLocations((prev) => prev.filter((loc) => loc !== salaName))
        if (form.getValues('sala') === salaName) {
          form.setValue('sala', '', { shouldDirty: true })
        }
      } catch (error) {
        console.error('Error al eliminar sala:', error)
      }
    },
    [form, onDeleteLocation],
  )

  const onSubmit = (data: BriefingItemFormValues) => {
    if (onSave(data)) {
      onOpenChange(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar' : 'Nuevo'} Servicio del Briefing</DialogTitle>
          <DialogDescription>
            {item
              ? 'Edita los detalles del servicio del briefing'
              : 'Crea un nuevo servicio del briefing con toda la información necesaria'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="asistentes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asistentes</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº Asistentes" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="precioUnitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Unitario</FormLabel>
                    <FormControl>
                      <Input placeholder="Precio Unitario" type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="importeFijo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe Fijo</FormLabel>
                    <FormControl>
                      <Input placeholder="Importe Fijo" type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Total</FormLabel>
                <FormControl>
                  <Input
                    readOnly
                    value={total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  />
                </FormControl>
              </FormItem>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sala"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sala</FormLabel>
                    <FormControl>
                      <Combobox
                        options={locationOptions}
                        value={field.value || ''}
                        onChange={(value) => {
                          field.onChange(value)
                          handleLocationSelect(value)
                        }}
                        onCreated={handleAddNewSala}
                        onDelete={handleDeleteSala}
                        placeholder="Selecciona o crea una sala..."
                        searchPlaceholder="Buscar o crear sala..."
                        emptyPlaceholder="Presiona Enter o + Añadir para crear"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de servicio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposServicio.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.servicio}>
                            {tipo.servicio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField
                control={form.control}
                name="conGastronomia"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!m-0 text-base">Con gastronomía</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="comentarios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentarios</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Comentarios" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">
                <Save className="mr-2" /> Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
})

ComercialBriefingDialog.displayName = 'ComercialBriefingDialog'
