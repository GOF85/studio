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
  Calendar as CalendarIcon,
  Info,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  Star,
  MessageSquare,
  Pencil,
  AlertTriangle,
  CheckCircle,
  Send,
  Printer,
  FileText,
  Upload,
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
import { ESTADO_TURNO_PERSONAL, AJUSTE_CONCEPTO_OPCIONES } from '@/types'
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
import { calculateHours, formatCurrency, formatDuration } from '@/lib/utils'
import {
  useEvento,
  useComercialBriefings,
  useCategoriasPersonal,
  useProveedores,
  usePersonalExterno,
  usePersonalExternoAjustes,
} from '@/hooks/use-data-queries'
import {
  useUpdatePersonalExterno,
  useCreatePersonalExterno,
  useSyncPersonalExternoAjustes,
} from '@/hooks/mutations/use-personal-externo-mutations'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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

const solicitadoPorOptions = ['Sala', 'Pase', 'Otro'] as const
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const

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
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Coste Planificado</span>
            <Clock className="h-3 w-3 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600">
            {formatCurrency(costeFinalPlanificado)}
          </div>
          <div className="text-[9px] font-bold text-blue-500/70 uppercase mt-1">
            {formatCurrency(totalPlanned)} turnos + {formatCurrency(totalAjustes)} ajustes
          </div>
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/5 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Coste Real Final</span>
            <CheckCircle className="h-3 w-3 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {formatCurrency(finalTotalReal)}
          </div>
          <div className="text-[9px] font-bold text-emerald-500/70 uppercase mt-1">
            {formatCurrency(totalReal)} turnos + {formatCurrency(totalAjustes)} ajustes
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Desviación</span>
            <AlertTriangle className="h-3 w-3 text-amber-500" />
          </div>
          <div className={cn(
            "text-xl font-black",
            finalTotalReal > costeFinalPlanificado ? "text-destructive" : "text-emerald-600"
          )}>
            {formatCurrency(finalTotalReal - costeFinalPlanificado)}
          </div>
          <div className="text-[9px] font-bold text-amber-500/70 uppercase mt-1">
            {((finalTotalReal / (costeFinalPlanificado || 1) - 1) * 100).toFixed(1)}% sobre planificado
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

CostSummary.displayName = 'CostSummary'

