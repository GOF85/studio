
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem } from '@/types';
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
import { format } from 'date-fns';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
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
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function BioPage() {
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; items: ItemWithOrderInfo[] } | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

   const { allItemsByStatus, allItems, blockedItems, pendingItems } = useMemo(() => {
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === 'Bio');
    setMaterialOrders(relatedOrders);

    const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
    const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);

    const items: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
    const processedItemKeys = new Set<string>();

    relatedPickingSheets.forEach(sheet => {
        const targetStatus = statusMap[sheet.status];
        sheet.items.forEach(item => {
             if (item.type === 'Bio') {
                const uniqueKey = `${item.orderId}-${item.itemCode}`;
                items[targetStatus].push({
                    ...item,
                    orderId: sheet.id,
                    orderContract: sheet.id,
                    orderStatus: sheet.status,
                    solicita: sheet.solicitante,
                });
                processedItemKeys.add(uniqueKey);
            }
        });
    });

    relatedOrders.forEach(order => {
        order.items.forEach(item => {
            const uniqueKey = `${order.id}-${item.itemCode}`;
            if (!processedItemKeys.has(uniqueKey)) {
                items['Asignado'].push({
                    ...item,
                    orderId: order.id,
                    orderContract: order.contractNumber || 'N/A',
                    orderStatus: 'Pendiente', 
                    solicita: order.solicita,
                    tipo: item.tipo,
                });
            }
        });
    });
    
    const all = relatedOrders.flatMap(order => order.items.map(item => ({...item, orderId: order.id, contractNumber: order.contractNumber, solicita: order.solicita, tipo: item.tipo } as ItemWithOrderInfo)));
    const blocked = [...items['En Preparación'], ...items['Listo']].sort((a,b) => (a.solicita || '').localeCompare(b.solicita || ''));

    return { allItemsByStatus: items, allItems: all, blockedItems: blocked, pendingItems: items.Asignado };
  }, [osId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    window.dispatchEvent(new Event('storage'));
    toast({ title: 'Guardado', description: 'Todos los cambios en los pedidos han sido guardados.' });
    setIsLoading(false);
  }

  const handleItemChange = (orderId: string, itemCode: string, field: 'quantity' | 'solicita', value: any) => {
    setMaterialOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
            if (field === 'solicita') {
                 return { ...order, solicita: value };
            }
          const updatedItems = order.items
            .map(item => item.itemCode === itemCode ? { ...item, [field]: value } : item)
            .filter(item => item.quantity > 0);
          const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          return { ...order, items: updatedItems, total: updatedTotal };
        }
        return order;
      });
    });
  };

  const handleDeleteItem = (orderId: string, itemCode: string) => {
    handleItemChange(orderId, itemCode, 'quantity', 0);
  }

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const updatedOrders = allMaterialOrders.filter((o: MaterialOrder) => o.id !== orderToDelete);
    localStorage.setItem('materialOrders', JSON.stringify(updatedOrders));
    setMaterialOrders(updatedOrders.filter((o: MaterialOrder) => o.osId === osId && o.type === 'Bio'));
    window.dispatchEvent(new Event('storage'));
    toast({ title: 'Pedido de material eliminado' });
    setOrderToDelete(null);
  };
  
  const renderColumn = (title: string, items: ItemWithOrderInfo[]) => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Card className="flex-1 bg-muted/30 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setModalContent({ title, items })}>
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                    {title}
                    <Badge variant={title === 'Listo' ? 'default' : 'secondary'} className="text-sm">{totalItems}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{totalQuantity}</p>
                <p className="text-xs text-muted-foreground">unidades totales</p>
            </CardContent>
        </Card>
    );
};

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Bio..." />;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Resumen de Artículos de Bio</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Artículos Pendientes de Picking</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(pendingItems.reduce((acc, item) => {
                                        acc[item.description] = (acc[item.description] || 0) + item.quantity;
                                        return acc;
                                    }, {} as Record<string, number>)).map(([desc, qty]) => (
                                        <TableRow key={desc}><TableCell>{desc}</TableCell><TableCell className="text-right">{qty}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Artículos en Proceso / Listos</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(blockedItems.reduce((acc, item) => {
                                        acc[item.description] = (acc[item.description] || 0) + item.quantity;
                                        return acc;
                                    }, {} as Record<string, number>)).map(([desc, qty]) => (
                                        <TableRow key={desc}><TableCell>{desc}</TableCell><TableCell className="text-right">{qty}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <BriefingSummaryDialog osId={osId} />
        </div>
        <Button asChild>
          <Link href={`/pedidos?osId=${osId}&type=Bio`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Bio
          </Link>
        </Button>
      </div>
      
       <div className="grid md:grid-cols-3 gap-6 mb-8">
            {renderColumn('Asignado', allItemsByStatus['Asignado'])}
            {renderColumn('En Preparación', allItemsByStatus['En Preparación'])}
            {renderColumn('Listo', allItemsByStatus['Listo'])}
       </div>

        <Card>
            <div className="flex items-center justify-between p-4">
                <CardTitle className="text-lg">Gestión de Pedidos</CardTitle>
                <Button onClick={handleSaveAll} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">Guardar Cambios</span>
                </Button>
            </div>
            <CardContent>
                <Collapsible defaultOpen={false}>
                    <div className="flex items-center gap-2 font-semibold text-destructive border p-2 rounded-md hover:bg-muted/50 mb-4">
                        <CollapsibleTrigger asChild>
                           <div className="flex-1 flex items-center cursor-pointer">
                             <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                             Bloqueado (En Preparación / Listo)
                           </div>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                         <div className="border rounded-lg mb-6">
                             <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Contrato</TableHead><TableHead>Artículo</TableHead><TableHead>Cantidad</TableHead><TableHead>Solicita</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blockedItems.map((item, index) => (
                                        <TableRow key={index} className="bg-muted/20">
                                            <TableCell><Badge variant="secondary">{item.orderContract}</Badge></TableCell>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.solicita}</TableCell>
                                        </TableRow>
                                    ))}
                                    {blockedItems.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No hay artículos bloqueados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                             </Table>
                         </div>
                    </CollapsibleContent>
                </Collapsible>
                
                <h3 className="font-semibold text-lg my-2 text-green-700">Pendiente (Asignado)</h3>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead>Solicita</TableHead>
                                <TableHead>Contrato</TableHead>
                                <TableHead className="w-32">Cantidad</TableHead>
                                <TableHead className="text-right w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                <TableRow key={item.itemCode + item.orderId}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                        <Select value={item.solicita} onValueChange={(value: 'Sala' | 'Cocina') => handleItemChange(item.orderId, item.itemCode, 'solicita', value)}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Sala">Sala</SelectItem>
                                                <SelectItem value="Cocina">Cocina</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                     <TableCell><Badge variant="outline">{materialOrders.find(o=>o.id === item.orderId)?.contractNumber}</Badge></TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.orderId, item.itemCode, 'quantity', parseInt(e.target.value) || 0)} className="h-8"/>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteItem(item.orderId, item.itemCode)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <Dialog open={!!modalContent} onOpenChange={() => setModalContent(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Detalle de: {modalContent?.title}</DialogTitle></DialogHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Artículo</TableHead>
                            <TableHead>Solicita</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modalContent?.items.map((item, index) => (
                             <TableRow key={`${item.itemCode}-${index}`}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>
                                     {item.solicita && <Badge variant={item.solicita === 'Sala' ? 'default' : 'outline'} className={item.solicita === 'Sala' ? 'bg-blue-600' : 'bg-orange-500'}>
                                        {item.solicita === 'Sala' ? <Users size={10} className="mr-1"/> : <Soup size={10} className="mr-1"/>}
                                        {item.solicita}
                                    </Badge>}
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>

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
