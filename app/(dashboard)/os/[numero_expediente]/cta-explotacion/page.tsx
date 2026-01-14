'use client'

import * as React from 'react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Euro, Settings, TrendingUp, RefreshCw, Info, MessageSquare, Save } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import {
  PersonalMiceOrder,
  PersonalExterno,
  PersonalExternoAjuste,
  ObjetivosGasto,
  ReturnSheet,
  ComercialBriefingItem,
  ComercialAjuste,
  GastronomyOrder,
  GastronomyOrderItem,
  PersonalExternoTurno,
  AsignacionPersonal,
  MaterialOrder,
  TransporteOrder,
  PruebaMenuData,
} from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { GASTO_LABELS } from '@/lib/constants'
import { formatNumber, formatCurrency, formatPercentage, calculateHours } from '@/lib/utils'

// Hooks
import {
  useObjetivosGastoPlantillas,
  useObjetivosGasto,
  useUpdateObjetivoGasto,
} from '@/hooks/use-objetivos-gasto'
import { useCtaRealCosts, useUpdateCtaRealCosts } from '@/hooks/use-cta-real-costs'
import { useCtaComentarios, useUpdateCtaComentarios } from '@/hooks/use-cta-comentarios'
import { useComercialBriefing, useComercialAjustes, useGastronomyOrders } from '@/hooks/use-briefing-data'
import {
  useEvento,
  useUpdateEvento,
  useMaterialOrders,
  useHieloOrders,
  useTransporteOrders,
  useDecoracionOrders,
  useAtipicoOrders,
  usePersonalMiceOrders,
  usePersonalExterno,
  usePersonalExternoAjustes,
  usePruebasMenu,
  useReturnSheets,
} from '@/hooks/use-data-queries'
import { usePedidosPendientes } from '@/hooks/use-pedidos-pendientes'
import { usePedidosEnviados } from '@/hooks/use-pedidos-enviados'

type CostRow = {
  label: string
  presupuesto: number
  cierre: number
  real: number
  objetivo: number
  objetivo_pct: number
  comentario?: string
}

const calculatePersonalMiceTotal = (orders: PersonalMiceOrder[], type: 'planned' | 'real') => {
  return orders.reduce((sum: number, order: PersonalMiceOrder) => {
    const hours =
      type === 'real' && order.horaEntradaReal && order.horaSalidaReal
        ? calculateHours(order.horaEntradaReal, order.horaSalidaReal)
        : calculateHours(order.horaEntrada, order.horaSalida)
    const price = order.precioHora || 0
    return sum + hours * price
  }, 0)
}

const calculatePersonalExternoTotal = (
  personalExterno: PersonalExterno | null,
  ajustes: PersonalExternoAjuste[],
  type: 'planned' | 'real',
) => {
  if (!personalExterno) return 0

  const costeTurnos = personalExterno.turnos.reduce((sum: number, turno: PersonalExternoTurno) => {
    if (type === 'real') {
      return (
        sum +
        (turno.asignaciones || []).reduce(
          (sumAsignacion: number, asignacion: AsignacionPersonal) => {
            const realHours = calculateHours(
              asignacion.horaEntradaReal || '',
              asignacion.horaSalidaReal || '',
            )
            const hoursToUse =
              realHours > 0 ? realHours : calculateHours(turno.horaEntrada, turno.horaSalida)
            return sumAsignacion + hoursToUse * (turno.precioHora || 0)
          },
          0,
        )
      )
    }
    // Planned cost
    const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida)
    const quantity = (turno.asignaciones?.length || 0) > 0 ? turno.asignaciones?.length || 0 : 1
    return sum + plannedHours * (turno.precioHora || 0) * quantity
  }, 0)

  const costeAjustes = ajustes.reduce(
    (sum: number, ajuste: PersonalExternoAjuste) => sum + ajuste.importe,
    0,
  )

  return costeTurnos + costeAjustes
}

