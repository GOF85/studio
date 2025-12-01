
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { format, parseISO, startOfToday, subDays, isWithinInterval, endOfDay, startOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

import type { ServiceOrder, PersonalMiceOrder, PersonalExterno, SolicitudPersonalCPR, CategoriaPersonal, Proveedor, Personal, PersonalExternoDB } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Users, Clock, Euro, TrendingDown, TrendingUp, Calendar as CalendarIcon, Star, Printer, Shuffle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';

const StarRating = ({ rating }: { rating: number }) => {
    return (
        <div className="flex">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={cn(
                        "h-5 w-5",
                        i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"
                    )}
                />
            ))}
        </div>
    );
};

type DetalleTrabajador = {
    id: string; // Composite key
    trabajadorId: string;
    nombre: string;
    esExterno: boolean;
    proveedor: string;
    osNumber: string;
    osId: string;
    fecha: string;
    categoria: string;
    horarioPlanificado: string;
    horarioReal: string;
    horasPlanificadas: number;
    horasReales: number;
    costePlanificado: number;
    costeReal: number;
    rating?: number;
    comentarios?: string;
};

type AnaliticaData = {
    costeTotal: number;
    costePlanificado: number;
    desviacionCoste: number;
    horasTotales: number;
    horasPlanificadas: number;
    desviacionHoras: number;
    numTurnos: number;
    costePorProveedor: { name: string; value: number }[];
    horasPorCategoria: { name: string; value: number }[];
    detalleCompleto: DetalleTrabajador[];
}


