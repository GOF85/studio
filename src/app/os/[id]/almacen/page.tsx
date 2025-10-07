'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, MoreHorizontal, Pencil, Trash2, Eye, ChevronDown, Save, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

export default function AlmacenPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Almacen');
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
             if (item.type === 'Almacen') {
                 items[targetStatus].push({
                    ...item,
                    orderId: sheet.id,
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
                    orderId: order.id,
                    orderContract: order.contractNumber || 'N/A',
                    orderStatus: 'Pendiente',
                    solicita: order.solicita,
                });
            }
        });
    });
    return items;
  }, [materialOrders, pickingSheets]);

  const handleSaveAll = () => {
    setIsLoading(true);
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    
    materialOrders.forEach(localOrder => {
      const index = allMaterialOrders.findIndex(o => o.id === localOrder.id);
      if (index !== -1) {
        allMaterialOrders[index] = localOrder;
      }
    });

    localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
    toast({ title: 'Guardado', description: 'Todos los cambios en los pedidos han sido guardados.' });
    setIsLoading(false);
  }

  const handleQuantityChange = (orderId: string, itemCode: string, newQuantity: number) => {
    setMaterialOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items
            .map(item => item.itemCode === itemCode ? { ...item, quantity: newQuantity } : item)
            .filter(item => item.quantity > 0);
          const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return { ...order, items: updatedItems, total: updatedTotal };
        }
        return order;
      });
    });
  };
  
  const handleSolicitaChange = (orderId: string, newSolicita: 'Sala' | 'Cocina') => {
    setMaterialOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, solicita: newSolicita } : order
      )
    );
  }

  const handleDeleteItem = (orderId: string, itemCode: string) => {
    handleQuantityChange(orderId, itemCode, 0);
  }

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Almacen'));
    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
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
                <DialogHeader><DialogTitle>Resumen de Artículos de Almacén</DialogTitle></DialogHeader>
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
          <Link href={`/pedidos?osId=${osId}&type=Almacen`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Almacén
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
                        <CardTitle className="text-lg">Gestión de Pedidos</CardTitle>
                        <div className="flex items-center gap-4">
                             <Button onClick={(e) => { e.stopPropagation(); handleSaveAll();}} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar Cambios</span>
                            </Button>
                            <ChevronDown className="h-6 w-6 transition-transform duration-200 group-data-[state=open]:rotate-180"/>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {/* Bloqueado */}
                        <h3 className="font-semibold text-lg my-2 text-destructive">Bloqueado (En Preparación / Listo)</h3>
                         <div className="border rounded-lg mb-6">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Contrato</TableHead>
                                        <TableHead>Artículo</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Solicita</TableHead>
                                        <TableHead className="text-right">Importe</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...allItemsByStatus['En Preparación'], ...allItemsByStatus['Listo']].sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map((item, index) => (
                                        <TableRow key={index} className="bg-muted/20">
                                            <TableCell><Badge variant="secondary">{item.orderContract}</Badge></TableCell>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.solicita}</TableCell>
                                            <TableCell className="text-right">{(item.price * item.quantity).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                        </TableRow>
                                    ))}
                                    {[...allItemsByStatus['En Preparación'], ...allItemsByStatus['Listo']].length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay artículos bloqueados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                             </Table>
                         </div>
                         
                        {/* Pendiente */}
                        <h3 className="font-semibold text-lg my-2 text-green-700">Pendiente (Asignado)</h3>
                        <div className="border rounded-lg">
                            <Table>
                                <TableBody>
                                    {materialOrders.filter(o => !pickingSheets.some(ps => ps.id === o.id)).sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(order => (
                                        <Collapsible key={order.id} asChild>
                                            <>
                                                <TableRow>
                                                    <TableCell className="p-0">
                                                      <CollapsibleTrigger className="flex items-center gap-2 font-medium w-full text-left p-4">
                                                        <ChevronDown className="h-4 w-4"/>
                                                        <span className="flex-1">{order.contractNumber}</span>
                                                        <span className="text-right font-normal">{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                                                      </CollapsibleTrigger>
                                                    </TableCell>
                                                    <TableCell className="w-48">
                                                        <Select value={order.solicita} onValueChange={(value: 'Sala' | 'Cocina') => handleSolicitaChange(order.id, value)}>
                                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Sala">Sala</SelectItem>
                                                                <SelectItem value="Cocina">Cocina</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right w-12">
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setOrderToDelete(order.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                <CollapsibleContent asChild>
                                                    <tr>
                                                        <td colSpan={3} className="p-0">
                                                            <div className="p-2 bg-muted/30">
                                                                <Table>
                                                                    <TableBody>
                                                                        {order.items.map(item => (
                                                                            <TableRow key={item.itemCode}>
                                                                                <TableCell>{item.description}</TableCell>
                                                                                <TableCell className="w-32">
                                                                                    <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(order.id, item.itemCode, parseInt(e.target.value) || 0)} className="h-8"/>
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
                                    ))}
                                    {materialOrders.filter(o => !pickingSheets.some(ps => ps.id === o.id)).length === 0 && (
                                         <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes de procesar.</TableCell></TableRow>
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
