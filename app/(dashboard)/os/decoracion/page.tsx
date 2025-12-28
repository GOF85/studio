
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Flower2 } from 'lucide-react';
import type { DecoracionOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { useDecoracionOrders, useDeleteDecoracionOrder, useEvento } from '@/hooks/use-data-queries';


export default function DecoracionPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const osId = (params.id as string) || '';
  const { toast } = useToast();

  const { data: evento, isLoading: loadingOS } = useEvento(osId);
  const { data: decoracionOrders = [], isLoading: loadingOrders } = useDecoracionOrders(osId);
  const deleteOrder = useDeleteDecoracionOrder();

  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return decoracionOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [decoracionOrders]);

  const handleDelete = async () => {
    if (!orderToDelete) return;
    await deleteOrder.mutateAsync(orderToDelete);
    setOrderToDelete(null);
  };
  
  if (loadingOS || loadingOrders) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />;
  }

  if (!evento) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">No se ha encontrado la Orden de Servicio.</p>
        <Button onClick={() => router.push('/os')}>Volver a OS</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/decoracion/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto de Decoración
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos de Decoración Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {decoracionOrders.length > 0 ? (
                          decoracionOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/decoracion/pedido?osId=${osId}&orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                              No hay gastos de decoración para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {decoracionOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de decoración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
