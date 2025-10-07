
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, MoreHorizontal, Pencil, Trash2, Eye, ChevronDown } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';


type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderStatus: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

export default function AlquilerPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Alquiler');
    setMaterialOrders(relatedOrders);

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    setPickingSheets(allPickingSheets.filter(sheet => sheet.osId === osId));

    setIsMounted(true);
  }, [osId]);

  const allItems = useMemo(() => {
    return materialOrders.flatMap(order => order.items);
  }, [materialOrders]);

  const allItemsByStatus = useMemo(() => {
    const items: Record<StatusColumn, ItemWithOrderInfo[]> = {
      Asignado: [],
      'En Preparación': [],
      Listo: [],
    };
    
    const pickedItemCodes = new Set<string>();
    pickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        sheet.items.forEach(item => {
             if (item.type === 'Alquiler') {
                 items[targetStatus].push({
                    ...item,
                    orderContract: sheet.id,
                    orderStatus: sheet.status,
                    solicita: sheet.solicitante,
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
                    orderStatus: 'Pendiente', 
                    solicita: order.solicita,
                });
            }
        });
    });
    return items;
  }, [materialOrders, pickingSheets]);

  const updateOrder = (orderId: string, updatedItems: OrderItem[]) => {
    const allOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const orderIndex = allOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex > -1) {
      allOrders[orderIndex].items = updatedItems;
      allOrders[orderIndex].total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      localStorage.setItem('materialOrders', JSON.stringify(allOrders));
      setMaterialOrders(prev => prev.map(o => o.id === orderId ? allOrders[orderIndex] : o));
    }
  }

  const handleQuantityChange = (orderId: string, itemCode: string, quantity: number) => {
    const order = materialOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const newItems = order.items.map(item => 
      item.itemCode === itemCode ? { ...item, quantity: Math.max(0, quantity) } : item
    ).filter(item => item.quantity > 0);

    updateOrder(orderId, newItems);
    toast({ title: 'Cantidad actualizada', description: 'El cambio se guardará automáticamente.' });
  }

  const handleDeleteItem = (orderId: string, itemCode: string) => {
    const order = materialOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const newItems = order.items.filter(item => item.itemCode !== itemCode);
    updateOrder(orderId, newItems);
    toast({ title: 'Artículo eliminado', description: 'El artículo ha sido eliminado del pedido.' });
  }

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Alquiler'));
    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />;
  }

  const renderColumn = (title: string, items: ItemWithOrderInfo[]) => (
    <Card className="flex-1 bg-muted/30">
        <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
                {title}
                <Badge variant={title === 'Listo' ? 'default' : 'secondary'} className="text-sm">{items.length}</Badge>
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            {items.length > 0 ? items.map((item, index) => (
                <Card key={`${item.itemCode}-${item.orderContract}-${index}`} className="p-3">
                    <p className="font-semibold">{item.description}</p>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                        <span>Cantidad: {item.quantity}</span>
                        {item.solicita && (
                            <Badge variant={item.solicita === 'Sala' ? 'default' : 'outline'} className={item.solicita === 'Sala' ? 'bg-blue-600' : 'bg-orange-500'}>
                                {item.solicita === 'Sala' ? <Users size={12} className="mr-1.5"/> : <Soup size={12} className="mr-1.5"/>}
                                {item.solicita}
                            </Badge>
                        )}
                        {title !== 'Asignado' && <Badge variant="outline">{item.orderContract}</Badge>}
                    </div>
                </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay artículos.</p>}
        </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Resumen de Artículos de Alquiler</DialogTitle></DialogHeader>
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
          <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Alquiler
          </Link>
        </Button>
      </div>

       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {renderColumn('Asignado', allItemsByStatus['Asignado'])}
            {renderColumn('En Preparación', allItemsByStatus['En Preparación'])}
            {renderColumn('Listo', allItemsByStatus['Listo'])}
       </div>

        <Collapsible>
          <Card>
              <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between hover:bg-muted/50">
                      <CardTitle>Gestión de Pedidos</CardTitle>
                      <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180"/>
                  </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <CardContent>
                      <div className="border rounded-lg">
                          <Table>
                              <TableHeader><TableRow><TableHead>Nº Contrato</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                              <TableBody>
                                  {materialOrders.length > 0 ? materialOrders.map(order => (
                                  <Collapsible key={order.id} asChild>
                                      <>
                                        <TableRow>
                                            <TableCell><CollapsibleTrigger className="flex items-center gap-2 font-medium w-full text-left">{order.contractNumber} <ChevronDown className="h-4 w-4"/></CollapsibleTrigger></TableCell>
                                            <TableCell>{order.solicita}</TableCell>
                                            <TableCell className="text-right">{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setOrderToDelete(order.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        <CollapsibleContent asChild>
                                            <tr>
                                                <td colSpan={4} className="p-0">
                                                    <div className="p-4 bg-muted/30">
                                                        <Table>
                                                            <TableBody>
                                                                {order.items.map(item => (
                                                                    <TableRow key={item.itemCode}>
                                                                        <TableCell>{item.description}</TableCell>
                                                                        <TableCell className="w-32">
                                                                            <Input type="number" value={item.quantity} onBlur={(e) => handleQuantityChange(order.id, item.itemCode, parseInt(e.target.value))} onChange={(e) => {
                                                                                const newItems = order.items.map(i => i.itemCode === item.itemCode ? {...i, quantity: parseInt(e.target.value) || 0} : i);
                                                                                setMaterialOrders(prev => prev.map(o => o.id === order.id ? {...o, items: newItems} : o));
                                                                            }} className="h-8"/>
                                                                        </TableCell>
                                                                        <TableCell className="w-12">
                                                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteItem(order.id, item.itemCode)}><Trash2 className="h-4 w-4"/></Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </td>
                                            </tr>
                                        </CollapsibleContent>
                                      </>
                                  </Collapsible>
                                  )) : (
                                      <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No hay pedidos de alquiler para este servicio.</TableCell></TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
              </CollapsibleContent>
          </Card>
        </Collapsible>

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
                onClick={handleDeleteOrder}
                >
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
