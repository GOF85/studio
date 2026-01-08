'use client'
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ArrowLeft,
  Users,
  Building2,
  Save,
  Loader2,
  PlusCircle,
  Trash2,
  Copy,
  Calendar as CalendarIcon,
  Info,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Send,
  Printer,
  FileText,
  Upload,
  Settings2,
  Calculator,
} from 'lucide-react'

import type {
  PersonalExternoAjuste,
  ServiceOrder,
  ComercialBriefing,
  ComercialBriefingItem,
  PersonalExterno,
  CategoriaPersonal,
  Proveedor,
  PersonalExternoTurno,
  AsignacionPersonal,
  EstadoTurnoPersonal,
} from '@/types'
import { ESTADO_TURNO_PERSONAL, AJUSTE_CONCEPTO_OPCIONES, CENTRO_COSTE_OPCIONES } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { FeedbackDialog } from '@/components/portal/feedback-dialog'
import { BriefingSummaryTrigger } from '@/components/os/briefing-summary-dialog'
import { calculateHours, formatCurrency, formatDuration } from '@/lib/utils'
import {
  useEvento,
  useComercialBriefings,
  useCategoriasPersonal,
  useProveedores,
  usePersonalExterno,
  usePersonalExternoAjustes,
  useAllPersonalExternoAssignments,
} from '@/hooks/use-data-queries'
import {
  useUpdatePersonalExterno,
  useCreatePersonalExterno,
  useSyncPersonalExternoAjustes,
} from '@/hooks/mutations/use-personal-externo-mutations'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useImpersonatedUser } from '@/hooks/use-impersonated-user'
import { logActivity } from '@/app/(dashboard)/portal/activity-log/utils'
import { ActivityLogSheet } from '@/components/os/activity-log-sheet'

import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'

const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const
const SOLICITADO_POR_OPTIONS = ['SALA', 'PASE'] as const

