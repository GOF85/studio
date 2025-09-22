'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Package, Search } from 'lucide-react';
import type { ServiceOrder, GastronomyOrder } from '@/types';
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

export default function PickingPage() {
  const [serviceOrdersWithGastro, setServiceOrdersWithGastro] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];

    const osIdsWithGastro = new Set(allGastroOrders.map(o => o.osId));
    
    const filteredOS = allServiceOrders
      .filter(os => osIdsWithGastro.has(os.id))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
    setServiceOrdersWithGastro(filteredOS);
    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return serviceOrdersWithGastro.filter(os =>
      os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (os.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [serviceOrdersWithGastro, searchTerm]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Picking y Logística..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Package />
            Picking y Logística
            </h1>
            <p className="text-muted-foreground mt-1">Selecciona una Orden de Servicio para preparar el picking.</p>
        </div>
      </div>

       <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nº Servicio, cliente..."
            className="pl-8 sm:w-1/2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Servicio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Evento</TableHead>
              <TableHead>Estado Picking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(os => (
                <TableRow
                  key={os.id}
                  onClick={() => router.push(`/cpr/picking/${os.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{os.serviceNumber}</TableCell>
                  <TableCell>{os.client}{os.finalClient && ` (${os.finalClient})`}</TableCell>
                  <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    {/* Placeholder for picking status */}
                    <Badge variant="secondary">Pendiente</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay Órdenes de Servicio con pedidos de gastronomía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
