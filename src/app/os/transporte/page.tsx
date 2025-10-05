
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Truck, Phone, Building } from 'lucide-react';
import type { TransporteOrder, ServiceOrder, Espacio } from '@/types';
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

const statusVariant: { [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
};

export default function TransportePage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [transporteOrders, setTransporteOrders] = useState<TransporteOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    
    if (!currentOS) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio válida.' });
        router.push('/pes');
        return;
    }
    
    setServiceOrder(currentOS);

    if (currentOS?.space) {
        const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
        const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
        setSpaceAddress(currentSpace?.calle || '');
    }

    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const relatedOrders = allTransporteOrders.filter(order => order.osId === osId);
    setTransporteOrders(relatedOrders);

    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return transporteOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [transporteOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const updatedOrders = allOrders.filter((o: TransporteOrder) => o.id !== orderToDelete);
    localStorage.setItem('transporteOrders', JSON.stringify(updatedOrders));
    setTransporteOrders(updatedOrders.filter((o: TransporteOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de transporte eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Transporte..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/${osId}/transporte/pedido`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Transporte
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Pedidos de Transporte Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Recogida</TableHead>
                          <TableHead>Entrega</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {transporteOrders.length > 0 ? (
                          transporteOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.proveedorNombre}</TableCell>
                              <TableCell>{order.tipoTransporte}</TableCell>
                              <TableCell>{order.lugarRecogida} a las {order.horaRecogida}</TableCell>
                              <TableCell>{order.lugarEntrega} a las {order.horaEntrega}</TableCell>
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
                                  <DropdownMenuItem onClick={() => router.push(`/os/${osId}/transporte/pedido?orderId=${order.id}`)}>
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
                          <TableCell colSpan={8} className="h-24 text-center">
                              No hay pedidos de transporte para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {transporteOrders.length > 0 && (
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de transporte.
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
