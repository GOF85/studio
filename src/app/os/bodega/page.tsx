
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Eye } from 'lucide-react';
import type { MaterialOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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


export default function BodegaPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bodega');
    setMaterialOrders(relatedOrders);

    setIsMounted(true);
  }, [osId]);

    const handleDelete = () => {
        if (!orderToDelete) return;

        let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
        localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
        setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Bodega'));
        
        toast({ title: 'Pedido de material eliminado' });
        setOrderToDelete(null);
    };

    const handleEdit = (order: MaterialOrder) => {
        if (order.status !== 'Asignado') {
            toast({ variant: 'destructive', title: 'No permitido', description: 'Solo se pueden editar pedidos en estado "Asignado".'});
            return;
        }
        router.push(`/pedidos?osId=${osId}&type=Bodega&orderId=${order.id}`);
    }

  const allItems = useMemo(() => {
    return materialOrders.flatMap(order => order.items);
  }, [materialOrders]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Bodega..." />;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Resumen de Artículos de Bodega</DialogTitle></DialogHeader>
                <Table>
                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="text-right">Cantidad Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {Object.entries(allItems.reduce((acc, item) => {
                            acc[item.description] = (acc[item.description] || 0) + item.quantity;
                            return acc;
                        }, {} as Record<string, number>)).map(([desc, qty]) => (
                            <TableRow key={desc}><TableCell>{desc}</TableCell><TableCell className="text-right">{qty}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Bodega`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Bodega
          </Link>
        </Button>
      </div>
      
       <Card>
        <CardHeader><CardTitle>Gestión de Pedidos de Bodega</CardTitle></CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader><TableRow><TableHead>Nº Contrato</TableHead><TableHead>Solicita</TableHead><TableHead>Artículos</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {materialOrders.length > 0 ? materialOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.contractNumber}</TableCell>
                                <TableCell>{order.solicita}</TableCell>
                                <TableCell>{order.items.length}</TableCell>
                                <TableCell className="text-right">{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
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
                        )) : (
                            <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos de bodega para este servicio.</TableCell></TableRow>
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
                Esta acción no se puede deshacer. Se eliminará el pedido de material.
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
