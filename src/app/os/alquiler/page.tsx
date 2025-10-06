
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function AlquilerPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
  const [summaryView, setSummaryView] = useState<'agregado' | 'segregado'>('agregado');
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;

  useEffect(() => {
    if (!osId) return;
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Alquiler');
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
             if (item.type === 'Alquiler') {
                 items[targetStatus].push({
                    ...item,
                    orderContract: sheet.id,
                    orderStatus: sheet.status,
                    solicita: sheet.solicitante,
                });
                pickedItemCodes.add(`${item.itemCode}__${sheet.solicitante || 'general'}`);
            }
        });
    });

    materialOrders.forEach(order => {
        order.items.forEach(item => {
            const itemKey = `${item.itemCode}__${order.solicita || 'general'}`;
            if (!pickedItemCodes.has(itemKey)) {
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

  const summaryItems = useMemo(() => {
    const allItems: (OrderItem & { solicita?: 'Sala' | 'Cocina' })[] = [];
    materialOrders.forEach(order => {
        order.items.forEach(item => {
            allItems.push({ ...item, solicita: order.solicita });
        });
    });

    if (summaryView === 'agregado') {
        const aggregated: Record<string, OrderItem & { solicitantes: Set<string> }> = {};
        allItems.forEach(item => {
            if (aggregated[item.itemCode]) {
                aggregated[item.itemCode].quantity += item.quantity;
                if (item.solicita) aggregated[item.itemCode].solicitantes.add(item.solicita);
            } else {
                aggregated[item.itemCode] = { ...item, solicitantes: new Set(item.solicita ? [item.solicita] : []) };
            }
        });
        return { agregado: Object.values(aggregated) };
    } else {
        return {
            sala: allItems.filter(i => i.solicita === 'Sala'),
            cocina: allItems.filter(i => i.solicita === 'Cocina'),
        };
    }
  }, [materialOrders, summaryView]);


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
                        {title !== 'Asignado' && <Badge variant="outline">{item.orderContract}</Badge>}
                    </div>
                </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay artículos.</p>}
        </CardContent>
    </Card>
  );

  const renderSummaryTable = (title: string, items: (OrderItem & {solicitantes?: Set<string>})[]) => (
    <div>
        {title && <h4 className="font-semibold mb-2">{title}</h4>}
        <div className="border rounded-lg">
            <Table>
                <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Solicitado por</TableHead></TableRow></TableHeader>
                <TableBody>
                    {items.map(item => (
                        <TableRow key={item.itemCode}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>
                                { 'solicitantes' in item && item.solicitantes ? Array.from(item.solicitantes).join(', ') : (item as any).solicita || ''}
                            </TableCell>
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
          <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Alquiler
          </Link>
        </Button>
      </div>

       <div className="flex flex-col h-[65vh]">
            <div className="flex gap-6 flex-grow">
                {renderColumn('Asignado', allItemsByStatus['Asignado'])}
                {renderColumn('En Preparación', allItemsByStatus['En Preparación'])}
                {renderColumn('Listo', allItemsByStatus['Listo'])}
           </div>
       </div>
       
       <Card className="mt-6">
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle>Resumen Total de Artículos</CardTitle>
                    <div className="w-48">
                        <Select value={summaryView} onValueChange={(value) => setSummaryView(value as any)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="agregado">Agregado</SelectItem>
                                <SelectItem value="segregado">Segregado (Sala/Cocina)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {summaryView === 'agregado' 
                    ? renderSummaryTable('', summaryItems.agregado || [])
                    : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {renderSummaryTable('Sala', summaryItems.sala || [])}
                            {renderSummaryTable('Cocina', summaryItems.cocina || [])}
                        </div>
                    )
                }
            </CardContent>
       </Card>
    </>
  );
}
