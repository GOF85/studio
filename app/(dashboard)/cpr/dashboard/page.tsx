
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useState, useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cprNav } from '@/lib/cpr-nav';
import { Separator } from '@/components/ui/separator';
import { Factory, AlertTriangle, List, Clock, CheckCircle, UserCheck } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrdenFabricacion, SolicitudPersonalCPR } from '@/types';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { useCprOrdenesFabricacion, useCprSolicitudesPersonal } from '@/hooks/use-cpr-data';


const workflowSections = {
    planificar: {
        title: '1. Planificar',
        modules: ['Planificación y OFs', 'Solicitudes de Personal', 'Validación de Horas']
    },
    ejecutar: {
        title: '2. Ejecutar',
        modules: ['Taller de Producción', 'Picking y Logística', 'Control de Calidad']
    },
    analizar: {
        title: '3. Analizar y Supervisar',
        modules: ['Stock Elaboraciones', 'Productividad', 'Informe de Picking', 'Trazabilidad', 'Incidencias']
    }
};


function WorkflowSection({ title, modules }: { title: string, modules: (typeof cprNav[number])[] }) {
    if (modules.length === 0) return null;
    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link href={item.href} key={item.href}>
                            <Card className="hover:bg-accent transition-colors h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-base">
                                        <Icon className="h-5 w-5" />
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export default function CprDashboardPage() {
    const { data: storedOFs = [] } = useCprOrdenesFabricacion();
    const { data: storedSolicitudes = [] } = useCprSolicitudesPersonal();

    const kpiData = useMemo(() => {
        const pendientes = storedOFs.filter(of => of.estado === 'Pendiente' || of.estado === 'Asignada').length;
        const enProceso = storedOFs.filter(of => of.estado === 'En Proceso').length;
        const finalizadasHoy = storedOFs.filter(of => of.fechaFinalizacion && isToday(parseISO(of.fechaFinalizacion))).length;
        const incidencias = storedOFs.filter(of => of.estado === 'Incidencia').length;

        const solicitudesActivas = storedSolicitudes.filter(s => s.estado === 'Confirmado' || s.estado === 'Asignada');

        return {
            pendientes,
            enProceso,
            finalizadasHoy,
            incidencias,
            turnosPorValidar: solicitudesActivas.length
        };
    }, [storedOFs, storedSolicitudes]);

    const navSections = {
        planificar: cprNav.filter(item => workflowSections.planificar.modules.includes(item.title)),
        ejecutar: cprNav.filter(item => workflowSections.ejecutar.modules.includes(item.title)),
        analizar: cprNav.filter(item => workflowSections.analizar.modules.includes(item.title))
    };


    return (
        <main className="min-h-screen bg-background/30">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <Factory className="h-5 w-5 text-rose-500" />
                        </div>
                    </div>
                    <div className="flex-1" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
                <KpiCard
                    title="OFs Pendientes"
                    value={kpiData.pendientes}
                    icon={List}
                    className="bg-background/40 backdrop-blur-sm border-border/40"
                />
                <KpiCard
                    title="OFs en Proceso"
                    value={kpiData.enProceso}
                    icon={Clock}
                    className="bg-background/40 backdrop-blur-sm border-border/40"
                />
                <KpiCard
                    title="Finalizadas Hoy"
                    value={kpiData.finalizadasHoy}
                    icon={CheckCircle}
                    className="bg-background/40 backdrop-blur-sm border-border/40"
                />
                <KpiCard
                    title="Incidencias Activas"
                    value={kpiData.incidencias}
                    icon={AlertTriangle}
                    className={cn(
                        "bg-background/40 backdrop-blur-sm border-border/40",
                        kpiData.incidencias > 0 ? "border-destructive/50 bg-destructive/5 text-destructive" : ""
                    )}
                />
                <KpiCard
                    title="Turnos por Validar"
                    value={kpiData.turnosPorValidar}
                    icon={UserCheck}
                    className={cn(
                        "bg-background/40 backdrop-blur-sm border-border/40",
                        kpiData.turnosPorValidar > 0 ? "border-amber-500/50 bg-amber-500/5 text-amber-700" : ""
                    )}
                />
            </div>

            <div className="space-y-10">
                <WorkflowSection
                    title={workflowSections.planificar.title}
                    modules={navSections.planificar}
                />
                <Separator className="bg-border/40" />
                <WorkflowSection
                    title={workflowSections.ejecutar.title}
                    modules={navSections.ejecutar}
                />
                <Separator className="bg-border/40" />
                <WorkflowSection
                    title={workflowSections.analizar.title}
                    modules={navSections.analizar}
                />
            </div>
        </main>
    );
}
