
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { MaterialOrder, ServiceOrder, OrderItem } from '@/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderStatus: MaterialOrder['status'];
};

const statusVariant: { [key in MaterialOrder['status']]: 'default' | 'secondary' | 'outline' } = {
  Asignado: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
};

export default function AlmacenPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
      const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Almacén');
      setMaterialOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const allItemsByStatus = useMemo(() => {
    const items: { [key in MaterialOrder['status']]: ItemWithOrderInfo[] } = {
      Asignado: [],
      'En preparación': [],
      Listo: [],
    };
    materialOrders.forEach(order => {
      order.items.forEach(item => {
        items[order.status].push({
          ...item,
          orderContract: order.contractNumber || 'N/A',
          orderStatus: order.status,
        });
      });
    });
    return items;
  }, [materialOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Almacén'));
    
    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };
  
  const handleEdit = (order: MaterialOrder) => {
    if (order.status !== 'Asignado') {
      toast({ variant: 'destructive', title: 'No permitido', description: 'Solo se pueden editar pedidos en estado "Asignado".'});
      return;
    }
    router.push(`/pedidos?osId=${osId}&type=Almacén&orderId=${order.id}`);
  }

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
          <div>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}`)} className="mb-2">
                  <ArrowLeft className="mr-2" />
                  Volver a la OS
              </Button>
              <h1 className="text-3xl font-headline font-bold">Módulo de Almacén</h1>
              <p className="text-muted-foreground">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
          </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Almacén`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Almacén
          </Link>
        </Button>
      </div>

      <Card className="mb-8">
          <CardHeader><CardTitle>Artículos Totales del Módulo</CardTitle></CardHeader>
          <CardContent>
              <Tabs defaultValue="Asignado">
                  <TabsList>
                      <TabsTrigger value="Asignado">Asignado ({allItemsByStatus['Asignado'].length})</TabsTrigger>
                      <TabsTrigger value="En preparación">En preparación ({allItemsByStatus['En preparación'].length})</TabsTrigger>
                      <TabsTrigger value="Listo">Listo ({allItemsByStatus['Listo'].length})</TabsTrigger>
                  </TabsList>
                  {(Object.keys(allItemsByStatus) as Array<MaterialOrder['status']>).map(status => (
                      <TabsContent key={status} value={status}>
                           <div className="border rounded-lg mt-4">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Artículo</TableHead>
                                          <TableHead>Cantidad</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {allItemsByStatus[status].length > 0 ? (
                                          allItemsByStatus[status].map((item, index) => (
                                              <TableRow key={`${item.itemCode}-${item.orderContract}-${index}`}>
                                                  <TableCell className="font-medium">{item.description}</TableCell>
                                                  <TableCell>{item.quantity}</TableCell>
                                              </TableRow>
                                          ))
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={2} className="h-24 text-center">
                                                  No hay artículos en estado "{status}".
                                              </TableCell>
                                          </TableRow>
                                      )}
                                  </TableBody>
                              </Table>
                          </div>
                      </TabsContent>
                  ))}
              </Tabs>
          </CardContent>
      </Card>

      <Card>
          <CardHeader><CardTitle>Pedidos Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Nº Contrato</TableHead>
                          <TableHead>Fecha Entrega</TableHead>
                          <TableHead>Lugar Entrega</TableHead>
                          <TableHead>Localización</TableHead>
                          <TableHead>Artículos</TableHead>
                          <TableHead>Importe Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {materialOrders.length > 0 ? (
                          materialOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.contractNumber}</TableCell>
                              <TableCell>{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                              <TableCell>{order.deliverySpace || 'N/A'}</TableCell>
                              <TableCell>{order.deliveryLocation || 'N/A'}</TableCell>
                              <TableCell>{order.items.length}</TableCell>
                              <TableCell>{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
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
                                  <DropdownMenuItem onClick={() => handleEdit(order)} disabled={order.status !== 'Asignado'}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)} disabled={order.status !== 'Asignado'}>
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
                              No hay pedidos de almacén para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de material.
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
