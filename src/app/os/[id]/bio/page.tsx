
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { MaterialOrder, ServiceOrder, OrderItem, PickingSheet } from '@/types';
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
  orderStatus: PickingSheet['status'];
};

const statusVariant: { [key in PickingSheet['status']]: 'default' | 'secondary' | 'outline' } = {
  Pendiente: 'secondary',
  'En Proceso': 'outline',
  Listo: 'default',
};

export default function BioPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bio');
    setMaterialOrders(relatedOrders);

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    setPickingSheets(allPickingSheets.filter(sheet => sheet.osId === osId));

    setIsMounted(true);
  }, [osId, router, toast]);

  const allItemsByStatus = useMemo(() => {
    const items: { [key in PickingSheet['status'] | 'Asignado']: ItemWithOrderInfo[] } = {
      Asignado: [],
      'Pendiente': [],
      'En Proceso': [],
      Listo: [],
    };
    
    const pickedItemCodes = new Set<string>();
    pickingSheets.forEach(sheet => {
        sheet.items.forEach(item => {
            if (item.type === 'Bio') {
                 items[sheet.status].push({
                    ...item,
                    orderContract: sheet.id,
                    orderStatus: sheet.status,
                });
                pickedItemCodes.add(item.itemCode);
            }
        });
    });

    materialOrders.forEach(order => {
        order.items.forEach(item => {
            if (!pickedItemCodes.has(item.itemCode)) {
                items['Asignado'].push({
                    ...item,
                    orderContract: order.contractNumber || 'N/A',
                    orderStatus: 'Pendiente', // Not in a sheet yet
                });
            }
        });
    });
    return items;
  }, [materialOrders, pickingSheets]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Bio'));

    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };
  
  const handleEdit = (order: MaterialOrder) => {
    if (order.status !== 'Asignado') {
      toast({ variant: 'destructive', title: 'No permitido', description: 'Solo se pueden editar pedidos en estado "Asignado".'});
      return;
    }
    router.push(`/pedidos?osId=${osId}&type=Bio&orderId=${order.id}`);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Bio..." />;
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Bio`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Bio
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
          <CardHeader><CardTitle>Artículos Totales del Módulo por Estado de Picking</CardTitle></CardHeader>
          <CardContent>
              <Tabs defaultValue="Asignado">
                  <TabsList>
                       <TabsTrigger value="Asignado">Asignado ({allItemsByStatus['Asignado'].length})</TabsTrigger>
                      <TabsTrigger value="Pendiente">Picking Pendiente ({allItemsByStatus['Pendiente'].length})</TabsTrigger>
                      <TabsTrigger value="En Proceso">En Preparación ({allItemsByStatus['En Proceso'].length})</TabsTrigger>
                      <TabsTrigger value="Listo">Listo para Servir ({allItemsByStatus['Listo'].length})</TabsTrigger>
                  </TabsList>
                  {(Object.keys(allItemsByStatus) as Array<keyof typeof allItemsByStatus>).map(status => (
                      <TabsContent key={status} value={status}>
                           <div className="border rounded-lg mt-4">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Artículo</TableHead>
                                          <TableHead>Cantidad</TableHead>
                                          <TableHead>Ref. Hoja Picking</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {allItemsByStatus[status].length > 0 ? (
                                          allItemsByStatus[status].map((item, index) => (
                                              <TableRow key={`${item.itemCode}-${item.orderContract}-${index}`}>
                                                  <TableCell className="font-medium">{item.description}</TableCell>
                                                  <TableCell>{item.quantity}</TableCell>
                                                  <TableCell><Badge variant="outline">{item.orderContract}</Badge></TableCell>
                                              </TableRow>
                                          ))
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={3} className="h-24 text-center">
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
    </>
  );
}