const RealCostInput = React.memo(({ 
  label, 
  initialValue, 
  onSave 
}: { 
  label: string, 
  initialValue: number | undefined, 
  onSave: (label: string, value: string) => void 
}) => {
  const [value, setValue] = useState(initialValue === undefined ? '' : initialValue.toString())

  useEffect(() => {
    setValue(initialValue === undefined ? '' : initialValue.toString())
  }, [initialValue])

  return (
    <Input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(label, value)}
      className="h-6 text-right w-24 ml-auto text-[11px] font-mono bg-transparent border-border/40 focus-visible:ring-emerald-500/30"
    />
  )
})

RealCostInput.displayName = 'RealCostInput'

const CostRowComponent = React.memo(({ 
  row, 
  facturacionNeta, 
  realCostValue, 
  handleSaveRealCost, 
  setEditingComment 
}: { 
  row: CostRow, 
  facturacionNeta: number, 
  realCostValue: number | undefined, 
  handleSaveRealCost: (label: string, value: string) => void, 
  setEditingComment: (val: { label: string; text: string } | null) => void 
}) => {
  const pctSFactPresupuesto = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0
  const pctSFactCierre = facturacionNeta > 0 ? row.cierre / facturacionNeta : 0
  const pctSFactReal = facturacionNeta > 0 ? row.real / facturacionNeta : 0
  const desviacion = row.objetivo - row.real
  const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0

  return (
    <TableRow key={row.label} className="hover:bg-muted/30 transition-colors border-b border-border/40">
      <TableCell
        className={cn(
          'py-1.5 px-3 font-medium sticky left-0 bg-background/95 backdrop-blur-sm z-10 border-r border-border/40',
          row.comentario && 'bg-amber-500/5',
        )}
      >
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-amber-500/10"
                onClick={() =>
                  setEditingComment({ label: row.label, text: row.comentario || '' })
                }
              >
                <MessageSquare
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground/50',
                    row.comentario && 'text-amber-500 fill-amber-500/20',
                  )}
                />
              </Button>
            </TooltipTrigger>
            {row.comentario && (
              <TooltipContent side="right" className="max-w-[300px]">
                <p className="text-xs">{row.comentario}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <span className="text-[11px] font-bold text-foreground/80">{row.label}</span>
        </div>
      </TableCell>
      
      {/* Presupuesto */}
      <TableCell className="py-1.5 px-3 text-right font-mono text-[11px] bg-blue-500/[0.02]">
        {formatCurrency(row.presupuesto)}
      </TableCell>
      <TableCell className="py-1.5 px-3 text-right font-mono text-[10px] text-muted-foreground/60 border-r border-border/40 bg-blue-500/[0.02]">
        {formatPercentage(pctSFactPresupuesto)}
      </TableCell>

      {/* Cierre */}
      <TableCell className="py-1.5 px-3 text-right font-mono text-[11px] bg-amber-500/[0.02]">
        {formatCurrency(row.cierre)}
      </TableCell>
      <TableCell className="py-1.5 px-3 text-right font-mono text-[10px] text-muted-foreground/60 border-r border-border/40 bg-amber-500/[0.02]">
        {formatPercentage(pctSFactCierre)}
      </TableCell>

      {/* Real */}
      <TableCell className="py-1.5 px-3 text-right bg-emerald-500/[0.02]">
        <RealCostInput
          label={row.label}
          initialValue={realCostValue}
          onSave={handleSaveRealCost}
        />
      </TableCell>
      <TableCell
        className={cn(
          'py-1.5 px-3 text-right font-mono text-[10px] border-r border-border/40 bg-emerald-500/[0.02]',
          pctSFactReal > row.objetivo_pct && row.objetivo_pct > 0 ? 'text-red-500 font-bold' : 'text-muted-foreground/60',
        )}
      >
        {formatPercentage(pctSFactReal)}
      </TableCell>

      {/* Objetivo */}
      <TableCell className="py-1.5 px-3 text-right font-mono text-[11px] text-muted-foreground/80">
        {formatCurrency(row.objetivo)}
      </TableCell>
      <TableCell className="py-1.5 px-3 text-right font-mono text-[10px] text-muted-foreground/60 border-r border-border/40">
        {formatPercentage(row.objetivo_pct)}
      </TableCell>

      {/* Desviación */}
      <TableCell
        className={cn(
          'py-1.5 px-3 text-right font-mono text-[11px]',
          desviacion < 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold',
        )}
      >
        {formatCurrency(desviacion)}
      </TableCell>
      <TableCell
        className={cn(
          'py-1.5 px-3 text-right font-mono text-[10px]',
          desviacion < 0 ? 'text-red-500/70' : 'text-emerald-600/70',
        )}
      >
        {formatPercentage(desviacionPct)}
      </TableCell>
    </TableRow>
  )
})

