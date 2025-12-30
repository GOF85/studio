'use client'

import * as React from 'react'
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray, useWatch, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  PlusCircle,
  Trash2,
  Save,
  Pencil,
  Check,
  Utensils,
  MessageSquare,
  Users,
  Loader2,
  RefreshCw,
  GripVertical,
  ArrowLeft,
} from 'lucide-react'
import { format, differenceInMinutes, parse, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type {
  ServiceOrder,
  ComercialBriefing,
  ComercialBriefingItem,
  GastronomyOrderItem,
  Receta,
  GastronomyOrderStatus,
  GastronomyOrder,
  HistoricoPreciosERP,
  ArticuloERP,
  IngredienteInterno,
  Elaboracion,
} from '@/types'
import { supabase } from '@/lib/supabase'
import {
  useGastronomyOrders,
  useComercialBriefing,
  useUpdateGastronomyOrder,
} from '@/hooks/use-briefing-data'
import { useEvento } from '@/hooks/use-data-queries'
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
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { RecetaSelector } from '@/components/os/gastronomia/receta-selector'

const gastroItemSchema = z.object({
  id: z.string(), // Receta ID
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  costeMateriaPrimaSnapshot: z.number().optional(),
  precioVentaSnapshot: z.number().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
  comentarios: z.string().optional(),
})

const formSchema = z.object({
  items: z.array(gastroItemSchema),
  status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
})

type FormValues = z.infer<typeof formSchema>

const GastroInfoBar = memo(({ asistentes }: { asistentes: number }) => {
  const { control } = useFormContext()
  const watchedItems = useWatch({ control, name: 'items' })

  const { totalPedido, ratioUnidadesPorPax } = useMemo(() => {
    let total = 0
    let totalUnits = 0

    ;(watchedItems || []).forEach((item: any) => {
      if (item.type === 'item') {
        const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0
        total += priceToUse * (item.quantity || 0)
        totalUnits += item.quantity || 0
      }
    })

    const ratio =
      asistentes && asistentes > 0
        ? totalUnits / asistentes
        : 0

    return {
      totalPedido: total,
      ratioUnidadesPorPax: ratio,
    }
  }, [watchedItems, asistentes])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardHeader className="pb-2 py-3">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Asistentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight">{asistentes}</span>
            <span className="text-[10px] font-bold uppercase text-muted-foreground/60">pax</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <CardHeader className="pb-2 py-3">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight text-orange-600">
              {totalPedido.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <CardHeader className="pb-2 py-3">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ratio Unidades/Pax</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight text-emerald-600">{ratioUnidadesPorPax.toFixed(2)}</span>
            <span className="text-[10px] font-bold uppercase text-muted-foreground/60">u/pax</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <CardHeader className="pb-2 py-3">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || 'Pendiente'}>
                <FormControl>
                  <SelectTrigger className="h-8 border-none bg-transparent p-0 focus:ring-0 text-[14px] font-black uppercase tracking-tight">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Pendiente">PENDIENTE</SelectItem>
                  <SelectItem value="En preparación">EN PREPARACIÓN</SelectItem>
                  <SelectItem value="Listo">LISTO</SelectItem>
                  <SelectItem value="Incidencia">INCIDENCIA</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
})

GastroInfoBar.displayName = 'GastroInfoBar'

// Componente para filas sortables
const SortableRow = memo(({
  id,
  index,
  field,
  control,
  remove,
  setEditingComment,
  formatCurrency,
  update,
  onEditSeparator,
}: any) => {
  // Deshabilitar completamente el sortable cuando estamos editando
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'hsl(var(--muted))' : 'transparent',
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={field.type === 'separator' ? 'bg-muted/50 hover:bg-muted/80' : ''}
    >
      {field.type === 'separator' ? (
        <>
          <TableCell className="w-8 flex items-center">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
              title="Arrastra para reordenar"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </TableCell>
          <TableCell
            className="flex-1 min-w-96 cursor-pointer hover:underline font-bold text-lg"
            onClick={() => onEditSeparator({ index, nombre: field.nombre })}
          >
            {field.nombre}
          </TableCell>
          <TableCell colSpan={3}></TableCell>
          <TableCell className="text-right w-16">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="w-8 flex items-center">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
              title="Arrastra para reordenar"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </TableCell>
          <TableCell className="flex-1 min-w-96">{field.nombre}</TableCell>
          <TableCell className="w-24">
            <FormField
              control={control}
              name={`items.${index}.quantity`}
              render={({ field: quantityField }) => (
                <Input
                  type="number"
                  {...quantityField}
                  onChange={(e) => quantityField.onChange(parseInt(e.target.value, 10) || 0)}
                  className="w-20 h-8"
                />
              )}
            />
          </TableCell>
          <TableCell className="w-24 text-right">
            {formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}
          </TableCell>
          <TableCell className="w-32 text-right font-semibold">
            {formatCurrency(
              (field.precioVentaSnapshot || field.precioVenta || 0) * (field.quantity || 0),
            )}
          </TableCell>
          <TableCell className="text-right w-24">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8"
                onClick={() => setEditingComment({ index, text: field.comentarios || '' })}
              >
                <MessageSquare className={`h-4 w-4 ${field.comentarios ? 'text-primary' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-8 w-8"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  )
})

function PedidoGastronomiaForm() {
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const briefingItemId = (params.briefingItemId as string) || ''

  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [editingComment, setEditingComment] = useState<{ index: number; text: string } | null>(null)
  const [editingSeparator, setEditingSeparator] = useState<{
    index: number
    nombre: string
  } | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  const { data: serviceOrder } = useEvento(osId)

  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    serviceOrder?.id || osId,
  )
  const { data: gastronomyOrders = [], isLoading: isLoadingOrders } = useGastronomyOrders(
    serviceOrder?.id || osId,
  )
  const updateOrderMutation = useUpdateGastronomyOrder()

  const briefingItem = useMemo(() => {
    return briefing?.items?.find((item) => item.id === briefingItemId) || null
  }, [briefing, briefingItemId])

  const gastroOrder = useMemo(() => {
    return gastronomyOrders.find((o) => o.id === briefingItemId) || null
  }, [gastronomyOrders, briefingItemId])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      status: 'Pendiente',
    },
  })

  const { control, handleSubmit, reset, watch, setValue, getValues, formState } = form

  const watchedItems = watch('items')
  const totalPedido = useMemo(() => {
    return (watchedItems || []).reduce((acc: number, item: any) => {
      if (item.type === 'separator') return acc
      return acc + (item.precioVentaSnapshot || item.precioVenta || 0) * (item.quantity || 0)
    }, 0)
  }, [watchedItems])

  // Sincronizar formulario con datos cargados
  useEffect(() => {
    if (gastroOrder) {
      reset({
        items: gastroOrder.items || [],
        status: gastroOrder.status || 'Pendiente',
      })
    }
  }, [gastroOrder, reset])

  const { fields, append, remove, update, move } = useFieldArray({ control, name: 'items' })

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex)
      }
    }
  }

  const updateAll = (newItems: any[]) => {
    newItems.forEach((item, index) => {
      update(index, item)
    })
  }

  const [isRecalculating, setIsRecalculating] = useState(false)
  const isLoading = isLoadingBriefing || isLoadingOrders || updateOrderMutation.isPending || isRecalculating

  const onAddReceta = (receta: Receta) => {
    // Usar coste_venta directamente de Supabase, fallback a costeMateriaPrima si no existe
    let coste = receta.costeMateriaPrima || 0
    let pvp = receta.precioVenta || 0

    // Si no hay precioVenta pero hay coste y porcentaje, calcular
    if (pvp === 0 && coste > 0) {
      const margen = receta.porcentajeCosteProduccion || 30
      pvp = coste * (1 + margen / 100)
    }

    append({
      id: receta.id,
      type: 'item',
      nombre: receta.nombre,
      costeMateriaPrima: coste,
      precioVenta: pvp,
      costeMateriaPrimaSnapshot: coste,
      precioVentaSnapshot: pvp,
      quantity: briefingItem?.asistentes || 1,
      comentarios: '',
    })
    setIsSelectorOpen(false)
    toast({ title: 'Receta añadida' })
  }

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true)
      const currentItems = getValues('items')

      if (currentItems.length === 0) {
        toast({
          variant: 'destructive',
          title: '✗ Sin items',
          description: 'Añade al menos un plato para recalcular',
        })
        return
      }

      // Cargar recetas de Supabase para obtener precios actualizados
      const itemIds = currentItems.filter((i) => i.type === 'item').map((i) => i.id)

      const { data: recetasData, error } = await supabase
        .from('recetas')
        .select('*')
        .in('id', itemIds)

      if (error) throw error

      const recetasMap = new Map((recetasData || []).map((r) => [r.id, r]))

      const updatedItems = currentItems.map((item) => {
        if (item.type === 'separator') return item

        const recetaData = recetasMap.get(item.id)
        if (!recetaData) return item

        // Usar coste_venta directamente de Supabase
        const coste = recetaData.coste_materia_prima_actual || recetaData.coste_materia_prima || 0
        let pvp = recetaData.precio_venta || 0

        // Si no hay precioVenta pero hay coste y porcentaje, calcular
        if (pvp === 0 && coste > 0) {
          const margen =
            recetaData.margen_bruto_actual || recetaData.porcentaje_coste_produccion || 30
          pvp = coste * (1 + margen / 100)
        }

        if (coste !== item.costeMateriaPrimaSnapshot || pvp !== item.precioVentaSnapshot) {
          return {
            ...item,
            costeMateriaPrima: coste,
            precioVenta: pvp,
            costeMateriaPrimaSnapshot: coste,
            precioVentaSnapshot: pvp,
          }
        }
        return item
      })

      let hasChanges = updatedItems.some((item, idx) => item !== currentItems[idx])

      if (hasChanges) {
        // Actualizar todos los items en el formulario
        updatedItems.forEach((item, index) => {
          update(index, item)
        })
        toast({
          title: '✓ Precios recalculados',
          description: 'Los precios y totales han sido actualizados desde Supabase',
        })
      } else {
        toast({
          title: 'ℹ Sin cambios',
          description: 'Los precios ya están actualizados',
        })
      }
    } catch (error) {
      console.error('Error recalculando precios:', error)
      toast({
        variant: 'destructive',
        title: '✗ Error',
        description: 'No se pudieron recalcular los precios',
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  const addSeparator = (name: string) => {
    append({
      id: `sep-${Date.now()}`,
      type: 'separator',
      nombre: name,
    })
  }

  const onSubmit = async (data: FormValues) => {
    if (!briefingItem) {
      toast({ variant: 'destructive', title: '✗ Error', description: 'No se encontró el briefing' })
      return
    }

    if (data.items.length === 0) {
      toast({ variant: 'destructive', title: '✗ Error', description: 'Añade al menos un plato' })
      return
    }

    try {
      await updateOrderMutation.mutateAsync({
        id: briefingItemId,
        osId: serviceOrder?.id || osId,
        status: data.status,
        items: data.items,
        total: totalPedido,
      })

      const itemCount = data.items.filter((i) => i.type === 'item').length
      const totalFormatted = totalPedido.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })

      toast({
        title: '✓ Pedido Guardado',
        description: `${itemCount} platos | Total: ${totalFormatted}`,
        duration: 5000,
      })

      reset(data)
    } catch (error) {
      console.error('Error guardando pedido:', error)
      toast({
        variant: 'destructive',
        title: '✗ Error',
        description: 'No se pudo guardar el pedido',
        duration: 5000,
      })
    }
  }

  const handleSaveComment = () => {
    if (editingComment) {
      const currentItems = getValues('items')
      currentItems[editingComment.index].comentarios = editingComment.text
      update(editingComment.index, currentItems[editingComment.index])
      setEditingComment(null)
      toast({ title: 'Comentario guardado.' })
    }
  }

  const handleSaveSeparator = () => {
    if (editingSeparator) {
      const currentItems = getValues('items')
      currentItems[editingSeparator.index].nombre = editingSeparator.nombre
      update(editingSeparator.index, currentItems[editingSeparator.index])
      setEditingSeparator(null)
      toast({ title: 'Separador actualizado.' })
    }
  }

  if (isLoading || !briefingItem) {
    return <LoadingSkeleton title="Cargando pedido de gastronomía..." />
  }

  return (
    <main className="space-y-6">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Premium Sticky */}
          <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
              <div className="flex items-center">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <Utensils className="h-5 w-5 text-orange-500" />
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2 no-print">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={isLoading}
                  className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-orange-500/5"
                >
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} />
                  Recalcular
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!formState.isDirty || updateOrderMutation.isPending}
                  className="h-8 text-[10px] font-black uppercase tracking-widest bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                >
                  {updateOrderMutation.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-3.5 w-3.5" />
                  )}
                  Guardar Pedido
                </Button>
              </div>
            </div>
          </div>

          {/* Info Bar Premium */}
          <GastroInfoBar asistentes={briefingItem.asistentes} />

          <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-orange-500/5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-orange-500" />
                <CardTitle className="text-[12px] font-black uppercase tracking-widest">Composición del Menú</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSeparator('Nuevo Separador')}
                  className="text-[10px] font-black uppercase tracking-widest h-8"
                >
                  + Separador
                </Button>
                <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button" 
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest h-8"
                    >
                      <PlusCircle className="mr-2 h-3.5 w-3.5" />
                      Añadir Plato
                    </Button>
                  </DialogTrigger>
                  <RecetaSelector onSelect={onAddReceta} />
                </Dialog>
              </div>
            </div>
            <CardContent className="p-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Referencia / Separador</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center w-24">Cantidad</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-24">PVP</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-32">Total</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {fields.length > 0 ? (
                        fields.map((field, index) => (
                          <SortableRow
                            key={field.id}
                            id={field.id}
                            index={index}
                            field={field}
                            control={control}
                            remove={remove}
                            update={update}
                            setEditingComment={setEditingComment}
                            onEditSeparator={setEditingSeparator}
                            formatCurrency={formatCurrency}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-[11px] text-muted-foreground uppercase tracking-widest">
                            No hay platos en este pedido.
                          </TableCell>
                        </TableRow>
                      )}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Dialog open={!!editingComment} onOpenChange={(isOpen) => !isOpen && setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Observaciones para: {editingComment ? watchedItems[editingComment.index].nombre : ''}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={editingComment?.text || ''}
            onChange={(e) =>
              setEditingComment((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            rows={4}
            placeholder="Añade aquí cualquier comentario sobre este plato..."
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingComment(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComment}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSeparator}
        onOpenChange={(isOpen) => !isOpen && setEditingSeparator(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar separador</DialogTitle>
          </DialogHeader>
          <Input
            value={editingSeparator?.nombre || ''}
            onChange={(e) =>
              setEditingSeparator((prev) => (prev ? { ...prev, nombre: e.target.value } : null))
            }
            placeholder="Nombre del separador"
            autoFocus
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingSeparator(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSeparator}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function PedidoGastronomiaPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
      <PedidoGastronomiaForm />
    </React.Suspense>
  )
}

export default PedidoGastronomiaPage
