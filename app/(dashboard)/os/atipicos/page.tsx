
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, FilePlus } from 'lucide-react';
import type { AtipicoOrder, ServiceOrder } from '@/types';
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
import { Badge } from '@/components/ui/badge';
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
import { useEvento, useAtipicoOrders } from '@/hooks/use-data-queries';
import { useDeleteAtipicoOrder } from '@/hooks/mutations/use-atipicos-mutations';

const statusVariant: { [key in AtipicoOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pendiente: 'secondary',
  Aprobado: 'default',
  Rechazado: 'destructive',
};

export default function AtipicosPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const osId = (params.id as string) || '';
  const { toast } = useToast();

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(osId);
  const { data: atipicoOrders = [], isLoading: isLoadingOrders } = useAtipicoOrders(osId);
  const deleteAtipico = useDeleteAtipicoOrder();

  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalAmount = useMemo(() => {
    return atipicoOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [atipicoOrders]);

  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
        await deleteAtipico.mutateAsync(orderToDelete);
        toast({ title: 'Gasto atípico eliminado' });
        setOrderToDelete(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el gasto.' });
    }
  };

  if (!isMounted || isLoadingOS || isLoadingOrders) {
    return <LoadingSkeleton title="Cargando Módulo de Atípicos..." />;
  }

  if (!serviceOrder) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h2 className="text-2xl font-bold">Orden de Servicio no encontrada</h2>
            <Button onClick={() => router.push('/os')} className="mt-4">Volver a la lista</Button>
        </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <Button asChild>
          <Link href={`/atipicos/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto Atípico
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos Atípicos Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {atipicoOrders.length > 0 ? (
                          atipicoOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/atipicos/pedido?osId=${osId}&orderId=${order.id}`)}>
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
                          <TableCell colSpan={5} className="h-24 text-center">
                              No hay gastos atípicos para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {atipicoOrders.length > 0 && (
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto atípico.
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
