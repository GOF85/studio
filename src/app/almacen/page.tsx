'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { MaterialOrder, ServiceOrder } from '@/types';
import { Header } from '@/components/layout/header';
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
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
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
  }, [osId, router, toast]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    const updatedOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]').filter((o: MaterialOrder) => o.id !== orderToDelete);
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
    router.push(`/?osId=${osId}&type=Almacén&orderId=${order.id}`);
  }

  if (!isMounted || !serviceOrder) {
    return null; // or a loading skeleton
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a la OS
                </Button>
                <h1 className="text-3xl font-headline font-bold">Módulo de Almacén</h1>
                <p className="text-muted-foreground">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
            </div>
          <Button asChild>
            <Link href={`/?osId=${osId}&type=Almacén`}>
              <PlusCircle className="mr-2" />
              Nuevo Pedido de Almacén
            </Link>
          </Button>
        </div>

        <Card>
            <CardHeader><CardTitle>Pedidos Realizados</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Nº Contrato</TableHead>
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
                            <TableCell colSpan={5} className="h-24 text-center">
                                No hay pedidos de almacén para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>

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
