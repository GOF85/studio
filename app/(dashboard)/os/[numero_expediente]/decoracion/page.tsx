'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Palette } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { useDecoracionOrders, useEvento } from '@/hooks/use-data-queries'
import { useDeleteDecoracionOrder } from '@/hooks/mutations/use-decoracion-mutations'
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
import { format } from 'date-fns'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function DecoracionPage() {
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: currentOS, isLoading: isLoadingOS } = useEvento(osId)

  const { data: decoracionOrders = [], isLoading: isLoadingOrders } = useDecoracionOrders(
    currentOS?.id,
  )
  const deleteDecoracion = useDeleteDecoracionOrder()

  const totalAmount = useMemo(() => {
    return decoracionOrders.reduce((sum, order) => sum + (order.precio || 0), 0)
  }, [decoracionOrders])

  const handleDelete = () => {
    if (!orderToDelete) return

    deleteDecoracion.mutate(orderToDelete, {
      onSuccess: () => {
        toast({ title: 'Gasto de decoración eliminado' })
        setOrderToDelete(null)
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar' })
      },
    })
  }

  if (isLoadingOS || isLoadingOrders) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />
  }

  if (!currentOS) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Orden de Servicio no encontrada</h2>
        <p className="text-muted-foreground">No se pudo encontrar la OS con número: {osId}</p>
        <Button asChild className="mt-4">
          <Link href="/os">Volver a la lista</Link>
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
            <Link href={`/decoracion/pedido?osId=${osId}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Gasto
            </Link>
          </Button>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Gastos Registrados</CardTitle>
          </div>
          {decoracionOrders.length > 0 && (
            <div className="text-right">
              <p className="text-[14px] font-black tracking-tight text-blue-600">{formatCurrency(totalAmount)}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Importe Total</p>
            </div>
          )}
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Concepto</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Importe</TableHead>
                  <TableHead className="h-10 px-4 text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decoracionOrders.length > 0 ? (
                  decoracionOrders.map((order) => (
                    <TableRow key={order.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                      <TableCell className="px-4 py-2 text-[11px] font-bold">
                        {format(new Date(order.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-medium">{order.concepto}</TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-black font-mono">{formatCurrency(order.precio)}</TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-border/40">
                            <DropdownMenuItem
                              className="text-[10px] font-bold uppercase tracking-widest"
                              onClick={() =>
                                router.push(`/decoracion/pedido?osId=${osId}&orderId=${order.id}`)
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
                    <TableCell colSpan={4} className="h-24 text-center text-[11px] text-muted-foreground uppercase tracking-widest">
                      No hay gastos de decoración para esta Orden de Servicio.
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
            <AlertDialogDescription className="text-[12px] text-muted-foreground">
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de
              decoración.
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
