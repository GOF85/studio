'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Snowflake, Phone, Building } from 'lucide-react';
import type { HieloOrder, ServiceOrder } from '@/types';
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

const statusVariant: { [key in HieloOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En reparto': 'outline',
  Entregado: 'outline',
};

export default function HieloPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [hieloOrders, setHieloOrders] = useState<HieloOrder[]>([]);
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

      const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
      const relatedOrders = allHieloOrders.filter(order => order.osId === osId);
      setHieloOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return hieloOrders.reduce((sum, order) => sum + order.total, 0);
  }, [hieloOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const updatedOrders = allOrders.filter((o: HieloOrder) => o.id !== orderToDelete);
    localStorage.setItem('hieloOrders', JSON.stringify(updatedOrders));
    setHieloOrders(updatedOrders.filter((o: HieloOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de hielo eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Hielo..." />;
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
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Snowflake />Módulo de Hielo</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                    <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                     {serviceOrder.respMetre && (
                        <p className="flex items-center gap-2">
                            Resp. Metre: {serviceOrder.respMetre} 
                            {serviceOrder.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {serviceOrder.respMetrePhone}</span>}
                        </p>
                    )}
                </div>
            </div>
          <Button asChild>
            <Link href={`/hielo/pedido?osId=${osId}`}>
              <PlusCircle className="mr-2" />
              Nuevo Pedido de Hielo
            </Link>
          </Button>
        </div>

        <Card>
            <CardHeader><CardTitle>Pedidos de Hielo Realizados</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Nº Artículos</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {hieloOrders.length > 0 ? (
                            hieloOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{order.proveedorNombre}</TableCell>
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
                                    <DropdownMenuItem onClick={() => router.push(`/hielo/pedido?osId=${osId}&orderId=${order.id}`)}>
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
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay pedidos de hielo para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                {hieloOrders.length > 0 && (
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de hielo.
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
