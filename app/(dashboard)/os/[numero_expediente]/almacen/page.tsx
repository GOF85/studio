'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PlusCircle, Eye, Trash2, FileText, ArrowLeft, Package, Boxes, CheckCircle2, Clock, Archive } from 'lucide-react'
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { useRouter } from 'next/navigation'
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
  useMaterialOrders,
  usePickingSheets,
  useReturnSheets,
  useEvento,
} from '@/hooks/use-data-queries'
import { useComercialBriefing } from '@/hooks/use-briefing-data'
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

function BriefingSummaryDialog({ items }: { items: ComercialBriefingItem[] }) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha)
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [items])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8">
          <FileText className="mr-2 h-3.5 w-3.5" />
          Briefing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Resumen de Servicios del Briefing</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hora</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Descripción</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Observaciones</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Asistentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn("border-border/40", item.conGastronomia && 'bg-orange-500/5 hover:bg-orange-500/10')}
                  >
                    <TableCell className="px-4 py-2 text-[11px] font-bold">{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-medium">
                      {item.horaInicio} - {item.horaFin}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px]">{item.descripcion}</TableCell>
                    <TableCell className="px-4 py-2 text-[10px] text-muted-foreground">
                      {item.comentarios}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-black">{item.asistentes}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[11px] text-muted-foreground uppercase tracking-widest">
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
  accentColor = "blue"
}: {
  title: string
  items: number
  totalQuantity: number
  totalValue: number
  onClick: () => void
  accentColor?: "blue" | "amber" | "emerald"
}) {
  const colors = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500"
  }

  const icons = {
    blue: <Boxes className="h-4 w-4 text-blue-500" />,
    amber: <Clock className="h-4 w-4 text-amber-500" />,
    emerald: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  }

  return (
    <Card 
      className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative hover:bg-muted/20 transition-all cursor-pointer group" 
      onClick={onClick}
    >
      <div className={cn("absolute top-0 left-0 w-1 h-full transition-all group-hover:w-1.5", colors[accentColor])} />
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</CardTitle>
        {icons[accentColor]}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tight">{items}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">refs.</span>
        </div>
        <div className="mt-1 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {totalQuantity.toLocaleString('es-ES')} artículos
          </span>
          <span className={cn("text-[11px] font-black font-mono", accentColor === 'blue' ? 'text-blue-600' : accentColor === 'amber' ? 'text-amber-600' : 'text-emerald-600')}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AlmacenPage() {
  const [orderToDelete, setOrderToDelete] = useState<{ orderId: string; itemCode: string } | null>(
    null,
  )
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null)

  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()
  const router = useRouter()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: materialOrders = [], isLoading: isLoadingOrders } = useMaterialOrders(
    serviceOrder?.numero_expediente,
    'Almacen',
  )
  const { data: pickingSheets = [], isLoading: isLoadingPicking } = usePickingSheets(
    serviceOrder?.id,
  )
  const { data: returnSheets = [], isLoading: isLoadingReturns } = useReturnSheets(serviceOrder?.id)
  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(serviceOrder?.id)

  const updateItemMutation = useUpdateMaterialOrderItem()
  const deleteItemMutation = useDeleteMaterialOrderItem()

  const isLoading =
    isLoadingOS || isLoadingOrders || isLoadingPicking || isLoadingReturns || isLoadingBriefing

  const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } =
    useMemo(() => {
      if (!serviceOrder)
        return {
          allItems: [],
          blockedOrders: [],
          pendingItems: [],
          itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] },
          totalValoracionPendiente: 0,
        }

      const mermas: Record<string, number> = {}
      returnSheets.forEach((sheet) => {
        Object.entries(sheet.itemStates).forEach(([key, state]: [string, any]) => {
          const itemInfo = sheet.items.find((i: any) => `${i.orderId}_${i.itemCode}` === key)
          if (
            itemInfo &&
            itemInfo.type === 'Almacen' &&
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

      pickingSheets.forEach((sheet) => {
        const targetStatus = statusMap[sheet.status] || 'En Preparación'
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] }

        sheet.items.forEach((item) => {
          if (item.type !== 'Almacen') return

          const uniqueKey = `${item.orderId}-${item.itemCode}`
          const orderRef = materialOrders.find((o) => o.id === item.orderId)

          let cantidadReal = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            const mermaAplicable = Math.min(cantidadReal, mermas[item.itemCode])
            cantidadReal -= mermaAplicable
            mermas[item.itemCode] -= mermaAplicable
          }

          if (cantidadReal > 0) {
            const itemWithInfo: ItemWithOrderInfo = {
              ...item,
              quantity: cantidadReal,
              orderId: sheet.id,
              orderContract: orderRef?.contractNumber || 'N/A',
              orderStatus: sheet.status,
              solicita: orderRef?.solicita,
            }
            statusItems[targetStatus].push(itemWithInfo)
            sheetInfo.items.push(itemWithInfo)
          }
          processedItemKeys.add(uniqueKey)
        })

        if (sheetInfo.items.length > 0) {
          blocked.push(sheetInfo)
        }
      })

      const all = materialOrders.flatMap((order) =>
        order.items.map((item) => {
          let cantidadAjustada = item.quantity
          ;(item.ajustes || []).forEach((ajuste) => {
            cantidadAjustada += ajuste.cantidad
          })
          return {
            ...item,
            quantity: cantidadAjustada,
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
            const mermaAplicable = Math.min(cantidadAjustada, mermas[item.itemCode])
            cantidadAjustada -= mermaAplicable
            mermas[item.itemCode] -= mermaAplicable
          }
          return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0
        })
        .map((item) => {
          let cantidadAjustada = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada -= mermas[item.itemCode]
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
    }, [materialOrders, pickingSheets, returnSheets])

  const handleItemChange = useCallback(
    async (orderId: string, itemCode: string, field: string, value: any) => {
      try {
        await updateItemMutation.mutateAsync({
          orderId,
          id: itemCode,
          updates: { [field]: value },
        })
        toast({
          title: 'Actualizado',
          description: 'El artículo ha sido actualizado correctamente.',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el artículo.',
          variant: 'destructive',
        })
      }
    },
    [updateItemMutation, toast],
  )

  const handleDeleteItem = async () => {
    if (!orderToDelete) return
    try {
      await deleteItemMutation.mutateAsync({
        orderId: orderToDelete.orderId,
        id: orderToDelete.itemCode,
      })
      toast({ title: 'Eliminado', description: 'El artículo ha sido eliminado del pedido.' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el artículo.',
        variant: 'destructive',
      })
    } finally {
      setOrderToDelete(null)
    }
  }

  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status]
    return (
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Artículos en estado: {status}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Solicita</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <TableRow key={`${item.itemCode}-${index}`} className="border-border/40">
                    <TableCell className="px-4 py-2 text-[11px] font-medium">{item.description}</TableCell>
                    <TableCell className="px-4 py-2 text-[11px]">{item.solicita}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-black">{item.quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-[11px] text-muted-foreground uppercase tracking-widest">
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
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Resumen de Artículos de Almacén</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cantidad</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cant. Cajas</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Valoración</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</TableHead>
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
                  <TableRow key={`${item.itemCode}-${index}`} className="border-border/40">
                    <TableCell className="px-4 py-2 text-[11px] font-medium">{item.description}</TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-black">{item.quantity}</TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-mono">{cajas}</TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-black font-mono">{formatCurrency(item.quantity * (item.price || 0))}</TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge 
                        variant={isBlocked ? 'destructive' : 'default'}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
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
        <div className="flex justify-end items-center gap-4 p-4 border-t border-border/40">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valoración Total</span>
          <span className="text-lg font-black tracking-tight text-blue-600">{formatCurrency(totalValue)}</span>
        </div>
      </DialogContent>
    )
  }

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Almacén..." />
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Archive className="h-5 w-5 text-blue-500" />
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={allItems.length === 0} 
                  className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5"
                >
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Resumen
                </Button>
              </DialogTrigger>
              {renderSummaryModal()}
            </Dialog>
            <BriefingSummaryDialog items={briefing?.items || []} />
            <Button 
              asChild
              className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <Link href={`/pedidos?numero_expediente=${serviceOrder?.numero_expediente}&type=Almacen`}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Nuevo Pedido
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(itemsByStatus) as StatusColumn[]).map((status) => {
          const items = itemsByStatus[status]
          const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
          const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
          
          const accentMap: Record<StatusColumn, "blue" | "amber" | "emerald"> = {
            "Asignado": "blue",
            "En Preparación": "amber",
            "Listo": "emerald"
          }

          return (
            <StatusCard
              key={status}
              title={status}
              items={items.length}
              totalQuantity={totalQty}
              totalValue={totalValue}
              accentColor={accentMap[status]}
              onClick={() => setActiveModal(status)}
            />
          )
        })}
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardHeader className="py-4 px-6 border-b border-border/40 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Gestión de Pedidos Pendientes</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valoración Pendiente</p>
            <p className="text-lg font-black tracking-tight text-blue-600">{formatCurrency(totalValoracionPendiente)}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Solicita</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha Entrega</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-32">Cantidad</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Valoración</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingItems.length > 0 ? (
                  pendingItems
                    .sort((a, b) => (a.solicita || '').localeCompare(b.solicita || ''))
                    .map((item) => (
                      <TableRow key={item.itemCode + item.orderId} className="border-border/40 group hover:bg-muted/20 transition-colors">
                        <TableCell className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">{item.description}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase">{item.itemCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Select
                            value={item.solicita}
                            onValueChange={(value: 'Sala' | 'Cocina') =>
                              handleItemChange(item.orderId, item.itemCode, 'solicita', value)
                            }
                          >
                            <SelectTrigger className="h-7 text-[11px] font-bold bg-transparent border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 backdrop-blur-md border-border/40">
                              <SelectItem value="Sala" className="text-[11px]">Sala</SelectItem>
                              <SelectItem value="Cocina" className="text-[11px]">Cocina</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Input
                            type="date"
                            value={
                              item.deliveryDate
                                ? format(new Date(item.deliveryDate), 'yyyy-MM-dd')
                                : ''
                            }
                            onChange={(e) =>
                              handleItemChange(
                                item.orderId,
                                item.itemCode,
                                'deliveryDate',
                                e.target.value,
                              )
                            }
                            className="h-7 text-[11px] font-mono bg-transparent border-border/40"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.orderId,
                                item.itemCode,
                                'quantity',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-7 w-20 ml-auto text-right text-[11px] font-black bg-transparent border-border/40"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right text-[11px] font-black font-mono text-blue-600">
                          {formatCurrency(item.quantity * (item.price || 0))}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-7 w-7 hover:bg-destructive/10"
                            onClick={() =>
                              setOrderToDelete({ orderId: item.orderId, itemCode: item.itemCode })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-20" />
                        <p className="text-[11px] font-medium uppercase tracking-wider">No hay pedidos pendientes</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <CardHeader className="py-4 px-6 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Consulta de Pedidos en Preparación o Listos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hoja Picking</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Contenido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedOrders.length > 0 ? (
                  blockedOrders.map((order) => (
                    <TableRow key={order.sheetId} className="border-border/40 group hover:bg-muted/20 transition-colors">
                      <TableCell className="px-4 py-2">
                        <Link
                          href={`/almacen/picking/${order.sheetId}`}
                          className="text-blue-600 hover:underline text-[11px] font-black font-mono"
                        >
                          {order.sheetId}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                            order.status === 'Listo' ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[10px] text-muted-foreground font-medium">
                        {order.items.map((i) => `${i.quantity}x ${i.description}`).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Clock className="h-8 w-8 opacity-20" />
                        <p className="text-[11px] font-medium uppercase tracking-wider">No hay pedidos en preparación o listos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {activeModal && renderStatusModal(activeModal)}

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-black uppercase tracking-widest">¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              Esta acción eliminará el artículo del pedido de material.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)} className="text-[10px] font-black uppercase tracking-widest">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90 text-[10px] font-black uppercase tracking-widest"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
