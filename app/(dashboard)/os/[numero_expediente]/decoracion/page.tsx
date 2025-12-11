
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
import { useDeleteDecoracionOrder } from '@/hooks/mutations/use-decoracion-mutations';
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


export default function DecoracionPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [decoracionOrders, setDecoracionOrders] = useState<DecoracionOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.numero_expediente as string;
  const { toast } = useToast();
  const deleteDecoracion = useDeleteDecoracionOrder();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
      const relatedOrders = allDecoracionOrders.filter(order => order.osId === osId);
      setDecoracionOrders(relatedOrders);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return decoracionOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [decoracionOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    deleteDecoracion.mutate(orderToDelete, {
      onSuccess: () => {
        setDecoracionOrders(prev => prev.filter(o => o.id !== orderToDelete));
        toast({ title: 'Gasto de decoración eliminado' });
        setOrderToDelete(null);
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar' });
      }
    });
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />;
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
