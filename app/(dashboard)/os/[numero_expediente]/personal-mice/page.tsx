'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react'
import type {
  PersonalMiceOrder,
  ServiceOrder,
  Espacio,
  ComercialBriefing,
  ComercialBriefingItem,
  Personal,
} from '@/types'
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
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import {
  useEvento,
  useEspacios,
  useComercialBriefings,
  usePersonalMiceOrders,
  usePersonal,
} from '@/hooks/use-data-queries'
import {
  useCreatePersonalMiceAssignment,
  useUpdatePersonalMiceAssignment,
  useDeletePersonalMiceAssignment,
  useSyncPersonalMiceAssignments,
} from '@/hooks/mutations/use-personal-mice-mutations'

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  centroCoste: z.enum(centroCosteOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
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

const formSchema = z.object({
  personal: z.array(personalMiceSchema),
})

type PersonalMiceFormValues = z.infer<typeof formSchema>

export default function PersonalMiceFormPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<number | null>(null)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: briefing } = useComercialBriefings(serviceOrder?.id)
  const { data: personalDB = [] } = usePersonal()
  const { data: existingAssignments = [], isLoading: isLoadingAssignments } = usePersonalMiceOrders(
    serviceOrder?.id,
  )
  const { data: espacios = [] } = useEspacios()

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
      form.reset({ personal: existingAssignments })
    }
  }, [existingAssignments, form])

  const spaceAddress = useMemo(() => {
    if (!serviceOrder?.space) return ''
    const currentSpace = espacios.find((e) => e.nombre === serviceOrder.space)
    return currentSpace?.calle || ''
  }, [serviceOrder?.space, espacios])

  const briefingItems = briefing?.[0]?.items || []

  const handlePersonalChange = useCallback(
    (index: number, name: string) => {
      if (!name) return
      const person = personalDB.find((p) => p.nombre.toLowerCase() === name.toLowerCase())
      if (person) {
        setValue(`personal.${index}.nombre`, person.nombre, { shouldDirty: true })
        setValue(`personal.${index}.dni`, person.id || '', { shouldDirty: true })
        setValue(`personal.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true })
      } else {
        setValue(`personal.${index}.nombre`, name, { shouldDirty: true })
      }
    },
    [personalDB, setValue],
  )

  const watchedFields = useWatch({ control, name: 'personal' })

  const { totalPlanned, totalReal } = useMemo(() => {
    if (!watchedFields) return { totalPlanned: 0, totalReal: 0 }

    const totals = watchedFields.reduce(
      (acc, order) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida)
        acc.planned += plannedHours * (order.precioHora || 0)

        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal)
        acc.real += realHours * (order.precioHora || 0)

        return acc
      },
      { planned: 0, real: 0 },
    )

    return { totalPlanned: totals.planned, totalReal: totals.real }
  }, [watchedFields])

  const onSubmit = async (data: PersonalMiceFormValues) => {
    if (!serviceOrder?.id) return
    setIsLoading(true)
    try {
      await syncAssignments.mutateAsync({ osId: serviceOrder.id, assignments: data.personal })
      toast({
        title: 'Personal MICE guardado',
        description: 'Todos los cambios han sido guardados.',
      })
      form.reset(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron guardar los cambios.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addRow = () => {
    append({
      id: Date.now().toString(),
      osId: serviceOrder?.id || osId,
      centroCoste: 'SALA',
      nombre: '',
      dni: '',
      tipoServicio: 'Servicio',
      horaEntrada: '09:00',
      horaSalida: '17:00',
      precioHora: 0,
      horaEntradaReal: '',
      horaSalidaReal: '',
    })
  }

  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete)
      setRowToDelete(null)
      toast({ title: 'Asignación eliminada' })
    }
  }

  const personalOptions = useMemo(() => {
    return personalDB.map((p) => ({ label: p.nombre, value: p.nombre.toLowerCase() }))
  }, [personalDB])

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
        <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isDirty}
                  className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Save className="mr-2 h-3 w-3" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full mb-6">
            <AccordionItem value="item-1" className="border-none">
              <Card className="bg-background/40 backdrop-blur-sm border-border/40 overflow-hidden">
                <AccordionTrigger className="px-6 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-muted">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Servicios del Evento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    <div className="border rounded-lg border-border/40 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 border-b border-border/40">
                            <TableHead className="h-8 px-3 text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                            <TableHead className="h-8 px-3 text-[10px] font-black uppercase tracking-widest">Descripción</TableHead>
                            <TableHead className="h-8 px-3 text-[10px] font-black uppercase tracking-widest">PAX</TableHead>
                            <TableHead className="h-8 px-3 text-right text-[10px] font-black uppercase tracking-widest">Duración</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {briefingItems.length > 0 ? (
                            briefingItems.map((item) => (
                              <TableRow key={item.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                <TableCell className="py-1.5 px-3 text-[11px] font-medium text-muted-foreground">
                                  {format(new Date(item.fecha), 'dd/MM/yyyy')} <span className="font-bold text-foreground ml-1">{item.horaInicio}</span>
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider">{item.descripcion}</TableCell>
                                <TableCell className="py-1.5 px-3 text-[11px] font-mono">{item.asistentes}</TableCell>
                                <TableCell className="py-1.5 px-3 text-right text-[11px] font-mono">
                                  {calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-16 text-center text-[11px] text-muted-foreground">
                                No hay servicios en el briefing.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader className="flex-row items-center justify-between py-4">
              <CardTitle className="text-[12px] font-black uppercase tracking-widest">Personal Asignado</CardTitle>
              <Button
                type="button"
                onClick={addRow}
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
              >
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Añadir Personal
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border/40">
                      <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Centro Coste</TableHead>
                      <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Nombre</TableHead>
                      <TableHead className="h-10 px-3 text-[10px] font-black uppercase tracking-widest">Servicio</TableHead>
                      <TableHead
                        colSpan={3}
                        className="h-10 text-center border-l border-border/40 px-3 text-[10px] font-black uppercase tracking-widest bg-blue-500/[0.02]"
                      >
                        Planificado
                      </TableHead>
                      <TableHead colSpan={2} className="h-10 text-center border-l border-border/40 px-3 text-[10px] font-black uppercase tracking-widest bg-emerald-500/[0.02]">
                        Real
                      </TableHead>
                      <TableHead className="h-10 px-3 text-right text-[10px] font-black uppercase tracking-widest"></TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/10 border-b border-border/40">
                      <TableHead className="h-8 px-3"></TableHead>
                      <TableHead className="h-8 px-3"></TableHead>
                      <TableHead className="h-8 px-3"></TableHead>
                      <TableHead className="h-8 border-l border-border/40 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-blue-500/[0.02] w-24">
                        Entrada
                      </TableHead>
                      <TableHead className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-blue-500/[0.02] w-24">Salida</TableHead>
                      <TableHead className="h-8 border-r border-border/40 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-blue-500/[0.02] w-20">
                        €/Hora
                      </TableHead>
                      <TableHead className="h-8 border-l border-border/40 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-emerald-500/[0.02] w-24">Entrada</TableHead>
                      <TableHead className="h-8 border-r border-border/40 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-emerald-500/[0.02] w-24">Salida</TableHead>
                      <TableHead className="h-8 px-3"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length > 0 ? (
                      fields.map((field, index) => (
                        <TableRow key={field.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <TableCell className="py-1.5 px-3">
                            <FormField
                              control={control}
                              name={`personal.${index}.centroCoste`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="w-28 h-7 text-[11px] font-bold bg-transparent border-border/40">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {centroCosteOptions.map((o) => (
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
                          <TableCell className="py-1.5 px-3 min-w-40">
                            <FormField
                              control={control}
                              name={`personal.${index}.nombre`}
                              render={({ field }) => (
                                <FormItem>
                                  <Combobox
                                    options={personalOptions}
                                    value={field.value || ''}
                                    onChange={(value) => handlePersonalChange(index, value)}
                                    placeholder="Nombre..."
                                    className="h-7 text-[11px] font-bold"
                                  />
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
                                      <SelectTrigger className="w-28 h-7 text-[11px] bg-transparent border-border/40">
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
                          <TableCell className="border-l border-border/40 py-1.5 px-3 bg-blue-500/[0.01]">
                            <FormField
                              control={control}
                              name={`personal.${index}.horaEntrada`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="time" {...field} className="w-24 h-7 text-[11px] font-mono bg-transparent border-border/40" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1.5 px-3 bg-blue-500/[0.01]">
                            <FormField
                              control={control}
                              name={`personal.${index}.horaSalida`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="time" {...field} className="w-24 h-7 text-[11px] font-mono bg-transparent border-border/40" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="border-r border-border/40 py-1.5 px-3 bg-blue-500/[0.01]">
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
                                      className="w-20 h-7 text-[11px] font-mono bg-transparent border-border/40"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="border-l border-border/40 py-1.5 px-3 bg-emerald-500/[0.01]">
                            <FormField
                              control={control}
                              name={`personal.${index}.horaEntradaReal`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="time" {...field} className="w-24 h-7 text-[11px] font-mono bg-transparent border-border/40" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="border-r border-border/40 py-1.5 px-3 bg-emerald-500/[0.01]">
                            <FormField
                              control={control}
                              name={`personal.${index}.horaSalidaReal`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="time" {...field} className="w-24 h-7 text-[11px] font-mono bg-transparent border-border/40" />
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-[11px] text-muted-foreground">
                          No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            {fields.length > 0 && (
              <CardFooter className="p-6 bg-muted/10 border-t border-border/40">
                <div className="w-full md:w-1/3 ml-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coste Planificado</span>
                    <span className="text-[12px] font-bold font-mono">{formatCurrency(totalPlanned)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coste Real</span>
                    <span className="text-[12px] font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReal)}</span>
                  </div>
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-700 dark:text-blue-400">Desviación</span>
                    <span className={cn(
                      "text-[14px] font-black font-mono",
                      totalReal - totalPlanned > 0 ? 'text-red-500' : 'text-emerald-600'
                    )}>
                      {formatCurrency(totalReal - totalPlanned)}
                    </span>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </form>
      </FormProvider>

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
    </div>
  )
}
