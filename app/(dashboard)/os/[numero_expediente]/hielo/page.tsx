'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Snowflake, Boxes, Clock, CheckCircle2 } from 'lucide-react'
import type { HieloOrder } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useHieloOrders, useEvento } from '@/hooks/use-data-queries'
import { useDeleteHieloOrderItem } from '@/hooks/mutations/use-hielo-mutations'

const statusVariant: {
  [key in HieloOrder['status']]: string
} = {
  Pendiente: 'border-amber-500 text-amber-600 bg-amber-50',
  Confirmado: 'border-blue-500 text-blue-600 bg-blue-50',
  'En reparto': 'border-orange-500 text-orange-600 bg-orange-50',
  Entregado: 'border-emerald-500 text-emerald-600 bg-emerald-50',
}

function StatusCard({
  title,
  value,
  subtitle,
  accentColor = "blue"
}: {
  title: string
  value: string | number
  subtitle: string
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
    <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative hover:bg-muted/20 transition-all group">
      <div className={cn("absolute top-0 left-0 w-1 h-full transition-all group-hover:w-1.5", colors[accentColor])} />
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</CardTitle>
        {icons[accentColor]}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tight">{value}</div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export default function HieloPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: hieloOrders = [], isLoading: isLoadingOrders } = useHieloOrders(serviceOrder?.id)
  const deleteHieloItem = useDeleteHieloOrderItem()

  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

  const totalAmount = useMemo(() => {
    return hieloOrders.reduce((sum, order) => sum + order.total, 0)
  }, [hieloOrders])

  const handleDelete = async () => {
    if (!orderToDelete) return

    try {
      await deleteHieloItem.mutateAsync(orderToDelete)
      toast({ title: 'Pedido de hielo eliminado' })
      setOrderToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el pedido.',
      })
    }
  }

  if (isLoadingOS || isLoadingOrders) {
    return <LoadingSkeleton title="Cargando Módulo de Hielo..." />
  }

  if (!serviceOrder) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold">Orden de Servicio no encontrada</h2>
        <Button onClick={() => router.push('/os')} className="mt-4">
          Volver a la lista
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Header Premium */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/os/${osId}/info`)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1" />

          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest h-9 px-4"
          >
            <Link href={`/pedidos?numero_expediente=${serviceOrder?.numero_expediente}&type=Hielo`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatusCard
          title="Total Pedidos"
          value={hieloOrders.length}
          subtitle="Pedidos registrados"
          accentColor="blue"
        />
        <StatusCard
          title="Coste Total"
          value={formatCurrency(totalAmount)}
          subtitle="Inversión en hielo"
          accentColor="amber"
        />
        <StatusCard
          title="Pendientes"
          value={hieloOrders.filter((o) => o.status === 'Pendiente').length}
          subtitle="Por confirmar"
          accentColor="emerald"
        />
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Pedidos Realizados</CardTitle>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cantidad</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Precio/Kg</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                  <TableHead className="h-10 px-4 text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hieloOrders.length > 0 ? (
                  hieloOrders.map((order) => (
                    <TableRow key={order.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                      <TableCell className="px-4 py-2 text-[11px] font-bold">{order.producto}</TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-medium">{order.cantidad} Kg</TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-mono">{formatCurrency(order.precio)}</TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-black font-mono">{formatCurrency(order.total)}</TableCell>
                      <TableCell className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                            statusVariant[order.status as keyof typeof statusVariant]
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-border/40">
                            <DropdownMenuItem
                              className="text-[10px] font-bold uppercase tracking-widest"
                              onClick={() =>
                                router.push(`/pedidos?numero_expediente=${serviceOrder?.numero_expediente}&type=Hielo&orderId=${order.id}`)
                              }
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive text-[10px] font-bold uppercase tracking-widest"
                              onClick={() => setOrderToDelete(order.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-[11px] text-muted-foreground uppercase tracking-widest">
                      No hay pedidos de hielo para esta OS.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={orderToDelete !== null}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-black uppercase tracking-widest">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará el pedido de hielo de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)} className="text-[10px] font-black uppercase tracking-widest">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-[10px] font-black uppercase tracking-widest"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
