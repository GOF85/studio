
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, ArrowLeft, Users, Phone, Building, UserPlus, Trash2 } from 'lucide-react';
import type { PersonalExternoOrder, ServiceOrder, Espacio } from '@/types';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format } from 'date-fns';

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export default function PersonalExternoPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [personalExternoOrders, setPersonalExternoOrders] = useState<PersonalExternoOrder[]>([]);
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

      if (currentOS?.space) {
        const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
        const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
        setSpaceAddress(currentSpace?.calle || '');
      }

      const allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
      const relatedOrders = allOrders.filter(order => order.osId === osId);
      setPersonalExternoOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return personalExternoOrders.reduce((sum, order) => {
        const horas = (new Date(`1970-01-01T${order.horaSalida}`).getTime() - new Date(`1970-01-01T${order.horaEntrada}`).getTime()) / (1000 * 60 * 60);
        return sum + (order.cantidad * order.precioHora * (horas > 0 ? horas : 0));
    }, 0);
  }, [personalExternoOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const updatedOrders = allOrders.filter((o) => o.id !== orderToDelete);
    localStorage.setItem('personalExternoOrders', JSON.stringify(updatedOrders));
    setPersonalExternoOrders(updatedOrders.filter((o) => o.osId === osId));
    
    toast({ title: 'Pedido de personal externo eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal Externo..." />;
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
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><UserPlus />Módulo de Personal Externo</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                    <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                </div>
            </div>
          <Button asChild>
            <Link href={`/personal-externo/pedido?osId=${osId}`}>
              <PlusCircle className="mr-2" />
              Nuevo Pedido
            </Link>
          </Button>
        </div>

        <Card>
            <CardHeader><CardTitle>Pedidos de Personal Externo</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Horario</TableHead>
                            <TableHead>Coste Total Est.</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {personalExternoOrders.length > 0 ? (
                            personalExternoOrders.map(order => {
                                const horas = (new Date(`1970-01-01T${order.horaSalida}`).getTime() - new Date(`1970-01-01T${order.horaEntrada}`).getTime()) / (1000 * 60 * 60);
                                const totalCost = order.cantidad * order.precioHora * (horas > 0 ? horas : 0);
                                const providerName = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]').find((p:any) => p.id === order.proveedorId)?.nombreProveedor || 'N/A';
                                return (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{providerName}</TableCell>
                                    <TableCell>{order.categoria}</TableCell>
                                    <TableCell>{order.cantidad}</TableCell>
                                    <TableCell>{order.horaEntrada} - {order.horaSalida}</TableCell>
                                    <TableCell>{formatCurrency(totalCost)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No hay pedidos de personal externo para esta Orden de Servicio.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                {personalExternoOrders.length > 0 && (
                    <div className="flex justify-end mt-4 text-xl font-bold">
                        Importe Total: {formatCurrency(totalAmount)}
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de personal.
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
