'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Layers } from 'lucide-react'
import type { AtipicoOrder } from '@/types'
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
import { format } from 'date-fns'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { formatCurrency } from '@/lib/utils'
import { useEvento } from '@/hooks/use-data-queries'
import { useAtipicos } from '@/hooks/use-atipicos'

const statusVariant: { [key in AtipicoOrder['status']]: 'default' | 'secondary' | 'destructive' } =
  {
    Pendiente: 'secondary',
    Aprobado: 'default',
    Rechazado: 'destructive',
  }

export default function AtipicosPage() {
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: evento, isLoading: loadingOS } = useEvento(osId)
  const { atipicos, isLoading: loadingAtipicos, deleteAtipico } = useAtipicos(evento?.id || '')

  const totalAmount = useMemo(() => {
    return atipicos.reduce((sum, order) => sum + order.precio, 0)
  }, [atipicos])

  const handleDelete = async () => {
    if (!orderToDelete) return
    try {
      await deleteAtipico.mutateAsync(orderToDelete)
      setOrderToDelete(null)
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (loadingOS || loadingAtipicos) {
    return <LoadingSkeleton title="Cargando Módulo de Atípicos..." />
  }

  if (!evento) {
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
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button 
              asChild
              className="h-8 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <Link href={`/atipicos/pedido?osId=${osId}`}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Nuevo Gasto
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <CardHeader className="py-4 px-6 border-b border-border/40 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest">Gastos Atípicos Registrados</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Importe Total</p>
              <p className="text-lg font-black tracking-tight text-amber-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-32">Fecha</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Concepto</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-32">Importe</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-32 text-center">Estado</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atipicos.length > 0 ? (
                  atipicos.map((order) => (
                    <TableRow key={order.id} className="border-border/40 group hover:bg-muted/20 transition-colors">
                      <TableCell className="px-4 py-2 text-[11px] font-bold">
                        {format(new Date(order.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-[11px] font-medium uppercase tracking-tight">
                        {order.concepto}
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
                                router.push(`/atipicos/pedido?osId=${osId}&orderId=${order.id}`)
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MoreHorizontal className="h-8 w-8 opacity-20" />
                        <p className="text-[11px] font-medium uppercase tracking-wider">No hay gastos atípicos registrados</p>
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto atípico.
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
