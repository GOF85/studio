'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Package } from 'lucide-react';
import type { Entrega, PickingEntregaState, PedidoEntrega, ProductoVenta } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Progress } from '@/components/ui/progress';

export default function PickingEntregasPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [pickingStates, setPickingStates] = useState<Record<string, PickingEntregaState>>({});
  const [pedidos, setPedidos] = useState<Record<string, PedidoEntrega>>({});
  const [productosVentaMap, setProductosVentaMap] = useState<Map<string, ProductoVenta>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[])
      .filter(os => os.status === 'Confirmado');
    setEntregas(allEntregas);

    const allPickingStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}') as Record<string, PickingEntregaState>;
    setPickingStates(allPickingStates);
    
    const allPedidos = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[])
        .reduce((acc, p) => {
            acc[p.osId] = p;
            return acc;
        }, {} as Record<string, PedidoEntrega>);
    setPedidos(allPedidos);
    
    const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
    setProductosVentaMap(new Map(allProductosVenta.map(p => [p.id, p])));

    setIsMounted(true);
  }, []);

  const filteredEntregas = useMemo(() => {
    return entregas.filter(entrega => 
      entrega.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entregas, searchTerm]);

  const getPickingProgress = (osId: string) => {
    const state = pickingStates[osId];
    const pedido = pedidos[osId];
    if (!pedido || !pedido.items) return { checked: 0, total: 0, percentage: 0 };
    
    const allItemsToPick = new Set<string>();
    pedido.items.forEach(item => {
        const producto = productosVentaMap.get(item.id);
        if(producto) {
            if (producto.producidoPorPartner) {
                allItemsToPick.add(`partner_${producto.id}`);
            } else if(producto.recetaId) {
                allItemsToPick.add(`cpr_${producto.recetaId}`);
            } else {
                 producto.componentes.forEach(comp => allItemsToPick.add(comp.erpId));
            }
        }
    });

    const totalItems = allItemsToPick.size;
    if (totalItems === 0) return { checked: 0, total: 0, percentage: 0 };

    const checkedItems = state?.checkedItems.size || 0;
    
    return {
      checked: checkedItems,
      total: totalItems,
      percentage: (checkedItems / totalItems) * 100
    };
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Picking y Logística..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ListChecks />Picking y Logística</h1>
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
              placeholder="Buscar por Nº Pedido o Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
          />
      </div>

       <div className="border rounded-lg">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Estado del Picking</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {filteredEntregas.length > 0 ? (
                  filteredEntregas.map(os => {
                    const progress = getPickingProgress(os.id);
                    return (
                        <TableRow key={os.id} onClick={() => router.push(`/entregas/picking/${os.id}`)} className="cursor-pointer">
                            <TableCell className="font-medium">{os.serviceNumber}</TableCell>
                            <TableCell>{os.client}</TableCell>
                            <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')} {os.deliveryTime || ''}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={progress.percentage} className="w-40" />
                                    <span className="text-sm text-muted-foreground">{progress.checked} / {progress.total}</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                  })
              ) : (
                  <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                      No hay pedidos confirmados para preparar.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
    </main>
  );
}