export default function AnaliticaExternosPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [proveedorFilter, setProveedorFilter] = useState('all');
    const [osFilter, setOsFilter] = useState('');

    const [allPersonalMice, setAllPersonalMice] = useState<PersonalMiceOrder[]>([]);
    const [allPersonalExterno, setAllPersonalExterno] = useState<PersonalExterno[]>([]);
    const [allSolicitudesCPR, setAllSolicitudesCPR] = useState<SolicitudPersonalCPR[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [personalInterno, setPersonalInterno] = useState<Personal[]>([]);
    const [personalExternoDB, setPersonalExternoDB] = useState<PersonalExternoDB[]>([]);
    const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);

    const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<{ id: string, nombre: string } | null>(null);


    useEffect(() => {
        setAllPersonalMice(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllPersonalExterno(JSON.parse(localStorage.getItem('personalExterno') || '[]'));
        setAllSolicitudesCPR(JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]'));
        setProveedores(JSON.parse(localStorage.getItem('proveedores') || '[]'));
        setPersonalInterno(JSON.parse(localStorage.getItem('personal') || '[]'));
        setPersonalExternoDB(JSON.parse(localStorage.getItem('personalExternoDB') || '[]'));
        setTiposPersonal(JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]);
    }, []);

    const uniqueProveedores = useMemo(() => {
        const ettIds = new Set(allPersonalExterno.flatMap(p => p.turnos.map(t => t.proveedorId)));
        tiposPersonal.forEach(tp => ettIds.add(tp.proveedorId));
        return proveedores.filter(p => ettIds.has(p.id) && p.tipos.includes('Personal'));
    }, [allPersonalExterno, proveedores, tiposPersonal]);
    
    const calculateHours = (start?: string, end?: string): number => {
        if (!start || !end) return 0;
        try {
            const startTime = new Date(`1970-01-01T${start}:00`);
            const endTime = new Date(`1970-01-01T${end}:00`);
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
            const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            return diff > 0 ? diff : 0;
        } catch (e) {
            return 0;
        }
    }

    const analiticaData: AnaliticaData = useMemo(() => {
        if (!dateRange?.from) return { costeTotal: 0, costePlanificado: 0, desviacionCoste: 0, horasTotales: 0, horasPlanificadas: 0, desviacionHoras: 0, numTurnos: 0, costePorProveedor: [], horasPorCategoria: [], detalleCompleto: [] };

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
        const costePorProveedor: Record<string, number> = {};
        const horasPorCategoria: Record<string, number> = {};
        const detalleCompleto: DetalleTrabajador[] = [];

        let costeTotal = 0, costePlanificado = 0, horasTotales = 0, horasPlanificadas = 0, numTurnos = 0;
        
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        
        const tiposPersonalMap = new Map((tiposPersonal || []).map(t => [t.id, t]));


        // Personal Externo Eventos
        allPersonalExterno.forEach(pedido => {
            const os = allServiceOrders.find((so: ServiceOrder) => so.id === pedido.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;
             if (osFilter && !(os.serviceNumber.toLowerCase().includes(osFilter.toLowerCase()) || os.client.toLowerCase().includes(osFilter.toLowerCase()))) return;
            
            pedido.turnos.forEach(turno => {
                const tipoPersonal = tiposPersonalMap.get(turno.proveedorId);
                if (proveedorFilter !== 'all' && tipoPersonal?.proveedorId !== proveedorFilter) return;

                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
                
                (turno.asignaciones || []).forEach(asig => {
                    numTurnos++;
                    const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || plannedHours;
                    const costeRealTurno = realHours * turno.precioHora;
                    const costePlanificadoTurno = plannedHours * turno.precioHora;

                    costeTotal += costeRealTurno;
                    costePlanificado += costePlanificadoTurno;
                    horasTotales += realHours;
                    horasPlanificadas += plannedHours;
                    
                    const prov = proveedores.find(p => p.id === tipoPersonal?.proveedorId);
                    if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                    
                    horasPorCategoria[turno.categoria] = (horasPorCategoria[turno.categoria] || 0) + realHours;
                    
                    detalleCompleto.push({
                         id: `${turno.id}-${asig.id}`, trabajadorId: asig.id, nombre: asig.nombre, esExterno: true, proveedor: prov?.nombreComercial || '', osNumber: os.serviceNumber, osId: os.id,
                        fecha: turno.fecha, categoria: turno.categoria, horarioPlanificado: `${turno.horaEntrada}-${turno.horaSalida}`, horarioReal: `${asig.horaEntradaReal}-${asig.horaSalidaReal}`,
                        horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: costePlanificadoTurno, costeReal: costeRealTurno, rating: asig.rating, comentarios: asig.comentariosMice
                    });
                });
            });
        });

        // Solicitudes CPR
        allSolicitudesCPR.forEach(solicitud => {
            if (!isWithinInterval(new Date(solicitud.fechaServicio), { start: rangeStart, end: rangeEnd })) return;
            if (solicitud.estado !== 'Cerrado') return;
            if (osFilter && !'cpr'.includes(osFilter.toLowerCase())) return;
            
            const tipoPersonal = tiposPersonalMap.get(solicitud.proveedorId || '');
            if (proveedorFilter !== 'all' && tipoPersonal?.proveedorId !== proveedorFilter) return;

            const plannedHours = calculateHours(solicitud.horaInicio, solicitud.horaFin);
            const costePlanificadoTurno = plannedHours * (tipoPersonal?.precioHora || 0);

            (solicitud.personalAsignado || []).forEach(asig => {
                numTurnos++;
                const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || plannedHours;
                const costeRealTurno = realHours * (tipoPersonal?.precioHora || 0);
                
                costeTotal += costeRealTurno;
                costePlanificado += costePlanificadoTurno;
                horasTotales += realHours;
                horasPlanificadas += plannedHours;
                horasPorCategoria[solicitud.categoria] = (horasPorCategoria[solicitud.categoria] || 0) + realHours;
                
                const prov = proveedores.find(p => p.id === tipoPersonal?.proveedorId);
                if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                
                detalleCompleto.push({
                     id: `${solicitud.id}-${asig.idPersonal}`, trabajadorId: asig.idPersonal, nombre: asig.nombre, esExterno: true, proveedor: prov?.nombreComercial || 'MICE', osNumber: 'CPR', osId: 'CPR',
                    fecha: solicitud.fechaServicio, categoria: solicitud.categoria, horarioPlanificado: `${solicitud.horaInicio}-${solicitud.horaFin}`, horarioReal: `${asig.horaEntradaReal}-${asig.horaSalidaReal}`,
                    horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: costePlanificadoTurno, costeReal: costeRealTurno, rating: asig.rating, comentarios: asig.comentariosMice
                });
            });
        });

        return {
            costeTotal,
            costePlanificado,
            desviacionCoste: costeTotal - costePlanificado,
            horasTotales,
            horasPlanificadas,
            desviacionHoras: horasTotales - horasPlanificadas,
            numTurnos,
            costePorProveedor: Object.entries(costePorProveedor).map(([name, value]) => ({ name, value })),
            horasPorCategoria: Object.entries(horasPorCategoria).map(([name, value]) => ({ name, value })),
            detalleCompleto: detalleCompleto.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        };

    }, [dateRange, proveedorFilter, osFilter, allPersonalMice, allPersonalExterno, allSolicitudesCPR, proveedores, personalInterno, personalExternoDB, tiposPersonal]);
    
    const { workerPerformanceSummary, performanceTotals } = useMemo(() => {
        if (!analiticaData.detalleCompleto) return { workerPerformanceSummary: [], performanceTotals: { totalJornadas: 0, totalHorasReales: 0, totalCosteReal: 0, mediaValoracion: 0 }};

        const summary = new Map<string, { totalJornadas: number; totalHoras: number; totalCoste: number; ratings: number[]; nombre: string, proveedor: string; }>();

        analiticaData.detalleCompleto.forEach(turno => {
            if (!turno.trabajadorId || !turno.esExterno) return;

            let workerData = summary.get(turno.trabajadorId);
            if (!workerData) {
                workerData = { totalJornadas: 0, totalHoras: 0, totalCoste: 0, ratings: [], nombre: turno.nombre, proveedor: turno.proveedor };
                summary.set(turno.trabajadorId, workerData);
            }

            workerData.totalJornadas += 1;
            workerData.totalHoras += turno.horasReales;
            workerData.totalCoste += turno.costeReal;
            if (turno.rating) {
                workerData.ratings.push(turno.rating);
            }
        });

        const performanceArray = Array.from(summary.entries()).map(([id, worker]) => {
            const avgRating = worker.ratings.length > 0 ? worker.ratings.reduce((a, b) => a + b, 0) / worker.ratings.length : 0;
            return {
                id,
                nombre: worker.nombre,
                proveedor: worker.proveedor,
                totalJornadas: worker.totalJornadas,
                totalHoras: worker.totalHoras,
                totalCoste: worker.totalCoste,
                avgRating,
            };
        }).sort((a, b) => b.totalJornadas - a.totalJornadas);
        
        const totals = performanceArray.reduce((acc, worker) => {
            acc.totalJornadas += worker.totalJornadas;
            acc.totalHorasReales += worker.totalHoras;
            acc.totalCosteReal += worker.totalCoste;
            return acc;
        }, { totalJornadas: 0, totalHorasReales: 0, totalCosteReal: 0 });

        const allRatings = performanceArray.flatMap(w => w.avgRating > 0 ? w.avgRating : []);
        const mediaValoracion = allRatings.length > 0 ? allRatings.reduce((a,b) => a+b, 0) / allRatings.length : 0;


        return { workerPerformanceSummary: performanceArray, performanceTotals: { ...totals, mediaValoracion } };
    }, [analiticaData.detalleCompleto]);
    
    const selectedWorkerDetails = useMemo(() => {
        if (!selectedWorkerForModal) return null;
        return {
            ...selectedWorkerForModal,
            turnos: analiticaData.detalleCompleto.filter(t => t.trabajadorId === selectedWorkerForModal.id)
        }
    }, [selectedWorkerForModal, analiticaData.detalleCompleto]);
    
    const handlePrintWorkerHistory = () => {
        if (!selectedWorkerDetails || !selectedWorkerDetails.nombre) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Historial de Servicios: ${selectedWorkerDetails.nombre}`, 14, 22);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periodo: ${dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : ''} - ${dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}`, 14, 30);
        
        autoTable(doc, {
            startY: 40,
            head: [['Fecha', 'OS/Centro', 'Horario Real', 'Horas', 'Coste', 'Valoración', 'Comentarios']],
            body: selectedWorkerDetails.turnos.map(t => [
                format(new Date(t.fecha), 'dd/MM/yy'),
                t.osNumber,
                t.horarioReal || '-',
                formatNumber(t.horasReales, 2) + 'h',
                formatCurrency(t.costeReal),
                '⭐'.repeat(t.rating || 0),
                t.comentarios || '-'
            ]),
            headStyles: { fillColor: [34, 197, 94] },
            columnStyles: { 6: { cellWidth: 'auto' }}
        });

        doc.save(`Historial_${selectedWorkerDetails.nombre.replace(/\s/g, '_')}.pdf`);
    };

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 0, 1)), to: endOfQuarter(new Date(now.getFullYear(), 2, 31)) }); break;
            case 'q2': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 3, 1)), to: endOfQuarter(new Date(now.getFullYear(), 5, 30)) }); break;
            case 'q3': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 6, 1)), to: endOfQuarter(new Date(now.getFullYear(), 8, 30)) }); break;
            case 'q4': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 9, 1)), to: endOfQuarter(new Date(now.getFullYear(), 11, 31)) }); break;
        }
        if (fromDate && toDate) {
            setDateRange({ from: fromDate, to: toDate });
        }
        setIsDatePickerOpen(false);
    };
    
