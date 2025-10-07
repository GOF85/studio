
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export default function AlmacenPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Almacen');
    setMaterialOrders(relatedOrders);

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    setPickingSheets(allPickingSheets.filter(sheet => sheet.osId === osId));

    setIsMounted(true);
  }, [osId]);

  const { assignedOrders, itemsEnPreparacion, itemsListos } = useMemo(() => {
    const enPreparacion: ItemWithOrderInfo[] = [];
    const listos: ItemWithOrderInfo[] = [];
    const pickedOrderIds = new Set<string>();

    pickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        sheet.items.forEach(item => {
             if (item.type === 'Almacen') {
                 const orderInfo = {
                    ...item,
                    orderContract: sheet.id,
                    orderStatus: sheet.status,
                    solicita: sheet.solicitante,
                };
                if (targetStatus === 'En Preparación') enPreparacion.push(orderInfo);
                else if (targetStatus === 'Listo') listos.push(orderInfo);
                
                const materialOrderForSheet = materialOrders.find(mo => mo.id === sheet.id);
                 if (materialOrderForSheet) {
                    pickedOrderIds.add(materialOrderForSheet.id);
                 }
            }
        });
    });
    
    const assigned = materialOrders.filter(order => !pickedOrderIds.has(order.id));
    
    return { assignedOrders: assigned, itemsEnPreparacion: enPreparacion, itemsListos: listos };
  }, [materialOrders, pickingSheets]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
  }

  const renderItemsColumn = (title: string, items: ItemWithOrderInfo[], columnType: StatusColumn) => (
    <Card className="flex-1 bg-muted/30">
        <CardHeader className="pb-4 flex-row items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={items.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Resumen de {title}</DialogTitle></DialogHeader>
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="text-right">Cantidad Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {Object.entries(items.reduce((acc, item) => {
                                acc[item.description] = (acc[item.description] || 0) + item.quantity;
                                return acc;
                            }, {} as Record<string, number>)).map(([desc, qty]) => (
                                <TableRow key={desc}><TableCell>{desc}</TableCell><TableCell className="text-right">{qty}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent className="space-y-2 h-full overflow-y-auto">
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
                        <Badge variant="outline">{item.orderContract}</Badge>
                    </div>
                </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay artículos.</p>}
        </CardContent>
    </Card>
  );
  
  const renderOrdersTable = (title: string, orders: MaterialOrder[], isEditable: boolean) => (
    <div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow><TableHead>Nº Contrato</TableHead><TableHead>Artículos</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id} className={isEditable ? "cursor-pointer" : ""} onClick={() => isEditable && router.push(`/pedidos?osId=${osId}&type=Almacen&orderId=${order.id}`)}>
                <TableCell>
                  <Button variant={isEditable ? "link" : "ghost"} className="p-0 h-auto">
                    {order.contractNumber}
                  </Button>
                </TableCell>
                <TableCell>{order.items.length}</TableCell>
                <TableCell className="text-right">{order.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Almacen`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Almacén
          </Link>
        </Button>
      </div>
      
       <div className="flex flex-col h-[50vh] mb-6">
            <div className="flex gap-6 flex-grow">
                {renderItemsColumn('Asignado', assignedOrders.flatMap(o => o.items.map(i => ({...i, orderContract: o.contractNumber || 'N/A', orderStatus: o.status, solicita: o.solicita }))), 'Asignado')}
                {renderItemsColumn('En Preparación', itemsEnPreparacion, 'En Preparación')}
                {renderItemsColumn('Listo', itemsListos, 'Listo')}
           </div>
       </div>

       <Card>
        <CardHeader><CardTitle>Gestión de Pedidos</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          {renderOrdersTable("Solicitado por Sala", materialOrders.filter(o => o.solicita === 'Sala'), true)}
          {renderOrdersTable("Solicitado por Cocina", materialOrders.filter(o => o.solicita === 'Cocina'), true)}
        </CardContent>
       </Card>
    </>
  );
}
