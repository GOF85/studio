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
  User,
  Loader2,
  RefreshCw,
  GripVertical,
  ArrowLeft,
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  Building2,
  MapPin,
  NotebookPen,
  ChevronDown,
  Sparkles,
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
import { BriefingSummaryTrigger } from '@/components/os/briefing-summary-dialog'

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
  CategoriaReceta,
} from '@/types'
import { supabase } from '@/lib/supabase'
import {
  useGastronomyOrders,
  useComercialBriefing,
  useUpdateGastronomyOrder,
  useGastroEsenciales,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { EditGastronomiaPlateModal } from '@/components/os/gastronomia/edit-gastronomia-plate-modal'
import { DualCompositionCards } from '@/components/gastro/dual-composition-cards'
import { useGastronomyOrderChanges } from '@/hooks/use-gastronomy-order-changes'

const gastroItemSchema = z.object({
  id: z.string(), // Receta ID
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  categoria: z.string().optional(),
  costeMateriaPrimaSnapshot: z.number().optional(),
  precioVentaSnapshot: z.number().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
  comentarios: z.string().optional(),
  alergenos: z.array(z.any()).optional(),
  alergenosMetadata: z.object({
    presentes: z.array(z.string()),
    trazas: z.array(z.string())
  }).optional(),
  alergenosDeclarados: z.array(z.object({ id: z.string() })).optional(),
  aprobadoCocina: z.boolean().optional(),
})

const formSchema = z.object({
  items: z.array(gastroItemSchema),
  status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
  asistentesAlergenos: z.coerce.number().optional().default(0),
  itemsAlergenos: z.array(gastroItemSchema).optional().default([]),
  comentariosAlergenos: z.string().optional().default(''),
  itemsEsenciales: z.array(gastroItemSchema).optional().default([]),
})

type FormValues = z.infer<typeof formSchema>

const GastroInfoBar = memo(({ asistentes, asistentesAlergenos = 0 }: { asistentes: number; asistentesAlergenos?: number }) => {
  const { control } = useFormContext()
  const watchedItems = useWatch({ control, name: 'items' })
  const watchedAllergenItems = useWatch({ control, name: 'itemsAlergenos' })
  const watchedEsencialesItems = useWatch({ control, name: 'itemsEsenciales' })

  const { totalPedido, asistentesGenericos, ratioGenericos, allergenTotal, ratioAlergenos } = useMemo(() => {
    // Calcular asistentes genéricos (totales menos alérgenos)
    const genericos = Math.max(0, asistentes - asistentesAlergenos)
    
    // Menú genérico: calcular total y units
    let regularTotal = 0
    let regularUnits = 0
    ;(watchedItems || []).forEach((item: any) => {
      if (item.type === 'item') {
        const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0
        regularTotal += priceToUse * (item.quantity || 0)
        regularUnits += item.quantity || 0
      }
    })

    // Esenciales: calcular total, pero NO sumar a regularUnits para el ratio
    let esencialesTotal = 0
    ;(watchedEsencialesItems || []).forEach((item: any) => {
      if (item.type === 'item') {
        const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0
        esencialesTotal += priceToUse * (item.quantity || 0)
      }
    })

    // Menú alérgeno: calcular total y units
    let allergenTotalPrice = 0
    let allergenUnits = 0
    ;(watchedAllergenItems || []).forEach((item: any) => {
      if (item.type === 'item') {
        const priceToUse = item.precioVenta || 0
        allergenTotalPrice += priceToUse * (item.quantity || 0)
        allergenUnits += item.quantity || 0
      }
    })

    // Calcular ratios (evitar división por cero)
    const ratioGenerico = genericos > 0 ? regularUnits / genericos : 0
    const ratioAlergeno = asistentesAlergenos > 0 ? allergenUnits / asistentesAlergenos : 0

    return {
      totalPedido: regularTotal + esencialesTotal,
      asistentesGenericos: genericos,
      ratioGenericos: ratioGenerico,
      allergenTotal: allergenTotalPrice,
      ratioAlergenos: ratioAlergeno,
    }
  }, [watchedItems, watchedAllergenItems, watchedEsencialesItems, asistentes, asistentesAlergenos])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {/* Card 1: Asistentes */}
      <Card className="h-auto bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-500" />
        <CardHeader className="pb-0 py-0.5 px-2">
          <div className="flex justify-between items-baseline gap-1">
            <CardTitle className="text-[13px] font-black uppercase tracking-widest leading-none">Asistentes</CardTitle>
            <div className="flex items-center gap-0.5">
              <span className="text-2xl font-black text-black dark:text-white leading-none">{asistentes}</span>
              <User className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 pt-0">
        </CardContent>
      </Card>

      {/* Card 2: Coste Pedido */}
      <Card className="h-auto bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <CardHeader className="pb-0 py-0.5 px-2">
          <div className="flex justify-between items-baseline gap-1">
            <CardTitle className="text-[13px] font-black uppercase tracking-widest leading-none">Coste Pedido</CardTitle>
            <span className="text-2xl font-black text-black dark:text-white leading-none">
              {(totalPedido + allergenTotal).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 pt-0">
        </CardContent>
      </Card>

      {/* Card 3: Coste por Pax */}
      <Card className="h-auto bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <CardHeader className="pb-0 py-0.5 px-2">
          <div className="flex justify-between items-baseline gap-1">
            <CardTitle className="text-[13px] font-black uppercase tracking-widest leading-none">Coste/Pax</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-black dark:text-white leading-none">
                {((totalPedido + allergenTotal) / asistentes).toFixed(2)}€
              </span>
              <span className="text-lg font-light text-muted-foreground">/</span>
              <User className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 pt-0">
        </CardContent>
      </Card>

      {/* Card 4: Ratios */}
      <Card className="h-auto bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardHeader className="pb-0 py-0.5 px-2">
          <div className="flex justify-between items-baseline gap-1">
            <CardTitle className="text-[13px] font-black uppercase tracking-widest leading-none">Ratios</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-black dark:text-white leading-none">
                {ratioGenericos.toFixed(2)}
              </span>
              <span className="text-lg font-light text-muted-foreground">/</span>
              <User className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 pt-0">
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
  watchedItem,
  control,
  remove,
  setEditingComment,
  formatCurrency,
  update,
  allergenUpdate,
  onEditSeparator,
  onEditPlate,
  editingMenu,
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
      style={{
        ...style,
        backgroundColor: field.type === 'separator' ? (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)') : style.backgroundColor
      }}
      className={field.type === 'separator' ? 'border-b-2 border-gray-200 dark:border-slate-700' : ''}
    >
      {field.type === 'separator' ? (
        <>
          <TableCell className="w-5 md:w-8 p-0.5 md:p-1">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0 md:p-1"
              title="Arrastra"
            >
              <GripVertical className="h-2.5 md:h-4 w-2.5 md:w-4" />
            </button>
          </TableCell>
          <TableCell
            className="px-0.5 md:px-3 py-0.5 md:py-2 min-w-[60px] md:min-w-[140px] cursor-pointer hover:underline font-bold text-[7px] md:text-base line-clamp-1"
            onClick={() => onEditSeparator({ index, nombre: field.nombre, menu: editingMenu })}
          >
            {field.nombre}
          </TableCell>
          <TableCell colSpan={3}></TableCell>
          <TableCell className="text-right px-0.5 md:px-3 py-0.5 md:py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive h-5 md:h-8 w-5 md:w-8 p-0"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-2.5 md:h-4 w-2.5 md:w-4" />
            </Button>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="w-5 md:w-8 p-0.5 md:p-1">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0 md:p-1"
              title="Arrastra"
            >
              <GripVertical className="h-2.5 md:h-4 w-2.5 md:w-4" />
            </button>
          </TableCell>
          <TableCell className={`px-0.5 md:px-3 py-0.5 md:py-2 min-w-[60px] md:min-w-[140px] text-[7px] md:text-sm font-medium line-clamp-1 flex items-center gap-1 ${watchedItem?.id?.toString().startsWith('manual-') ? 'cursor-pointer hover:underline hover:text-blue-600 bg-yellow-100/50 dark:bg-yellow-900/20' : ''}`} onClick={() => { if (watchedItem?.id?.toString().startsWith('manual-')) { onEditPlate(watchedItem, editingMenu); } }} >
            {watchedItem?.id?.toString().startsWith('manual-') && <AlertCircle className="h-3 md:h-4 w-3 md:w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />}
            <span>{field.nombre}</span>
          </TableCell>
          <TableCell className="px-0.5 md:px-3 py-0.5 md:py-2 text-center">
            <FormField
              control={control}
              name={`${editingMenu === 'alergenos' ? 'itemsAlergenos' : 'items'}.${index}.quantity`}
              render={({ field: quantityField }) => (
                <Input
                  type="number"
                  {...quantityField}
                  onChange={(e) => quantityField.onChange(parseInt(e.target.value, 10) || 0)}
                  className="w-8 md:w-16 h-6 md:h-8 text-center text-[8px] md:text-sm font-semibold p-0.5 md:p-2 mx-auto"
                />
              )}
            />
          </TableCell>
          <TableCell className="px-0.5 md:px-3 py-0.5 md:py-2 text-right text-[7px] md:text-xs font-medium">
            {formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}
          </TableCell>
          <TableCell className="px-0.5 md:px-3 py-0.5 md:py-2 text-right font-semibold text-[7px] md:text-xs">
            {formatCurrency(
              (field.precioVentaSnapshot || field.precioVenta || 0) * (field.quantity || 0),
            )}
          </TableCell>
          <TableCell className="px-0.5 md:px-3 py-0.5 md:py-2 text-right">
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-5 md:h-8 w-5 md:w-8 p-0"
                onClick={() => setEditingComment({ index, text: field.comentarios || '' })}
              >
                <MessageSquare className={`h-2.5 md:h-4 w-2.5 md:w-4 ${field.comentarios ? 'text-primary' : ''}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive h-5 md:h-8 w-5 md:w-8 p-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-2.5 md:h-4 w-2.5 md:w-4" />
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

  const [isSelectorOpen, setIsSelectorOpen] = useState<false | 'regular' | 'alergenos'>(false)
  const [editingComment, setEditingComment] = useState<{ index: number; text: string } | null>(null)
  const [editingSeparator, setEditingSeparator] = useState<{
    index: number
    nombre: string
    menu?: 'regular' | 'alergenos'
  } | null>(null)
  const [editingPlate, setEditingPlate] = useState<GastronomyOrderItem | null>(null)
  const [editingMenu, setEditingMenu] = useState<'regular' | 'alergenos'>('regular')
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([])

  const router = useRouter()
  const { toast } = useToast()

  const { data: serviceOrder } = useEvento(osId)

  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    serviceOrder?.id || osId,
  )
  const { data: gastronomyOrders = [], isLoading: isLoadingOrders } = useGastronomyOrders(
    serviceOrder?.id || osId,
  )
  const { data: gastroEsenciales = [] } = useGastroEsenciales()
  const updateOrderMutation = useUpdateGastronomyOrder()
  const lastBriefingItemId = useRef<string | null>(null)

  // Cargar categorías de Supabase
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const { data, error } = await supabase
          .from('categorias_recetas')
          .select('*')
          .order('nombre', { ascending: true });
        
        if (error) throw error;
        setCategorias((data || []) as CategoriaReceta[]);
      } catch (error) {
        console.error('Error loading categorías:', error);
      }
    };
    
    loadCategorias();
  }, []);

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
      asistentesAlergenos: 0,
      itemsAlergenos: [],
      comentariosAlergenos: '',
      itemsEsenciales: [],
    },
  })

  const { control, handleSubmit, reset, watch, setValue, getValues, formState } = form

  const watchedItems = watch('items')
  const watchedAllergenItems = watch('itemsAlergenos')
  const watchedEsencialesItems = watch('itemsEsenciales')
  
  const totalPedido = useMemo(() => {
    return (watchedItems || []).reduce((acc: number, item: any) => {
      if (item.type === 'separator') return acc
      return acc + (item.precioVentaSnapshot || item.precioVenta || 0) * (item.quantity || 0)
    }, 0)
  }, [watchedItems])

  const totalEsenciales = useMemo(() => {
    return (watchedEsencialesItems || []).reduce((acc: number, item: any) => {
      return acc + (item.precioVentaSnapshot || item.precioVenta || 0) * (item.quantity || 0)
    }, 0)
  }, [watchedEsencialesItems])

  const totalAllergenItems = useMemo(() => {
    return (watchedAllergenItems || []).reduce((acc: number, item: any) => {
      if (item.type === 'separator') return acc
      return acc + (item.precioVenta || 0) * (item.quantity || 0)
    }, 0)
  }, [watchedAllergenItems])

  // Sincronizar formulario con datos cargados
  useEffect(() => {
    if (gastroOrder) {
      // Evitar resets infinitos si el ID no ha cambiado y ya tenemos datos
      const currentResetKey = `${briefingItemId}-${gastroOrder.id}-${(gastroOrder.items || []).length}-${(gastroOrder.itemsEsenciales || []).length}`;
      if (lastBriefingItemId.current === currentResetKey) return;
      
      // Normalizar IDs a string para asegurar detección de platos manuales
      const normalizeItems = (items: any[]) => 
        items.map(item => ({
          ...item,
          id: item.id?.toString() // Convertir ID a string
        }))
      
      const normalizedItems = normalizeItems(gastroOrder.items || [])
      const normalizedAllergenItems = normalizeItems(gastroOrder.itemsAlergenos || [])
      const normalizedEsencialesItems = normalizeItems(gastroOrder.itemsEsenciales || [])
      
      // Si no hay esenciales guardados aún en este pedido, inyectar los de la lista maestra
      const finalEsenciales = normalizedEsencialesItems.length > 0
        ? normalizedEsencialesItems 
        : (gastroEsenciales || []).map(e => ({
            id: e.receta?.id || e.receta_id,
            type: 'item' as const,
            nombre: e.receta?.nombre || 'Receta',
            precioVenta: e.receta?.precioVenta || 0,
            precioVentaSnapshot: e.receta?.precioVenta || 0,
            quantity: 0,
            comentarios: '',
          }))
      
      reset({
        items: normalizedItems,
        status: gastroOrder.status || 'Pendiente',
        asistentesAlergenos: gastroOrder.asistentesAlergenos || 0,
        itemsAlergenos: normalizedAllergenItems,
        comentariosAlergenos: gastroOrder.comentariosAlergenos || '',
        itemsEsenciales: finalEsenciales,
      })
      lastBriefingItemId.current = currentResetKey;
    }
  }, [gastroOrder, reset, gastroEsenciales, briefingItem, briefingItemId])

  // Detectar cambios en la orden para notificar a cocina
  useGastronomyOrderChanges(gastroOrder || null)

  const { fields, append, remove, update, move } = useFieldArray({ control, name: 'items' })
  const {
    fields: allergenFields,
    append: allergenAppend,
    remove: allergenRemove,
    update: allergenUpdate,
    move: allergenMove,
  } = useFieldArray({ control, name: 'itemsAlergenos' })
  const {
    fields: esencialesFields,
    append: esencialesAppend,
    remove: esencialesRemove,
    update: esencialesUpdate,
    move: esencialesMove,
  } = useFieldArray({ control, name: 'itemsEsenciales' })

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

  const [costBreakdownOpen, setCostBreakdownOpen] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const isLoading = isLoadingBriefing || isLoadingOrders || updateOrderMutation.isPending || isRecalculating

  // Actualizar la lógica para saber a qué menú añadir el plato
  const onAddReceta = (receta: Receta, targetMenu: 'regular' | 'alergenos' = 'regular') => {
    let coste = receta.costeMateriaPrima || 0
    let pvp = receta.precioVenta || 0

    // Si no hay precioVenta pero hay coste y porcentaje, calcular
    if (pvp === 0 && coste > 0) {
      const margen = receta.porcentajeCosteProduccion || 30
      pvp = coste * (1 + margen / 100)
    }

    const newItem = {
      id: receta.id,
      type: 'item' as const,
      nombre: receta.nombre,
      costeMateriaPrima: coste,
      precioVenta: pvp,
      costeMateriaPrimaSnapshot: coste,
      precioVentaSnapshot: pvp,
      quantity: targetMenu === 'regular' ? (briefingItem?.asistentes || 1) : (watch('asistentesAlergenos') || 1),
      comentarios: '',
      aprobadoCocina: targetMenu === 'alergenos' ? false : undefined,
    }

    if (targetMenu === 'regular') {
      append(newItem)
      toast({ title: 'Plato añadido al menú regular' })
    } else {
      allergenAppend(newItem)
      toast({ title: 'Plato alérgeno añadido' })
    }

    setIsSelectorOpen(false)
  }

  const handleUpdatePlate = (updatedPlate: GastronomyOrderItem) => {
    if (!editingPlate) return;

    // Buscar el índice del plato en el array correspondiente
    const isRegular = editingMenu === 'regular';
    const array = getValues(isRegular ? 'items' : 'itemsAlergenos') || [];
    const itemIndex = array.findIndex((item: any) => item.id === editingPlate.id);

    if (itemIndex !== -1) {
      const updatedItem = {
        ...array[itemIndex],
        nombre: updatedPlate.nombre,
        precioVenta: updatedPlate.precioVenta,
        precioVentaSnapshot: updatedPlate.precioVentaSnapshot,
        costeMateriaPrima: updatedPlate.costeMateriaPrima,
        costeMateriaPrimaSnapshot: updatedPlate.costeMateriaPrimaSnapshot,
        categoria: updatedPlate.categoria,
        alergenos: updatedPlate.alergenos,
        alergenosMetadata: updatedPlate.alergenosMetadata,
      };

      // Usar la función update de useFieldArray para mejor rendimiento
      if (isRegular) {
        update(itemIndex, updatedItem);
      } else {
        allergenUpdate(itemIndex, updatedItem);
      }

      toast({ title: '✓ Plato actualizado' });
    }

    setEditingPlate(null);
  }

  const handleOpenEditPlate = (plate: GastronomyOrderItem, menu: 'regular' | 'alergenos') => {
    if (!plate?.id?.toString().startsWith('manual-')) return;
    
    const array = menu === 'regular' ? (getValues('items') || []) : (getValues('itemsAlergenos') || []);
    const updatedPlate = array.find((item: any) => item.id === plate.id) || plate;
    
    setEditingPlate(updatedPlate);
    setEditingMenu(menu);
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
      const allergenItemsTotal = (data.itemsAlergenos || [])
        .filter((i) => i.type === 'item')
        .reduce((acc, item) => acc + (item.precioVenta || 0) * (item.quantity || 0), 0)

      await updateOrderMutation.mutateAsync({
        id: briefingItemId,
        osId: serviceOrder?.id || osId,
        status: data.status,
        items: data.items,
        total: totalPedido,
        asistentesAlergenos: data.asistentesAlergenos || 0,
        itemsAlergenos: data.itemsAlergenos || [],
        totalAlergenos: allergenItemsTotal,
        comentariosAlergenos: data.comentariosAlergenos || '',
        itemsEsenciales: data.itemsEsenciales || [],
      })

      const itemCount = data.items.filter((i) => i.type === 'item').length
      const allergenCount = (data.itemsAlergenos || []).filter((i) => i.type === 'item').length
      const totalFormatted = totalPedido.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })

      toast({
        title: '✓ Pedido Guardado',
        description: `${itemCount} platos${allergenCount > 0 ? ` + ${allergenCount} alérgenos` : ''} | Total: ${totalFormatted}`,
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

  const handleSaveSeparatorAllergen = () => {
    if (editingSeparator) {
      const currentItems = getValues('itemsAlergenos')
      currentItems[editingSeparator.index].nombre = editingSeparator.nombre
      allergenUpdate(editingSeparator.index, currentItems[editingSeparator.index])
      setEditingSeparator(null)
      toast({ title: 'Separador actualizado.' })
    }
  }

  const [commentModalOpen, setCommentModalOpen] = useState(false)

  if (isLoading || !briefingItem) {
    return <LoadingSkeleton title="Cargando pedido de gastronomía..." />
  }

  return (
    <main className="space-y-4 pb-28 md:pb-4">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Header Premium Sticky */}
          <div className="sticky top-[5.25rem] md:top-[88px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 mb-4">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 md:py-3 flex items-center justify-between gap-4">
              {/* Left Section: Service Name */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push(`/os/${osId}/gastronomia`)}
                  className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0 hover:bg-emerald-500/20 transition-colors"
                  title="Ir a gastronomía"
                >
                  <Utensils className="h-4 md:h-5 w-4 md:w-5 text-emerald-600 dark:text-emerald-400" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="hidden md:flex md:items-center gap-4 text-sm font-bold text-foreground">
                    <span className="truncate text-3xl font-black text-foreground">{briefingItem?.descripcion}</span>
                    {briefingItem?.fecha && (
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Calendar className="w-4 h-4" />
                        <span className="truncate">{format(new Date(briefingItem.fecha), 'dd/MM', { locale: es })}</span>
                      </div>
                    )}
                    {briefingItem?.horaInicio && (
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Clock className="w-4 h-4" />
                        <span className="truncate">{briefingItem.horaInicio}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex md:hidden flex-wrap gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] text-muted-foreground leading-tight">
                    <span className="font-bold text-foreground block truncate max-w-[150px]">{briefingItem?.descripcion}</span>
                    {briefingItem?.fecha && (
                      <span className="truncate">{format(new Date(briefingItem.fecha), 'dd/MM', { locale: es })}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 no-print">
                <BriefingSummaryTrigger items={briefing?.items || []} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCostBreakdownOpen(true)}
                  className="h-8 md:h-9 gap-1.5 md:gap-2 text-[9px] md:text-xs font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5 px-2 md:px-3 hidden sm:flex"
                  title="Ver desglose de costes"
                >
                  <BarChart3 className="h-4 md:h-5 w-4 md:w-5" />
                  <span className="hidden md:inline">Desglose</span>
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 md:h-9 gap-1.5 md:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] md:text-xs font-black uppercase tracking-widest px-3 md:px-4 shadow-lg shadow-emerald-900/20"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 md:h-5 w-4 md:w-5" />
                  )}
                  <span>Guardar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Info Bar Premium */}
          <GastroInfoBar asistentes={briefingItem.asistentes} asistentesAlergenos={watch('asistentesAlergenos')} />

          {/* Notas del Briefing Comercial */}
          {briefingItem.comentarios && (
            <Card className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50 mb-4 shadow-none">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <NotebookPen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/70 dark:text-blue-400/70">Comentarios</span>
                    <p className="text-xs text-blue-900 dark:text-blue-200 whitespace-pre-wrap">{briefingItem.comentarios}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Esenciales */}
          {(esencialesFields.length > 0 || (gastroEsenciales && gastroEsenciales.length > 0)) && (
            <Collapsible className="mb-4">
              <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 shadow-none overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-amber-500/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <div>
                        <CardTitle className="text-[12px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Esenciales</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-amber-700 dark:text-amber-400">{formatCurrency(totalEsenciales)}</span>
                      <ChevronDown className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 border-t border-amber-100 dark:border-amber-900/50">
                    <Table>
                      <TableHeader className="bg-amber-100/30 dark:bg-amber-900/10">
                        <TableRow className="hover:bg-transparent border-amber-100 dark:border-amber-900/30">
                          <TableHead className="h-8 px-4 text-[10px] font-black uppercase tracking-wider text-amber-700/70">Artículo</TableHead>
                          <TableHead className="h-8 text-center text-[10px] font-black uppercase tracking-wider text-amber-700/70">Cant.</TableHead>
                          <TableHead className="h-8 text-right text-[10px] font-black uppercase tracking-wider text-amber-700/70">P/U</TableHead>
                          <TableHead className="h-8 text-right text-[10px] font-black uppercase tracking-wider text-amber-700/70">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {esencialesFields.map((field, index) => (
                          <TableRow key={field.id} className="border-amber-100 dark:border-amber-900/30 hover:bg-amber-500/5">
                            <TableCell className="py-2 px-4 text-xs font-semibold text-amber-900 dark:text-amber-100">{field.nombre}</TableCell>
                            <TableCell className="py-2">
                              <FormField
                                control={control}
                                name={`itemsEsenciales.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <Input
                                    type="number"
                                    {...qtyField}
                                    onChange={(e) => qtyField.onChange(parseInt(e.target.value, 10) || 0)}
                                    className="w-16 h-7 text-center text-xs font-bold mx-auto border-amber-200 focus-visible:ring-amber-500 bg-white/50 dark:bg-black/20"
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="py-2 text-right text-[11px] text-amber-700/80">
                              {formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs font-black text-amber-700">
                              {formatCurrency((field.precioVentaSnapshot || field.precioVenta || 0) * (watchedEsencialesItems?.[index]?.quantity || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Menú Regular */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 overflow-x-auto shadow-none">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-border/40 bg-emerald-500/5 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-emerald-500" />
                <div className="flex flex-col gap-0">
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    {/* Asistentes - con espacio separador */}
                    <div className="flex items-center gap-1.5 pr-4 border-r border-emerald-200 dark:border-emerald-800">
                      <CardTitle className="text-[12px] font-black uppercase tracking-widest">Menú General</CardTitle>
                      <div className="flex items-center gap-0.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">×{Math.max(0, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0))}</span>
                        <User className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      </div>
                    </div>
                    
                    {/* Info en línea - Desktop */}
                    <div className="hidden md:flex items-center gap-6 text-xs font-semibold">
                      {/* Coste */}
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Coste:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency((watchedItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + ((item.precioVentaSnapshot ?? item.precioVenta ?? 0) * (item.quantity || 0)), 0))}</span>
                      </div>
                      
                      {/* Coste/Pax */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-muted-foreground">Coste/Pax:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{Math.max(0, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0)) > 0 ? formatCurrency(((watchedItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + ((item.precioVentaSnapshot ?? item.precioVenta ?? 0) * (item.quantity || 0)), 0)) / Math.max(1, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0))) : formatCurrency(0)}</span>
                        <span className="text-muted-foreground">/</span>
                        <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      
                      {/* Ratio */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-muted-foreground">Ratio:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{Math.max(0, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0)) > 0 ? ((watchedItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) / Math.max(1, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0))).toFixed(2) : '0.00'}</span>
                        <span className="text-muted-foreground">/</span>
                        <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      
                      {/* Total ud. */}
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Total ud.:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{(watchedItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSeparator('Separador')}
                  className="text-[10px] font-black uppercase tracking-widest h-8"
                >
                  + Separador
                </Button>
                <Dialog open={isSelectorOpen === 'regular'} onOpenChange={(isOpen) => setIsSelectorOpen(isOpen ? 'regular' : false)}>
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
                  <RecetaSelector onSelect={(receta) => onAddReceta(receta, 'regular')} />
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
                      <TableHead className="w-5 md:w-8 p-0.5 md:p-2"></TableHead>
                      <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground min-w-[60px] md:min-w-[140px]">Plato</TableHead>
                      <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Ud.</TableHead>
                      <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">P/U</TableHead>
                      <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Total</TableHead>
                      <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Acc.</TableHead>
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
                            watchedItem={watchedItems?.[index]}
                            control={control}
                            remove={remove}
                            update={update}
                            allergenUpdate={allergenUpdate}
                            setEditingComment={setEditingComment}
                            onEditSeparator={setEditingSeparator}
                            onEditPlate={handleOpenEditPlate}
                            editingMenu="regular"
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

          {/* Tarjeta de Configuración de Alérgenos */}
          <Collapsible className="mb-4">
            <Card className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 shadow-none overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 cursor-pointer hover:bg-slate-500/5 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full bg-red-500" />
                    <CardTitle className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                      🔴 Asistentes Alérgicos
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cantidad:</span>
                      <FormField
                        control={control}
                        name="asistentesAlergenos"
                        render={({ field }) => (
                          <FormItem className="mb-0">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                className="h-8 w-16 text-center text-sm font-bold bg-white/50 dark:bg-black/20"
                                placeholder="0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/40">
                <CardContent className="p-4 bg-background/40">
                  <FormField
                    control={control}
                    name="comentariosAlergenos"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex items-center gap-2 ml-1">
                          <MessageSquare className="h-3 w-3 text-slate-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Detalles y observaciones de alérgenos</span>
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Especifica los alérgenos, ingredientes sensibles, nombres de invitados o requerimientos especiales..."
                            className="min-h-[80px] text-xs resize-none bg-white/50 dark:bg-black/20 border-slate-200 dark:border-slate-800 focus-visible:ring-red-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Menú Alérgeno - Solo si hay asistentes alérgenos */}
          {watch('asistentesAlergenos') > 0 && (
            <Card className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 overflow-x-auto shadow-none">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-border/40 bg-red-500/5 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-red-500" />
                  <div className="flex flex-col gap-0">
                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      {/* Asistentes - con espacio separador */}
                      <div className="flex items-center gap-1.5 pr-4 border-r border-red-200 dark:border-red-800">
                        <CardTitle className="text-[12px] font-black uppercase tracking-widest">Menú Alérgeno</CardTitle>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs font-bold text-red-700 dark:text-red-400">×{watch('asistentesAlergenos') || 0}</span>
                          <User className="w-4 h-4 text-red-700 dark:text-red-400" />
                        </div>
                      </div>
                      
                      {/* Info en línea - Desktop */}
                      <div className="hidden md:flex items-center gap-6 text-xs font-semibold">
                        {/* Coste */}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Coste:</span>
                          <span className="text-red-700 dark:text-red-400">{formatCurrency((watchedAllergenItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + ((item.precioVenta ?? 0) * (item.quantity || 0)), 0))}</span>
                        </div>
                        
                        {/* Coste/Pax */}
                        <div className="flex items-center gap-0.5">
                          <span className="text-muted-foreground">Coste/Pax:</span>
                          <span className="text-red-700 dark:text-red-400">{(watch('asistentesAlergenos') || 0) > 0 ? formatCurrency(((watchedAllergenItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + ((item.precioVenta ?? 0) * (item.quantity || 0)), 0)) / (watch('asistentesAlergenos') || 1)) : formatCurrency(0)}</span>
                          <span className="text-muted-foreground">/</span>
                          <User className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                        </div>
                        
                        {/* Ratio */}
                        <div className="flex items-center gap-0.5">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span className="text-red-700 dark:text-red-400">{(watch('asistentesAlergenos') || 0) > 0 ? ((watchedAllergenItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) / (watch('asistentesAlergenos') || 1)).toFixed(2) : '0.00'}</span>
                          <span className="text-muted-foreground">/</span>
                          <User className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                        </div>
                        
                        {/* Total ud. */}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Total ud.:</span>
                          <span className="text-red-700 dark:text-red-400">{(watchedAllergenItems || []).filter((i: any) => i.type === 'item').reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      allergenAppend({
                        id: `sep-${Date.now()}`,
                        type: 'separator',
                        nombre: 'Nuevo Separador',
                      })
                    }}
                    className="text-[10px] font-black uppercase tracking-widest h-8"
                  >
                    + Separador
                  </Button>
                  <Dialog open={isSelectorOpen === 'alergenos'} onOpenChange={(isOpen) => setIsSelectorOpen(isOpen ? 'alergenos' : false)}>
                    <DialogTrigger asChild>
                      <Button 
                        type="button" 
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest h-8"
                      >
                        <PlusCircle className="mr-2 h-3.5 w-3.5" />
                        Añadir Plato 🔴
                      </Button>
                    </DialogTrigger>
                    <RecetaSelector onSelect={(receta) => onAddReceta(receta, 'alergenos')} />
                  </Dialog>
                </div>
              </div>
              <CardContent className="p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event
                    if (over && active.id !== over.id) {
                      const oldIndex = allergenFields.findIndex((f) => f.id === active.id)
                      const newIndex = allergenFields.findIndex((f) => f.id === over.id)
                      if (oldIndex !== -1 && newIndex !== -1) {
                        allergenMove(oldIndex, newIndex)
                      }
                    }
                  }}
                >
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="w-5 md:w-8 p-0.5 md:p-2"></TableHead>
                        <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground min-w-[60px] md:min-w-[140px]">Plato</TableHead>
                        <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Ud.</TableHead>
                        <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">P/U</TableHead>
                        <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Total</TableHead>
                        <TableHead className="h-8 md:h-10 px-0.5 md:px-3 py-0.5 md:py-2 text-[7px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Acc.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={allergenFields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {allergenFields.length > 0 ? (
                          allergenFields.map((field, index) => (
                            <SortableRow
                              key={field.id}
                              id={field.id}
                              index={index}
                              field={field}
                              watchedItem={watchedAllergenItems?.[index]}
                              control={control}
                              remove={allergenRemove}
                              update={update}
                              allergenUpdate={allergenUpdate}
                              setEditingComment={setEditingComment}
                              onEditSeparator={setEditingSeparator}
                              onEditPlate={handleOpenEditPlate}
                              editingMenu="alergenos"
                              formatCurrency={formatCurrency}
                            />
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-widest">
                              No hay platos alérgenos en este pedido.
                            </TableCell>
                          </TableRow>
                        )}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      {/* Comment Modal */}
      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentario del Servicio</DialogTitle>
            <DialogDescription>Notas adicionales registradas en el briefing para este servicio.</DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{briefingItem?.comentarios}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCommentModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingComment} onOpenChange={(isOpen) => !isOpen && setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Observaciones para: {editingComment ? watchedItems[editingComment.index].nombre : ''}
            </DialogTitle>
            <DialogDescription>Añade detalles o requerimientos específicos para este plato.</DialogDescription>
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
            <DialogDescription>Modifica el nombre del separador para organizar tu menú.</DialogDescription>
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
            <Button onClick={() => editingSeparator?.menu === 'alergenos' ? handleSaveSeparatorAllergen() : handleSaveSeparator()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Breakdown Dialog */}
      <Dialog open={costBreakdownOpen} onOpenChange={setCostBreakdownOpen}>
        <DialogContent className="max-w-sm w-full rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Desglose de Costos</DialogTitle>
            <DialogDescription>Análisis detallado de costos por menú y asistentes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Regular Menu */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Menú Regular</h3>
              <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <p className="text-muted-foreground">Asistentes</p>
                  <p className="font-bold text-sm">{briefingItem?.asistentes || 0} - {watch('asistentesAlergenos') || 0} = {Math.max(0, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo Total</p>
                  <p className="font-bold text-sm">{formatCurrency(totalPedido)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Costo por Persona</p>
                  <p className="font-bold text-base">
                    {((briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0)) > 0 
                      ? formatCurrency(totalPedido / Math.max(1, (briefingItem?.asistentes || 0) - (watch('asistentesAlergenos') || 0)))
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Allergen Menu (if exists) */}
            {(watch('asistentesAlergenos') || 0) > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-red-700 dark:text-red-400">Menú Alérgeno</h3>
                <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div>
                    <p className="text-muted-foreground">Asistentes</p>
                    <p className="font-bold text-sm">{watch('asistentesAlergenos')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo Total</p>
                    <p className="font-bold text-sm">{formatCurrency(totalAllergenItems)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Costo por Persona</p>
                    <p className="font-bold text-base">
                      {(watch('asistentesAlergenos') || 0) > 0
                        ? formatCurrency(totalAllergenItems / (watch('asistentesAlergenos') || 1))
                        : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Combined Total */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <h3 className="font-bold text-sm">Total Combinado</h3>
              <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-muted/50 border border-border/40">
                <div>
                  <p className="text-muted-foreground">Asistentes Totales</p>
                  <p className="font-bold text-sm">{(briefingItem?.asistentes || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo Total</p>
                  <p className="font-bold text-sm">{formatCurrency(totalPedido + totalAllergenItems)}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostBreakdownOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de platos */}
      <EditGastronomiaPlateModal
        key={editingPlate?.id}
        isOpen={!!editingPlate}
        plate={editingPlate}
        categorias={categorias}
        onSave={handleUpdatePlate}
        onClose={() => setEditingPlate(null)}
      />
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
