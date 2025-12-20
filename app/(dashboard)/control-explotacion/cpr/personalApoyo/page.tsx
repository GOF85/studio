
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type DetallePersonalApoyo = SolicitudPersonalCPR & {
    costePlanificado: number;
    costeReal: number;
    horasPlanificadas: number;
    horasReales: number;
    proveedorNombre: string;
};

function CommentModal({ comment, trigger }: { comment: string, trigger: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                 {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Motivo de la Solicitud</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{comment}</p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function DetallePersonalApoyoCprPageInner() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalles, setDetalles] = useState<DetallePersonalApoyo[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const searchParams = useSearchParams() ?? new URLSearchParams();
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

    const { calendarDays, eventsByDay } = useMemo(() => {
        if (!from || !to) return { calendarDays: [], eventsByDay: {} };

        const rangeStart = new Date(from);
        const rangeEnd = new Date(to);

        const monthStart = startOfMonth(rangeStart);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(endOfMonth(rangeEnd), { weekStartsOn: 1 });
        
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        const grouped: Record<string, { totalCoste: number, details: { osNumber: string, trabajador: string, categoria: string }[] }> = {};
        filteredDetails.forEach(coste => {
            const dayKey = format(new Date(coste.fechaServicio), 'yyyy-MM-dd');
            if (!grouped[dayKey]) {
                grouped[dayKey] = { totalCoste: 0, details: [] };
            }
            grouped[dayKey].totalCoste += coste.costeReal;
            grouped[dayKey].details.push({ osNumber: 'CPR', trabajador: coste.personalAsignado?.[0]?.nombre || 'Sin asignar', categoria: coste.categoria });
        });

        return { calendarDays: days, eventsByDay: grouped };
    }, [from, to, filteredDetails]);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de personal..." />;
    }

    return (
      <main>
          <div className="text-sm text-muted-foreground mb-6">
              Mostrando datos para el periodo: <strong>{dateRangeDisplay}</strong>
          </div>
          
           <Tabs defaultValue="costes">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="costes">Costes</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="costes">
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
                                                <CommentModal comment={detalle.motivo} trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><MessageSquare className="h-4 w-4"/></Button>} />
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={10} className="text-center h-24">No se encontraron datos para este periodo.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="calendario">
                    <TooltipProvider>
                        <Card>
                             <CardContent className="pt-6">
                                <div className="border rounded-lg">
                                    <div className="grid grid-cols-7 border-b">
                                        {WEEKDAYS.map(day => (
                                        <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">
                                            {day}
                                        </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 auto-rows-fr">
                                        {calendarDays.map((day) => {
                                        const dayKey = format(day, 'yyyy-MM-dd');
                                        const dayEvent = eventsByDay[dayKey];
                                        const isCurrentMonth = isWithinInterval(day, { start: new Date(from!), end: new Date(to!) });

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={cn('h-28 border-r border-b p-2 flex flex-col', !isCurrentMonth && 'bg-muted/30 text-muted-foreground', 'last:border-r-0')}>
                                                <span className='font-semibold text-xs'>{format(day, 'd')}</span>
                                                {dayEvent && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="mt-1 flex-grow flex items-center justify-center bg-blue-100/50 rounded-md p-1 cursor-default">
                                                                <p className="text-sm font-bold text-blue-700 text-center">{formatCurrency(dayEvent.totalCoste)}</p>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="p-1 max-w-xs text-xs space-y-1">
                                                                {dayEvent.details.map((d, i) => (
                                                                    <p key={i}><strong>{d.trabajador}:</strong> {d.categoria}</p>
                                                                ))}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                </div>
                             </CardContent>
                        </Card>
                    </TooltipProvider>
                </TabsContent>
            </Tabs>
      </main>
    );
}

export default function DetallePersonalApoyoCprPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <DetallePersonalApoyoCprPageInner />
        </Suspense>
    );
}