CostRowComponent.displayName = 'CostRowComponent'

export default function CtaExplotacionPage() {
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Supabase hooks (React Query)
  const { data: serviceOrder } = useEvento(osId)
  const { data: plantillas } = useObjetivosGastoPlantillas()
  const { data: objetivo } = useObjetivosGasto(serviceOrder?.id)
  const { data: realCosts } = useCtaRealCosts(serviceOrder?.id)
  const { data: comentariosData } = useCtaComentarios(serviceOrder?.id)
  const { data: briefing } = useComercialBriefing(serviceOrder?.id)
  const { data: ajustes } = useComercialAjustes(serviceOrder?.id)
  const { data: materialOrders } = useMaterialOrders(serviceOrder?.numero_expediente)
  const { data: transporteOrders } = useTransporteOrders(serviceOrder?.id)
  const { data: decoracionOrders } = useDecoracionOrders(serviceOrder?.id)
  const { data: atipicoOrders } = useAtipicoOrders(serviceOrder?.id)
  const { data: personalMiceOrders } = usePersonalMiceOrders(serviceOrder?.id)
  const { data: personalExternoArr } = usePersonalExterno(serviceOrder?.id)
  const { data: personalExternoAjustes } = usePersonalExternoAjustes(serviceOrder?.id)
  const { data: pruebasMenuArr } = usePruebasMenu(serviceOrder?.id)
  const { data: gastronomyOrdersArr } = useGastronomyOrders(serviceOrder?.id)
  const { data: returnSheets } = useReturnSheets(serviceOrder?.id)
  // Pedidos de alquiler: pendientes + enviados
  const { data: allPedidosPendientes = [] } = usePedidosPendientes(osId)
  const { data: allPedidosEnviados = [] } = usePedidosEnviados(osId)

  const updateObjetivo = useUpdateObjetivoGasto()
  const updateEvento = useUpdateEvento()
  const updateRealCosts = useUpdateCtaRealCosts()
  const updateComentarios = useUpdateCtaComentarios()

  const [realCostInputs, setRealCostInputs] = useState<Record<string, number | undefined>>({})
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<{ label: string; text: string } | null>(null)

  useEffect(() => {
    if (realCosts) {
      setRealCostInputs(realCosts)
    }
  }, [realCosts])

  useEffect(() => {
    if (comentariosData) {
      setComentarios(comentariosData)
    }
  }, [comentariosData])

  const revenueData = useMemo(() => {
    if (!serviceOrder) return { facturacionBruta: 0, netRevenue: 0 }

    const safeAjustes = ajustes || []
    const totalBriefing =
      briefing?.items?.reduce(
        (acc: number, item: ComercialBriefingItem) =>
          acc + item.asistentes * item.precioUnitario + (item.importeFijo || 0),
        0,
      ) || 0
    const totalAjustes =
      safeAjustes.reduce((sum: number, ajuste: ComercialAjuste) => sum + ajuste.importe, 0) || 0
    const facturacionBruta = totalBriefing + totalAjustes
    const agencyCommission =
      (facturacionBruta * (serviceOrder?.agencyPercentage || 0)) / 100 +
      (serviceOrder?.agencyCommissionValue || 0)
    const spaceCommission =
      (facturacionBruta * (serviceOrder?.spacePercentage || 0)) / 100 +
      (serviceOrder?.spaceCommissionValue || 0)
    const netRevenue = facturacionBruta - agencyCommission - spaceCommission

    return { facturacionBruta, netRevenue }
  }, [serviceOrder, briefing, ajustes])

  const devolucionesPorCategoria = useMemo(() => {
    const safeReturnSheets = returnSheets || []
    const map: Record<string, number> = {}
    safeReturnSheets.forEach((sheet: ReturnSheet) => {
      sheet.items.forEach((item: any) => {
        const cat = item.category || 'Otros'
        const valorDevuelto = (item.quantityReturned || 0) * (item.price || 0)
        map[cat] = (map[cat] || 0) + valorDevuelto
      })
    })
    return map
  }, [returnSheets])

  const materialTotals = useMemo(() => {
    const safeMaterialOrders = materialOrders || []
    const materialMap = safeMaterialOrders.reduce((acc: Record<string, number>, order: MaterialOrder) => {
      const type = order.type || 'Otros'
      acc[type] = (acc[type] || 0) + (order.total ?? 0)
      return acc
    }, {})

    // Para Alquiler: sumar pedidos pendientes + pedidos enviados
    const alquilerPendientes = (allPedidosPendientes || []).reduce((sum: number, pedido: any) => {
      const pedidoTotal = (pedido.items || []).reduce((itemSum: number, item: any) => {
        return itemSum + ((item.priceSnapshot || item.price || 0) * (item.cantidad || 0))
      }, 0)
      return sum + pedidoTotal
    }, 0)

    const alquilerEnviados = (allPedidosEnviados || []).reduce((sum: number, pedido: any) => {
      const pedidoTotal = (pedido.items || []).reduce((itemSum: number, item: any) => {
        return itemSum + ((item.price || item.priceSnapshot || 0) * (item.cantidad || 0))
      }, 0)
      return sum + pedidoTotal
    }, 0)

    // Total alquiler = pendientes + enviados (no incluir materialOrders que es estado intermedio)
    materialMap['Alquiler'] = alquilerPendientes + alquilerEnviados

    return materialMap
  }, [materialOrders, allPedidosPendientes, allPedidosEnviados])

  const personalExternoCosts = useMemo(() => {
    if (!serviceOrder) return { planned: 0, real: 0 }
    const personalExternoData = (personalExternoArr as any) as PersonalExterno | null
    
    return {
      planned: calculatePersonalExternoTotal(personalExternoData, personalExternoAjustes || [], 'planned'),
      real: calculatePersonalExternoTotal(personalExternoData, personalExternoAjustes || [], 'real')
    }
  }, [personalExternoArr, personalExternoAjustes, serviceOrder?.id])

  const ctaData = useMemo(() => {
    if (!serviceOrder) return null

    const safeGastronomyOrders = gastronomyOrdersArr || []
    const safePruebasMenu = pruebasMenuArr || []
    const safeTransporteOrders = transporteOrders || []
    const safeDecoracionOrders = decoracionOrders || []
    const safeAtipicoOrders = atipicoOrders || []
    const safePersonalMiceOrders = personalMiceOrders || []

    const getModuleTotal = (orders: any[]) =>
      orders.reduce((sum: number, order: any) => sum + (order.total ?? order.precio ?? 0), 0)

    const gastronomyCost = getModuleTotal(safeGastronomyOrders)

    const getCierreCost = (label: string, presupuesto: number) => {
      const catMap: Record<string, string> = {
        [GASTO_LABELS.bodega]: 'Bodega',
        [GASTO_LABELS.consumibles]: 'Bio',
        [GASTO_LABELS.almacen]: 'Almacen',
        [GASTO_LABELS.alquiler]: 'Alquiler',
      }
      const cat = catMap[label]
      if (!cat) return presupuesto
      return Math.max(0, presupuesto - (devolucionesPorCategoria[cat] || 0))
    }

    const pruebaMenu = safePruebasMenu.find((p: PruebaMenuData) => p.osId === serviceOrder.id)

    const micecateringTemplate = plantillas?.find(p => p.nombre.toLowerCase() === 'micecatering')

    const currentObjetivo: ObjetivosGasto = (objetivo || micecateringTemplate || {
      nombre: 'Por defecto',
      name: 'Por defecto',
      id: 'default',
      gastronomia: 0,
      bodega: 0,
      consumibles: 0,
      almacen: 0,
      alquiler: 0,
      transporte: 0,
      decoracion: 0,
      atipicos: 0,
      personal_mice: 0,
      personal_externo: 0,
      coste_prueba_menu: 0,
    }) as ObjetivosGasto

    const costesBase = [
      { label: GASTO_LABELS.gastronomia, presupuesto: gastronomyCost, cierre: gastronomyCost },
      {
        label: GASTO_LABELS.bodega,
        presupuesto: materialTotals['Bodega'] || 0,
        cierre: getCierreCost(GASTO_LABELS.bodega, materialTotals['Bodega'] || 0),
      },
      {
        label: GASTO_LABELS.consumibles,
        presupuesto: materialTotals['Bio'] || 0,
        cierre: getCierreCost(GASTO_LABELS.consumibles, materialTotals['Bio'] || 0),
      },
      {
        label: GASTO_LABELS.almacen,
        presupuesto: materialTotals['Almacen'] || 0,
        cierre: getCierreCost(GASTO_LABELS.almacen, materialTotals['Almacen'] || 0),
      },
      {
        label: GASTO_LABELS.alquiler,
        presupuesto: materialTotals['Alquiler'] || 0,
        cierre: getCierreCost(GASTO_LABELS.alquiler, materialTotals['Alquiler'] || 0),
      },
      {
        label: GASTO_LABELS.transporte,
        presupuesto: getModuleTotal(safeTransporteOrders),
        cierre: getModuleTotal(safeTransporteOrders),
      },
      {
        label: GASTO_LABELS.decoracion,
        presupuesto: getModuleTotal(safeDecoracionOrders),
        cierre: getModuleTotal(safeDecoracionOrders),
      },
      {
        label: GASTO_LABELS.atipicos,
        presupuesto: getModuleTotal(safeAtipicoOrders),
        cierre: getModuleTotal(safeAtipicoOrders),
      },
      {
        label: GASTO_LABELS.personal_mice,
        presupuesto: calculatePersonalMiceTotal(safePersonalMiceOrders, 'planned'),
        cierre: calculatePersonalMiceTotal(safePersonalMiceOrders, 'real'),
      },
      {
        label: GASTO_LABELS.personal_externo,
        presupuesto: personalExternoCosts.planned,
        cierre: personalExternoCosts.real,
      },
      {
        label: GASTO_LABELS.coste_prueba_menu,
        presupuesto: pruebaMenu?.costePruebaMenu || 0,
        cierre: pruebaMenu?.costePruebaMenu || 0,
      },
    ]

    return {
      serviceOrder: serviceOrder || null,
      objetivos: currentObjetivo,
      costes: costesBase,
      facturacionNeta: revenueData.netRevenue,
    }
  }, [
    serviceOrder,
    revenueData.netRevenue,
    materialTotals,
    personalExternoCosts,
    transporteOrders,
    decoracionOrders,
    atipicoOrders,
    personalMiceOrders,
    pruebasMenuArr,
    gastronomyOrdersArr,
    devolucionesPorCategoria,
    objetivo,
    plantillas,
  ])

  const { serviceOrder: ctaServiceOrder, facturacionNeta = 0, objetivos = { nombre: 'Por defecto', id: 'default' } as ObjetivosGasto, costes = [] } = ctaData || { serviceOrder: null, facturacionNeta: 0, objetivos: { nombre: 'Por defecto', id: 'default' } as ObjetivosGasto, costes: [] }

  const ingresosAsistente = useMemo(() => 
    ctaServiceOrder?.asistentes ? facturacionNeta / ctaServiceOrder.asistentes : 0,
    [ctaServiceOrder?.asistentes, facturacionNeta]
  )

  const processedCostes: CostRow[] = useMemo(() => 
    costes.map((coste: { label: string; presupuesto: number; cierre: number }) => {
      const keyMap: { [key: string]: keyof Omit<ObjetivosGasto, 'id' | 'nombre'> } = {
        [GASTO_LABELS.gastronomia]: 'gastronomia',
        [GASTO_LABELS.bodega]: 'bodega',
        [GASTO_LABELS.consumibles]: 'consumibles',
        [GASTO_LABELS.almacen]: 'almacen',
        [GASTO_LABELS.alquiler]: 'alquiler',
        [GASTO_LABELS.transporte]: 'transporte',
        [GASTO_LABELS.decoracion]: 'decoracion',
        [GASTO_LABELS.atipicos]: 'atipicos',
        [GASTO_LABELS.personal_mice]: 'personal_mice',
        [GASTO_LABELS.personal_externo]: 'personal_externo',
        [GASTO_LABELS.coste_prueba_menu]: 'coste_prueba_menu',
      }
      const objKey = keyMap[coste.label]
      const objetivo_pct = objKey && objetivos?.[objKey] ? (objetivos[objKey] as number) / 100 : 0
      const realValue = realCostInputs[coste.label] ?? coste.cierre
      return {
        ...coste,
        real: realValue,
        objetivo: facturacionNeta * objetivo_pct,
        objetivo_pct: objetivo_pct,
        comentario: comentarios[coste.label] || '',
      }
    }),
    [costes, objetivos, realCostInputs, facturacionNeta, comentarios]
  )

  const totals = useMemo(() => ({
    totalPresupuesto: processedCostes.reduce(
      (sum: number, row: CostRow) => sum + row.presupuesto,
      0,
    ),
    totalCierre: processedCostes.reduce((sum: number, row: CostRow) => sum + row.cierre, 0),
    totalReal: processedCostes.reduce(
      (sum: number, row: CostRow) => sum + (row.real ?? row.cierre),
      0,
    ),
    totalObjetivo: processedCostes.reduce((sum: number, row: CostRow) => sum + row.objetivo, 0),
  }), [processedCostes])

  const rentabilidadData = useMemo(() => {
    const rentabilidadPresupuesto = facturacionNeta - totals.totalPresupuesto
    const rentabilidadPctPresupuesto =
      facturacionNeta > 0 ? rentabilidadPresupuesto / facturacionNeta : 0
    const repercusionHQPresupuesto = rentabilidadPresupuesto * 0.25
    const rentabilidadPostHQPresupuesto = rentabilidadPresupuesto - repercusionHQPresupuesto
    const rentabilidadPostHQPctPresupuesto =
      facturacionNeta > 0 ? rentabilidadPostHQPresupuesto / facturacionNeta : 0

    const rentabilidadCierre = facturacionNeta - totals.totalCierre
    const rentabilidadPctCierre = facturacionNeta > 0 ? rentabilidadCierre / facturacionNeta : 0
    const repercusionHQCierre = rentabilidadCierre * 0.25
    const rentabilidadPostHQCierre = rentabilidadCierre - repercusionHQCierre
    const rentabilidadPostHQPctCierre =
      facturacionNeta > 0 ? rentabilidadPostHQCierre / facturacionNeta : 0

    const rentabilidadReal = facturacionNeta - totals.totalReal
    const rentabilidadPctReal = facturacionNeta > 0 ? rentabilidadReal / facturacionNeta : 0
    const repercusionHQReal = rentabilidadReal * 0.25
    const rentabilidadPostHQReal = rentabilidadReal - repercusionHQReal
    const rentabilidadPostHQPctReal =
      facturacionNeta > 0 ? rentabilidadPostHQReal / facturacionNeta : 0

    return {
      rentabilidadPresupuesto,
      rentabilidadPctPresupuesto,
      repercusionHQPresupuesto,
      rentabilidadPostHQPresupuesto,
      rentabilidadPostHQPctPresupuesto,
      rentabilidadCierre,
      rentabilidadPctCierre,
      repercusionHQCierre,
      rentabilidadPostHQCierre,
      rentabilidadPostHQPctCierre,
      rentabilidadReal,
      rentabilidadPctReal,
      repercusionHQReal,
      rentabilidadPostHQReal,
      rentabilidadPostHQPctReal,
    }
  }, [facturacionNeta, totals])

  const {
    rentabilidadPresupuesto,
    rentabilidadPctPresupuesto,
    repercusionHQPresupuesto,
    rentabilidadPostHQPresupuesto,
    rentabilidadPostHQPctPresupuesto,
    rentabilidadCierre,
    rentabilidadPctCierre,
    repercusionHQCierre,
    rentabilidadPostHQCierre,
    rentabilidadPostHQPctCierre,
    rentabilidadReal,
    rentabilidadPctReal,
    repercusionHQReal,
    rentabilidadPostHQReal,
    rentabilidadPostHQPctReal,
  } = rentabilidadData

  const handleObjetivoChange = async (plantillaId: string) => {
    if (!serviceOrder?.id || !plantillas?.length) return
    const plantilla = plantillas.find((p) => p.id === plantillaId)
    if (plantilla) {
      // Omitir el ID de la plantilla para que el upsert use el os_id como clave de conflicto
      const { id, nombre, ...objetivoSinId } = plantilla
      try {
        // 1. Actualizar los valores de los objetivos para esta OS
        await updateObjetivo.mutateAsync({ 
          osId: serviceOrder.id, 
          objetivo: { ...objetivoSinId, nombre: plantilla.nombre } as ObjetivosGasto 
        })

        // 2. Guardar la referencia de la plantilla en la OS
        await updateEvento.mutateAsync({
          id: serviceOrder.id,
          objetivoGastoId: plantillaId
        })

        toast({
          title: 'Plantilla aplicada',
          description: `Se ha aplicado la plantilla "${plantilla.nombre}".`,
        })
      } catch (e) {
        toast({
          title: 'Error',
          description: 'No se pudo aplicar la plantilla.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['materialOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['hieloOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['transporteOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['decoracionOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['atipicoOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['personalMiceOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['personalExterno', osId] })
    queryClient.invalidateQueries({ queryKey: ['gastronomyOrders', osId] })
    queryClient.invalidateQueries({ queryKey: ['returnSheets', osId] })
    toast({ title: 'Datos actualizados' })
  }

  const handleSaveRealCost = useCallback(async (label: string, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value) || 0
    setRealCostInputs((prev) => ({ ...prev, [label]: numericValue }))
    try {
      await updateRealCosts.mutateAsync({ osId, costs: { ...realCostInputs, [label]: numericValue } })
      toast({ title: 'Coste Real Guardado', description: 'El valor se ha guardado en Supabase.' })
    } catch (e) {
      toast({ title: 'Error al guardar', description: String(e), variant: 'destructive' })
    }
  }, [realCostInputs, osId, updateRealCosts, toast])

  const handleSaveComentario = async () => {
    if (!editingComment) return
    const newComentarios = { ...comentarios, [editingComment.label]: editingComment.text }
    setComentarios(newComentarios)
    try {
      await updateComentarios.mutateAsync({ osId, comentarios: newComentarios })
      setEditingComment(null)
      toast({ title: 'Comentario guardado' })
    } catch (e) {
      toast({
        title: 'Error al guardar comentario',
        description: String(e),
        variant: 'destructive',
      })
    }
  }

  if (!ctaData) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Summary Card */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="py-4 px-6 border-b border-border/40 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Euro className="h-4 w-4 text-blue-500" />
                </div>
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Análisis de Costes
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Plantilla: <span className="text-foreground">{objetivos.nombre}</span>
                </div>
                
                <div className="h-4 w-[1px] bg-border/60 mx-1" />
                
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm"
                  className="h-7 px-2 text-[9px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Actualizar
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7 border-border/40">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Plantilla de Objetivos
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {(plantillas || []).map((p) => (
                        <DropdownMenuItem 
                          key={p.id} 
                          onSelect={() => handleObjetivoChange(p.id)}
                          className="text-xs"
                        >
                          {p.nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Facturación Neta Highlight */}
            <div className="bg-blue-500/5 border-y border-blue-500/10 px-6 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
                Facturación Neta del Servicio
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {formatCurrency(facturacionNeta)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/40">
                    <TableHead className="h-10 px-3 sticky left-0 bg-muted/30 z-10 text-[10px] font-black uppercase tracking-widest">
                      Partida
                    </TableHead>
                    <TableHead colSpan={2} className="h-10 px-3 text-center border-l border-border/40 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      Presupuesto
                    </TableHead>
                    <TableHead colSpan={2} className="h-10 px-3 text-center border-l border-border/40 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Cierre
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1.5 cursor-help">
                            <Info className="h-3 w-3 inline opacity-50" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Presupuesto menos devoluciones y mermas.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead colSpan={2} className="h-10 px-3 text-center border-l border-border/40 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Real
                    </TableHead>
                    <TableHead colSpan={2} className="h-10 px-3 text-center border-l border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Objetivo
                    </TableHead>
                    <TableHead colSpan={2} className="h-10 px-3 text-center border-l border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Desviación
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedCostes.map((row) => (
                    <CostRowComponent
                      key={row.label}
                      row={row}
                      facturacionNeta={facturacionNeta}
                      realCostValue={realCostInputs[row.label]}
                      handleSaveRealCost={handleSaveRealCost}
                      setEditingComment={setEditingComment}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Rentabilidad Card */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle className="text-[14px] font-black uppercase tracking-widest">
                Análisis de Rentabilidad
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40">
                  <TableHead className="h-10 px-6 text-[10px] font-black uppercase tracking-widest">Concepto</TableHead>
                  <TableHead className="h-10 px-6 text-right text-[10px] font-black uppercase tracking-widest">Presupuesto</TableHead>
                  <TableHead className="h-10 px-6 text-right text-[10px] font-black uppercase tracking-widest">Cierre</TableHead>
                  <TableHead className="h-10 px-6 text-right text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Real</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Facturación Neta</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] font-bold">{formatCurrency(facturacionNeta)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] font-bold">{formatCurrency(facturacionNeta)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(facturacionNeta)}</TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Costes</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px]">{formatCurrency(totals.totalPresupuesto)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px]">{formatCurrency(totals.totalCierre)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px]">{formatCurrency(totals.totalReal)}</TableCell>
                </TableRow>
                <TableRow className="bg-emerald-500/[0.03] border-b border-border/40">
                  <TableCell className="py-4 px-6 text-[12px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">Rentabilidad Bruta</TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[14px] font-black", rentabilidadPresupuesto >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadPresupuesto)}
                  </TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[14px] font-black", rentabilidadCierre >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadCierre)}
                  </TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[16px] font-black", rentabilidadReal >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadReal)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b border-border/40">
                  <TableCell className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Repercusión HQ (25%)</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] text-muted-foreground/60">{formatCurrency(repercusionHQPresupuesto)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] text-muted-foreground/60">{formatCurrency(repercusionHQCierre)}</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] text-muted-foreground/60">{formatCurrency(repercusionHQReal)}</TableCell>
                </TableRow>
                <TableRow className="bg-emerald-500/[0.05] border-b border-border/40">
                  <TableCell className="py-4 px-6 text-[12px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">Rentabilidad Post-HQ</TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[14px] font-black", rentabilidadPostHQPresupuesto >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadPostHQPresupuesto)}
                  </TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[14px] font-black", rentabilidadPostHQCierre >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadPostHQCierre)}
                  </TableCell>
                  <TableCell className={cn("py-4 px-6 text-right font-mono text-[16px] font-black", rentabilidadPostHQReal >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatCurrency(rentabilidadPostHQReal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ingresos / Asistente</TableCell>
                  <TableCell className="py-3 px-6 text-right font-mono text-[12px] font-bold" colSpan={3}>
                    {formatCurrency(ingresosAsistente)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentario para: {editingComment?.label}</DialogTitle>
            <DialogDescription>
              Añade una nota explicativa para esta partida de coste.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingComment?.text || ''}
            onChange={(e) =>
              setEditingComment((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            rows={5}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cerrar</Button>
            </DialogClose>
            <Button onClick={handleSaveComentario}>
              <Save className="mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
