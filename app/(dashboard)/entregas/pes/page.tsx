

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Package, ClipboardList, Search, Filter, Eye, EyeOff, Plus, Truck, Clock, User } from 'lucide-react';
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
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven state
  const searchTerm = searchParams.get('q') || '';
  const selectedMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');
  const showPastEvents = searchParams.get('past') === 'true';
  const statusFilter = searchParams.get('status') || 'all';

  const updateFilters = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '' || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allHitos = useMemo(() => {
    const flattened: any[] = [];
    (entregasData || []).forEach((entrega: any) => {
      const hitos = entrega.hitos || [];
      if (hitos.length === 0) return;
      
      hitos.forEach((hito: any, index: number) => {
        const hitoIndex = (index + 1).toString().padStart(2, '0');
        flattened.push({
          ...entrega,
          ...hito,
          id: `${entrega.id}-${hito.id || index}`, // ID único para la fila
          serviceNumber: `${entrega.numero_expediente}.${hitoIndex}`,
          parentExpediente: entrega.numero_expediente,
          // Usar la fecha y hora del hito para visualización y filtros
          fecha_inicio: hito.fecha,
          deliveryTime: hito.hora,
          briefing_items: hito.items || [] // Para el tooltip
        });
      });
    });
    return flattened;
  }, [entregasData]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allHitos.forEach(os => {
      try {
        const date = os.fecha_inicio;
        if (!date) return;
        const month = format(new Date(date), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid date for hito ${os.serviceNumber}: ${os.fecha_inicio}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [allHitos]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const filtered = allHitos.filter(os => {
      const serviceNumber = os.serviceNumber || '';
      const client = os.nombre_evento || os.client || (os.cliente_id ? `Cliente ID ${os.cliente_id}` : '');
      const searchMatch = searchTerm.trim() === '' || 
                         serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const date = os.fecha_inicio;
          const osMonth = date ? format(new Date(date), 'yyyy-MM') : '';
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
          try {
              const date = os.fecha_inicio;
              pastEventMatch = date ? !isBefore(new Date(date), today) : true;
          } catch (e) {
              pastEventMatch = true;
          }
      }

      const status = (os.estado || os.status || '').toUpperCase();
      const displayStatus = status === 'EJECUTADO' ? 'ENTREGADO' : status;
      const statusMatch = statusFilter === 'all' || displayStatus === statusFilter.toUpperCase();

      return searchMatch && monthMatch && pastEventMatch && statusMatch;
    });

    return filtered.sort((a, b) => {
        const dateA = a.fecha_inicio || '';
        const dateB = b.fecha_inicio || '';
        return dateA.localeCompare(dateB);
    });

  }, [allHitos, searchTerm, selectedMonth, showPastEvents, statusFilter]);
  
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'BORRADOR': 'secondary',
    'Borrador': 'secondary',
    'PENDIENTE': 'outline',
    'Pendiente': 'outline',
    'CONFIRMADO': 'default',
    'Confirmado': 'default',
    'ANULADO': 'destructive',
    'Anulado': 'destructive',
    'CANCELADO': 'destructive',
    'EJECUTADO': 'default',
    'ENVIADO': 'default',
    'ENTREGADO': 'default'
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
                          onChange={(e) => updateFilters({ q: e.target.value })}
                          className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                      />
                  </div>
              </div>

              <div className="flex items-center gap-3">

                  <Select value={selectedMonth} onValueChange={(val) => updateFilters({ month: val })}>
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
                      onClick={() => updateFilters({ past: !showPastEvents })}
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
            {['all', 'BORRADOR', 'CONFIRMADO', 'ENTREGADO', 'CANCELADO'].map((status) => (
                <Button 
                    key={status}
                    size="sm" 
                    variant="ghost"
                    onClick={() => updateFilters({ status: status })}
                    className={cn(
                        "h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        statusFilter === status 
                            ? "bg-amber-600 text-white shadow-sm" 
                            : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700"
                    )}
                >
                    {status === 'all' ? 'Todos' : status.charAt(0) + status.slice(1).toLowerCase()}
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
                      const serviceNumber = os.serviceNumber;
                      const client = os.nombre_evento || os.client || (os.cliente_id ? `Cliente ID ${os.cliente_id}` : 'Sin cliente');
                      const startDate = os.fecha_inicio;
                      const status = (os.estado || os.status || '').toUpperCase();
                      const displayStatus = status === 'EJECUTADO' ? 'ENTREGADO' : status;
                      const deliveryTime = os.deliveryTime || '';

                      return (
                        <TableRow key={os.id} onClick={() => router.push(`/entregas/pedido/${os.parentExpediente || serviceNumber}`)} className="cursor-pointer group">
                            <TableCell className="font-medium">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="hover:underline decoration-primary/30 underline-offset-4">
                                                {serviceNumber}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-4 w-80 bg-popover/95 backdrop-blur-md border-border/50 shadow-2xl rounded-2xl">
                                            <div className="space-y-4">
                                                {/* Header */}
                                                <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{serviceNumber}</span>
                                                        <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[150px]">{os.nombre_evento}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold h-5 px-2 border-primary/20 bg-primary/5">{displayStatus}</Badge>
                                                </div>

                                                {/* Delivery Info */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <div className="p-1 rounded bg-amber-500/10 mt-0.5">
                                                            <Truck className="h-3 w-3 text-amber-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-bold uppercase leading-tight">{os.lugarEntrega || 'Sin dirección'}</p>
                                                            <p className="text-[9px] text-muted-foreground">{os.localizacion || 'Sin localización específica'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 ml-7">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-[9px] font-medium">{os.hora}</span>
                                                        </div>
                                                        {os.contacto && (
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-[9px] font-medium truncate max-w-[100px]">{os.contacto}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Items List */}
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                                        <Package className="h-3 w-3" />
                                                        Contenido del Pedido
                                                    </p>
                                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                                        {os.briefing_items && os.briefing_items.length > 0 ? (
                                                            os.briefing_items.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/20">
                                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded min-w-[20px] text-center">
                                                                        {item.quantity}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[10px] font-bold leading-tight truncate">{item.nombre}</p>
                                                                        <p className="text-[8px] text-muted-foreground uppercase tracking-tighter">Ref: {item.referencia || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-[10px] text-muted-foreground italic py-1">No hay artículos en este pedido</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Observations */}
                                                {os.observaciones && (
                                                    <div className="pt-2 border-t border-border/40">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Observaciones</p>
                                                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                                            "{os.observaciones}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell>{client}</TableCell>
                            <TableCell>{startDate ? format(new Date(startDate), 'dd/MM/yyyy') : ''} {deliveryTime}</TableCell>
                            <TableCell>
                            <Badge variant={statusVariant[status] || 'default'}>
                                {displayStatus}
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