const ExternoHeaderMetrics = memo(({ control, facturacion = 0, osId }: { control: any, facturacion: number, osId: string }) => {
  const watchedTurnos = useWatch({
    control,
    name: 'turnos'
  })
  const watchedAjustes = useWatch({
    control,
    name: 'ajustes'
  })

  // Objetivos de Gasto
  const { data: objetivos } = useObjetivosGasto(osId)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const { objetivoValue, objetivoPctLabel } = useMemo(() => {
    // Buscamos el objetivo específico de la OS o la plantilla 'personal_externo', 'micecatering' o 'general'
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => {
      const name = p.nombre?.toLowerCase() || ''
      return name === 'general' || name === 'micecatering' || name === 'mice catering'
    })
    
    // Usamos el campo personal_externo si existe, si no personal_mice como fallback
    const pct = objetivoTemplate?.personal_externo || objetivoTemplate?.personal_mice || 0
    const objetivoPct = (Number(pct) || 0) / 100
    
    return { 
      objetivoValue: facturacion * objetivoPct, 
      objetivoPctLabel: `${Number(pct).toFixed(1)}%` 
    }
  }, [objetivos, plantillas, facturacion])

  const { totalPlanned } = useMemo(() => {
    if (!watchedTurnos) return { totalPlanned: 0 }

    const stats = watchedTurnos.reduce(
      (acc: { planned: number }, order: any) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida)
        acc.planned += plannedHours * (order.precioHora || 0)
        return acc
      },
      { planned: 0 },
    )

    const totalAjustes = watchedAjustes?.reduce((sum: number, a: any) => sum + (Number(a.importe) || 0), 0) || 0

    return { totalPlanned: stats.planned + totalAjustes }
  }, [watchedTurnos, watchedAjustes])

  const desviacionPct = useMemo(() => {
    if (!objetivoValue || objetivoValue === 0) return 0
    return ((totalPlanned - objetivoValue) / objetivoValue) * 100
  }, [totalPlanned, objetivoValue])

  const planificadoPctFacturacion = useMemo(() => {
    if (!facturacion || facturacion === 0) return '0%'
    return `${((totalPlanned / facturacion) * 100).toFixed(1)}%`
  }, [totalPlanned, facturacion])

  return (
    <div className="flex items-center gap-2">
      {/* Presupuesto Actual */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 px-3 py-1 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 rounded-lg transition-all cursor-help">
            <span className="text-[10px] font-bold uppercase text-blue-600/70 tracking-wider">Planificado</span>
            <div className="flex items-baseline gap-0.5">
              <span className="font-black text-sm md:text-base text-blue-700 tabular-nums">
                {formatCurrency(totalPlanned).split(',')[0]}
              </span>
              <span className="text-[10px] font-bold text-blue-600/60">
                ,{formatCurrency(totalPlanned).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          {planificadoPctFacturacion} de facturación
        </TooltipContent>
      </Tooltip>

      {/* Objetivo de Gasto */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 px-3 py-1 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 rounded-lg transition-all cursor-help">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Objetivo</span>
            <div className="flex items-baseline gap-0.5">
              <span className="font-black text-sm md:text-base text-foreground tabular-nums">
                {formatCurrency(objetivoValue).split(',')[0]}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/60">
                ,{formatCurrency(objetivoValue).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          Configurado al {objetivoPctLabel}
        </TooltipContent>
      </Tooltip>

      {/* Desviación Crítica */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-3 px-3 py-1 border rounded-lg shadow-sm transition-all duration-300 cursor-help bg-white",
            desviacionPct > 0 ? 'border-red-200 text-red-600' : 'border-emerald-200 text-emerald-600'
          )}>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Desviación</span>
            <span className="font-black text-sm md:text-base tabular-nums">
              {isFinite(desviacionPct) ? `${desviacionPct > 0 ? '+' : ''}${desviacionPct.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          Diferencia: {formatCurrency(totalPlanned - objetivoValue)}
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

ExternoHeaderMetrics.displayName = 'ExternoHeaderMetrics'

const PersonalExternoRow = memo(
  ({
    index,
    control,
    handleCategoryChange,
    categoriaOptions,
    onRemove,
  }: {
    index: number
    control: any
    handleCategoryChange: (index: number, catId: string) => void
    categoriaOptions: any[]
    onRemove: (index: number) => void
  }) => {
    const watchedTurno = useWatch({
      control,
      name: `turnos.${index}`,
    })

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'Confirmado':
          return (
            <div className="h-6 px-2 rounded-md border border-emerald-200 flex items-center gap-1.5 bg-background">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span className="text-[9px] font-black uppercase text-emerald-700">CONF</span>
            </div>
          )
        case 'Solicitado':
          return (
            <div className="h-6 px-2 rounded-md border border-blue-200 flex items-center gap-1.5 bg-background">
              <Send className="h-3 w-3 text-blue-500" />
              <span className="text-[9px] font-black uppercase text-blue-700">SOLIC</span>
            </div>
          )
        case 'Cancelado':
          return (
            <div className="h-6 px-2 rounded-md border border-red-200 flex items-center gap-1.5 bg-background">
              <Trash2 className="h-3 w-3 text-red-500" />
              <span className="text-[9px] font-black uppercase text-red-700">CANC</span>
            </div>
          )
        default:
          return (
            <div className="h-6 px-2 rounded-md border border-border flex items-center gap-1.5 bg-background">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] font-black uppercase text-muted-foreground">PEND</span>
            </div>
          )
      }
    }

    return (
      <TableRow className="border-border/40 group hover:bg-muted/20 transition-colors">
        <TableCell className="px-3 py-1.5 w-[90px]">
          <FormField
            control={control}
            name={`turnos.${index}.solicitadoPor`}
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-7 w-full text-[10px] font-bold border-border/40 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SOLICITADO_POR_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="text-[10px]">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="px-3 py-1.5 min-w-[250px]">
          <FormField
            control={control}
            name={`turnos.${index}.categoriaId`}
            render={({ field }) => (
              <FormItem>
                <Combobox
                  options={categoriaOptions}
                  value={field.value}
                  onChange={(value) => handleCategoryChange(index, value)}
                  placeholder="Categoría..."
                  className="h-7 text-[11px] font-bold w-full"
                />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="px-3 py-1.5 w-[130px]">
          <FormField
            control={control}
            name={`turnos.${index}.tipoServicio`}
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value || 'Servicio'}>
                  <FormControl>
                    <SelectTrigger className="h-7 w-full text-[10px] bg-transparent border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tipoServicioOptions.map((o) => (
                      <SelectItem key={o} value={o} className="text-[10px]">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="px-2 py-1.5 w-[200px]">
          <div className="flex items-center justify-center gap-1">
            <FormField
              control={control}
              name={`turnos.${index}.horaEntrada`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="h-7 w-20 text-[10px] font-mono border-border/40 bg-transparent p-1 px-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <span className="text-muted-foreground px-0.5">-</span>
            <FormField
              control={control}
              name={`turnos.${index}.horaSalida`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="h-7 w-20 text-[10px] font-mono border-border/40 bg-transparent p-1 px-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </TableCell>
        <TableCell className="px-3 py-1.5 w-[80px]">
          <div className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50/50 text-center py-0.5 px-1.5 rounded border border-blue-100">
            {calculateHours(watchedTurno?.horaEntrada, watchedTurno?.horaSalida).toFixed(1)}h
          </div>
        </TableCell>
        <TableCell className="px-3 py-1.5 w-[90px]">
          <FormField
            control={control}
            name={`turnos.${index}.precioHora`}
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    className="h-7 w-full text-[10px] font-mono border-border/40 bg-transparent text-right pr-4"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">€</span>
                </div>
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="px-3 py-1.5 text-right text-[10px] font-mono font-bold text-foreground bg-muted/5 w-[100px]">
          {formatCurrency(calculateHours(watchedTurno?.horaEntrada, watchedTurno?.horaSalida) * (watchedTurno?.precioHora || 0))}
        </TableCell>
        <TableCell className="px-3 py-1.5 w-[50px] text-center">
          <CommentDialog turnoIndex={index} />
        </TableCell>
        <TableCell className="px-3 py-1.5 w-[120px]">
          <FormField
            control={control}
            name={`turnos.${index}.statusPartner`}
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-none shadow-none p-0 h-auto bg-transparent focus:ring-0 [&>svg]:hidden w-full flex justify-center">
                      {getStatusBadge(field.value)}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ESTADO_TURNO_PERSONAL.map((s) => (
                      <SelectItem key={s} value={s} className="text-[10px]">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="px-3 py-1.5 text-right w-[50px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 transition-colors"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4 stroke-[3px]" />
          </Button>
        </TableCell>
      </TableRow>
    )
  },
)

PersonalExternoRow.displayName = 'PersonalExternoRow'

const CostSummary = memo(() => {
  const { control } = useFormContext()
  const watchedFields = useWatch({ control, name: 'turnos' })
  const watchedAjustes = useWatch({ control, name: 'ajustes' })

  const { totalPlanned, totalReal, totalAjustes, costeFinalPlanificado, finalTotalReal } =
    useMemo(() => {
      const planned =
        watchedFields?.reduce((acc: number, order: any) => {
          const plannedHours = calculateHours(order.horaEntrada, order.horaSalida)
          const asignaciones = order.asignaciones || []
          const quantity = asignaciones.length > 0 ? asignaciones.length : 1
          return acc + plannedHours * (order.precioHora || 0) * quantity
        }, 0) || 0

      const real =
        watchedFields?.reduce((acc: number, order: any) => {
          return (
            acc +
            (order.asignaciones || []).reduce((sumAsignacion: number, asignacion: any) => {
              const realHours = calculateHours(
                asignacion.horaEntradaReal,
                asignacion.horaSalidaReal,
              )
              const hoursToUse =
                realHours > 0 ? realHours : calculateHours(order.horaEntrada, order.horaSalida)
              return sumAsignacion + hoursToUse * (order.precioHora || 0)
            }, 0)
          )
        }, 0) || 0

      const aj = watchedAjustes?.reduce((sum: number, ajuste: any) => sum + ajuste.importe, 0) || 0
      return {
        totalPlanned: planned,
        totalReal: real,
        totalAjustes: aj,
        costeFinalPlanificado: planned + aj,
        finalTotalReal: real + aj,
      }
    }, [watchedFields, watchedAjustes])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-background border-border/60 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coste Planificado</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="text-xl font-black text-foreground">
            {formatCurrency(costeFinalPlanificado)}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-1">
            {formatCurrency(totalPlanned)} turnos + {formatCurrency(totalAjustes)} ajustes
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background border-border/60 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coste Real Final</span>
            <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="text-xl font-black text-foreground">
            {formatCurrency(finalTotalReal)}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-1">
            {formatCurrency(totalReal)} turnos + {formatCurrency(totalAjustes)} ajustes
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background border-border/60 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Desviación</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className={cn(
            "text-xl font-black",
            finalTotalReal > costeFinalPlanificado ? "text-yellow-500" : "text-emerald-600"
          )}>
            {formatCurrency(finalTotalReal - costeFinalPlanificado)}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-1">
            {((finalTotalReal / (costeFinalPlanificado || 1) - 1) * 100).toFixed(1)}% sobre planificado
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

CostSummary.displayName = 'CostSummary'

const CierreHorasReales = memo(({ form, allAssignments, currentOsId }: { form: any; allAssignments: any[]; currentOsId: string }) => {
  const { control } = form
  const watchedFields = useWatch({ control, name: 'turnos' })

  const checkConflict = useCallback((workerDni: string, date: string, start: string, end: string, currentAsigId: string) => {
    if (!workerDni || !date) return null
    
    // Convert current times to minutes for comparison
    const parseTime = (t: string) => {
      if (!t) return 0
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    const currentStart = parseTime(start)
    const currentEnd = parseTime(end)

    // Check against ALL other assignments in the database
    const externalConflict = allAssignments.find(a => 
      a.workerDni === workerDni && 
      a.osId !== currentOsId && 
      a.fecha === date &&
      !(parseTime(a.horaSalida) <= currentStart || parseTime(a.horaEntrada) >= currentEnd)
    )

    if (externalConflict) return { type: 'external', event: externalConflict.eventoNombre }

    // Check against other rows in the CURRENT form
    let internalConflict = false
    watchedFields.forEach((turno: any, tIdx: number) => {
      if (turno.fecha === date) {
        turno.asignaciones?.forEach((asig: any, aIdx: number) => {
          if (asig.dni === workerDni && asig.id !== currentAsigId) {
             const localStart = parseTime(turno.horaEntrada)
             const localEnd = parseTime(turno.horaSalida)
             if (!(localEnd <= currentStart || localStart >= currentEnd)) {
               internalConflict = true
             }
          }
        })
      }
    })

    if (internalConflict) return { type: 'internal' }

    return null
  }, [allAssignments, currentOsId, watchedFields])

  const turnosAprobados = useMemo(() => {
    return (
      watchedFields?.filter(
        (t: any) => t.statusPartner === 'Confirmado' && t.asignaciones && t.asignaciones.length > 0,
      ) || []
    )
  }, [watchedFields])

  if (turnosAprobados.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="h-32 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-20" />
            <p className="text-[11px] font-medium uppercase tracking-wider">No hay turnos confirmados para cierre</p>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {watchedFields.map((turno: any, turnoIndex: number) => {
        if (
          turno.statusPartner !== 'Confirmado' ||
          !turno.asignaciones ||
          turno.asignaciones.length === 0
        )
          return null

        return turno.asignaciones.map((asignacion: any, asigIndex: number) => {
          const realHours = calculateHours(
            asignacion.horaEntradaReal,
            asignacion.horaSalidaReal,
          )
          const plannedHours = calculateHours(
            turno.horaEntrada,
            turno.horaSalida,
          )
          const deviation = realHours > 0 ? realHours - plannedHours : 0
          const hasTimeMismatch = Math.abs(deviation) > 0.01
          
          const conflict = checkConflict(asignacion.dni, turno.fecha, turno.horaEntrada, turno.horaSalida, asignacion.id)

          return (
            <TableRow
              key={asignacion.id}
              className={cn(
                "border-border/40 group transition-colors",
                hasTimeMismatch ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/20'
              )}
            >
              <TableCell className="px-4 py-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-tight">{asignacion.nombre}</span>
                    {conflict && (
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <AlertTriangle className="h-4 w-4 text-yellow-500 fill-yellow-500/10 animate-pulse" />
                         </TooltipTrigger>
                         <TooltipContent className="text-[10px] bg-yellow-400 text-black border-yellow-500 font-bold shadow-xl">
                           {conflict.type === 'external' 
                            ? `CONFLICTO: OCUPADO EN ${conflict.event.toUpperCase()}` 
                            : 'DOBLE RESERVA EN ESTE EVENTO'}
                         </TooltipContent>
                       </Tooltip>
                    )}
                  </div>
                  {hasTimeMismatch && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-yellow-600 bg-yellow-400/10 w-fit px-1.5 py-0.5 rounded border border-yellow-400/50">
                      <Clock className="h-3 w-3" />
                      Desviación: {deviation > 0 ? '+' : ''}{formatDuration(deviation)}h
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4 py-2 text-[11px] font-mono text-muted-foreground">
                {asignacion.dni || '---'}
              </TableCell>
              <TableCell className="px-4 py-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {format(new Date(turno.fecha), 'dd/MM/yy')}
                  </span>
                  <span className="text-[11px] font-medium">
                    {turno.horaEntrada} - {turno.horaSalida}
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-2 py-2 bg-emerald-500/5 border-l border-border/40">
                <FormField
                  control={control}
                  name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`}
                  render={({ field }) => (
                    <Input
                      type="time"
                      {...field}
                      value={field.value ?? ""}
                      className="h-8 text-[11px] border-border/40 bg-background/50 text-center"
                    />
                  )}
                />
              </TableCell>
              <TableCell className="px-2 py-2 bg-emerald-500/5 border-r border-border/40">
                <FormField
                  control={control}
                  name={`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`}
                  render={({ field }) => (
                    <Input
                      type="time"
                      {...field}
                      value={field.value ?? ""}
                      className="h-8 text-[11px] border-border/40 bg-background/50 text-center"
                    />
                  )}
                />
              </TableCell>
              <TableCell className="px-4 py-2 text-center">
                <FeedbackDialog
                  turnoIndex={turnoIndex}
                  asigIndex={asigIndex}
                  form={form}
                />
              </TableCell>
            </TableRow>
          )
        })
      })}
    </>
  )
})

