'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Calendar, Clock, Utensils, ListCheck, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { useMaterialOrders } from '@/hooks/use-data-queries'
import type {
  ServiceOrder,
  ComercialBriefing,
  ComercialBriefingItem,
  GastronomyOrderItem,
  GastronomyOrderStatus,
  GastronomyOrder,
} from '@/types'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { BriefingSummaryDialog, BriefingSummaryTrigger } from '@/components/os/briefing-summary-dialog'
import { cn } from '@/lib/utils'
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useComercialBriefing, useGastronomyOrders, useStaffOrders, useUpdateStaffOrder, type GastronomyStaffOrder } from '@/hooks/use-briefing-data'
import { useComercialBriefings } from '@/hooks/use-data-queries'
import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'
import { useEvento } from '@/hooks/use-data-queries'
import { RecetaSelector } from '@/components/os/gastronomia/receta-selector'
import { DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, Trash2, Plus } from 'lucide-react'
import type { Receta } from '@/types'

const statusVariant: {
  [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive'
} = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
}

type EnrichedBriefingItem = ComercialBriefingItem & {
  gastro_status?: GastronomyOrderStatus
  gastro_total?: number
}

export default function GastronomiaPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder } = useEvento(osId)

  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    serviceOrder?.id || osId,
  )
  const { data: gastronomyOrders, isLoading: isLoadingOrders } = useGastronomyOrders(
    serviceOrder?.id || osId,
  )
  
  const { data: existingStaffOrders, isLoading: isLoadingStaff } = useStaffOrders(serviceOrder?.id || osId)
  const updateStaffOrderMutation = useUpdateStaffOrder()
  
  // Estado para pedido de personal (comida staff)
  const [isSelectorOpen, setIsSelectorOpen] = useState<string | false>(false)
  const [expandedDays, setExpandedDays] = useState<string[]>([])

  const toggleDayExpansion = (dia: string) => {
    setExpandedDays(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  // Obtener todos los servicios del briefing comercial (no solo gastronomía)
  const { data: allBriefings } = useComercialBriefings(serviceOrder?.id || osId)
  const allBriefingItems = useMemo(() => {
    return allBriefings?.[0]?.items || []
  }, [allBriefings])

  const briefingItems = useMemo(() => {
    if (!briefing?.items) return []

    const safeGastronomyOrders = gastronomyOrders || []
    return briefing.items
      .filter((item) => item.conGastronomia)
      .map((item) => {
        const order = safeGastronomyOrders.find((o) => o.id === item.id)
        return {
          ...item,
          gastro_status: (order?.status || 'Pendiente') as GastronomyOrderStatus,
          gastro_total: (order as any)?.total || 0,
        }
      })
  }, [briefing, gastronomyOrders])

  // Extraer días únicos del briefing
  const uniqueDays = useMemo(() => {
    const days = new Set<string>()
    allBriefingItems.forEach((item) => {
      days.add(item.fecha)
    })
    return Array.from(days).sort()
  }, [allBriefingItems])

  const isLoading = isLoadingBriefing || isLoadingOrders || isLoadingStaff

  const sortedBriefingItems = useMemo(() => {
    return [...briefingItems].sort((a, b) => {
      const dateA = new Date(a.fecha)
      const dateB = new Date(b.fecha)
      const dateComparison = dateA.getTime() - dateB.getTime()
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [briefingItems])

  // Hook para infinite scroll (sin paginación, mostrar todos)
  const sentinelRef = useInfiniteScroll({
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
    enabled: false,
  })

  // Definir columnas para la vista móvil (optimizada)
  const mobileColumns: MobileTableColumn<EnrichedBriefingItem>[] = [
    {
      key: 'descripcion',
      label: 'Descripción',
      isTitle: true,
      format: (value, row) => (
        <div className="flex items-center justify-between">
          <span className="truncate">{value}</span>
          <div className="flex items-center gap-2 text-[12px] font-bold text-muted-foreground">
            <Users className="h-4 w-4 text-amber-500" />
            <span>{row.asistentes}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'dateTime',
      label: '',
      format: (_v, row) => (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(row.fecha), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-bold">{row.horaInicio}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'comentarios',
      label: '',
      format: (_v, row) => (
        <div className="flex items-center justify-between">
          <span className="italic opacity-70 text-[11px] truncate">{row.comentarios || '-'}</span>
          <span className="font-bold text-emerald-700 text-xs">
            {row.gastro_total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      ),
    },
  ]

  // CTA / objetivos: presupuesto de gastronomía y objetivo
  const { data: objetivos } = useObjetivosGasto(serviceOrder?.id)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const presupuesto = useMemo(() => {
    const safeOrders = gastronomyOrders || []
    const gastroTotal = safeOrders.reduce((acc, o: any) => acc + (o.total || 0), 0)
    const staffTotal = (existingStaffOrders || []).reduce((acc, order) => {
      if (order.sinComida) return acc
      return acc + (order.total || 0)
    }, 0)
    return gastroTotal + staffTotal
  }, [gastronomyOrders, existingStaffOrders])

  const totalStaffAmount = useMemo(() => {
    const safeOrders = existingStaffOrders || []
    return safeOrders.reduce((acc, order) => {
      if (order.sinComida) return acc
      return acc + (order.total || 0)
    }, 0)
  }, [existingStaffOrders])

  // Bodega CTA: presupuesto/objetivo for Bodega module (used in header)
  const { data: materialOrders = [] } = useMaterialOrders(serviceOrder?.numero_expediente, 'Bodega')
  
  const totalGastroAmount = useMemo(() => {
    const safeOrders = gastronomyOrders || []
    return safeOrders.reduce((acc, o: any) => acc + (o.total || 0), 0)
  }, [gastronomyOrders])

  const presupuestoBodega = useMemo(() => {
    const safe = materialOrders || []
    return safe.reduce((acc: number, o: any) => acc + (o.total || 0), 0)
  }, [materialOrders])

  const objetivoBodega = useMemo(() => {
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => p.nombre?.toLowerCase() === 'micecatering')
    const objetivoPct = (objetivoTemplate?.bodega || 0) / 100
    const facturacionNeta = (serviceOrder?.facturacion as number) || 0
    return facturacionNeta * objetivoPct
  }, [objetivos, plantillas, serviceOrder])

  const desviacionBodegaPct = useMemo(() => {
    if (!objetivoBodega || objetivoBodega === 0) return 0
    return ((presupuestoBodega - objetivoBodega) / objetivoBodega) * 100
  }, [presupuestoBodega, objetivoBodega])

  const objetivoValue = useMemo(() => {
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => p.nombre?.toLowerCase() === 'micecatering')
    const objetivoPct = (objetivoTemplate?.gastronomia || 0) / 100
    const facturacionNeta = (serviceOrder?.facturacion as number) || 0
    return facturacionNeta * objetivoPct
  }, [objetivos, plantillas, serviceOrder])

  const desviacionPct = useMemo(() => {
    if (!objetivoValue || objetivoValue === 0) return 0
    return ((presupuesto - objetivoValue) / objetivoValue) * 100
  }, [presupuesto, objetivoValue])

  // Cambiar el título de la página
  useEffect(() => {
    document.title = 'OS Gastronomía'
  }, [])

  // Funciones para gestionar líneas de personal
  const onAddRecetaToStaff = async (receta: Receta, fecha: string) => {
    const currentOrder = (existingStaffOrders || []).find(o => o.fecha === fecha) || {
      osId: serviceOrder?.id || osId,
      fecha,
      items: [],
      total: 0,
      sinComida: false
    }

    const newItem: GastronomyOrderItem = {
      id: receta.id,
      type: 'item',
      nombre: receta.nombre,
      precioVenta: receta.precioVenta || 0,
      precioVentaSnapshot: receta.precioVenta || 0,
      costeMateriaPrima: receta.costeMateriaPrima || 0,
      costeMateriaPrimaSnapshot: receta.costeMateriaPrima || 0,
      quantity: 1,
    }

    const updatedItems = [...currentOrder.items, newItem]
    const updatedTotal = updatedItems.reduce((acc, item) => acc + (item.precioVenta || 0) * (item.quantity || 0), 0)

    try {
      await updateStaffOrderMutation.mutateAsync({
        ...currentOrder,
        items: updatedItems,
        total: updatedTotal
      })
      toast({ title: 'Plato añadido al staff' })
      setIsSelectorOpen(false)
    } catch (error) {
      toast({ title: 'Error al añadir plato', variant: 'destructive' })
    }
  }

  const onToggleSinComida = async (fecha: string, checked: boolean) => {
    const currentOrder = (existingStaffOrders || []).find(o => o.fecha === fecha) || {
      osId: serviceOrder?.id || osId,
      fecha,
      items: [],
      total: 0,
      sinComida: false
    }

    try {
      await updateStaffOrderMutation.mutateAsync({
        ...currentOrder,
        sinComida: checked
      })
      toast({ title: checked ? 'Marcado como sin comida' : 'Marcado como con comida' })
    } catch (error) {
      toast({ title: 'Error al actualizar estado', variant: 'destructive' })
    }
  }

  const removeStaffItem = async (fecha: string, itemId: string) => {
    const currentOrder = (existingStaffOrders || []).find(o => o.fecha === fecha)
    if (!currentOrder) return

    const updatedItems = currentOrder.items.filter(i => i.id !== itemId)
    const updatedTotal = updatedItems.reduce((acc, item) => acc + (item.precioVenta || 0) * (item.quantity || 0), 0)

    try {
      await updateStaffOrderMutation.mutateAsync({
        ...currentOrder,
        items: updatedItems,
        total: updatedTotal
      })
      toast({ title: 'Plato eliminado' })
    } catch (error) {
      toast({ title: 'Error al eliminar plato', variant: 'destructive' })
    }
  }

  const updateStaffItemQuantity = async (fecha: string, itemId: string, quantity: number) => {
    const currentOrder = (existingStaffOrders || []).find(o => o.fecha === fecha)
    if (!currentOrder) return

    const updatedItems = currentOrder.items.map(i => i.id === itemId ? { ...i, quantity } : i)
    const updatedTotal = updatedItems.reduce((acc, item) => acc + (item.precioVenta || 0) * (item.quantity || 0), 0)

    try {
      await updateStaffOrderMutation.mutateAsync({
        ...currentOrder,
        items: updatedItems,
        total: updatedTotal
      })
    } catch (error) {
      toast({ title: 'Error al actualizar cantidad', variant: 'destructive' })
    }
  }

  const linesForDay = (fecha: string) => {
    const order = (existingStaffOrders || []).find(o => o.fecha === fecha)
    return order?.items || []
  }

  const totalForDay = (fecha: string) => {
    const order = (existingStaffOrders || []).find(o => o.fecha === fecha)
    return order?.total || 0
  }

  const isSinComidaForDay = (fecha: string) => {
    const order = (existingStaffOrders || []).find(o => o.fecha === fecha)
    return order?.sinComida || false
  }

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />
  }

  return (
    <div className="space-y-4">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-2">
        <div className="max-w-7xl mx-auto px-3 py-1">
          <div className="flex items-center justify-between gap-2 min-h-10">
            <div className="flex items-center h-8 gap-2">
              <Utensils className="h-5 w-5 text-emerald-800" aria-hidden="true" />
              <h1 className="text-sm md:text-base font-bold text-emerald-900 tracking-tight">Gastronomía</h1>
            </div>
            <div className="flex items-center gap-3 text-xs md:gap-6 md:text-sm">
              <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
                <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Presupuesto</div>
                <div className="font-bold text-xs md:text-sm">{presupuesto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>
              <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
                <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Objetivo</div>
                <div className="font-bold text-xs md:text-sm">{objetivoValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>
              <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
                <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Desviación</div>
                <div className={cn('font-bold text-xs md:text-sm', desviacionPct > 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {isFinite(desviacionPct) ? `${desviacionPct.toFixed(2)}%` : '-'}
                </div>
              </div>
              {/* Botón Resumen Briefing a la derecha */}
              <div className="ml-2">
                <BriefingSummaryTrigger items={allBriefingItems} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b border-border/40 bg-muted/10">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 md:gap-2">
              <Utensils className="h-4 w-4 text-emerald-800 hidden md:block" />
              <CardTitle className="text-xs md:text-sm font-black uppercase tracking-tight md:tracking-widest text-muted-foreground">
                <span className="hidden md:inline">Pedidos Gastronomía CPR</span>
                <span className="inline md:hidden">Pedidos Gastronomía</span>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-sm md:text-lg font-black text-emerald-700 tracking-tight">
                 {totalGastroAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
               </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0.5 md:p-1">
          {/* Vista Móvil: Tarjetas Apiladas */}
          <div className="md:hidden p-0.5 space-y-0.5">
            <MobileTableView
              data={sortedBriefingItems}
              columns={mobileColumns}
              compact
              cardClassName="p-0.5 gap-0.5"
              className="space-y-0.5"
              onCardClick={(item) => router.push(`/os/${osId}/gastronomia/${item.id}`)}
              sentinelRef={sentinelRef}
              isLoading={false}
              emptyMessage="No hay pedidos de gastronomía."
            />
          </div>

          {/* Vista Escritorio: Tabla Tradicional */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40">
                  <TableHead className="h-8 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest">Hora</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest">Descripción</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest">PAX</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest">Comentarios</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px] md:text-xs font-black uppercase tracking-widest">Coste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefingItems.length > 0 ? (
                  sortedBriefingItems.map((item) => (
                    <TableRow
                      key={item.id}
                      onClick={() => router.push(`/os/${osId}/gastronomia/${item.id}`)}
                      className={cn(
                        'cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/40',
                        item.descripcion?.toLowerCase?.() === 'prueba de menu' &&
                          'bg-orange-500/5 hover:bg-orange-500/10',
                      )}
                    >
                      <TableCell className="py-2 px-2 text-xs font-medium text-muted-foreground">
                        {format(new Date(item.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-xs font-bold">
                        {item.horaInicio}
                      </TableCell>
                      <TableCell className="py-2 px-2 min-w-[120px] text-xs font-bold uppercase tracking-wider">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-xs font-mono">
                        {item.asistentes}
                      </TableCell>
                      <TableCell className="py-2 px-2 min-w-[120px] text-xs text-muted-foreground italic">
                        {item.comentarios || '-'}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-right">
                        <span className="text-xs font-bold text-emerald-700">
                          {item.gastro_total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-[10px] text-muted-foreground">
                      No hay pedidos de gastronomía. Activa la opción "Con gastronomía" en los hitos
                      del briefing comercial.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta Pedido de Personal */}
      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b border-border/40 bg-muted/10">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 md:gap-2">
              <Utensils className="h-4 w-4 text-blue-800 hidden md:block" />
              <CardTitle className="text-xs md:text-sm font-black uppercase tracking-tight md:tracking-widest text-muted-foreground">
                Pedido de Personal (Staff)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-sm md:text-lg font-black text-blue-700 tracking-tight">
                 {totalStaffAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
               </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0.5 md:p-1">
          {uniqueDays.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No hay días de evento para agregar personal.
            </div>
          ) : (
            <div className="space-y-1">
              {uniqueDays.map((día) => {
                const linesInDay = linesForDay(día)
                const dayTotal = totalForDay(día)
                const sinComida = isSinComidaForDay(día)
                const isExpanded = expandedDays.includes(día)

                return (
                  <div key={día} className="border border-border/40 rounded-lg overflow-hidden bg-background/40">
                    {/* Header del día */}
                    <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between border-b border-border/40">
                      <div className="flex items-center gap-4">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={() => toggleDayExpansion(día)}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-tight text-foreground/80">
                            {format(new Date(día), 'EEEE, d MMMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/50 px-2 py-0.5 rounded border border-blue-100 shadow-sm transition-all hover:bg-blue-50/50">
                          <Checkbox 
                            id={`no-food-${día}`} 
                            checked={sinComida} 
                            onCheckedChange={(checked) => onToggleSinComida(día, !!checked)}
                            className="h-3.5 w-3.5 border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label 
                            htmlFor={`no-food-${día}`} 
                            className="text-[9px] md:text-[10px] font-bold uppercase text-blue-800 cursor-pointer select-none"
                          >
                            Sin comida personal
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!sinComida && (
                          <>
                            <div className="text-right">
                              <span className="text-[9px] md:text-[10px] font-bold text-blue-600/70">
                                 {dayTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </div>
                            <Dialog open={isSelectorOpen === día} onOpenChange={(open) => {
                              setIsSelectorOpen(open ? día : false)
                              if (open && !isExpanded) toggleDayExpansion(día)
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="default" 
                                  size="icon" 
                                  className="h-6 w-6 md:h-7 md:w-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 border-2 border-white"
                                >
                                  <Plus className="h-4 w-4 stroke-[3]" />
                                </Button>
                              </DialogTrigger>
                              <RecetaSelector onSelect={(receta) => {
                                onAddRecetaToStaff(receta, día)
                                setIsSelectorOpen(false)
                              }} />
                            </Dialog>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contenido */}
                    {!sinComida && isExpanded && (
                      <div className="p-1.5 space-y-1.5">
                        {linesInDay.length > 0 ? (
                          <div className="space-y-1">
                            {linesInDay.map((line) => {
                              const unitPrice = line.precioVentaSnapshot || line.precioVenta || 0
                              const totalPrice = unitPrice * (line.quantity || 0)
                              return (
                                <div
                                  key={line.id}
                                  className="grid grid-cols-12 items-center bg-background px-3 py-2 rounded border border-border/40 text-[10px] md:text-[11px] gap-2 shadow-sm"
                                >
                                  <div className="col-span-12 md:col-span-5 font-bold text-foreground">
                                    {line.nombre}
                                  </div>
                                  <div className="col-span-6 md:col-span-3 flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={line.quantity}
                                      onChange={(e) => updateStaffItemQuantity(día, line.id, parseInt(e.target.value) || 0)}
                                      className="w-10 h-6 text-center border border-border rounded font-mono text-[10px] focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="text-muted-foreground/60 whitespace-nowrap text-[9px]">
                                      × {unitPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                  </div>
                                  <div className="col-span-4 md:col-span-3 text-right font-bold text-blue-600/80 text-[10px]">
                                    {totalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                  </div>
                                  <div className="col-span-2 md:col-span-1 text-right">
                                    <button 
                                      onClick={() => removeStaffItem(día, line.id)} 
                                      className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                      title="Eliminar plato"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-[11px] text-muted-foreground italic bg-muted/5 rounded border border-dashed border-border/40">
                            No hay platos asignados. Pulsa el botón "+" para añadir comida de staff.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
