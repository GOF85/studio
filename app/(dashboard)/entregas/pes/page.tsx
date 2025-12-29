

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Package, ClipboardList, Search, Filter, Eye, EyeOff, Plus } from 'lucide-react';
import type { Entrega } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useEntregas } from '@/hooks/use-data-queries';

export default function PrevisionEntregasPage() {
  const { data: entregasData, isLoading } = useEntregas();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const entregas = useMemo(() => {
    return (entregasData || []) as any[];
  }, [entregasData]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entregas.forEach(os => {
      try {
        const date = os.fecha_inicio || os.startDate;
        if (!date) return;
        const month = format(new Date(date), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.numero_expediente || os.serviceNumber}: ${os.fecha_inicio || os.startDate}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [entregas]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const filtered = entregas.filter(os => {
      const serviceNumber = os.numero_expediente || os.serviceNumber || '';
      const client = os.cliente_id ? `Cliente ID ${os.cliente_id}` : (os.client || '');
      const searchMatch = searchTerm.trim() === '' || serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const date = os.fecha_inicio || os.startDate;
          const osMonth = date ? format(new Date(date), 'yyyy-MM') : '';
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              const date = os.fecha_fin || os.endDate;
              pastEventMatch = date ? !isBefore(new Date(date), today) : true;
          } catch (e) {
              pastEventMatch = true;
          }
      }

      const status = os.estado || os.status;
      const statusMatch = statusFilter === 'all' || status === statusFilter;

      return searchMatch && monthMatch && pastEventMatch && statusMatch;
    });

    return filtered.sort((a, b) => {
        const dateA = a.fecha_inicio || a.startDate;
        const dateB = b.fecha_inicio || b.startDate;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  }, [entregas, searchTerm, selectedMonth, showPastEvents, statusFilter]);
  
  const statusVariant: { [key in Entrega['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    Borrador: 'secondary',
    Pendiente: 'outline',
    Confirmado: 'default',
    Anulado: 'destructive'
  };

  if (!isMounted || isLoading) {
    return <LoadingSkeleton title="Cargando Previsión de Entregas..." />;
  }

  return (
    <main className="min-h-screen bg-background/30 pb-20">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
              <div className="flex items-center">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <ClipboardList className="h-5 w-5 text-amber-500" />
                  </div>
              </div>

              <div className="flex-1 hidden md:block">
                  <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                      <Input
                          placeholder="Buscar pedido o cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                      />
                  </div>
              </div>

              <div className="flex items-center gap-3">

                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-8 w-[180px] text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50">
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/80">
                        <SelectItem value="all" className="text-[10px] font-bold uppercase">Todos los meses</SelectItem>
                        {availableMonths.map(month => (
                            <SelectItem key={month} value={month} className="text-[10px] font-bold uppercase">
                            {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                            </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPastEvents(!showPastEvents)}
                      className={cn(
                          "h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50",
                          showPastEvents ? "border-amber-500/50 bg-amber-500/5 text-amber-700" : "text-muted-foreground"
                      )}
                  >
                      {showPastEvents ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
                      {showPastEvents ? "Finalizados" : "Ver finalizados"}
                  </Button>

                  <div className="h-4 w-[1px] bg-border/40 mx-1" />

                  <Button size="sm" asChild className="h-8 rounded-lg font-black px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                      <Link href="/entregas/pedido/nuevo">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Nuevo Pedido
                      </Link>
                  </Button>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-2">Filtrar Estado:</span>
            {['all', 'Borrador', 'Confirmado', 'Enviado', 'Entregado'].map((status) => (
                <Button 
                    key={status}
                    size="sm" 
                    variant="ghost"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                        "h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        statusFilter === status 
                            ? "bg-amber-600 text-white shadow-sm" 
                            : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700"
                    )}
                >
                    {status === 'all' ? 'Todos' : status}
                </Button>
            ))}
        </div>

        <div className="bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden">
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
                  filteredAndSortedOrders.map(os => {
                      const serviceNumber = os.numero_expediente || os.serviceNumber;
                      const client = os.cliente_id ? `Cliente ID ${os.cliente_id}` : os.client;
                      const startDate = os.fecha_inicio || os.startDate;
                      const status = os.estado || os.status;
                      const deliveryTime = os.deliveryTime || '';

                      return (
                        <TableRow key={os.id} onClick={() => router.push(`/entregas/pedido/${os.id}`)} className="cursor-pointer group">
                            <TableCell className="font-medium">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="hover:underline decoration-primary/30 underline-offset-4">
                                                {serviceNumber}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-3 max-w-xs bg-popover/95 backdrop-blur-md border-border/50 shadow-xl rounded-xl">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{serviceNumber}</span>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold h-4">{status}</Badge>
                                                </div>
                                                
                                                {os.briefing_items && os.briefing_items.length > 0 ? (
                                                    <div className="space-y-2 pt-1">
                                                        {os.briefing_items.map((item: any, idx: number) => (
                                                            <div key={idx} className="text-[10px] border-l-2 border-primary/20 pl-2 py-0.5">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <span className="font-bold text-foreground/90 uppercase leading-tight">
                                                                        {item.servicio || item.descripcion || 'Servicio'}
                                                                    </span>
                                                                    <span className="text-[9px] font-medium text-muted-foreground shrink-0">
                                                                        {item.horaInicio || '??:??'}
                                                                    </span>
                                                                </div>
                                                                {(item.comentario || item.comentarios) && (
                                                                    <p className="text-[9px] text-muted-foreground italic mt-0.5 line-clamp-2">
                                                                        "{item.comentario || item.comentarios}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-muted-foreground italic py-1">Sin detalles de servicios</p>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell>{client}</TableCell>
                            <TableCell>{startDate ? format(new Date(startDate), 'dd/MM/yyyy') : ''} {deliveryTime}</TableCell>
                            <TableCell>
                            <Badge variant={statusVariant[status as keyof typeof statusVariant] || 'default'}>
                                {status}
                            </Badge>
                            </TableCell>
                        </TableRow>
                      );
                  })
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
      </div>
    </main>
  );
}
