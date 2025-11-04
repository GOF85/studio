
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useState, useEffect, useMemo } from 'react';
import type { LucideIcon, OrdenFabricacion } from 'lucide-react';
import { cprNav } from '@/lib/cpr-nav';
import { Separator } from '@/components/ui/separator';
import { Factory, AlertTriangle, List, Clock, CheckCircle, UserCheck } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SolicitudPersonalCPR } from '@/types';


const workflowSections = {
  planificar: {
    title: '1. Planificar',
    modules: ['Planificación y OFs', 'Solicitudes de Personal']
  },
  ejecutar: {
    title: '2. Ejecutar',
    modules: ['Taller de Producción', 'Picking y Logística', 'Control de Calidad']
  },
  analizar: {
    title: '3. Analizar y Supervisar',
    modules: ['Stock Elaboraciones', 'Productividad', 'Informe de Picking', 'Trazabilidad', 'Incidencias', 'Validación de Horas']
  }
};

function KpiCard({ title, value, icon: Icon, href, className }: { title: string, value: number, icon: LucideIcon, href: string, className?: string }) {
    return (
        <Link href={href}>
            <Card className={cn("hover:shadow-md transition-all", className)}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                </CardContent>
            </Card>
        </Link>
    )
}

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
    const [isMounted, setIsMounted] = useState(false);
    const [kpiData, setKpiData] = useState({
        pendientes: 0,
        enProceso: 0,
        finalizadasHoy: 0,
        incidencias: 0,
        turnosPorValidar: 0,
    });

    useEffect(() => {
        const storedOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const today = new Date();
        
        const pendientes = storedOFs.filter(of => of.estado === 'Pendiente' || of.estado === 'Asignada').length;
        const enProceso = storedOFs.filter(of => of.estado === 'En Proceso').length;
        const finalizadasHoy = storedOFs.filter(of => of.fechaFinalizacion && isToday(parseISO(of.fechaFinalizacion))).length;
        const incidencias = storedOFs.filter(of => of.estado === 'Incidencia').length;

        const storedSolicitudes = (JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[])
            .filter(s => s.estado === 'Asignada' || s.estado === 'Confirmado');
        
        setKpiData({ pendientes, enProceso, finalizadasHoy, incidencias, turnosPorValidar: storedSolicitudes.length });
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Panel de control de Producción..." />;
    }
    
    const navSections = {
      planificar: cprNav.filter(item => workflowSections.planificar.modules.includes(item.title)),
      ejecutar: cprNav.filter(item => workflowSections.ejecutar.modules.includes(item.title)),
      analizar: cprNav.filter(item => workflowSections.analizar.modules.includes(item.title))
    };


    return (
        <main>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                <KpiCard title="OFs Pendientes" value={kpiData.pendientes} icon={List} href="/cpr/of?status=Pendiente" />
                <KpiCard title="OFs en Proceso" value={kpiData.enProceso} icon={Clock} href="/cpr/of?status=En+Proceso" />
                <KpiCard title="Finalizadas Hoy" value={kpiData.finalizadasHoy} icon={CheckCircle} href="/cpr/of" />
                <KpiCard title="Incidencias Activas" value={kpiData.incidencias} icon={AlertTriangle} href="/cpr/incidencias" className={kpiData.incidencias > 0 ? "border-destructive bg-destructive/10" : ""} />
                <KpiCard title="Turnos por Validar" value={kpiData.turnosPorValidar} icon={UserCheck} href="/cpr/validacion-horas" className={kpiData.turnosPorValidar > 0 ? "border-amber-500 bg-amber-50" : ""} />
            </div>

            <div className="space-y-6">
                <WorkflowSection 
                    title={workflowSections.planificar.title}
                    modules={navSections.planificar}
                />
                <Separator />
                 <WorkflowSection 
                    title={workflowSections.ejecutar.title}
                    modules={navSections.ejecutar}
                />
                <Separator />
                <WorkflowSection 
                    title={workflowSections.analizar.title}
                    modules={navSections.analizar}
                />
            </div>
        </main>
    );
}
