
'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Visión general del taller de producción.' },
    { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardList, description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory, description: 'Gestiona la producción en cocina.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Excedentes', href: '/cpr/excedentes', icon: PackagePlus, description: 'Gestiona el sobrante de producción.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];
