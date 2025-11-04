

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, CategoriaPersonal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { FeedbackDialog } from '@/components/portal/feedback-dialog';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ValidacionHorasPage() {
    const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const router = useRouter();
    const { toast } = useToast();

    const loadData = useCallback(() => {
        const storedData = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[])
            .filter(s => s.estado === 'Confirmado' || s.estado === 'Asignada');
        setSolicitudes(storedData);
    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);
    
    const filteredSolicitudes = useMemo(() => {
        return solicitudes.filter(s => {
            const searchMatch = searchTerm === '' ||
                s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.personalAsignado?.[0]?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

            const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);

            return searchMatch && dateMatch;
        }).sort((a,b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime());
    }, [solicitudes, searchTerm, dateFilter]);
    
    const handleSaveHours = (solicitudId: string, asignacionId: string, field: 'horaEntradaReal' | 'horaSalidaReal', value: string) => {
        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudId);
        if (reqIndex === -1) return;
        
        if (!allRequests[reqIndex].personalAsignado) return;
        const asigIndex = allRequests[reqIndex].personalAsignado!.findIndex(a => a.idPersonal === asignacionId);
        if (asigIndex === -1) return;

        allRequests[reqIndex].personalAsignado![asigIndex][field] = value;
        
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        setSolicitudes(allRequests.filter(s => s.estado === 'Asignada' || s.estado === 'Confirmado'));
    };
    
    const handleSaveFeedback = (solicitudId: string, asignacionId: string, feedback: { rating: number; comment: string }) => {
        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudId);
        if (reqIndex === -1 || !allRequests[reqIndex].personalAsignado) return;

        const asigIndex = allRequests[reqIndex].personalAsignado!.findIndex(a => a.idPersonal === asignacionId);
        if (asigIndex === -1) return;

        allRequests[reqIndex].personalAsignado![asigIndex].rating = feedback.rating;
        allRequests[reqIndex].personalAsignado![asigIndex].comentariosMice = feedback.comment;
        
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        setSolicitudes(allRequests.filter(s => s.estado === 'Asignada' || s.estado === 'Confirmado'));
        toast({ title: 'Valoración guardada.' });
    };

    const handleCloseTurno = (solicitudId: string) => {
        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudId);
        if (reqIndex === -1) return;
        
        const asignacion = allRequests[reqIndex].personalAsignado?.[0];
        if (!asignacion || !asignacion.horaEntradaReal || !asignacion.horaSalidaReal) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes introducir la hora de entrada y salida real para cerrar el turno.' });
            return;
        }

        allRequests[reqIndex].estado = 'Cerrado';
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        loadData(); // Reload data to remove from the list
        toast({ title: 'Turno Cerrado', description: `El turno de ${asignacion.nombre} ha sido validado y cerrado.` });
    };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Validación de Horas..." />;
    }

    return (
        <div>
            <div className="flex gap-4 mb-4">
                <Input placeholder="Buscar por trabajador, categoría, motivo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm"/>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : <span>Filtrar por fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                    </PopoverContent>
                </Popover>
                <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); }}>Limpiar</Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Trabajador</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>H. Planificadas</TableHead>
                                <TableHead className="w-24">H. Entrada Real</TableHead>
                                <TableHead className="w-24">H. Salida Real</TableHead>
                                <TableHead>Horas Reales</TableHead>
                                <TableHead>Coste Real</TableHead>
                                <TableHead className="text-center">Valoración</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSolicitudes.length > 0 ? filteredSolicitudes.map(s => {
                                const asignacion = s.personalAsignado?.[0];
                                if (!asignacion) return null;
                                
                                const horasPlanificadas = calculateHours(s.horaInicio, s.horaFin);
                                const horasReales = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
                                const costePlanificado = s.costeImputado || 0;
                                const costeReal = horasReales > 0 ? (costePlanificado / horasPlanificadas) * horasReales : 0;
                                
                                return (
                                    <TableRow key={s.id}>
                                        <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="font-semibold">{asignacion.nombre}</TableCell>
                                        <TableCell>{s.categoria}</TableCell>
                                        <TableCell>{s.horaInicio} - {s.horaFin} ({formatNumber(horasPlanificadas, 2)}h)</TableCell>
                                        <TableCell>
                                            <Input type="time" defaultValue={asignacion.horaEntradaReal} onBlur={(e) => handleSaveHours(s.id, asignacion.idPersonal, 'horaEntradaReal', e.target.value)} className="h-8" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="time" defaultValue={asignacion.horaSalidaReal} onBlur={(e) => handleSaveHours(s.id, asignacion.idPersonal, 'horaSalidaReal', e.target.value)} className="h-8" />
                                        </TableCell>
                                        <TableCell className="font-mono font-semibold">{formatNumber(horasReales, 2)}h</TableCell>
                                        <TableCell className="font-mono">{formatCurrency(costeReal)}</TableCell>
                                        <TableCell className="text-center">
                                            <FeedbackDialog 
                                                workerName={asignacion.nombre}
                                                initialRating={asignacion.rating}
                                                initialComment={asignacion.comentariosMice}
                                                onSave={(feedback) => handleSaveFeedback(s.id, asignacion.idPersonal, feedback)}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className={cn("h-4 w-4", (asignacion.rating || asignacion.comentariosMice) && 'text-primary')}/>
                                                    </Button>
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleCloseTurno(s.id)} disabled={!asignacion.horaEntradaReal || !asignacion.horaSalidaReal}>
                                                <CheckCircle className="mr-2"/>Cerrar Turno
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-48 text-center">No hay turnos pendientes de validación para los filtros seleccionados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
