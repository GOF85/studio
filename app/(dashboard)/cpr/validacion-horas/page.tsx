'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, PersonalExternoDB, Personal } from '@/types';
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
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { logActivity } from '@/app/(dashboard)/portal/activity-log/utils';
import { useCprSolicitudesPersonal, useUpdateCprSolicitudPersonal } from '@/hooks/use-cpr-data';
import { usePersonal, usePersonalExternoDB } from '@/hooks/use-data-queries';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
    'Solicitado': 'secondary',
    'Aprobada': 'outline',
    'Rechazada': 'destructive',
    'Asignada': 'default',
    'Confirmado': 'success',
    'Solicitada Cancelacion': 'destructive',
    'Cerrado': 'secondary'
};

export default function ValidacionHorasPage() {
    const { data: allSolicitudes = [] } = useCprSolicitudesPersonal();
    const { data: personalInterno = [] } = usePersonal();
    const { data: personalExterno = [] } = usePersonalExternoDB();
    const updateSolicitud = useUpdateCprSolicitudPersonal();

    const solicitudes = useMemo(() => {
        return allSolicitudes.filter(s => s.estado === 'Confirmado' || s.estado === 'Asignada' || s.estado === 'Cerrado');
    }, [allSolicitudes]);

    const personalExternoDB = useMemo(() => {
        const arr = Array.isArray(personalExterno) ? personalExterno : [];
        return new Map(arr.map(p => [p.id, { nombre: p.nombreCompleto }]));
    }, [personalExterno]);

    const personalInternoDB = useMemo(() => {
        return new Map(personalInterno.map(p => [p.id, { nombre: `${p.nombre} ${p.apellido1}` }]));
    }, [personalInterno]);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [showClosed, setShowClosed] = useState(false);
    const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const router = useRouter();
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();

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
        }).sort((a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime());
    }, [solicitudes, searchTerm, dateFilter, showClosed]);

    const handleSaveFeedback = (solicitud: SolicitudPersonalCPR, feedback: { rating: number; comment: string, horaEntradaReal?: string, horaSalidaReal?: string }) => {
        if (!solicitud || !impersonatedUser) return;

        const asignacion = solicitud.personalAsignado?.[0];
        if (!asignacion) return;

        const originalState = solicitud.estado;

        const updatedAsignacion = { ...asignacion };
        updatedAsignacion.rating = feedback.rating;
        updatedAsignacion.comentariosMice = feedback.comment;

        let newState = originalState;

        if (feedback.horaEntradaReal && feedback.horaSalidaReal) {
            const originalHours = {
                entrada: asignacion.horaEntradaReal,
                salida: asignacion.horaSalidaReal
            };
            updatedAsignacion.horaEntradaReal = feedback.horaEntradaReal;
            updatedAsignacion.horaSalidaReal = feedback.horaSalidaReal;

            if (originalState !== 'Cerrado') {
                newState = 'Cerrado';
                logActivity({
                    userId: impersonatedUser.id,
                    userName: impersonatedUser.nombre,
                    action: 'CERRAR_TURNO_CPR',
                    details: `Turno de ${asignacion.nombre} cerrado con horas ${feedback.horaEntradaReal}-${feedback.horaSalidaReal}.`,
                    severity: 'info'
                });
            } else {
                if (originalHours.entrada !== feedback.horaEntradaReal || originalHours.salida !== feedback.horaSalidaReal) {
                    logActivity({
                        userId: impersonatedUser.id,
                        userName: impersonatedUser.nombre,
                        action: 'MODIFICAR_HORAS_CPR',
                        details: `Horas de ${asignacion.nombre} cambiadas a ${feedback.horaEntradaReal}-${feedback.horaSalidaReal}.`,
                        severity: 'info'
                    });
                }
            }
        } else if (originalState !== 'Cerrado') {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes introducir la hora de entrada y salida real para cerrar el turno.' });
            return;
        }

        updateSolicitud.mutate({
            id: solicitud.id,
            estado: newState,
            personalAsignado: [updatedAsignacion]
        });

        toast({ title: 'Valoración guardada', description: `La valoración para ${asignacion.nombre} ha sido guardada.` });
        setSolicitudToManage(null);
    };

    const getAssignedName = (asignacion?: { idPersonal: string, nombre?: string }) => {
        if (!asignacion) return 'No asignado';
        if (asignacion.nombre) return asignacion.nombre;
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
                    <Input placeholder="Buscar por trabajador, categoría, motivo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
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
                                    <TableHead>H. Reales</TableHead>
                                    <TableHead>Coste Real</TableHead>
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
                                    const hasDeviation = horasReales > 0 && Math.abs(horasReales - horasPlanificadas) > 0.01;

                                    const nombreAsignado = getAssignedName(asignacion);

                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>{format(new Date(s.fechaServicio), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-semibold">{nombreAsignado}</TableCell>
                                            <TableCell>{s.categoria}</TableCell>
                                            <TableCell>{s.horaInicio} - {s.horaFin} ({formatNumber(horasPlanificadas, 2)}h)</TableCell>
                                            <TableCell className={cn("font-mono font-semibold", hasDeviation && (horasReales > horasPlanificadas ? 'text-orange-600' : 'text-green-600'))}>
                                                {horasReales > 0 ? `${formatNumber(horasReales, 2)}h` : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono">{formatCurrency(costeReal)}</TableCell>
                                            <TableCell className="text-right">
                                                {s.estado !== 'Cerrado' ? (
                                                    <Button size="sm" onClick={() => setSolicitudToManage(s)}>
                                                        <CheckCircle className="mr-2" />Cerrar Turno
                                                    </Button>
                                                ) : <Button variant="outline" size="sm" onClick={() => setSolicitudToManage(s)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center">No hay turnos pendientes de validación para los filtros seleccionados.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <FeedbackDialog
                    open={!!solicitudToManage}
                    onOpenChange={(isOpen) => !isOpen && setSolicitudToManage(null)}
                    turnoInfo={solicitudToManage}
                    workerName={getAssignedName(solicitudToManage?.personalAsignado?.[0])}
                    initialRating={solicitudToManage?.personalAsignado?.[0]?.rating}
                    initialComment={solicitudToManage?.personalAsignado?.[0]?.comentariosMice}
                    initialHoraEntrada={solicitudToManage?.personalAsignado?.[0]?.horaEntradaReal || solicitudToManage?.horaInicio}
                    initialHoraSalida={solicitudToManage?.personalAsignado?.[0]?.horaSalidaReal || solicitudToManage?.horaFin}
                    onSave={(feedback) => solicitudToManage && handleSaveFeedback(solicitudToManage, feedback)}
                    title="Confirmar Cierre y Valoración de Turno"
                    description="Verifica las horas reales e introduce la valoración del desempeño antes de cerrar el turno."
                    saveButtonText={solicitudToManage?.estado === 'Cerrado' ? 'Guardar Cambios' : 'Confirmar y Cerrar'}
                />
            </div>
        </TooltipProvider>
    );
}
