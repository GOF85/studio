
'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer } from 'lucide-react';

export const cprNav = [
    { title: 'Panel de control', href: '/cpr/dashboard', description: 'Visión general del taller de producción.' },
    { title: 'Planificación', href: '/cpr/planificacion', description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', description: 'Gestiona la producción en cocina.' },
    { title: 'Picking y Logística', href: '/cpr/picking', description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', description: 'Valida las elaboraciones.' },
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', description: 'Consulta el picking completo de una OS.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', description: 'Consulta lotes y su histórico.' },
    { title: 'Incidencias', href: '/cpr/incidencias', description: 'Revisa las incidencias de producción.' },
];
