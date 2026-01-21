'use client'
import { useEffect, useState, useMemo, memo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, FormProvider, useWatch, useFormContext, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Loader2,
  Save,
  AlertTriangle,
  Phone,
  Mail,
  Trash2,
  Star,
  FileText,
} from 'lucide-react'

import type { ServiceOrder, Personal } from '@/types'
import { osFormSchema, type OsFormValues } from '@/types/entregas'
import type { EspacioV2, ContactoEspacio } from '@/types/espacios'
import { CATERING_VERTICALES } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useLoadingStore } from '@/hooks/use-loading-store'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Combobox } from '@/components/ui/combobox'
import {
  useEvento,
  usePersonal,
  useEspacios,
  useUpdateEvento,
  useCreateEvento,
} from '@/hooks/use-data-queries'

// --- Componentes Optimizados ---

const ContactDisplay = ({ phoneField, mailField, iconColor = "text-emerald-500/70" }: { phoneField: string, mailField: string, iconColor?: string }) => {
  const phone = useWatch({ name: phoneField as any });
  const mail = useWatch({ name: mailField as any });
  return (
    <div className="flex items-center gap-4 px-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
        <Phone className={`h-3 w-3 ${iconColor}`} />
        <span>{phone || '-'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
        <Mail className={`h-3 w-3 ${iconColor}`} />
        <span className="truncate max-w-[120px]">{mail || '-'}</span>
      </div>
    </div>
  )
}

const AnulacionDisplay = () => {
  const status = useWatch({ name: 'status' });
  const motivo = useWatch({ name: 'anulacionMotivo' });
  
  if (status !== 'Anulado') return null;
  
  return (
    <div className="space-y-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="text-[10px] font-black uppercase tracking-widest">Motivo de Anulación</h3>
      </div>
      <p className="text-sm font-medium text-destructive/80 italic pl-6">
        "{motivo}"
      </p>
    </div>
  )
}

// Using shared `osFormSchema` and `OsFormValues` from types/entregas

const defaultValues: Partial<OsFormValues> = {
  serviceNumber: '',
  client: '',
  contact: '',
  phone: '',
  finalClient: '',
  asistentes: 0,
  space: '',
  spaceAddress: '',
  spaceContact: '',
  spacePhone: '',
  spaceMail: '',
  respMetre: '',
  respMetrePhone: '',
  respMetreMail: '',
  respPase: '',
  respPasePhone: '',
  respPaseMail: '',
  respCocinaPase: '',
  respCocinaPasePhone: '',
  respCocinaPaseMail: '',
  respCocinaCPR: '',
  respCocinaCPRPhone: '',
  respCocinaCPRMail: '',
  respProjectManager: '',
  respProjectManagerPhone: '',
  respProjectManagerMail: '',
  comercialAsiste: false,
  comercial: '',
  comercialPhone: '',
  comercialMail: '',
  rrhhAsiste: false,
  respRRHH: '',
  respRRHHPhone: '',
  respRRHHMail: '',
  agencyPercentage: 0,
  agencyCommissionValue: 0,
  spacePercentage: 0,
  spaceCommissionValue: 0,
  facturacion: 0,
  plane: '',
  comments: '',
  status: 'Borrador',
  tipoCliente: 'Empresa',
  deliveryLocations: [],
  direccionPrincipal: '',
  isVip: false,
  cateringVertical: CATERING_VERTICALES[0],
  email: '',
}

const ClienteTitle = memo(() => {
  const client = useWatch({ name: 'client' })
  const finalClient = useWatch({ name: 'finalClient' })
  return (
    <div className="flex w-full items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-emerald-500 rounded-full" />
        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-foreground/70">Cliente</h3>
      </div>
      {(client || finalClient) && (
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {client}
          </span>
          {finalClient && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {finalClient}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

const ClientInfo = memo(() => {
  const { control } = useFormContext()
  return (
    <AccordionContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 pt-2">
        <FormField
          control={control}
          name="client"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="tipoCliente"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Agencia">Agencia</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="finalClient"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente Final</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contacto Principal</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teléfono Principal</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Principal</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="direccionPrincipal"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dirección Principal de Entrega</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="bg-background/50" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </AccordionContent>
  )
})

const EspacioTitle = memo(() => {
  const space = useWatch({ name: 'space' })
  const spaceAddress = useWatch({ name: 'spaceAddress' })

  return (
    <div className="flex w-full items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-blue-500 rounded-full" />
        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-foreground/70">Espacio</h3>
      </div>
      {space && (
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {space}
          </span>
          {spaceAddress && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {spaceAddress}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

const ResponsablesTitle = memo(() => {
  const metre = useWatch({ name: 'respMetre' })
  const pase = useWatch({ name: 'respPase' })
  const pm = useWatch({ name: 'respProjectManager' })

  return (
    <div className="flex w-full items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-amber-500 rounded-full" />
        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-foreground/70">Responsables</h3>
      </div>
      {(metre || pase || pm) && (
        <div className="hidden md:flex gap-4">
          {metre && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metre</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{metre}</span>
            </div>
          )}
          {pm && (
            <div className="flex flex-col items-end border-l pl-4 border-border/40">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PM</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{pm}</span>
            </div>
          )}
          {pase && (
            <div className="flex flex-col items-end border-l pl-4 border-border/40">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pase</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{pase}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

const BeforeUnloadHandler = ({ control }: { control: any }) => {
  const { isDirty } = useFormState({ control })
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  return null
}

export default function InfoPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const isEditing = osId !== 'nuevo'

  const { toast } = useToast()

  const { data: personal, isLoading: isLoadingPersonal } = usePersonal()
  const { data: espacios, isLoading: isLoadingEspacios } = useEspacios()
  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(isEditing ? osId : undefined)

  const updateEventoMutation = useUpdateEvento()
  const createEventoMutation = useCreateEvento()

  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [isAnulacionDialogOpen, setIsAnulacionDialogOpen] = useState(false)
  const [anulacionMotivo, setAnulacionMotivo] = useState('')
  const [pendingStatus, setPendingStatus] = useState<OsFormValues['status'] | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isSubmittingFromDialog, setIsSubmittingFromDialog] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues,
  })

  const {
    setValue,
    reset,
    control,
  } = form

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getFullName = useCallback((p: Personal) => `${p.nombre} ${p.apellido1}`, [])

  const personalByDept = useMemo(() => {
    const map: Record<string, Personal[]> = {
      Sala: [],
      Pase: [],
      CPR: [],
      Comercial: [],
      RRHH: [],
      Operaciones: [],
      Almacén: [],
    }
    if (!personal) return map
    
    personal.forEach((p) => {
      if (p.departamento && p.nombre && p.apellido1) {
        let dept = p.departamento
        // Normalización de departamentos para coincidir con las llaves del mapa
        if (dept.includes('Almacen') || dept.includes('Almacén') || dept.includes('Logística')) {
          dept = 'Almacén'
        } else if (dept.includes('CPR')) {
          dept = 'CPR'
        } else if (dept.includes('RRHH')) {
          dept = 'RRHH'
        } else if (dept.includes('Operaciones') || dept.includes('HQ')) {
          dept = 'Operaciones'
        }

        if (map[dept]) {
          map[dept].push(p)
        }
      }
    })
    return map
  }, [personal])

  const personalSala = personalByDept['Sala']
  const personalPase = personalByDept['Pase']
  const personalCPR = personalByDept['CPR']
  const personalComercial = personalByDept['Comercial']
  const personalRRHH = personalByDept['RRHH']
  const personalOperaciones = personalByDept['Operaciones']
  const personalLogistica = personalByDept['Almacén']

  const validEspacios = useMemo(() => (espacios || []).filter((e) => e.nombre), [espacios])
  const espacioOptions = useMemo(
    () => validEspacios.map((e) => ({ label: e.nombre, value: e.nombre })),
    [validEspacios],
  )

  // Sincronizar formulario con datos cargados
  useEffect(() => {
    if (isInitialized) return

    if (isEditing && serviceOrder) {
      reset({
        ...defaultValues,
        ...serviceOrder,
        status: (serviceOrder.status as any) ?? defaultValues.status,
        startDate: serviceOrder.startDate ? new Date(serviceOrder.startDate) : new Date(),
        endDate: serviceOrder.endDate ? new Date(serviceOrder.endDate) : new Date(),
      })
      setIsInitialized(true)
    } else if (!isEditing) {
      reset({
        ...defaultValues,
        id: crypto.randomUUID(),
        startDate: new Date(),
        endDate: new Date(),
      })
      setIsInitialized(true)
    }
  }, [serviceOrder, isEditing, reset, isInitialized])

  const handlePersonalChange = useCallback((
    name: string,
    phoneField: keyof OsFormValues,
    mailField: keyof OsFormValues,
  ) => {
    const person = (personal || []).find((p) => getFullName(p) === name)
    setValue(phoneField, person?.telefono || '', { shouldDirty: true })
    setValue(mailField, person?.email || '', { shouldDirty: true })
  }, [personal, setValue, getFullName])

  const handleEspacioChange = useCallback((name: string) => {
    const espacio = (espacios as EspacioV2[]).find((e) => e.nombre === name)
    setValue('spaceAddress', espacio?.calle || '', { shouldDirty: true })
    const contactos: ContactoEspacio[] = espacio?.contactos ?? []
    if (contactos.length > 0) {
      setValue('spaceContact', contactos[0]?.nombre || '', { shouldDirty: true })
      setValue('spacePhone', contactos[0]?.telefono || '', { shouldDirty: true })
      setValue('spaceMail', contactos[0]?.email || '', { shouldDirty: true })
    } else {
      setValue('spaceContact', '', { shouldDirty: true })
      setValue('spacePhone', '', { shouldDirty: true })
      setValue('spaceMail', '', { shouldDirty: true })
    }
  }, [espacios, setValue])

  const isLoading =
    isLoadingPersonal ||
    isLoadingEspacios ||
    isLoadingOS ||
    updateEventoMutation.isPending ||
    createEventoMutation.isPending

  const onInvalid = (errors: any) => {
    const missingFields = Object.keys(errors).join(', ')
    toast({
      variant: 'destructive',
      title: 'No se puede guardar',
      description: `Faltan campos obligatorios: ${missingFields}.`,
    })
  }

  const onSubmit = async (data: OsFormValues) => {
    const isNew = !isEditing
    const message = isNew
      ? 'Orden de Servicio creada correctamente.'
      : 'Orden de Servicio actualizada correctamente.'

    // Asegurar que cateringVertical es del tipo correcto
    const cateringVerticalTyped = data.cateringVertical as (typeof CATERING_VERTICALES)[number]
    const safeData = { ...data, cateringVertical: cateringVerticalTyped }

    try {
      if (isNew) {
        const result = await createEventoMutation.mutateAsync(safeData)
        toast({ description: message, duration: 2000 })
        router.push(`/os/${result.numero_expediente}/info`)
      } else {
        // ensure id is present when updating
        const payload = { ...(safeData as any), id: (serviceOrder && serviceOrder.id) || osId } as any
        await updateEventoMutation.mutateAsync(payload)
        toast({ description: message, duration: 2000 })
        reset(payload)
      }
    } catch (err: any) {
      console.error('Error saving OS:', err)
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'Ocurrió un error inesperado.',
      })
    }
  }
  const handleSaveFromDialog = async () => {
    setIsSubmittingFromDialog(true)
    await form.handleSubmit(onSubmit, onInvalid)()
  }

  const handleStatusChange = (value: OsFormValues['status']) => {
    if (value === 'Anulado') {
      setPendingStatus(value)
      setIsAnulacionDialogOpen(true)
    } else {
      setValue('status', value, { shouldDirty: true })
      setValue('anulacionMotivo', undefined, { shouldDirty: true })
    }
  }

  const handleConfirmAnulacion = () => {
    if (pendingStatus && anulacionMotivo.trim()) {
      setValue('status', pendingStatus, { shouldDirty: true })
      setValue('anulacionMotivo', anulacionMotivo, { shouldDirty: true })
      setIsAnulacionDialogOpen(false)
      setAnulacionMotivo('')
      setPendingStatus(null)
    } else {
      toast({ variant: 'destructive', description: 'El motivo de anulación no puede estar vacío.' })
    }
  }

  // Valores por defecto para el acordeón: abiertos solo si es una nueva OS
  const accordionDefaultValue = isEditing ? [] : ['cliente', 'espacio']

  if (!isMounted) {
    return (
      <LoadingSkeleton
        title={isEditing ? 'Editando Orden de Servicio...' : 'Creando Orden de Servicio...'}
      />
    )
  }

  return (
    <>
      <BeforeUnloadHandler control={form.control} />
      <main>
        <FormProvider {...form}>
          <form
            id="os-form"
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="space-y-6"
          >
            <Card className="bg-background/60 backdrop-blur-md border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 md:py-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 border-b border-border/40 bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">
                      Info. OS
                    </CardTitle>
                  </div>
                  <FormField
                    control={form.control}
                    name="isVip"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="vip-check"
                            className="h-4 w-4 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white"
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor="vip-check"
                          className="flex items-center gap-2 !mt-0 text-[10px] font-black uppercase tracking-[0.1em] text-amber-700 dark:text-amber-400 cursor-pointer"
                        >
                          <Star className="h-3.5 w-3.5 fill-current" /> Evento VIP
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <Select onValueChange={(v) => handleStatusChange(v as any)} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                'w-[160px] h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                                field.value === 'Confirmado' &&
                                'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
                                field.value === 'Pendiente' &&
                                'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
                                field.value === 'Anulado' &&
                                'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
                                field.value === 'Borrador' &&
                                'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20',
                              )}
                            >
                              <SelectValue placeholder="Estado..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Borrador" className="text-[10px] font-bold uppercase tracking-widest">Borrador</SelectItem>
                            <SelectItem value="Pendiente" className="text-[10px] font-bold uppercase tracking-widest">Pendiente</SelectItem>
                            <SelectItem value="Confirmado" className="text-[10px] font-bold uppercase tracking-widest">Confirmado</SelectItem>
                            <SelectItem value="Anulado" className="text-[10px] font-bold uppercase tracking-widest">Anulado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all duration-200 active:scale-95"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isEditing ? (
                      <>
                        <span className="hidden sm:inline ml-2">Guardar Cambios</span>
                        <span className="inline sm:hidden ml-2">Guardar</span>
                      </>
                    ) : (
                      <span className="ml-2">Crear OS</span>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-6 md:p-6 md:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-6 gap-x-4">
                  <FormField
                    control={form.control}
                    name="serviceNumber"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nº Servicio</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            readOnly={isEditing}
                            value={field.value ?? ''}
                            className="h-10 bg-background/50 font-mono font-bold border-border/40 focus:bg-background transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col lg:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Inicio</FormLabel>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-bold h-10 bg-background/50 border-border/40 hover:bg-background transition-colors',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: es })
                                ) : (
                                  <span>Elige fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date)
                                setStartDateOpen(false)
                              }}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col lg:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Fin</FormLabel>
                        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-bold h-10 bg-background/50 border-border/40 hover:bg-background transition-colors',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: es })
                                ) : (
                                  <span>Elige fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date)
                                setEndDateOpen(false)
                              }}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="asistentes"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asistentes</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value ?? 0}
                              className="h-10 bg-background/50 font-bold pr-10 border-border/40 focus:bg-background transition-colors"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase opacity-60">PAX</div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cateringVertical"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vertical Catering</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background/50 font-bold border-border/40 focus:bg-background transition-colors">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATERING_VERTICALES.map((v) => (
                              <SelectItem key={v} value={v} className="font-bold text-xs">
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Accordion
                  type="multiple"
                  defaultValue={accordionDefaultValue}
                  className="w-full space-y-4"
                >
                  <AccordionItem value="cliente" className="border-none">
                    <Card className="bg-background/40 backdrop-blur-sm border-border/30 shadow-none overflow-hidden">
                      <AccordionTrigger className="p-0 hover:no-underline hover:bg-muted/20 transition-colors">
                        <ClienteTitle />
                      </AccordionTrigger>
                      <ClientInfo />
                    </Card>
                  </AccordionItem>

                  <AccordionItem value="espacio" className="border-none">
                    <Card className="bg-background/40 backdrop-blur-sm border-border/30 shadow-none overflow-hidden">
                      <AccordionTrigger className="p-0 hover:no-underline hover:bg-muted/20 transition-colors">
                        <EspacioTitle />
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 pt-2">
                          <FormField
                            control={form.control}
                            name="space"
                            render={({ field }) => (
                              <FormItem className="lg:col-span-2">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Espacio</FormLabel>
                                <Combobox
                                  options={espacioOptions}
                                  value={field.value || ''}
                                  onChange={(value) => {
                                    field.onChange(value)
                                    handleEspacioChange(value)
                                  }}
                                  placeholder="Busca o selecciona un espacio..."
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spaceAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dirección</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} className="bg-background/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spaceContact"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contacto</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} className="bg-background/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spacePhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teléfono</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ''} className="bg-background/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spaceMail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} value={field.value || ''} className="bg-background/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>

                  <AccordionItem value="responsables" className="border-none">
                    <Card className="bg-background/40 backdrop-blur-sm border-border/30 shadow-none overflow-hidden">
                      <AccordionTrigger className="p-0 hover:no-underline hover:bg-muted/20 transition-colors">
                        <ResponsablesTitle />
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-6 pt-2 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            {[
                              [
                                'respMetre',
                                'respMetrePhone',
                                'respMetreMail',
                                'Resp. Metre',
                                personalSala,
                              ],
                              [
                                'respPase',
                                'respPasePhone',
                                'respPaseMail',
                                'Resp. Pase',
                                personalPase,
                              ],
                              [
                                'respCocinaPase',
                                'respCocinaPasePhone',
                                'respCocinaPaseMail',
                                'Resp. Cocina Pase',
                                personalPase,
                              ],
                              [
                                'respCocinaCPR',
                                'respCocinaCPRPhone',
                                'respCocinaCPRMail',
                                'Resp. Cocina CPR',
                                personalCPR,
                              ],
                              [
                                'respProjectManager',
                                'respProjectManagerPhone',
                                'respProjectManagerMail',
                                'Resp. Project Manager',
                                personalOperaciones,
                              ],
                              [
                                'respLogistica',
                                'respLogisticaPhone',
                                'respLogisticaMail',
                                'Resp. Logística',
                                personalLogistica,
                              ],
                            ].map(([name, phone, mail, label, personalList]) => (
                              <div key={name as string} className="space-y-2 group">
                                <FormField
                                  control={form.control}
                                  name={name as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-500 transition-colors">{label as string}</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          handlePersonalChange(value, phone as any, mail as any)
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-background/50 font-bold">
                                            <SelectValue placeholder="Seleccionar..." />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {((personalList as Personal[]) || []).map((p) => (
                                            <SelectItem key={p.id} value={getFullName(p)} className="font-medium">
                                              {getFullName(p)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <ContactDisplay phoneField={phone as string} mailField={mail as string} iconColor="text-amber-500/70" />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/40">
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="comercialAsiste"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 transition-all hover:bg-muted/30">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="h-5 w-5"
                                      />
                                    </FormControl>
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-xs font-black uppercase tracking-widest">
                                        Asistencia Comercial
                                      </FormLabel>
                                      <p className="text-[10px] text-muted-foreground font-medium">El comercial asistirá al evento</p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <div className="space-y-2 group">
                                <FormField
                                  control={form.control}
                                  name="comercial"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-blue-500 transition-colors">Resp. Comercial</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          handlePersonalChange(value, 'comercialPhone', 'comercialMail')
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-background/50 font-bold">
                                            <SelectValue placeholder="Seleccionar..." />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {personalComercial.map((p) => (
                                            <SelectItem key={p.id} value={getFullName(p)} className="font-medium">
                                              {getFullName(p)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <ContactDisplay phoneField="comercialPhone" mailField="comercialMail" iconColor="text-blue-500/70" />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="rrhhAsiste"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 transition-all hover:bg-muted/30">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="h-5 w-5"
                                      />
                                    </FormControl>
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-xs font-black uppercase tracking-widest">
                                        Asistencia RRHH
                                      </FormLabel>
                                      <p className="text-[10px] text-muted-foreground font-medium">RRHH asistirá al evento</p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <div className="space-y-2 group">
                                <FormField
                                  control={form.control}
                                  name="respRRHH"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-emerald-500 transition-colors">Resp. RRHH</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail')
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-background/50 font-bold">
                                            <SelectValue placeholder="Seleccionar..." />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {personalRRHH.map((p) => (
                                            <SelectItem key={p.id} value={getFullName(p)} className="font-medium">
                                              {getFullName(p)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <ContactDisplay phoneField="respRRHHPhone" mailField="respRRHHMail" iconColor="text-emerald-500/70" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                </Accordion>

                <div className="space-y-4 pt-6 border-t border-border/40">
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comentarios Generales</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            {...field}
                            value={field.value ?? ''}
                            className="bg-background/50 resize-none focus:ring-emerald-500/20"
                            placeholder="Añade cualquier observación relevante para el servicio..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <AnulacionDisplay />
              </CardContent>
            </Card>
          </form>
        </FormProvider>
        {/* Zona de peligro removida */}
      </main>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Qué quieres hacer con los cambios que has realizado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="destructive"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => router.push(`/os/${params.numero_expediente}/info`)}
              >
                Descartar
              </Button>
              <Button onClick={handleSaveFromDialog} disabled={isLoading}>
                {isLoading && isSubmittingFromDialog ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Guardar y Salir'
                )}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* AlertDialog de borrado removido */}
      <AlertDialog open={isAnulacionDialogOpen} onOpenChange={setIsAnulacionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vas a anular esta orden de servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Es correcto? Indica, por favor, el motivo de la anulación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Escribe aquí el motivo de la anulación..."
            value={anulacionMotivo}
            onChange={(e) => setAnulacionMotivo(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsAnulacionDialogOpen(false)
                form.setValue('status', form.getValues('status')) // revert select
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAnulacion} disabled={!anulacionMotivo.trim()}>
              Confirmar Anulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
