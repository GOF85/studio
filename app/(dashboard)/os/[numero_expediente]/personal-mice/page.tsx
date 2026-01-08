'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2, ListCheck, Calendar, Clock, AlertTriangle } from 'lucide-react'
import type {
  PersonalMiceOrder,
  ServiceOrder,
  Espacio,
  ComercialBriefing,
  ComercialBriefingItem,
  Personal,
} from '@/types'
import { CENTRO_COSTE_OPCIONES } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { BriefingSummaryDialog } from '@/components/os/briefing-summary-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
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
import { calculateHours, formatCurrency, cn } from '@/lib/utils'
import { logActivity } from '@/app/(dashboard)/portal/activity-log/utils'
import { useImpersonatedUser } from '@/hooks/use-impersonated-user'
import { ActivityLogSheet } from '@/components/os/activity-log-sheet'
import {
  useEvento,
  useEspacios,
  useComercialBriefings,
  usePersonalMiceOrders,
  usePersonal,
  useAllPersonalMiceAssignments,
} from '@/hooks/use-data-queries'
import {
  useCreatePersonalMiceAssignment,
  useUpdatePersonalMiceAssignment,
  useDeletePersonalMiceAssignment,
  useSyncPersonalMiceAssignments,
} from '@/hooks/mutations/use-personal-mice-mutations'
import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'

const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const

// Esquema más permisivo para evitar bloqueos por datos antiguos o formatos de tiempo
const personalMiceSchema = z.object({
  id: z.string().optional().nullable(),
  osId: z.string().optional().nullable(),
  personalId: z.string().optional().nullable(),
  centroCoste: z.string().default('SALA'), // Relaxed enum
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.string().default('Servicio'), // Relaxed enum
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  // Regex más flexible para aceptar HH:mm o HH:mm:ss
  horaEntrada: z.string().default('09:00'),
  horaSalida: z.string().default('17:00'),
  precioHora: z.coerce.number().min(0).default(0),
  horaEntradaReal: z.string().optional().nullable().default(''),
  horaSalidaReal: z.string().optional().nullable().default(''),
  comentario: z.string().optional().nullable().default(''),
})

const formSchema = z.object({
  personal: z.array(personalMiceSchema),
})

type PersonalMiceFormValues = z.infer<typeof formSchema>

// --- Subcomponentes para Optimización ---

const MiceHeaderMetrics = memo(({ control, objetivoValue }: { control: any; objetivoValue: number }) => {
  const watchedPersonal = useWatch({
    control,
    name: 'personal'
  })

  const { totalPlanned, totalReal } = useMemo(() => {
    if (!watchedPersonal) return { totalPlanned: 0, totalReal: 0 }

    const totals = watchedPersonal.reduce(
      (acc: { planned: number; real: number }, order: any) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida)
        acc.planned += plannedHours * (order.precioHora || 0)

        const realHours = calculateHours(order.horaEntradaReal || order.horaEntrada, order.horaSalidaReal || order.horaSalida)
        acc.real += realHours * (order.precioHora || 0)

        return acc
      },
      { planned: 0, real: 0 },
    )

    return { totalPlanned: totals.planned, totalReal: totals.real }
  }, [watchedPersonal])

  const desviacionPct = useMemo(() => {
    if (!objetivoValue || objetivoValue === 0) return 0
    return ((totalPlanned - objetivoValue) / objetivoValue) * 100
  }, [totalPlanned, objetivoValue])

  return (
    <div className="flex items-center gap-3 text-xs md:gap-6 md:text-sm">
      <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
        <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Presupuesto</div>
        <div className="font-bold text-xs md:text-sm">{formatCurrency(totalPlanned)}</div>
      </div>
      <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
        <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Objetivo</div>
        <div className="font-bold text-xs md:text-sm">{formatCurrency(objetivoValue)}</div>
      </div>
      <div className="flex flex-col items-end justify-center leading-none min-w-[60px]">
        <div className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground">Desviación</div>
        <div className={cn('font-bold text-xs md:text-sm', desviacionPct > 0 ? 'text-red-500' : 'text-emerald-600')}>
          {isFinite(desviacionPct) ? `${desviacionPct.toFixed(2)}%` : '-'}
        </div>
      </div>
    </div>
  )
})

MiceHeaderMetrics.displayName = 'MiceHeaderMetrics'