CierreHorasReales.displayName = 'CierreHorasReales'

const asignacionSchema = z.object({
  id: z.string().optional().nullable(),
  nombre: z.string().optional().nullable().default(''),
  dni: z.string().optional().nullable().default(''),
  telefono: z.string().optional().nullable().default(''),
  email: z.string().optional().nullable().default(''),
  comentarios: z.string().optional().nullable().default(''),
  rating: z.number().optional().nullable().default(0),
  comentariosMice: z.string().optional().nullable().default(''),
  horaEntradaReal: z.string().optional().nullable().default(''),
  horaSalidaReal: z.string().optional().nullable().default(''),
})

const personalTurnoSchema = z.object({
  id: z.string().optional().nullable(),
  categoriaId: z.string().min(1, 'La categoría es obligatoria'),
  proveedorId: z.string().optional().nullable(),
  categoria: z.string().optional().nullable().default(''),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.any({ required_error: 'La fecha es obligatoria.' }),
  horaEntrada: z.string().optional().nullable().default('09:00'),
  horaSalida: z.string().optional().nullable().default('17:00'),
  solicitadoPor: z.string().optional().nullable().default('SALA'),
  tipoServicio: z.string().optional().nullable().default('Servicio'),
  observaciones: z.string().optional().nullable().default(''),
  statusPartner: z.string().optional().nullable().default('Pendiente'),
  asignaciones: z.array(asignacionSchema).optional().nullable().default([]),
  requiereActualizacion: z.boolean().optional().nullable().default(false),
})

