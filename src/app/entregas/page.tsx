'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Package, Calendar, Settings, Database, Percent, BookOpen } from 'lucide-react';
import type { ServiceOrder } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function EntregasDashboardPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedOrders = localStorage.getItem('serviceOrders');
    const allOrders: ServiceOrder[] = storedOrders ? JSON.parse(storedOrders) : [];
    setServiceOrders(allOrders.filter(o => o.vertical === 'Entregas'));
    setIsMounted(true);
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [serviceOrders]);

  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const filtered = serviceOrders.filter(os => {
      const searchMatch = searchTerm.trim() === '' || os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || os.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const osMonth = format(new Date(os.startDate), 'yyyy-MM');
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              pastEventMatch = !isBefore(new Date(os.endDate), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }

      return searchMatch && monthMatch && pastEventMatch;
    });

    return filtered.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents]);
  
  const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
    Borrador: 'secondary',
    Pendiente: 'destructive',
    Confirmado: 'default',
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Dashboard de Entregas..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Package />Dashboard de Entregas</h1>
        <Button asChild>
          <Link href="/os?vertical=Entregas">
            <PlusCircle className="mr-2" />
            Nuevo Pedido
          </Link>
        </Button>
      </div>

       <section className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader className="flex-row items-center justify-between">
                         <CardTitle>Previsión de Entregas</CardTitle>
                         <Button asChild variant="outline">
                             <Link href="/entregas/calendario"><Calendar className="mr-2"/>Ver Calendario</Link>
                         </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <Input
                                placeholder="Buscar por Nº Pedido o Cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Filtrar por mes" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="all">Todos los meses</SelectItem>
                                {availableMonths.map(month => (
                                    <SelectItem key={month} value={month}>
                                    {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                                <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                                <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Mostrar pasados
                                </label>
                            </div>
                        </div>

                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Pedido</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {filteredAndSortedOrders.length > 0 ? (
                                    filteredAndSortedOrders.map(os => (
                                    <TableRow key={os.id} onClick={() => router.push(`/os?id=${os.id}`)} className="cursor-pointer">
                                        <TableCell className="font-medium">{os.serviceNumber}</TableCell>
                                        <TableCell>{os.client}</TableCell>
                                        <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')} {os.deliveryTime || ''}</TableCell>
                                        <TableCell>
                                        <Badge variant={statusVariant[os.status]}>
                                            {os.status}
                                        </Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay pedidos de entrega que coincidan con los filtros.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
       </section>
        
        <section>
             <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4 text-center">Configuración de Entregas</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3"><Settings/>Configuración</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild variant="ghost" className="w-full justify-start">
                            <Link href="/packs-de-venta"><Package className="mr-2"/>Packs de Venta</Link>
                        </Button>
                         <Button asChild variant="ghost" className="w-full justify-start">
                            <Link href="/margenes-categoria"><Percent className="mr-2"/>Márgenes por Categoría</Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full justify-start">
                            <Link href="/precios"><Database className="mr-2"/>Productos de Catálogo</Link>
                        </Button>
                         <Button asChild variant="ghost" className="w-full justify-start">
                            <Link href="/docs/entregas-manual"><BookOpen className="mr-2"/>Manual de Entregas</Link>
                        </Button>
                    </CardContent>
                </Card>
             </div>
        </section>
    </main>
  );
}
