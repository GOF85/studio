'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  Truck,
  Phone,
  Building,
} from 'lucide-react'
import { format } from 'date-fns'
import type { TransporteOrder, ServiceOrder, Espacio } from '@/types'
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { formatCurrency } from '@/lib/utils'
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
import { useDeleteTransporteOrder } from '@/hooks/mutations/use-transporte-mutations'
import { useEvento, useTransporteOrders } from '@/hooks/use-data-queries'

const statusVariant: {
  [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive'
} = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
}

export default function TransportePage() {
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId)
  const { data: transporteOrders = [], isLoading: isLoadingOrders } = useTransporteOrders(
    serviceOrder?.id,
  )
  const deleteTransporte = useDeleteTransporteOrder()

  const totalAmount = useMemo(() => {
    return transporteOrders.reduce((sum, order) => sum + order.precio, 0)
  }, [transporteOrders])

  const handleDelete = async () => {
    if (!orderToDelete) return

    try {
      await deleteTransporte.mutateAsync(orderToDelete)
      toast({ title: 'Pedido de transporte eliminado' })
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
    return <LoadingSkeleton title="Cargando Módulo de Transporte..." />
  }

  if (!serviceOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">No se ha encontrado la Orden de Servicio.</p>
        <Button onClick={() => router.push('/os')}>Volver a OS</Button>
      </div>
    )
  }

  return (
    <main className="space-y-6">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button 
              asChild
              className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <Link href={`/transporte/pedido?osId=${osId}`}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Nuevo Pedido
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardHeader className="py-4 px-6 border-b border-border/40 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Pedidos de Transporte Realizados</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Importe Total</p>
              <p className="text-lg font-black tracking-tight text-blue-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-32">Fecha</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Proveedor</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Recogida</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Entrega</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Importe</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transporteOrders.length > 0 ? (
                  transporteOrders.map((order) => (
                    <TableRow key={order.id} className="border-border/40 group hover:bg-muted/20 transition-colors">
                      <TableCell className="px-4 py-2 text-[11px] font-bold">
                        {format(new Date(order.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-medium uppercase tracking-tight">
                        {order.proveedorNombre}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[11px] text-muted-foreground">
                        {order.tipoTransporte}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium">{order.lugarRecogida}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{order.horaRecogida}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium">{order.lugarEntrega}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{order.horaEntrega}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-black font-mono">
                        {formatCurrency(order.precio)}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-center">
                        <Badge 
                          variant={statusVariant[order.status]}
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-border/40">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/transporte/pedido?osId=${osId}&orderId=${order.id}`)
                              }
                              className="text-[11px] font-bold uppercase tracking-widest"
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive text-[11px] font-bold uppercase tracking-widest"
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
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Truck className="h-8 w-8 opacity-20" />
                        <p className="text-[11px] font-medium uppercase tracking-wider">No hay pedidos de transporte registrados</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-black uppercase tracking-widest">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de transporte.
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
    </main>
  )
}
