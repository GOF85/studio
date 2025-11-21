

'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, Shield, CheckSquare, TrendingUp, Users, UserPlus, UserCheck, Archive, HistoryIcon, Calculator, Box, Layers, Percent, Target, Banknote, CreditCard, Building, Trash2 } from 'lucide-react';
import { rrhhNav } from './rrhh-nav';
import { bookNavLinks } from './book-nav';
import { bdNavLinks } from './bd-nav';

export const cprNav = [
    { title: 'Dashboard CPR', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Vista general y KPIs del centro de producción.' },
    { title: 'Planificación y OFs', href: '/cpr/of', icon: Factory, description: 'Agrega necesidades y gestiona las O.F.' },
    { title: 'Taller de Producción', href: '/cpr/produccion', icon: ChefHat, description: 'Interfaz para cocineros en tablets.' },
    { title: 'Inventario de Materia Prima', href: '/cpr/inventario', icon: Archive, description: 'Gestiona el stock teórico y físico de ingredientes.'},
    { title: 'Cierres de Inventario', href: '/cpr/cierres', icon: Calculator, description: 'Realiza y consulta los cierres de inventario mensuales.'},
    { title: 'Movimientos de Inventario', href: '/cpr/inventario/movimientos', icon: HistoryIcon, description: 'Auditoría de todos los ajustes y movimientos de stock.'},
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Solicitudes de Personal', href: '/cpr/solicitud-personal', icon: Users, description: 'Pide personal de apoyo para picos de trabajo.' },
    { title: 'Validación de Horas', href: '/cpr/validacion-horas', icon: UserCheck, description: 'Cierra los turnos del personal de apoyo.'},
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción e inventario.' },
];
export { rrhhNav, bookNavLinks, bdNavLinks };

