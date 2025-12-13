

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

    useEffect(() => {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        if (currentBriefing) {
            const sortedItems = [...currentBriefing.items].sort((a, b) => {
                const dateComparison = a.fecha.localeCompare(b.fecha);
                if (dateComparison !== 0) return dateComparison;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            setBriefingItems(sortedItems);
        }
    }, [osId]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlquilerPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  const router = useRouter();
  const params = useParams() ?? {};
  const osId = (params.numero_expediente as string) || '';

 const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
    if (typeof window === 'undefined') {
        return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
    }
    
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Alquiler');

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);

    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    
    const mermas: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
      Object.entries(sheet.itemStates).forEach(([key, state]) => {
        const itemInfo = sheet.items.find(i => `${i.orderId}_${i.itemCode}` === key);
        if (itemInfo && itemInfo.type === 'Alquiler' && itemInfo.sentQuantity > state.returnedQuantity) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity;
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida;
        }
      });
    });
    
    const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
    const processedItemKeys = new Set<string>();
    const blocked: BlockedOrderInfo[] = [];

    relatedPickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

        sheet.items.forEach(itemInSheet => {
            if (itemInSheet.type !== 'Alquiler') return;
            
            const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
            const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
            
            // CRITICAL FIX: Always get the quantity from the source of truth (materialOrders)
            const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);
            if (!originalItem) return;
            
            const itemWithInfo: ItemWithOrderInfo = {
                ...originalItem, 
                orderId: sheet.id, 
                orderContract: orderRef?.contractNumber || 'N/A', 
                orderStatus: sheet.status, 
                solicita: orderRef?.solicita,
            };

            statusItems[targetStatus].push(itemWithInfo);
            sheetInfo.items.push(itemWithInfo);
            processedItemKeys.add(uniqueKey);
        });

        if (sheetInfo.items.length > 0) {
            blocked.push(sheetInfo);
        }
    });

    const all = relatedOrders.flatMap(order => 
        order.items.map(item => {
            return {
                ...item, 
                orderId: order.id, 
                orderContract: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo
        })
    );
    
    const pending = all.filter(item => {
      const uniqueKey = `${item.orderId}-${item.itemCode}`;
      let cantidadAjustada = item.quantity;
      if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
          cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
          mermas[item.itemCode] = 0;
      }
      return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0;
    }).map(item => {
        let cantidadAjustada = item.quantity;
        if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada = Math.max(0, cantidadAjustada - mermas[item.itemCode]);
        }
        return {...item, quantity: cantidadAjustada};
    });
    
    statusItems['Asignado'] = pending;

    const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return { 
        allItems: all, 
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente
    };
  }, [osId, updateTrigger]);
  
    useEffect(() => {
        setIsMounted(true);
        const forceUpdate = () => setUpdateTrigger(prev => prev + 1);
        window.addEventListener('storage', forceUpdate);
        return () => window.removeEventListener('storage', forceUpdate);
    }, []);
  
  const renderStatusModal = (status: StatusColumn) => {
    const items = itemsByStatus[status];
    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item, index) => (
                            <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    )
  }
  
    const renderSummaryModal = () => {
    const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
     const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return (
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Resumen de Artículos de Alquiler</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Cant. Cajas</TableHead>
                <TableHead>Valoración</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                return (
                  <TableRow key={`${item.itemCode}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{cajas}</TableCell>
                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                    <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
         <div className="flex justify-end font-bold text-lg p-4">
            Valoración Total: {formatCurrency(totalValue)}
        </div>
      </DialogContent>
    )
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />;
  }

  return (
    <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                </DialogTrigger>
                {renderSummaryModal()}
            </Dialog>
            <BriefingSummaryDialog osId={osId} />
        </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Alquiler`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Alquiler
          </Link>
        </Button>
      </div>
      
       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                const items = itemsByStatus[status];
                const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return (
                <StatusCard 
                    key={status}
                    title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                    items={items.length}
                    totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                    totalValue={totalValue}
                    onClick={() => setActiveModal(status)}
                />
            )})}
        </div>
      
        <Card className="mb-6">
            <div className="flex items-center justify-between p-4">
                <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
            </div>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead>Solicita</TableHead>
                                <TableHead>Fecha Entrega</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead>Valoración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                <TableRow key={item.itemCode + item.orderId}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.solicita}</TableCell>
                                    <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
            </CardHeader>
             <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Hoja Picking</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Contenido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                <TableRow key={order.sheetId}>
                                    <TableCell>
                                        <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                            <Badge variant="secondary">{order.sheetId}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

       {activeModal && renderStatusModal(activeModal)}
    </Dialog>
  );
}
    