const CierreHorasReales = memo(({ form }: { form: any }) => {
  const { control } = form
  const watchedFields = useWatch({ control, name: 'turnos' })

  const turnosAprobados = useMemo(() => {
    return (
      watchedFields?.filter(
        (t: any) => t.statusPartner === 'Gestionado' && t.asignaciones && t.asignaciones.length > 0,
      ) || []
    )
  }, [watchedFields])

  if (turnosAprobados.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="h-32 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-20" />
            <p className="text-[11px] font-medium uppercase tracking-wider">No hay turnos gestionados para cierre</p>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {watchedFields.map((turno: any, turnoIndex: number) => {
        if (
          turno.statusPartner !== 'Gestionado' ||
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

          return (
            <TableRow
              key={asignacion.id}
              className={cn(
                "border-border/40 group transition-colors",
                hasTimeMismatch ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/20'
              )}
            >
              <TableCell className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {hasTimeMismatch && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                        Desviación: {deviation > 0 ? '+' : ''}{formatDuration(deviation)}h
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-tight">{asignacion.nombre}</span>
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
  id: z.string(),
  nombre: z.string(),
  dni: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  comentarios: z.string().optional(),
  rating: z.number().optional(),
  comentariosMice: z.string().optional(),
  horaEntradaReal: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM')
    .optional()
    .or(z.literal('')),
  horaSalidaReal: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM')
    .optional()
    .or(z.literal('')),
})

const personalTurnoSchema = z.object({
  id: z.string(),
  proveedorId: z.string().min(1, 'El proveedor es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  solicitadoPor: z.enum(solicitadoPorOptions),
  tipoServicio: z.enum(tipoServicioOptions),
  observaciones: z.string().optional().default(''),
  statusPartner: z.enum(['Pendiente Asignación', 'Gestionado']),
  asignaciones: z.array(asignacionSchema).optional(),
  requiereActualizacion: z.boolean().optional(),
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

function CommentDialog({ turnoIndex, form }: { turnoIndex: number; form: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const { getValues, setValue } = form

  const fieldName = `turnos.${turnoIndex}.observaciones`
  const dialogTitle = `Observaciones para la ETT`

  const [comment, setComment] = useState(getValues(fieldName) || '')

  const handleSave = () => {
    setValue(fieldName, comment, { shouldDirty: true })
    setIsOpen(false)
  }

  useEffect(() => {
    if (isOpen) {
      setComment(getValues(fieldName) || '')
    }
  }, [isOpen, getValues, fieldName])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
          <Pencil className={cn('h-4 w-4', getValues(fieldName) && 'text-primary')} />
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

  // Supabase Mutations
  const updatePersonalMutation = useUpdatePersonalExterno()
  const createPersonalMutation = useCreatePersonalExterno()
  const syncAjustesMutation = useSyncPersonalExternoAjustes()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { turnos: [], ajustes: [], observacionesGenerales: '' },
  })

  const { control, setValue, watch, trigger, getValues, handleSubmit, formState } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'turnos',
  })

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
    if (personalExternoDB) {
      form.reset({
        turnos: personalExternoDB.turnos.map((t) => ({ ...t, fecha: new Date(t.fecha) })),
        ajustes: ajustesDB || [],
        observacionesGenerales: personalExternoDB.observacionesGenerales || '',
      })
      setPersonalExterno(personalExternoDB)
    } else if (isMounted && !isLoadingPersonal) {
      // Initialize with empty state if no data in DB
      setPersonalExterno({ osId, turnos: [], status: 'Pendiente' })
    }
  }, [personalExternoDB, ajustesDB, form, isMounted, isLoadingPersonal, osId])

  const briefingItems = useMemo(() => {
    if (!briefings) return []
    return briefings.flatMap((b) => b.items)
  }, [briefings])

  const handleProviderChange = useCallback(
    (index: number, categoriaId: string) => {
      if (!categoriaId) return
      const cat = categoriasPersonal.find((p) => p.id === categoriaId)
      if (cat) {
        setValue(`turnos.${index}.proveedorId`, cat.proveedorId, { shouldDirty: true })
        setValue(`turnos.${index}.categoria`, cat.categoria, { shouldDirty: true })
        setValue(`turnos.${index}.precioHora`, cat.precioHora || 0, { shouldDirty: true })
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
        if (isSolicitudDesactualizada) {
          return (
            <Button onClick={handleSubmit(onSubmit)}>
              <RefreshCw className="mr-2" />
              Notificar Cambios a ETT
            </Button>
          )
        }
        return (
          <Button variant="secondary" disabled>
            <CheckCircle className="mr-2" />
            Solicitado
          </Button>
        )
      case 'Asignado':
        return (
          <Button onClick={() => handleGlobalStatusAction('Cerrado')}>
            <Save className="mr-2" />
            Cerrar y Validar Costes
          </Button>
        )
      case 'Cerrado':
        return (
          <Button variant="secondary" disabled>
            <CheckCircle className="mr-2" />
            Cerrado
          </Button>
        )
      default:
        return (
          <Button onClick={() => handleGlobalStatusAction('Solicitado')}>
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
        return {
          ...t,
          fecha: format(t.fecha, 'yyyy-MM-dd'),
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

  const addRow = () => {
    append({
      id: crypto.randomUUID(),
      proveedorId: '',
      categoria: '',
      precioHora: 0,
      fecha: new Date(),
      horaEntrada: '09:00',
      horaSalida: '17:00',
      solicitadoPor: 'Sala',
      tipoServicio: 'Servicio',
      observaciones: '',
      statusPartner: 'Pendiente Asignación',
      asignaciones: [],
      requiereActualizacion: true,
    })
  }

  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
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
      const proveedor = proveedores.find((prov) => prov.id === p.proveedorId)
      return {
        value: p.id,
        label: `${proveedor?.nombreComercial || 'Desconocido'} - ${p.categoria}`,
      }
    })
  }, [categoriasPersonal, proveedores])

  if (!isMounted || isLoadingOS || isLoadingPersonal || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />
  }

  const isLoading =
    updatePersonalMutation.isPending ||
    createPersonalMutation.isPending ||
    syncAjustesMutation.isPending

  const statusBadgeVariant = useMemo(() => {
    switch (personalExterno?.status) {
      case 'Solicitado': return 'secondary'
      case 'Asignado': return 'default'
      case 'Cerrado': return 'outline'
      default: return 'secondary'
    }
  }, [personalExterno?.status])

  return (
    <>
      <main className="space-y-6">
        <TooltipProvider>
          <FormProvider {...form}>
            <form id="personal-externo-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Header Premium Sticky */}
              <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                  <div className="flex items-center">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>

                  <div className="flex-1" />

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusBadgeVariant}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1"
                    >
                      {personalExterno?.status || 'Pendiente'}
                    </Badge>
                    <div className="h-4 w-[1px] bg-border/40 mx-1" />
                    <ActionButton />
                    <Button
                      type="submit"
                      disabled={isLoading || !formState.isDirty}
                      className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-3.5 w-3.5" />
                      )}
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </div>


              <Accordion type="single" collapsible className="w-full mb-6">
                <AccordionItem value="item-1" className="border-none">
                  <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-muted-foreground/20" />
                    <AccordionTrigger className="p-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-[12px] font-black uppercase tracking-widest">Servicios del Evento (Briefing)</h3>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="rounded-md border border-border/40 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow className="hover:bg-transparent border-border/40">
                                <TableHead className="h-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                                <TableHead className="h-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Descripción</TableHead>
                                <TableHead className="h-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Asistentes</TableHead>
                                <TableHead className="h-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Duración</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {briefingItems.length > 0 ? (
                                briefingItems.map((item) => (
                                  <TableRow key={item.id} className="border-border/40">
                                    <TableCell className="py-2 text-[11px] font-medium">
                                      {format(new Date(item.fecha), 'dd/MM/yyyy')} <span className="text-muted-foreground ml-1">{item.horaInicio}</span>
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px]">{item.descripcion}</TableCell>
                                    <TableCell className="py-2 text-[11px] font-bold">{item.asistentes}</TableCell>
                                    <TableCell className="py-2 text-[11px] text-right font-mono">
                                      {calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="h-20 text-center text-[11px] text-muted-foreground italic">
                                    No hay servicios definidos en el briefing.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>

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
                  <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardHeader className="py-4 px-6 flex-row items-center justify-between border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
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
                          onClick={addRow}
                          size="sm"
                          className="bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 border border-blue-600/20 text-[10px] font-black uppercase tracking-widest h-8"
                        >
                          <PlusCircle className="mr-2 h-3 w-3" />
                          Añadir Turno
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/40">
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-36">Fecha</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-32">Solicitado Por</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground min-w-48">Proveedor - Categoría</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-36">Tipo Servicio</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center bg-blue-500/5 border-x border-border/40" colSpan={3}>
                                Horario Planificado
                              </TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Obs.</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                              <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-16"></TableHead>
                            </TableRow>
                            <TableRow className="hover:bg-transparent border-border/40 h-0">
                              <TableHead colSpan={4} className="p-0 h-0" />
                              <TableHead className="h-8 px-2 text-[9px] font-bold uppercase text-muted-foreground text-center bg-blue-500/5 border-l border-border/40">Entrada</TableHead>
                              <TableHead className="h-8 px-2 text-[9px] font-bold uppercase text-muted-foreground text-center bg-blue-500/5">Salida</TableHead>
                              <TableHead className="h-8 px-2 text-[9px] font-bold uppercase text-muted-foreground text-center bg-blue-500/5 border-r border-border/40">€/Hora</TableHead>
                              <TableHead colSpan={3} className="p-0 h-0" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.length > 0 ? (
                              fields.map((field, index) => (
                                <TableRow key={field.id} className="border-border/40 group hover:bg-muted/20 transition-colors">
                                  <TableCell className="px-4 py-2">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.fecha`}
                                      render={({ field: dateField }) => (
                                        <FormItem>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button
                                                  variant={'outline'}
                                                  className={cn(
                                                    'w-full h-8 px-2 text-left font-medium text-[11px] border-border/40 bg-background/50',
                                                    !dateField.value && 'text-muted-foreground',
                                                  )}
                                                >
                                                  {dateField.value ? (
                                                    format(dateField.value, 'dd/MM/yy')
                                                  ) : (
                                                    <span>Elige</span>
                                                  )}
                                                  <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                                                mode="single"
                                                selected={dateField.value}
                                                onSelect={dateField.onChange}
                                                initialFocus
                                                locale={es}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-4 py-2">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.solicitadoPor`}
                                      render={({ field: selectField }) => (
                                        <FormItem>
                                          <Select
                                            onValueChange={selectField.onChange}
                                            value={selectField.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="h-8 text-[11px] border-border/40 bg-background/50">
                                                <SelectValue />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {solicitadoPorOptions.map((o) => (
                                                <SelectItem key={o} value={o} className="text-[11px]">
                                                  {o}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-4 py-2">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.proveedorId`}
                                      render={({ field: f }) => (
                                        <FormItem>
                                          <Combobox
                                            options={categoriaOptions}
                                            value={f.value}
                                            onChange={(value) => handleProviderChange(index, value)}
                                            placeholder="Proveedor..."
                                            className="h-8 text-[11px]"
                                          />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-4 py-2">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.tipoServicio`}
                                      render={({ field: selectField }) => (
                                        <FormItem>
                                          <Select
                                            onValueChange={selectField.onChange}
                                            value={selectField.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="h-8 text-[11px] border-border/40 bg-background/50">
                                                <SelectValue />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {tipoServicioOptions.map((o) => (
                                                <SelectItem key={o} value={o} className="text-[11px]">
                                                  {o}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-2 py-2 bg-blue-500/5 border-l border-border/40">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.horaEntrada`}
                                      render={({ field: f }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="time"
                                              {...f}
                                              className="h-8 text-[11px] border-border/40 bg-background/50 text-center"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-2 py-2 bg-blue-500/5">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.horaSalida`}
                                      render={({ field: f }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="time"
                                              {...f}
                                              className="h-8 text-[11px] border-border/40 bg-background/50 text-center"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-2 py-2 bg-blue-500/5 border-r border-border/40">
                                    <FormField
                                      control={control}
                                      name={`turnos.${index}.precioHora`}
                                      render={({ field: f }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              {...f}
                                              className="h-8 text-[11px] border-border/40 bg-background/50 text-center font-mono"
                                              readOnly
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="px-4 py-2 text-center">
                                    <CommentDialog turnoIndex={index} form={form} />
                                  </TableCell>
                                  <TableCell className="px-4 py-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex justify-center">
                                          {field.statusPartner === 'Gestionado' ? (
                                            <div className="h-6 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                                              <span className="text-[9px] font-black uppercase text-emerald-600">OK</span>
                                            </div>
                                          ) : (
                                            <div className="h-6 px-2 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                                              <span className="text-[9px] font-black uppercase text-amber-600">PEND</span>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                                        {field.statusPartner}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell className="px-4 py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
                                      onClick={() => setRowToDelete(index)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={10} className="h-32 text-center">
                                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Users className="h-8 w-8 opacity-20" />
                                    <p className="text-[11px] font-medium uppercase tracking-wider">No hay personal planificado</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={addRow}
                                      className="mt-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                      Añadir Primer Turno
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="aprobados" className="mt-0 outline-none">
                  <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardHeader className="py-4 px-6 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <CardTitle className="text-[12px] font-black uppercase tracking-widest">Cierre y Horas Reales</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 bg-emerald-500/5 border-b border-border/40">
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                          Esta sección debe ser completada por el responsable del evento. Los datos introducidos aquí se utilizarán para el cálculo del coste real final.
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
                            <CierreHorasReales form={form} />
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Resumen Financiero */}
                <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <CardHeader className="py-4 px-6 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <CardTitle className="text-[12px] font-black uppercase tracking-widest">Resumen de Costes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <CostSummary />
                  </CardContent>
                </Card>

                {/* Ajustes de Costes */}
                <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                  <CardHeader className="py-4 px-6 border-b border-border/40 flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-500" />
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
                      className="h-7 text-[9px] font-black uppercase tracking-widest border-amber-500/20 hover:bg-amber-500/10 text-amber-700"
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