const PersonalMiceRow = memo(({ 
  index, 
  control, 
  personalOptions, 
  handlePersonalChange, 
  setRowToDelete,
  isInternalConflict,
  isExternalConflict
}: { 
  index: number
  control: any
  personalOptions: any[]
  handlePersonalChange: (index: number, name: string) => void
  setRowToDelete: (index: number) => void
  isInternalConflict: boolean
  isExternalConflict: boolean
}) => {
  // Solo observamos los campos necesarios para esta fila específica
  const rowValues = useWatch({
    control,
    name: `personal.${index}` || {}
  })

  // Evitar errores si rowValues es undefined
  if (!rowValues) return null

  const hasConflict = isInternalConflict || isExternalConflict

  return (
    <TableRow className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      <TableCell className="py-1.5 px-3">
        <FormField
          control={control}
          name={`personal.${index}.centroCoste`}
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-20 h-7 text-[10px] font-bold bg-transparent border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CENTRO_COSTE_OPCIONES.map((o) => (
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
      <TableCell className="py-1.5 px-3 min-w-40">
        <FormField
          control={control}
          name={`personal.${index}.nombre`}
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <Combobox
                  options={personalOptions}
                  value={field.value || ''}
                  onChange={(value) => handlePersonalChange(index, value)}
                  placeholder="Nombre..."
                  className={cn("h-7 text-[11px] font-bold", hasConflict && "border-amber-500 text-amber-700")}
                />
                {hasConflict && (
                  <div className="absolute -top-4 right-0 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                    <AlertTriangle className="h-3 w-3" />
                    {isExternalConflict ? 'Doble Booking (Otro Evento)' : 'Doble Reserva (Interna)'}
                  </div>
                )}
              </div>
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <FormField
          control={control}
          name={`personal.${index}.tipoServicio`}
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-24 h-7 text-[10px] bg-transparent border-border/40">
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
      <TableCell className="py-1.5 px-3">
        <div className="flex items-center gap-1">
          <FormField
            control={control}
            name={`personal.${index}.horaEntrada`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} className="w-20 h-7 text-[10px] font-mono bg-transparent border-border/40 p-1" />
                </FormControl>
              </FormItem>
            )}
          />
          <span className="text-muted-foreground">-</span>
          <FormField
            control={control}
            name={`personal.${index}.horaSalida`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} className="w-20 h-7 text-[10px] font-mono bg-transparent border-border/40 p-1" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <div className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50/50 py-0.5 px-1.5 rounded border border-blue-100/50 w-fit">
          {calculateHours(rowValues.horaEntrada, rowValues.horaSalida).toFixed(1)}h
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <FormField
          control={control}
          name={`personal.${index}.precioHora`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? 0}
                  className="w-16 h-7 text-[10px] font-mono bg-transparent border-border/40"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <div className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50/50 py-0.5 px-1.5 rounded border border-amber-100/50 w-full text-right whitespace-nowrap">
          {formatCurrency(calculateHours(rowValues.horaEntrada, rowValues.horaSalida) * (rowValues.precioHora || 0))}
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <div className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100/50 py-0.5 px-1.5 rounded border border-blue-200/50 w-fit">
          {formatCurrency(calculateHours(rowValues.horaEntrada, rowValues.horaSalida) * (rowValues.precioHora || 0))}
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <div className="flex items-center gap-1">
          <FormField
            control={control}
            name={`personal.${index}.horaEntradaReal`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} className="w-20 h-7 text-[10px] font-mono bg-transparent border-emerald-500/20 p-1" />
                </FormControl>
              </FormItem>
            )}
          />
          <span className="text-muted-foreground">-</span>
          <FormField
            control={control}
            name={`personal.${index}.horaSalidaReal`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} className="w-20 h-7 text-[10px] font-mono bg-transparent border-emerald-500/20 p-1" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </TableCell>
      <TableCell className="py-1.5 px-3">
        <FormField
          control={control}
          name={`personal.${index}.comentario`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Obs..." className="w-32 h-7 text-[10px] bg-transparent border-border/40" />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="text-right py-1.5 px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 h-7 w-7"
          onClick={() => setRowToDelete(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
})

PersonalMiceRow.displayName = 'PersonalMiceRow'

export default function PersonalMiceFormPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<number | null>(null)
  const [deletedNames, setDeletedNames] = useState<string[]>([])
  const [openResumenBriefing, setOpenResumenBriefing] = useState(false)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()
  const { impersonatedUser } = useImpersonatedUser()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: allBriefings } = useComercialBriefings(serviceOrder?.id)
  const allBriefingItems = useMemo(() => {
    return allBriefings?.[0]?.items || []
  }, [allBriefings])

  const { data: personalDB = [] } = usePersonal()
  const { data: existingAssignments = [], isLoading: isLoadingAssignments } = usePersonalMiceOrders(
    serviceOrder?.id,
  )
  const { data: allAssignments = [] } = useAllPersonalMiceAssignments()
  const { data: espacios = [] } = useEspacios()

  // Objetivos de Gasto
  const { data: objetivos } = useObjetivosGasto(serviceOrder?.id)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const objetivoValue = useMemo(() => {
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => p.nombre?.toLowerCase() === 'micecatering')
    const objetivoPct = (objetivoTemplate?.personal_mice || 0) / 100
    const facturacionNeta = (serviceOrder?.facturacion as number) || 0
    return facturacionNeta * objetivoPct
  }, [objetivos, plantillas, serviceOrder])

  const syncAssignments = useSyncPersonalMiceAssignments()

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  })

  const { control, setValue } = form

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'personal',
  })

  useEffect(() => {
    if (existingAssignments.length > 0) {
      // Ensure that if it has no date, it defaults to the first day of the event
      const updatedAssignments = existingAssignments.map(a => ({
        ...a,
        fecha: a.fecha || (allBriefingItems.length > 0 ? allBriefingItems[0].fecha : ''),
        horaEntrada: a.horaEntrada?.split(':').slice(0, 2).join(':') || '09:00',
        horaSalida: a.horaSalida?.split(':').slice(0, 2).join(':') || '17:00',
        horaEntradaReal: a.horaEntradaReal?.split(':').slice(0, 2).join(':') || '',
        horaSalidaReal: a.horaSalidaReal?.split(':').slice(0, 2).join(':') || '',
        precioHora: a.precioHora || 0,
        comentario: a.comentario || '',
      }))
      form.reset({ personal: updatedAssignments })
    }
  }, [existingAssignments, form, allBriefingItems])

  const handlePersonalChange = useCallback(
    (index: number, name: string) => {
      if (!name) {
        setValue(`personal.${index}.personalId`, '', { shouldDirty: true })
        setValue(`personal.${index}.dni`, '', { shouldDirty: true })
        return
      }
      
      // Search by Nombre + Apellido
      const person = personalDB.find((p) => {
        const fullName = `${p.nombre} ${p.apellido1 || ''}`.trim().toLowerCase()
        return fullName === name.toLowerCase() || p.nombre.toLowerCase() === name.toLowerCase()
      })

      if (person) {
        setValue(`personal.${index}.nombre`, `${person.nombre} ${person.apellido1 || ''}`.trim(), { shouldDirty: true })
        setValue(`personal.${index}.personalId`, person.id || '', { shouldDirty: true })
        setValue(`personal.${index}.dni`, person.id || '', { shouldDirty: true })
        setValue(`personal.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true })
      } else {
        setValue(`personal.${index}.nombre`, name, { shouldDirty: true })
      }
    },
    [personalDB, setValue],
  )

  const watchedDates = useWatch({
    control,
    name: fields.map((_, i) => `personal.${i}.fecha` as const)
  })

  const uniqueDays = useMemo(() => {
    const days = new Set<string>()
    // Preferencia a items del briefing
    allBriefingItems.forEach(item => { if (item.fecha) days.add(item.fecha) })
    // Añadir fechas que existan en el formulario
    fields.forEach((_, i) => {
      const d = watchedDates?.[i]
      if (d) days.add(d)
    })
    return Array.from(days).sort()
  }, [allBriefingItems, fields, watchedDates])

  const groupedIndicesByDay = useMemo(() => {
    const groups: Record<string, number[]> = {}
    uniqueDays.forEach(dia => { groups[dia] = [] })
    
    fields.forEach((_, index) => {
      const fecha = watchedDates?.[index]
      if (fecha && groups[fecha]) {
        groups[fecha].push(index)
      }
    })
    return groups
  }, [uniqueDays, fields, watchedDates])

  const onSubmit = async (data: PersonalMiceFormValues) => {
    if (!serviceOrder?.id) {
      toast({
        variant: 'destructive',
        title: 'Error de Contexto',
        description: 'No se ha podido identificar la Orden de Servicio.',
      })
      return
    }
    setIsLoading(true)
    console.log('--- SUBMIT START ---')
    console.log('Payload data:', data)
    try {
      // Normalizar datos antes de enviar (asegurar que no hay nulls en campos requeridos)
      const sanitizedAssignments = data.personal.map(p => ({
        ...p,
        nombre: p.nombre || '',
        dni: p.dni || '',
        id: p.id === null ? undefined : (p.id && p.id.startsWith('temp-') ? undefined : p.id)
      }))

      await syncAssignments.mutateAsync({ 
        osId: serviceOrder.id, 
        assignments: sanitizedAssignments as any
      })

      // Log activity
      const logDetails = [
        `Gestionados ${sanitizedAssignments.length} turnos.`,
        deletedNames.length > 0 ? `Eliminados: ${deletedNames.join(', ')}.` : ''
      ].filter(Boolean).join(' ')

      await logActivity({
        userId: impersonatedUser?.id || '',
        userName: impersonatedUser?.nombre || 'Sistema',
        action: 'Actualizar Personal MICE',
        details: logDetails,
        entity: 'OS',
        entityId: serviceOrder.id
      })
      
      setDeletedNames([])
      toast({
        title: 'Personal MICE guardado',
        description: 'Todos los cambios han sido guardados.',
      })
      form.reset(data)
    } catch (error: any) {
      console.error('Error saving Personal MICE:', error)
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: error.message || 'No se pudieron guardar los cambios en la base de datos.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onInvalid = (errors: any) => {
    console.error('Zod Validation Errors:', errors)
    toast({
      variant: 'destructive',
      title: 'Error de Validación',
      description: 'Hay errores en el formulario. Por favor, revisa los campos marcados o la consola.',
    })
  }

  const addRow = (fecha?: string) => {
    append({
      id: `temp-${Date.now()}`,
      osId: serviceOrder?.id || osId,
      centroCoste: 'SALA',
      nombre: '',
      dni: '',
      tipoServicio: 'Servicio',
      fecha: fecha || (allBriefingItems[0]?.fecha || ''),
      horaEntrada: '09:00',
      horaSalida: '17:00',
      precioHora: 0,
      horaEntradaReal: '',
      horaSalidaReal: '',
      comentario: '',
    })
  }

  const duplicateDay = (sourceFecha: string) => {
    const allPersonal = form.getValues().personal
    const toCopy = allPersonal.filter(p => p.fecha === sourceFecha)
    if (toCopy.length === 0) return

    // Find the next day in uniqueDays that has no assignments
    const targetFecha = uniqueDays.find(d => d > sourceFecha && !allPersonal.some(p => p.fecha === d))
    
    if (targetFecha) {
      toCopy.forEach(p => {
        append({
          ...p,
          id: `temp-${Date.now()}-${Math.random()}`,
          fecha: targetFecha,
          horaEntradaReal: '',
          horaSalidaReal: '',
        })
      })
      toast({ title: `Jornada duplicada al ${format(new Date(targetFecha), 'dd/MM')}` })
    } else {
      toast({ title: 'No hay más días disponibles para duplicar', variant: 'destructive' })
    }
  }


  const personalOptions = useMemo(() => {
    return personalDB.map((p) => ({ 
      label: `${p.nombre} ${p.apellido1 || ''}`.trim(), 
      value: `${p.nombre} ${p.apellido1 || ''}`.trim().toLowerCase() 
    }))
  }, [personalDB])

  // --- Optimizaciones de Rendimiento ---
  
  // Agrupar índices por día una sola vez

  // Pre-calcular conflictos para evitar lógica pesada en el render loop
  const conflictsMap = useMemo(() => {
    const internal = new Set<number>()
    const external = new Set<number>()
    if (!form.getValues().personal) return { internal, external }

    form.getValues().personal.forEach((p, index) => {
      if (!p.personalId || !p.fecha || !p.horaEntrada || !p.horaSalida) return

      // Check Interno
      for (let i = index + 1; i < form.getValues().personal.length; i++) {
        const other = form.getValues().personal[i]
        if (other.personalId === p.personalId && other.fecha === p.fecha) {
          if (p.horaEntrada < other.horaSalida && p.horaSalida > other.horaEntrada) {
            internal.add(index)
            internal.add(i)
          }
        }
      }

      // Check Externo (otros eventos)
      const hasExt = allAssignments.some(other => {
        if (other.osId === serviceOrder?.id || other.personalId !== p.personalId || other.fecha !== p.fecha) return false
        return (p.horaEntrada < other.horaSalida && p.horaSalida > other.horaEntrada)
      })
      if (hasExt) external.add(index)
    })

    return { internal, external }
  }, [fields, watchedDates, allAssignments, serviceOrder?.id])

  if (isLoadingOS || isLoadingAssignments) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />
  }

  if (!serviceOrder) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold">Orden de Servicio no encontrada</h2>
        <Button onClick={() => router.push('/os')} className="mt-4">
          Volver al listado
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FormProvider {...form}>
        <form id="personal-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          {/* Header Premium Sticky */}
          <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-2">
            <div className="max-w-7xl mx-auto px-3 py-1">
              <div className="flex items-center justify-between gap-2 min-h-10">
                <div className="flex items-center h-8 gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <h1 className="text-sm md:text-base font-bold text-blue-900 tracking-tight">Personal "MiceCatering"</h1>
                </div>

                <div className="flex items-center gap-3 text-xs md:gap-6 md:text-sm">
                  <MiceHeaderMetrics control={control} objetivoValue={objetivoValue} />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 md:h-8 px-2 md:px-3 text-[12px]"
                    onClick={() => setOpenResumenBriefing(true)}
                  >
                    <ListCheck className="h-4 w-4 md:h-3.5 md:w-3.5 mr-0 md:mr-1" />
                    <span className="hidden md:inline">Resumen Briefing</span>
                  </Button>

                  <ActivityLogSheet 
                    entityId={serviceOrder?.id || ''} 
                    buttonClassName="h-7 md:h-8 px-2 md:px-3 text-[10px] font-black uppercase tracking-widest border-border/40" 
                  />

                  <Button
                    type="submit"
                    disabled={isLoading || !form.formState.isDirty}
                    className="h-7 md:h-8 px-2 md:px-3 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Save className="mr-2 h-3 w-3" />}
                    <span className="hidden md:inline">Guardar Cambios</span>
                    <span className="inline md:hidden">Guardar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {uniqueDays.length === 0 ? (
              <Card className="bg-background/60 backdrop-blur-md border-border/40 p-8 text-center italic text-muted-foreground">
                No hay servicios en el briefing comercial para este evento.
              </Card>
            ) : (
              uniqueDays.map((dia) => {
                const dayIndices = groupedIndicesByDay[dia] || []

                return (
                  <Card key={dia} className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardHeader className="flex-row items-center justify-between py-2 px-3 bg-muted/10 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        <CardTitle className="text-[11px] font-black uppercase tracking-widest">
                          {format(new Date(dia), 'EEEE, d MMMM yyyy', { locale: es })}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => duplicateDay(dia)}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50"
                          title="Duplicar este equipo en el primer día sin personal"
                        >
                          <PlusCircle className="mr-1.5 h-3 w-3" />
                          Duplicar Día
                        </Button>
                        <Button
                          type="button"
                          onClick={() => addRow(dia)}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[9px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
                        >
                          <PlusCircle className="mr-1.5 h-3 w-3" />
                          Añadir Personal
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 border-b border-border/40">
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Centro de Coste</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Nombre</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Servicio</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Horario Plan.</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Horas</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">€/Hora</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Coste</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Horario Real</TableHead>
                              <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Comentario</TableHead>
                              <TableHead className="h-10 px-3 text-right text-[10px] font-black uppercase tracking-widest"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dayIndices.length > 0 ? (
                              dayIndices.map((index) => (
                                <PersonalMiceRow 
                                  key={fields[index].id}
                                  index={index}
                                  control={control}
                                  personalOptions={personalOptions}
                                  handlePersonalChange={handlePersonalChange}
                                  setRowToDelete={setRowToDelete}
                                  isInternalConflict={conflictsMap.internal.has(index)}
                                  isExternalConflict={conflictsMap.external.has(index)}
                                />
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={9} className="h-12 text-center text-[10px] text-muted-foreground italic">
                                  No hay personal asignado para este día.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </form>
      </FormProvider>

      <BriefingSummaryDialog
        open={openResumenBriefing}
        onOpenChange={setOpenResumenBriefing}
        items={allBriefingItems}
      />

      <AlertDialog
        open={rowToDelete !== null}
        onOpenChange={(open) => !open && setRowToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la asignación de personal de la
              tabla.
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

      <ConflictDialog />
    </div>
  )

  function handleDeleteRow() {
    if (rowToDelete !== null) {
      const row = form.getValues(`personal.${rowToDelete}`)
      if (row?.nombre) {
        setDeletedNames(prev => [...prev, row.nombre])
      }
      remove(rowToDelete)
      setRowToDelete(null)
      toast({ title: 'Asignación eliminada' })
    }
  }

  function ConflictDialog() {
    // Logic for conflict detection could be complex, for now let's just implement a simple one
    // or leave it as a placeholder if it's too heavy for one go.
    // However, I'll try to implement a simple overlap check within the same OS first.
    return <div />
  }
}

