
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
  }

  const renderColumn = (title: string, items: ItemWithOrderInfo[], columnType: StatusColumn) => (
    <Card className="flex-1 bg-muted/30">
        <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
                {title}
                <Badge variant={columnType === 'Listo' ? 'default' : 'secondary'} className="text-sm">{items.length}</Badge>
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
                        {columnType !== 'Asignado' && <Badge variant="outline">{item.orderContract}</Badge>}
                    </div>
                </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay artículos.</p>}
        </CardContent>
    </Card>
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
      
       <div className="grid md:grid-cols-3 gap-6">
            {renderColumn('Asignado', allItemsByStatus['Asignado'], 'Asignado')}
            {renderColumn('En Preparación', allItemsByStatus['En Preparación'], 'En Preparación')}
            {renderColumn('Listo', allItemsByStatus['Listo'], 'Listo')}
       </div>
    </>
  );
}
