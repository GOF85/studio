
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, formatDistance, parseISO, startOfToday, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OrdenFabricacion } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type OfConTiempos = OrdenFabricacion & {
    tiempoAsignacion?: string;
    tiempoProduccion?: string;
};

type DatosResponsable = {
    nombre: string;
    ofs: OfConTiempos[];
    incidencias: OrdenFabricacion[];
};

export default function ProductividadPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(startOfToday(), 7),
        to: startOfToday(),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [allOFs, setAllOFs] = useState<OrdenFabricacion[]>([]);
    const [responsableFilter, setResponsableFilter] = useState('all');

    useEffect(() => {
        const storedOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        setAllOFs(storedOFs);
    }, []);

    const reporteData = useMemo(() => {
        if (!dateRange?.from) return [];

        const ofsEnRango = allOFs.filter(of => {
            const fechaFin = of.fechaFinalizacion ? parseISO(of.fechaFinalizacion) : null;
            return fechaFin && fechaFin >= dateRange.from! && fechaFin <= (dateRange.to || dateRange.from);
        });

        const ofsFiltradasPorResponsable = responsableFilter === 'all'
            ? ofsEnRango
            : ofsEnRango.filter(of => of.responsable === responsableFilter);

        const porResponsable = new Map<string, DatosResponsable>();

        ofsFiltradasPorResponsable.forEach(of => {
            if (of.responsable) {
                if (!porResponsable.has(of.responsable)) {
                    porResponsable.set(of.responsable, { nombre: of.responsable, ofs: [], incidencias: [] });
                }
                const data = porResponsable.get(of.responsable)!;
                
                if (of.estado === 'Finalizado' || of.estado === 'Validado') {
                     const ofConTiempos: OfConTiempos = { ...of };
                    if (of.fechaAsignacion && of.fechaInicioProduccion) {
                        ofConTiempos.tiempoAsignacion = formatDistance(parseISO(of.fechaInicioProduccion), parseISO(of.fechaAsignacion), { locale: es });
                    }
                    if (of.fechaInicioProduccion && of.fechaFinalizacion) {
                        ofConTiempos.tiempoProduccion = formatDistance(parseISO(of.fechaFinalizacion), parseISO(of.fechaInicioProduccion), { locale: es });
                    }
                    data.ofs.push(ofConTiempos);
                }
                
                if (of.estado === 'Incidencia') {
                    data.incidencias.push(of);
                }
            }
        });
        return Array.from(porResponsable.values());

    }, [allOFs, dateRange, responsableFilter]);


    const responsablesUnicos = useMemo(() => {
        const responsables = new Set<string>();
        allOFs.forEach(of => {
            if (of.responsable) responsables.add(of.responsable);
        });
        return Array.from(responsables).sort();
    }, [allOFs]);

    const handleClearFilters = () => {
        setDateRange({ from: subDays(startOfToday(), 7), to: startOfToday() });
        setResponsableFilter('all');
    }