const formSchema = z.object({
  turnos: z.array(personalTurnoSchema),
  ajustes: z
    .array(
      z.object({
        id: z.string(),
        proveedorId: z.string().min(1, 'Debe seleccionar un proveedor.'),
        concepto: z.string().min(1, 'El concepto del ajuste es obligatorio.'),
        importe: z.coerce.number(),
      }),
    )
    .optional(),
  observacionesGenerales: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

function CommentDialog({ turnoIndex }: { turnoIndex: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const { getValues, setValue } = useFormContext()

  const fieldName = `turnos.${turnoIndex}.observaciones`
  const dialogTitle = `Observaciones para la ETT`

  const [comment, setComment] = useState('')

  useEffect(() => {
    if (isOpen) {
      setComment(getValues(fieldName) || '')
    }
  }, [isOpen, getValues, fieldName])

  const handleSave = () => {
    setValue(fieldName, comment, { shouldDirty: true })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
          <FileText className={cn('h-4 w-4', getValues(fieldName) && 'text-primary')} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Añade aquí comentarios..."
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PersonalExternoPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [personalExterno, setPersonalExterno] = useState<PersonalExterno | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<number | null>(null)
  const [deletedNames, setDeletedNames] = useState<string[]>([])
  const isInitialized = useRef(false)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()
  const { impersonatedUser } = useImpersonatedUser()

  // Supabase Queries
  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: briefings } = useComercialBriefings(serviceOrder?.id)
  const { data: categoriasPersonal = [] } = useCategoriasPersonal()
  const { data: proveedores = [] } = useProveedores()
  const { data: personalExternoDB, isLoading: isLoadingPersonal } = usePersonalExterno(
    serviceOrder?.id,
  ) as { data: PersonalExterno | null; isLoading: boolean }
  const { data: ajustesDB = [] } = usePersonalExternoAjustes(serviceOrder?.id)
  const { data: allAssignments = [] } = useAllPersonalExternoAssignments()

  // Supabase Mutations
  const updatePersonalMutation = useUpdatePersonalExterno()
  const createPersonalMutation = useCreatePersonalExterno()
  const syncAjustesMutation = useSyncPersonalExternoAjustes()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [], ajustes: [], observacionesGenerales: '' },
  })

  const { control, setValue, watch, trigger, getValues, handleSubmit, formState } = form

  // Extraemos las fechas de cada turno para agrupar
  const watchedDates = useWatch({
    control,
    name: 'turnos',
  }).map((t: any) => t.fecha)

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'turnos',
  })

  // Agrupación por días (memoizada para evitar saltos de UI)
  const { uniqueDays, groupedIndicesByDay } = useMemo(() => {
    const groups: Record<string, number[]> = {}
    
    watchedDates.forEach((fecha, idx) => {
      if (fecha) {
        // Normalizamos la fecha a formato ISO (YYYY-MM-DD) usando métodos locales 
        // para evitar desfases por zona horaria al comparar Date vs String
        const d = new Date(fecha)
        const y = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, '0')
        const da = String(d.getDate()).padStart(2, '0')
        const dateKey = `${y}-${mo}-${da}`

        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(idx)
      }
    })

    // Las llaves únicas son los días que tienen turnos
    const days = Object.keys(groups).sort()

    return { uniqueDays: days, groupedIndicesByDay: groups }
  }, [watchedDates])

  const duplicateDay = (sourceDay: string) => {
    // 1. Encontrar los turnos del día origen
    const sourceIndices = groupedIndicesByDay[sourceDay] || []
    if (sourceIndices.length === 0) return

    // 2. Determinar la siguiente fecha disponible del briefing
    const existingDays = new Set(uniqueDays)
    const nextDate = briefingItems
      .map((b) => {
        const d = new Date(b.fecha)
        const y = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, '0')
        const da = String(d.getDate()).padStart(2, '0')
        return `${y}-${mo}-${da}`
      })
      .find((f) => !existingDays.has(f))

    if (!nextDate) {
      toast({
        title: 'Error',
        description: 'No hay más fechas disponibles en el briefing',
        variant: 'destructive',
      })
      return
    }

    // 3. Duplicar cada turno al nuevo día
    sourceIndices.forEach((idx) => {
      const sourceData = fields[idx]
      if (!sourceData) return
      
      const { id, ...dataToDuplicate } = sourceData
      addRow({
        ...dataToDuplicate,
        id: crypto.randomUUID(), // Nueva entrada
        fecha: new Date(nextDate),
        asignaciones: [], // No duplicar personas asignadas
      })
    })

    toast({
      title: 'Éxito',
      description: `Día duplicado al ${nextDate}`,
    })
  }

  const {
    fields: ajusteFields,
    append: appendAjuste,
    remove: removeAjuste,
  } = useFieldArray({
    control,
    name: 'ajustes',
  })

  const watchedAjustes = watch('ajustes')
  const totalAjustes = useMemo(() => {
    return (watchedAjustes || []).reduce((acc, curr) => acc + (Number(curr.importe) || 0), 0)
  }, [watchedAjustes])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Avoid initializing until we have the OS ID and the first data load state is definitive
    if (!serviceOrder?.id || isLoadingPersonal || !isMounted) return

    if (personalExternoDB && !isInitialized.current) {
      form.reset({
        turnos: personalExternoDB.turnos.map((t) => ({ 
          ...t, 
          fecha: new Date(t.fecha),
          horaEntrada: t.horaEntrada?.split(':').slice(0, 2).join(':') || '09:00',
          horaSalida: t.horaSalida?.split(':').slice(0, 2).join(':') || '17:00',
          asignaciones: (t.asignaciones || []).map(a => ({
            ...a,
            horaEntradaReal: a.horaEntradaReal?.split(':').slice(0, 2).join(':') || '',
            horaSalidaReal: a.horaSalidaReal?.split(':').slice(0, 2).join(':') || '',
          }))
        })),
        ajustes: ajustesDB || [],
        observacionesGenerales: personalExternoDB.observacionesGenerales || '',
      })
      setPersonalExterno(personalExternoDB)
      isInitialized.current = true
    } else if (personalExternoDB === null && !isInitialized.current) {
      // Initialize with empty state ONLY if we are sure there's no data in DB
      setPersonalExterno({ osId: serviceOrder.id, turnos: [], status: 'Pendiente' })
      isInitialized.current = true
    }
  }, [personalExternoDB, ajustesDB, form, isMounted, isLoadingPersonal, serviceOrder?.id])

  const briefingItems = useMemo(() => {
    if (!briefings) return []
    return briefings.flatMap((b) => b.items)
  }, [briefings])

  const handleCategoryChange = useCallback(
    (index: number, categoriaId: string) => {
      if (!categoriaId) return
      const cat = categoriasPersonal.find((p) => p.id === categoriaId)
      if (cat) {
        setValue(`turnos.${index}.categoriaId`, cat.id, { shouldDirty: true })
        setValue(`turnos.${index}.proveedorId`, cat.proveedor_id || null, { shouldDirty: true })
        setValue(`turnos.${index}.categoria`, cat.nombre || '', { shouldDirty: true })
        setValue(`turnos.${index}.precioHora`, cat.precio_hora_base || 0, { shouldDirty: true })
        trigger(`turnos.${index}`)
      }
    },
    [categoriasPersonal, setValue, trigger],
  )

  const handleGlobalStatusAction = async (newStatus: EstadoTurnoPersonal) => {
    if (!personalExterno || !serviceOrder?.id) return

    const updatedTurnos = personalExterno.turnos.map((t) => ({
      ...t,
      requiereActualizacion: newStatus === 'Solicitado' ? true : t.requiereActualizacion,
    }))

    try {
      await updatePersonalMutation.mutateAsync({
        osId: serviceOrder.id,
        updates: {
          status: newStatus as any,
          turnos: updatedTurnos,
          observacionesGenerales: getValues('observacionesGenerales'),
        },
      })
      toast({
        title: 'Estado actualizado',
        description: `La solicitud de personal ahora está: ${newStatus}`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
      })
    }
  }

  const isSolicitudDesactualizada = useMemo(() => {
    if (personalExterno?.status !== 'Solicitado') return false
    if (!formState.isDirty) return false
    const savedTurnos = new Map(personalExterno.turnos.map((t) => [t.id, t]))
    const currentTurnos = getValues('turnos')
    if (savedTurnos.size !== currentTurnos.length) return true
    return currentTurnos.some((current) => {
      const saved = savedTurnos.get(current.id)
      if (!saved) return true
      const { asignaciones, requiereActualizacion, ...savedRest } = saved
      const {
        asignaciones: currentAsignaciones,
        requiereActualizacion: currentReq,
        ...currentRest
      } = current
      return JSON.stringify(savedRest) !== JSON.stringify(currentRest)
    })
  }, [formState.isDirty, personalExterno, getValues])

  const ActionButton = () => {
    if (!personalExterno) return null
    switch (personalExterno.status) {
      case 'Solicitado':
        return (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => window.open(`/portal/externo/${serviceOrder.numero_expediente}`, '_blank')}>
              <Building2 className="mr-2 h-4 w-4" />
              Ver en Portal
            </Button>
            {isSolicitudDesactualizada && (
              <Button onClick={handleSubmit(onSubmit)}>
                <RefreshCw className="mr-2" />
                Notificar Cambios
              </Button>
            )}
          </div>
        )
      case 'Confirmado':
        return (
          <Button onClick={() => handleGlobalStatusAction('Cerrado')}>
            <Save className="mr-2" />
            Cerrar y Validar Costes
          </Button>
        )
      case 'Cerrado':
        return (
          <Button variant="secondary" disabled className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="mr-2" />
            Validado
          </Button>
        )
      default:
        return (
          <Button onClick={() => handleGlobalStatusAction('Solicitado')} className="bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2" />
            Solicitar a ETT
          </Button>
        )
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (!serviceOrder?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Falta el ID de la Orden de Servicio.',
      })
      return
    }

    try {
      const turnos = data.turnos.map((t) => {
        const existingTurno = personalExterno?.turnos.find((et) => et.id === t.id)
        
        // Aseguramos que la fecha sea un objeto Date antes de formatear
        let finalFecha = t.fecha
        if (typeof t.fecha === 'string') {
          finalFecha = new Date(t.fecha)
        }

        return {
          ...t,
          fecha: format(finalFecha, 'yyyy-MM-dd'),
          statusPartner: existingTurno?.statusPartner || 'Pendiente Asignación',
          requiereActualizacion: true,
          asignaciones: (t.asignaciones || []).map((a) => ({
            ...a,
            horaEntradaReal: a.horaEntradaReal || '',
            horaSalidaReal: a.horaSalidaReal || '',
          })),
        }
      })

      const updates = {
        osId: serviceOrder.id,
        status: personalExterno?.status || 'Solicitado',
        turnos,
        observacionesGenerales: data.observacionesGenerales,
      }

      if (personalExternoDB) {
        await updatePersonalMutation.mutateAsync({ osId: serviceOrder.id, updates: updates as any })
      } else {
        await createPersonalMutation.mutateAsync(updates as any)
      }

      await syncAjustesMutation.mutateAsync({
        osId: serviceOrder.id,
        ajustes: data.ajustes || [],
      })

      // Log activity
      const logDetails = [
        `Gestionados ${turnos.length} turnos.`,
        deletedNames.length > 0 ? `Eliminados: ${deletedNames.join(', ')}.` : ''
      ].filter(Boolean).join(' ')

      await logActivity({
        userId: impersonatedUser?.id || '',
        userName: impersonatedUser?.nombre || 'Sistema',
        action: 'Actualizar Personal Externo',
        details: logDetails,
        entity: 'OS',
        entityId: serviceOrder.id
      })

      setDeletedNames([])

      toast({
        title: 'Personal guardado',
        description: 'La planificación del personal ha sido guardada.',
      })
      form.reset(data)
    } catch (error) {
      console.error('Error saving personal externo:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la planificación.',
      })
    }
  }

  const addRow = (initialData: Partial<any> = {}) => {
    append({
      id: crypto.randomUUID(),
      categoriaId: '',
      proveedorId: null,
      categoria: '',
      precioHora: 0,
      fecha: new Date(),
      horaEntrada: '09:00',
      horaSalida: '17:00',
      solicitadoPor: 'SALA',
      statusPartner: 'Pendiente',
      asignaciones: [],
      requiereActualizacion: true,
      ...initialData,
    })
  }

  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      const row = getValues(`turnos.${rowToDelete}`)
      // Determinar un "nombre" descriptivo para el turno
      const cat = categoriasPersonal.find(o => o.id === row?.categoriaId)
      const identifier = cat ? cat.nombre : `Turno`
      
      setDeletedNames(prev => [...prev, identifier])
      
      remove(rowToDelete)
      setRowToDelete(null)
      toast({ title: 'Turno eliminado' })
    }
  }

  const handleClearAll = () => {
    remove()
    removeAjuste()
    setShowClearConfirm(false)
    toast({ title: 'Planificación vaciada' })
    handleSubmit(onSubmit)()
  }

  const providerOptions = useMemo(
    () =>
      proveedores.map((p) => ({
        value: p.id,
        label: p.nombreComercial,
      })),
    [proveedores],
  )

  const categoriaOptions = useMemo(() => {
    return categoriasPersonal.map((p) => {
      const proveedor = proveedores.find((prov) => prov.id === p.proveedor_id)
      return {
        value: p.id,
        label: `${proveedor?.nombreComercial || 'Desconocido'} - ${p.nombre || 'Sin nombre'}`,
      }
    })
  }, [categoriasPersonal, proveedores])

  const isLoading =
    updatePersonalMutation.isPending ||
    createPersonalMutation.isPending ||
    syncAjustesMutation.isPending

  const statusBadgeVariant = useMemo(() => {
    switch (personalExterno?.status) {
      case 'Solicitado': return 'secondary'
      case 'Confirmado': return 'default'
      case 'Cerrado': return 'outline'
      default: return 'secondary'
    }
  }, [personalExterno?.status])

  if (!isMounted || isLoadingOS || isLoadingPersonal || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />
  }

  return (
    <>
      <main className="space-y-6">
        <TooltipProvider>
          <FormProvider {...form}>
            <form
              id="personal-externo-form"
              onSubmit={handleSubmit(onSubmit, (errors) => {
                console.error('Validation Errors:', errors)
                toast({
                  variant: 'destructive',
                  title: 'Error de validación',
                  description: 'Por favor revisa los campos marcados en rojo.',
                })
              })}
            >
              {/* Header Premium Sticky - Sincronizado con OsHeader */}
              <div className="sticky top-[5.25rem] md:top-[88px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 transition-none shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-sm">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5 text-blue-600">Personal Externo</h2>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none opacity-70 truncate max-w-[120px] md:max-w-none">{serviceOrder.nombre_evento}</p>
                    </div>
                  </div>

                  <div className="flex-1" />

                  <ExternoHeaderMetrics 
                    control={control} 
                    facturacion={serviceOrder?.facturacion || 0}
                    osId={serviceOrder?.id || ''}
                  />

                  <div className="h-6 w-[1px] bg-border/40 mx-2" />

                  <div className="flex items-center gap-2">
                    <BriefingSummaryTrigger items={briefingItems} />
                    <ActivityLogSheet 
                      entityId={serviceOrder?.id || ''} 
                      buttonClassName="h-8 text-[8px] font-black uppercase tracking-widest border-border/40" 
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !formState.isDirty}
                      className="h-8 text-[8px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 px-3"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-3 w-3" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>


              <Tabs defaultValue="planificacion" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 border border-border/40 h-10">
                  <TabsTrigger
                    value="planificacion"
                    className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Planificación de Turnos
                  </TabsTrigger>
                  <TabsTrigger
                    value="aprobados"
                    className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Cierre y Horas Reales
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="planificacion" className="mt-0 outline-none">
                  <Card className="bg-background border-border/40 overflow-hidden shadow-none">
                    <div className="absolute top-0 left-0 w-1 h-full bg-border" />
                    <CardHeader className="py-4 px-6 flex-row items-center justify-between border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-[12px] font-black uppercase tracking-widest">Planificación de Turnos</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {fields.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowClearConfirm(true)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] font-black uppercase tracking-widest h-8"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Vaciar
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => {
                            // Encontrar la siguiente fecha disponible del briefing que no esté ya en uniqueDays
                            const existingDays = new Set(uniqueDays)
                            const nextDate = briefingItems
                              .map((b) => {
                                const d = new Date(b.fecha)
                                const y = d.getFullYear()
                                const mo = String(d.getMonth() + 1).padStart(2, '0')
                                const da = String(d.getDate()).padStart(2, '0')
                                return `${y}-${mo}-${da}`
                              })
                              .find((f) => !existingDays.has(f))

                            if (!nextDate) {
                              toast({
                                title: 'No hay más días',
                                description: 'Ya se han planificado todos los días disponibles del briefing.',
                                variant: 'destructive',
                              })
                              return
                            }
                            
                            addRow({ fecha: new Date(nextDate) })
                          }}
                          size="sm"
                          className="bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 border border-blue-600/20 text-[10px] font-black uppercase tracking-widest h-8"
                        >
                          <PlusCircle className="mr-2 h-3 w-3" />
                          + Añadir día
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 bg-muted/20">
                      <div className="space-y-4 p-4">
                        {uniqueDays.map((dateStr) => {
                          const indices = groupedIndicesByDay[dateStr] || []
                          const dateObj = new Date(dateStr)

                          return (
                            <div
                              key={dateStr}
                              className="rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm"
                            >
                              {/* Header del Día */}
                              <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between border-b border-border/40">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center justify-center bg-background rounded-lg border border-border/40 w-10 h-10 shadow-sm">
                                    <span className="text-[10px] font-black uppercase text-blue-600 leading-none">
                                      {format(dateObj, 'MMM', { locale: es })}
                                    </span>
                                    <span className="text-[14px] font-black text-foreground leading-none mt-0.5">
                                      {format(dateObj, 'dd')}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">
                                      {format(dateObj, 'EEEE', { locale: es })}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {indices.length} {indices.length === 1 ? 'Turno' : 'Turnos'} Planificados
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const existingDays = new Set(uniqueDays)
                                    const nextDate = briefingItems
                                      .map((b) => {
                                        const d = new Date(b.fecha)
                                        const y = d.getFullYear()
                                        const mo = String(d.getMonth() + 1).padStart(2, '0')
                                        const da = String(d.getDate()).padStart(2, '0')
                                        return `${y}-${mo}-${da}`
                                      })
                                      .find((f) => !existingDays.has(f))
                                    
                                    if (!nextDate) return null

                                    return (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => duplicateDay(dateStr)}
                                        className="h-8 text-[9px] font-black uppercase tracking-widest border-blue-500/20 text-blue-700 hover:bg-blue-500/10"
                                      >
                                        <Copy className="mr-1.5 h-3 w-3" />
                                        Duplicar siguiente día
                                      </Button>
                                    )
                                  })()}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const indicesRow = groupedIndicesByDay[dateStr] || []
                                      // Eliminar de atrás hacia adelante para no corromper los otros índices de uniqueDays en el mismo render
                                      const sortedIndices = [...indicesRow].sort((a, b) => b - a)
                                      sortedIndices.forEach(idx => remove(idx))
                                      toast({ title: 'Día vaciado' })
                                    }}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="mr-1.5 h-3 w-3" />
                                    Vaciar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      addRow({
                                        fecha: new Date(dateStr),
                                        solicitadoPor: 'SALA',
                                        statusPartner: 'Pendiente',
                                      })
                                    }}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest border-blue-600/20 text-blue-600 hover:bg-blue-600/10"
                                  >
                                    <PlusCircle className="mr-1.5 h-3 w-3" />
                                    Añadir Personal
                                  </Button>
                                </div>
                              </div>

                              {/* Tabla de Turnos del Día */}
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/40 bg-muted/10">
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground w-[90px]">
                                        CC
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground min-w-[250px]">
                                        Categoría (ETT)
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground w-[130px]">
                                        Servicio
                                      </TableHead>
                                      <TableHead className="h-9 px-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground w-[200px] text-center">
                                        Horario
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center w-[80px]">
                                        Duración
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center w-[90px]">
                                        Precio/h
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-right w-[100px]">
                                        Coste
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center w-[50px]">
                                        Obs.
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-center w-[120px]">
                                        Estado
                                      </TableHead>
                                      <TableHead className="h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground text-right w-[50px]"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {indices.map((index) => {
                                      const field = fields[index]
                                      if (!field) return null
                                      return (
                                        <PersonalExternoRow
                                          key={field.id}
                                          index={index}
                                          control={control}
                                          onRemove={setRowToDelete}
                                          handleCategoryChange={handleCategoryChange}
                                          categoriaOptions={categoriaOptions}
                                        />
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )
                        })}

                        {fields.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 bg-background/50 rounded-xl border-2 border-dashed border-border/40">
                            <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
                            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                              No hay turnos planificados
                            </p>
                            <Button
                              type="button"
                              onClick={() => {
                                const nextDate = briefingItems
                                  .map((b) => {
                                    const d = new Date(b.fecha)
                                    const y = d.getFullYear()
                                    const mo = String(d.getMonth() + 1).padStart(2, '0')
                                    const da = String(d.getDate()).padStart(2, '0')
                                    return `${y}-${mo}-${da}`
                                  })[0] || new Date().toISOString().split('T')[0]
                                
                                addRow({ fecha: new Date(nextDate) })
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-4 text-[10px] font-black uppercase tracking-widest"
                            >
                              Comenzar Planificación
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="aprobados" className="mt-0 outline-none">
                  <Card className="bg-background border-border/40 overflow-hidden shadow-none">
                    <div className="absolute top-0 left-0 w-1 h-full bg-border" />
                    <CardHeader className="py-4 px-6 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-[12px] font-black uppercase tracking-widest">Cierre y Horas Reales</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 bg-yellow-400/5 border-b border-yellow-400/20">
                        <p className="text-[11px] text-yellow-800 font-bold leading-relaxed uppercase tracking-wider">
                          Esta sección debe ser completada por el responsable del evento para validar el coste real final.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/40">
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">DNI</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Horario Planificado</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center bg-emerald-500/5 border-x border-border/40" colSpan={2}>
                                Horario Real
                              </TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Feedback</TableHead>
                            </TableRow>
                            <TableRow className="hover:bg-transparent border-border/40 h-0">
                              <TableHead colSpan={3} className="p-0 h-0" />
                              <TableHead className="h-8 px-2 text-[9px] font-bold uppercase text-muted-foreground text-center bg-emerald-500/5 border-l border-border/40 w-28">Entrada Real</TableHead>
                              <TableHead className="h-8 px-2 text-[9px] font-bold uppercase text-muted-foreground text-center bg-emerald-500/5 border-r border-border/40 w-28">Salida Real</TableHead>
                              <TableHead className="p-0 h-0" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <CierreHorasReales form={form} allAssignments={allAssignments} currentOsId={serviceOrder?.id || ''} />
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* SECCIÓN DE AJUSTES Y RESUMEN COLAPSADA */}
              <Accordion type="single" collapsible className="mt-8">
                <AccordionItem value="ajustes" className="border-none">
                  <div className="flex items-center justify-center -mb-3 relative z-20 gap-4">
                    <AccordionTrigger className="w-auto bg-background border border-border/40 px-6 py-1.5 rounded-full hover:no-underline hover:bg-muted/50 transition-colors shadow-sm">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Configuración y Ajustes Económicos</span>
                      </div>
                    </AccordionTrigger>
                    <ActionButton />
                  </div>

                  <AccordionContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Resumen Financiero */}
                      <Card className="bg-background border-border/40 overflow-hidden shadow-none">
                        <div className="absolute top-0 left-0 w-1 h-full bg-border" />
                        <CardHeader className="py-4 px-6 border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Resumen de Costes</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          <CostSummary />
                        </CardContent>
                      </Card>

                      {/* Ajustes de Costes */}
                      <Card className="bg-background border-border/40 overflow-hidden shadow-none">
                        <div className="absolute top-0 left-0 w-1 h-full bg-border" />
                        <CardHeader className="py-4 px-6 border-b border-border/40 flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                             <RefreshCw className="h-4 w-4 text-muted-foreground" />
                             <CardTitle className="text-[12px] font-black uppercase tracking-widest">Ajustes de Costes</CardTitle>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() =>
                              appendAjuste({
                                id: Date.now().toString(),
                                proveedorId: '',
                                concepto: '',
                                importe: 0,
                              })
                            }
                            className="h-7 text-[9px] font-black uppercase tracking-widest border-border/40 hover:bg-muted"
                          >
                            <PlusCircle className="mr-1.5 h-3 w-3" />
                            Añadir Ajuste
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {(ajusteFields || []).length > 0 ? (
                              (ajusteFields || []).map((ajuste, index) => (
                                <div key={ajuste.id} className="flex gap-2 items-start group animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FormField
                                      control={control}
                                      name={`ajustes.${index}.proveedorId`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <Combobox
                                            options={providerOptions}
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            placeholder="Proveedor..."
                                            className="h-8 text-[11px]"
                                          />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={control}
                                      name={`ajustes.${index}.concepto`}
                                      render={({ field }) => (
                                        <Combobox
                                          options={AJUSTE_CONCEPTO_OPCIONES.map((o) => ({
                                            label: o,
                                            value: o,
                                          }))}
                                          value={field.value || ''}
                                          onChange={field.onChange}
                                          placeholder="Concepto..."
                                          className="h-8 text-[11px]"
                                        />
                                      )}
                                    />
                                    <FormField
                                      control={control}
                                      name={`ajustes.${index}.importe`}
                                      render={({ field }) => (
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            className="h-8 text-[11px] font-mono pr-6 border-border/40 bg-background/50"
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€</span>
                                        </div>
                                      )}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
                                    onClick={() => removeAjuste(index)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <div className="h-24 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-lg bg-muted/5">
                                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">No hay ajustes registrados</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="px-6 py-3 bg-muted/30 border-t border-border/40 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Ajustes</span>
                          <span className="text-[14px] font-black font-mono">{formatCurrency(totalAjustes)}</span>
                        </CardFooter>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </FormProvider>
        </TooltipProvider>

        <AlertDialog
          open={rowToDelete !== null}
          onOpenChange={(open) => !open && setRowToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará el turno de la tabla.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteRow}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Vaciar toda la planificación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y eliminará todos los turnos de personal de este evento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/80"
                onClick={handleClearAll}
              >
                Sí, vaciar todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
