
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Flower2 } from 'lucide-react';
import type { DecoracionOrder, ServiceOrder } from '@/types';
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
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

const statusVariant: { [key in DecoracionOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pendiente: 'secondary',
  Aprobado: 'default',
  Rechazado: 'destructive',
};

export default function DecoracionPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [decoracionOrders, setDecoracionOrders] = useState<DecoracionOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

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

    let allOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const updatedOrders = allOrders.filter((o: DecoracionOrder) => o.id !== orderToDelete);
    localStorage.setItem('decoracionOrders', JSON.stringify(updatedOrders));
    setDecoracionOrders(updatedOrders.filter((o: DecoracionOrder) => o.osId === osId));
    
    toast({ title: 'Gasto de decoración eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Decoración..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a la OS
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Flower2 />Módulo de Decoración</h1>
                <p className="text-muted-foreground mt-2">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
            </div>
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
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {decoracionOrders.length > 0 ? (
                            decoracionOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{order.concepto}</TableCell>
                                <TableCell>{order.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
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
                            <TableCell colSpan={5} className="h-24 text-center">
                                No hay gastos de decoración para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                {decoracionOrders.length > 0 && (
                    <div className="flex justify-end mt-4 text-xl font-bold">
                        Importe Total: {totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </div>
                )}
            </CardContent>
        </Card>
      </main>

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
