
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SolicitudPersonalCPR, CategoriaPersonal, Proveedor } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, calculateHours } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

type DetallePersonalApoyo = SolicitudPersonalCPR & {
    costePlanificado: number;
    costeReal: number;
    horasPlanificadas: number;
    horasReales: number;
    proveedorNombre: string;
};

export default function DetallePersonalApoyoCprPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalles, setDetalles] = useState<DetallePersonalApoyo[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    useEffect(() => {
        if (!from || !to) {
            setIsMounted(true);
            return;
        }

        const rangeStart = new Date(from);
        const rangeEnd = new Date(to);

        const allSolicitudes = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[])
            .filter(s => {
                try {
                    const fechaServicio = new Date(s.fechaServicio);
                    return isWithinInterval(fechaServicio, { start: rangeStart, end: rangeEnd });
                } catch (e) { return false; }
            });

        const tiposPersonalMap = new Map((JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]).map(t => [t.id, t]));
        const proveedoresMap = new Map((JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[]).map(p => [p.id, p]));

        const detallesCalculados: DetallePersonalApoyo[] = allSolicitudes.map(s => {
            const tipo = tiposPersonalMap.get(s.proveedorId || '');
            const proveedor = tipo ? proveedoresMap.get(tipo.proveedorId) : null;
            const precioHora = tipo?.precioHora || 0;
            const horasPlanificadas = calculateHours(s.horaInicio, s.horaFin);
            
            let horasReales = horasPlanificadas;
            if (s.personalAsignado && s.personalAsignado.length > 0) {
                const hReal = calculateHours(s.personalAsignado[0].horaEntradaReal, s.personalAsignado[0].horaSalidaReal);
                if (hReal > 0) horasReales = hReal;
            }

            return {
                ...s,
                horasPlanificadas,
                horasReales,
                costePlanificado: horasPlanificadas * precioHora,
                costeReal: horasReales * precioHora,
                proveedorNombre: proveedor?.nombreComercial || 'MICE Interno',
            };
        });

        setDetalles(detallesCalculados.sort((a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime()));
        setIsMounted(true);
    }, [from, to]);
    
    const dateRangeDisplay = useMemo(() => {
        if (!from || !to) return "Rango de fechas no especificado";
        try {
            return `${format(new Date(from), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(to), 'dd/MM/yyyy', { locale: es })}`;
        } catch (e) {
            return "Fechas inválidas";
        }
    }, [from, to]);

    const uniqueCategories = useMemo(() => Array.from(new Set(detalles.map(d => d.categoria))), [detalles]);

    const filteredDetails = useMemo(() => {
        return detalles.filter(d => {
            const searchMatch = d.solicitadoPor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                d.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (d.personalAsignado?.[0]?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
            const categoryMatch = categoryFilter === 'all' || d.categoria === categoryFilter;
            return searchMatch && categoryMatch;
        });
    }, [detalles, searchTerm, categoryFilter]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de personal..." />;
    }

    return (
      <main>
          <div className="text-sm text-muted-foreground mb-6">
              Mostrando datos para el periodo: <strong>{dateRangeDisplay}</strong>
          </div>
          
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle>Detalle de Personal de Apoyo CPR</CardTitle>
                      <div className="flex gap-4">
                          <Input placeholder="Buscar por solicitante, motivo, trabajador..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                              <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por categoría"/></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Todas las categorías</SelectItem>
                                  {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <Button variant="secondary" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}>Limpiar</Button>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Trabajador</TableHead>
                              <TableHead>Proveedor</TableHead>
                              <TableHead>Categoría</TableHead>
                              <TableHead>Partida</TableHead>
                              <TableHead>Horas Plan.</TableHead>
                              <TableHead>Horas Reales</TableHead>
                              <TableHead className="text-right">Coste Plan.</TableHead>
                              <TableHead className="text-right">Coste Real</TableHead>
                              <TableHead className="text-center">Motivo</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredDetails.length > 0 ? filteredDetails.map((detalle) => (
                              <TableRow key={detalle.id}>
                                  <TableCell>{format(new Date(detalle.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell>{detalle.personalAsignado?.[0]?.nombre || <Badge variant="destructive">Sin Asignar</Badge>}</TableCell>
                                  <TableCell><Badge variant="outline">{detalle.proveedorNombre}</Badge></TableCell>
                                  <TableCell className="font-semibold">{detalle.categoria}</TableCell>
                                  <TableCell><Badge variant="secondary">{detalle.partida}</Badge></TableCell>
                                  <TableCell className="text-center">{formatNumber(detalle.horasPlanificadas, 2)}h</TableCell>
                                  <TableCell className="text-center font-semibold">{formatNumber(detalle.horasReales, 2)}h</TableCell>
                                  <TableCell className="text-right">{formatCurrency(detalle.costePlanificado)}</TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(detalle.costeReal)}</TableCell>
                                  <TableCell className="text-center">
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MessageSquare className="h-4 w-4"/></Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                  <p className="max-w-xs">{detalle.motivo}</p>
                                              </TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  </TableCell>
                              </TableRow>
                          )) : (
                              <TableRow><TableCell colSpan={10} className="text-center h-24">No se encontraron datos para este periodo.</TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </main>
    );
}
