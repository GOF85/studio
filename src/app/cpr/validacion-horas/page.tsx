
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle, Pencil } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, PersonalExternoDB, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { FeedbackDialog } from '@/components/portal/feedback-dialog';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'default',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

export default function ValidacionHorasPage() {
    const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
    const [personalExternoDB, setPersonalExternoDB] = useState<Map<string, { nombre: string }>>(new Map());
    const [personalInternoDB, setPersonalInternoDB] = useState<Map<string, { nombre: string }>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [showClosed, setShowClosed] = useState(false);
    const [solicitudToClose, setSolicitudToClose] = useState<SolicitudPersonalCPR | null>(null);

    const router = useRouter();
    const { toast } = useToast();

    const loadData = useCallback(() => {
        const storedData = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[])
            .filter(s => s.estado === 'Confirmado' || s.estado === 'Asignada' || s.estado === 'Cerrado');
        setSolicitudes(storedData);

        const storedPersonalExterno = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
        setPersonalExternoDB(new Map(storedPersonalExterno.map(p => [p.id, { nombre: p.nombreCompleto }])));

        const storedPersonalInterno = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalInternoDB(new Map(storedPersonalInterno.map(p => [p.id, { nombre: `${p.nombre} ${p.apellidos}` }])));

    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);
    
    const filteredSolicitudes = useMemo(() => {
        return solicitudes.filter(s => {
            const isClosed = s.estado === 'Cerrado';
            if (!showClosed && isClosed) {
                return false;
            }

            const searchMatch = searchTerm === '' ||
                s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.personalAsignado?.[0]?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

            const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);

            return searchMatch && dateMatch;
        }).sort((a,b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime());
    }, [solicitudes, searchTerm, dateFilter, showClosed]);
    
    const handleSaveHours = (solicitudId: string, asignacionId: string, field: 'horaEntradaReal' | 'horaSalidaReal', value: string) => {
        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudId);
        if (reqIndex === -1) return;
        
        if (!allRequests[reqIndex].personalAsignado) return;
        const asigIndex = allRequests[reqIndex].personalAsignado!.findIndex(a => a.idPersonal === asignacionId);
        if (asigIndex === -1) return;

        allRequests[reqIndex].personalAsignado![asigIndex][field] = value;
        
        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        setSolicitudes(prev => prev.map(s => s.id === solicitudId ? allRequests[reqIndex] : s));
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
        setSolicitudes(prev => prev.map(s => s.id === solicitudId ? allRequests[reqIndex] : s));
        toast({ title: 'Valoración guardada.' });
    };

    const handleConfirmClose = (feedback: { rating: number; comment: string }) => {
        if (!solicitudToClose) return;

        const allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
        const reqIndex = allRequests.findIndex(r => r.id === solicitudToClose.id);
        if (reqIndex === -1) return;
        
        const asignacion = allRequests[reqIndex].personalAsignado?.[0];
        if (!asignacion || !asignacion.horaEntradaReal || !asignacion.horaSalidaReal) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes introducir la hora de entrada y salida real para cerrar el turno.' });
            return;
        }

        allRequests[reqIndex].estado = 'Cerrado';
        allRequests[reqIndex].personalAsignado![0].rating = feedback.rating;
        allRequests[reqIndex].personalAsignado![0].comentariosMice = feedback.comment;

        localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
        loadData(); // Reload data to apply filters
        toast({ title: 'Turno Cerrado', description: `El turno de ${asignacion.nombre} ha sido validado y cerrado.` });
        setSolicitudToClose(null);
    };

    const getAssignedName = (asignacion?: {idPersonal: string, nombre?: string}) => {
        if(!asignacion) return 'No asignado';
        if(asignacion.nombre) return asignacion.nombre;
        const worker = personalExternoDB.get(asignacion.idPersonal) || personalInternoDB.get(asignacion.idPersonal);
        return worker?.nombre || 'Desconocido';
    }


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Validación de Horas..." />;
    }

    return (
        <TooltipProvider>
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
                     <div className="flex items-center space-x-2">
                        <Checkbox id="show-closed" checked={showClosed} onCheckedChange={(checked) => setShowClosed(Boolean(checked))} />
                        <Label htmlFor="show-closed">Ver turnos cerrados</Label>
                    </div>
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
                                    const costeReal = horasReales > 0 && horasPlanificadas > 0 ? (costePlanificado / horasPlanificadas) * horasReales : 0;
                                    
                                    const nombreAsignado = getAssignedName(asignacion);

                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-semibold">{nombreAsignado}</TableCell>
                                            <TableCell>{s.categoria}</TableCell>
                                            <TableCell>{s.horaInicio} - {s.horaFin} ({formatNumber(horasPlanificadas, 2)}h)</TableCell>
                                            <TableCell>
                                                <Input type="time" defaultValue={asignacion.horaEntradaReal} onBlur={(e) => handleSaveHours(s.id, asignacion.idPersonal, 'horaEntradaReal', e.target.value)} className="h-8" disabled={s.estado === 'Cerrado'}/>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="time" defaultValue={asignacion.horaSalidaReal} onBlur={(e) => handleSaveHours(s.id, asignacion.idPersonal, 'horaSalidaReal', e.target.value)} className="h-8" disabled={s.estado === 'Cerrado'}/>
                                            </TableCell>
                                            <TableCell className="font-mono font-semibold">{formatNumber(horasReales, 2)}h</TableCell>
                                            <TableCell className="font-mono">{formatCurrency(costeReal)}</TableCell>
                                            <TableCell className="text-center">
                                                <FeedbackDialog 
                                                    workerName={nombreAsignado}
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
                                                {s.estado !== 'Cerrado' ? (
                                                    <Button size="sm" onClick={() => setSolicitudToClose(s)} disabled={!asignacion.horaEntradaReal || !asignacion.horaSalidaReal}>
                                                        <CheckCircle className="mr-2"/>Cerrar Turno
                                                    </Button>
                                                ) : <Badge variant="secondary">Cerrado</Badge>}
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
                 <FeedbackDialog
                    open={!!solicitudToClose}
                    onOpenChange={(isOpen) => !isOpen && setSolicitudToClose(null)}
                    workerName={getAssignedName(solicitudToClose?.personalAsignado?.[0])}
                    initialRating={solicitudToClose?.personalAsignado?.[0]?.rating}
                    initialComment={solicitudToClose?.personalAsignado?.[0]?.comentariosMice}
                    onSave={handleConfirmClose}
                    title="Confirmar Cierre y Valoración de Turno"
                    description="Verifica las horas reales e introduce la valoración del desempeño antes de cerrar el turno."
                    saveButtonText="Confirmar y Cerrar"
                 />
            </div>
        </TooltipProvider>
    );
}
