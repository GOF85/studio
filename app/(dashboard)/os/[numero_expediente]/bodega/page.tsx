'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  PlusCircle,
  Users,
  Soup,
  Eye,
  ChevronDown,
  Save,
  Loader2,
  Trash2,
  FileText,
  Wine,
} from 'lucide-react'
import type {
  MaterialOrder,
  OrderItem,
  PickingSheet,
  ComercialBriefing,
  ComercialBriefingItem,
  ReturnSheet,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  useEvento,
  useComercialBriefings,
  useMaterialOrders,
  usePickingSheets,
  useReturnSheets,
} from '@/hooks/use-data-queries'
import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'
// replaced local Bottle with lucide `Wine` icon
import {
  useUpdateMaterialOrderItem,
  useDeleteMaterialOrderItem,
} from '@/hooks/mutations/use-material-mutations'

type ItemWithOrderInfo = OrderItem & {
  orderContract: string
  orderId: string
  orderStatus?: PickingSheet['status']
  solicita?: 'Sala' | 'Cocina'
  tipo?: string
  deliveryDate?: string
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string }[]
}

type BlockedOrderInfo = {
  sheetId: string
  status: PickingSheet['status']
  items: OrderItem[]
}

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo'

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
  Pendiente: 'En Preparación',
  'En Proceso': 'En Preparación',
  Listo: 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
  const { data: briefings = [] } = useComercialBriefings(osId)
  const briefingItems = useMemo(() => {
    const items = briefings?.[0]?.items || []
    return [...items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha)
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [briefings])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
        >
          <FileText className="mr-2 h-3.5 w-3.5" />
          Resumen Briefing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">
            Resumen de Servicios del Briefing
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto border rounded-lg border-border/40">
          <Table>
              <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/40">
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Hora</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Descripción</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Observaciones</TableHead>
                <TableHead className="h-7 px-2 text-right text-[10px] font-black uppercase tracking-widest">PAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {briefingItems.length > 0 ? (
                briefingItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "border-b border-border/40 transition-colors",
                      item.conGastronomia ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.06]' : 'hover:bg-muted/30'
                    )}
                  >
                    <TableCell className="py-1 px-2 text-[11px] font-medium text-muted-foreground">
                      {format(new Date(item.fecha), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-[11px] font-bold">
                      {item.horaInicio} - {item.horaFin}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-[11px] font-bold uppercase tracking-wider">
                      {item.descripcion}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-[11px] text-muted-foreground italic">
                      {item.comentarios}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-right font-mono text-[11px]">
                      {item.asistentes}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-[11px] text-muted-foreground">
                    No hay servicios en el briefing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusCard({
  title,
  items,
  totalQuantity,
  totalValue,
  onClick,
  color = "blue"
}: {
  title: string
  items: number
  totalQuantity: number
  totalValue: number
  onClick: () => void
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500"
  }
  const accentColor = colorClasses[color] || "bg-blue-500"

  return (
    <Card 
      className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden hover:bg-muted/30 transition-all cursor-pointer group relative" 
      onClick={onClick}
    >
      <div className={cn("absolute top-0 left-0 w-1 h-full", accentColor)} />
      <CardHeader className="py-1 px-2">
        <CardTitle className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-1 px-2">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black tracking-tight">{items}</span>
          <span className="text-[9px] font-bold uppercase text-muted-foreground/60">Referencias</span>
        </div>
        <div className="mt-0.5 flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
            <span>Artículos</span>
            <span className="text-foreground/70">{totalQuantity.toLocaleString('es-ES')}</span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
            <span>Valoración</span>
            <span className="text-foreground/70">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BodegaPage() {
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null)

  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: materialOrders = [], isLoading: isLoadingMaterials } = useMaterialOrders(
    serviceOrder?.id,
    'Bodega',
  )
  const { data: pickingSheets = [], isLoading: isLoadingPicking } = usePickingSheets(serviceOrder?.id)
  const { data: returnSheets = [], isLoading: isLoadingReturns } = useReturnSheets(serviceOrder?.id)

  const updateMutation = useUpdateMaterialOrderItem()
  const deleteMutation = useDeleteMaterialOrderItem()

  const { data: objetivos } = useObjetivosGasto(serviceOrder?.id)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const handleItemChange = async (itemId: string, field: 'quantity' | 'price', value: number, orderId?: string) => {
    try {
      await updateMutation.mutateAsync({
        id: itemId,
        updates: { [field]: value },
        orderId
      })
      toast({ title: 'Cambio guardado' })
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  const handleDeleteItem = async (itemId: string, orderId?: string) => {
    try {
      await deleteMutation.mutateAsync({ id: itemId, orderId })
      toast({ title: 'Artículo eliminado' })
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } =
    useMemo(() => {
      if (
        isLoadingOS ||
        isLoadingMaterials ||
        isLoadingPicking ||
        isLoadingReturns ||
        !serviceOrder
      ) {
        return {
          allItems: [],
          blockedOrders: [],
          pendingItems: [],
          itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] },
          totalValoracionPendiente: 0,
        }
      }

      const relatedOrders = materialOrders.filter(
        (order) => (order.osId === serviceOrder.id || order.osId === serviceOrder.serviceNumber) && order.type === 'Bodega',
      )
      const relatedPickingSheets = pickingSheets.filter((sheet) => sheet.osId === serviceOrder.id || sheet.osId === serviceOrder.serviceNumber)
      const relatedReturnSheets = returnSheets.filter((s) => s.osId === serviceOrder.id || s.osId === serviceOrder.serviceNumber)

      const mermas: Record<string, number> = {}
      relatedReturnSheets.forEach((sheet) => {
        Object.entries(sheet.itemStates).forEach(([key, state]: [string, any]) => {
          const itemInfo = sheet.items.find((i: any) => `${i.orderId}_${i.itemCode}` === key)
          if (
            itemInfo &&
            itemInfo.type === 'Bodega' &&
            itemInfo.sentQuantity > state.returnedQuantity
          ) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida
          }
        })
      })

      const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = {
        Asignado: [],
        'En Preparación': [],
        Listo: [],
      }
      const processedItemKeys = new Set<string>()
      const blocked: BlockedOrderInfo[] = []

      relatedPickingSheets.forEach((sheet) => {
        const targetStatus = statusMap[sheet.status as PickingSheet['status']] || 'En Preparación'
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] }

        sheet.items.forEach((itemInSheet) => {
          if (itemInSheet.type !== 'Bodega') return

          const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`
          const orderRef = relatedOrders.find((o) => o.id === itemInSheet.orderId)
          const originalItem = orderRef?.items?.find((i) => i.itemCode === itemInSheet.itemCode)

          if (!originalItem) return

          let cantidadReal = originalItem.quantity

          const itemWithInfo: ItemWithOrderInfo = {
            ...originalItem,
            quantity: cantidadReal,
            orderId: sheet.id,
            orderContract: orderRef?.contractNumber || 'N/A',
            orderStatus: sheet.status,
            solicita: orderRef?.solicita,
          }

          statusItems[targetStatus].push(itemWithInfo)
          sheetInfo.items.push(itemWithInfo)

          processedItemKeys.add(uniqueKey)
        })

        if (sheetInfo.items.length > 0) {
          blocked.push(sheetInfo)
        }
      })

      const all = relatedOrders.flatMap((order) =>
        order.items.map((item) => {
          return {
            ...item,
            quantity: item.quantity,
            orderId: order.id,
            orderContract: order.contractNumber,
            solicita: order.solicita,
            tipo: item.tipo,
            deliveryDate: order.deliveryDate,
            ajustes: item.ajustes,
          } as ItemWithOrderInfo
        }),
      )

      const pending = all
        .filter((item) => {
          const uniqueKey = `${item.orderId}-${item.itemCode}`
          let cantidadAjustada = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode])
            mermas[item.itemCode] = 0 // Consume la merma
          }
          return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0
        })
        .map((item) => {
          let cantidadAjustada = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode])
          }
          return { ...item, quantity: cantidadAjustada }
        })

      statusItems['Asignado'] = pending

      const totalValoracionPendiente = pending.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      )

      return {
        allItems: all,
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente,
      }
    }, [
      osId,
      materialOrders,
      pickingSheets,
      returnSheets,
      isLoadingOS,
      isLoadingMaterials,
      isLoadingPicking,
      isLoadingReturns,
    ])

  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status]
    return (
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">
            Artículos en estado: <span className="text-blue-600 dark:text-blue-400">{status}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto border rounded-lg border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/40">
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Artículo</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Solicita</TableHead>
                <TableHead className="h-7 px-2 text-right text-[10px] font-black uppercase tracking-widest">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <TableRow key={`${item.itemCode}-${index}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-1 px-2 text-[11px] font-bold uppercase tracking-wider">{item.description}</TableCell>
                    <TableCell className="py-1 px-2 text-[11px] text-muted-foreground">{item.solicita}</TableCell>
                    <TableCell className="py-1 px-2 text-right font-mono text-[11px] font-bold">{item.quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-[11px] text-muted-foreground">
                    No hay artículos en este estado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    )
  }

  const renderSummaryModal = () => {
    const all = [
      ...itemsByStatus.Asignado,
      ...itemsByStatus['En Preparación'],
      ...itemsByStatus.Listo,
    ]
    const totalValue = all.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
    return (
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">
            Resumen de Artículos de Bodega
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto border rounded-lg border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/40">
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Artículo</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Cantidad</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Cant. Cajas</TableHead>
                <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Valoración</TableHead>
                <TableHead className="h-7 px-2 text-right text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(
                  (pi) => pi.itemCode === item.itemCode && pi.orderId === item.orderId,
                )
                const cajas =
                  item.unidadVenta && item.unidadVenta > 0
                    ? (item.quantity / item.unidadVenta).toFixed(2)
                    : '-'
                return (
                  <TableRow key={`${item.itemCode}-${index}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-1 px-2 text-[11px] font-bold uppercase tracking-wider">{item.description}</TableCell>
                      <TableCell className="py-1 px-2 text-[11px] font-mono">{item.quantity}</TableCell>
                      <TableCell className="py-1 px-2 text-[11px] font-mono text-muted-foreground">{cajas}</TableCell>
                      <TableCell className="py-1 px-2 text-[11px] font-mono">{formatCurrency(item.quantity * (item.price || 0))}</TableCell>
                      <TableCell className="py-1 px-2 text-right">
                      <Badge 
                        variant={isBlocked ? 'destructive' : 'default'}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-5"
                      >
                        {isBlocked ? 'Bloqueado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end p-4 bg-blue-500/5 border-t border-border/40">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Valoración Total</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </DialogContent>
    )
  }

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

  if (isLoadingOS || isLoadingMaterials || isLoadingPicking || isLoadingReturns) {
    return <LoadingSkeleton title="Cargando Módulo de Bodega..." />
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-2">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center h-10">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Wine className="h-5 w-5 text-blue-500" />
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex flex-col items-end justify-center leading-none">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">Presupuesto</div>
                <div className="font-bold text-sm">{presupuestoBodega.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>

              <div className="flex flex-col items-end justify-center leading-none">
                <div className="text-[9px] font-black uppercase text-muted-foreground">Objetivo</div>
                <div className="font-bold text-sm">{objetivoBodega.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>

              <div className="flex flex-col items-end justify-center leading-none">
                <div className="text-[9px] font-black uppercase text-muted-foreground">Desviación</div>
                <div className={cn('font-bold text-sm', desviacionBodegaPct > 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {isFinite(desviacionBodegaPct) ? `${desviacionBodegaPct.toFixed(2)}%` : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 md:justify-end justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={allItems.length === 0}
                  className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
                >
                  <Eye className="mr-2 h-3.5 w-3.5" />
                    <span className="hidden md:inline">Resumen Artículos</span>
                    <span className="inline md:hidden">Artículos</span>
                </Button>
              </DialogTrigger>
              {renderSummaryModal()}
            </Dialog>
            <div>
              <div className="hidden md:block">
                <BriefingSummaryDialog osId={osId} />
              </div>
              <div className="block md:hidden">
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5">
                  <span>Briefing</span>
                </Button>
              </div>
            </div>
            <Button 
              asChild
              className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <Link href={`/pedidos?osId=${osId}&type=Bodega`}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                <span className="hidden md:inline">Nuevo Pedido</span>
                <span className="inline md:hidden">Pedido</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(itemsByStatus) as StatusColumn[]).map((status) => {
          const items = itemsByStatus[status]
          const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
          const colorMap: Record<string, string> = {
            Asignado: 'blue',
            'En Preparación': 'amber',
            Listo: 'emerald'
          }
          return (
            <StatusCard
              key={status}
              title={status === 'Asignado' ? 'Pendiente de Asignar' : status}
              items={items.length}
              totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
              totalValue={totalValue}
              onClick={() => setActiveModal(status)}
              color={colorMap[status]}
            />
          )
        })}
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <CardTitle className="text-[12px] font-black uppercase tracking-widest">Gestión de Pedidos Pendientes</CardTitle>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40">
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Artículo</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Solicita</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Fecha Entrega</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest w-32">Cantidad</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Valoración</TableHead>
                  <TableHead className="h-7 px-2 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingItems.length > 0 ? (
                  pendingItems
                    .sort((a, b) => (a.solicita || '').localeCompare(b.solicita || ''))
                    .map((item) => (
                      <TableRow key={item.itemCode + item.orderId} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <TableCell className="py-1 px-2 text-[11px] font-bold uppercase tracking-wider">{item.description}</TableCell>
                          <TableCell className="py-1 px-2 text-[11px] text-muted-foreground">{item.solicita}</TableCell>
                          <TableCell className="py-1 px-2 text-[11px] font-mono">
                          {item.deliveryDate
                            ? format(new Date(item.deliveryDate), 'dd/MM/yyyy')
                            : ''}
                        </TableCell>
                          <TableCell className="py-1 px-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.itemCode, 'quantity', parseFloat(e.target.value), item.orderId)
                            }
                            className="w-20 h-7 text-[11px] font-mono bg-transparent border-border/40"
                          />
                        </TableCell>
                          <TableCell className="py-1 px-2 text-[11px] font-mono">{formatCurrency(item.quantity * (item.price || 0))}</TableCell>
                          <TableCell className="py-1 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.itemCode, item.orderId)}
                            className="h-7 w-7 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-[11px] text-muted-foreground">
                      No hay pedidos pendientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-muted-foreground/20" />
        <CardHeader className="py-1 px-2 border-b border-border/40">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest">Consulta de Pedidos en Preparación o Listos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40">
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Hoja Picking</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
                  <TableHead className="h-7 px-2 text-[10px] font-black uppercase tracking-widest">Contenido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedOrders.length > 0 ? (
                  blockedOrders.map((order) => (
                    <TableRow key={order.sheetId} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-1 px-2">
                        <Link
                          href={`/almacen/picking/${order.sheetId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold font-mono"
                        >
                          {order.sheetId}
                        </Link>
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Badge 
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-5 border-border/40"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1 px-2 text-[11px] text-muted-foreground italic">
                        {order.items.map((i) => `${i.quantity}x ${i.description}`).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-[11px] text-muted-foreground">
                      No hay pedidos en preparación o listos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {activeModal && renderStatusModal(activeModal)}
    </Dialog>
  )
}
