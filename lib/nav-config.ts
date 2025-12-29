import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MenuItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    className?: string; // e.g. "theme-orange"
    description?: string;
    badge?: {
        label: string;
        variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    };
}

export const planningItems: MenuItem[] = [
    {
        title: 'Previsión de Servicios',
        href: '/pes',
        icon: ClipboardList,
        description: 'Planifica y gestiona servicios futuros',
    },
    {
        title: 'Calendario de Servicios',
        href: '/calendario',
        icon: Calendar,
        description: 'Vista temporal de todos los eventos',
    },
    {
        title: 'Entregas MICE',
        href: '/entregas',
        icon: Truck,
        className: "theme-orange",
        description: 'Gestión de entregas y logística',
    },
];

export const coreOpsItems: MenuItem[] = [
    {
        title: 'Book Gastronómico',
        href: '/book',
        icon: BookHeart,
        description: 'Recetas, ingredientes y elaboraciones',
    },
    {
        title: 'Producción (CPR)',
        href: '/cpr',
        icon: Factory,
        description: 'Centro de producción y costes',
    },
    {
        title: 'Almacén',
        href: '/almacen',
        icon: Warehouse,
        description: 'Control de stock e inventario',
    },
];

export const reportingItems: MenuItem[] = [
    {
        title: 'Analítica',
        href: '/analitica',
        icon: BarChart3,
        description: 'Métricas y KPIs del negocio',
    },
    {
        title: 'Control de Explotación',
        href: '/control-explotacion',
        icon: AreaChart,
        description: 'Seguimiento financiero operativo',
    },
];

export const adminItems: MenuItem[] = [
    {
        title: 'Recursos Humanos',
        href: '/rrhh',
        icon: Users,
        description: 'Gestión de personal y equipos',
    },
    {
        title: 'Portales Externos',
        href: '/portal',
        icon: Users,
        description: 'Acceso para clientes y colaboradores',
    },
    {
        title: 'Bases de Datos',
        href: '/bd',
        icon: Package,
        description: 'Proveedores, artículos y configuración',
    },
];

export const commercialItems: MenuItem[] = [
    {
        title: 'Catálogo de Espacios',
        href: '/bd/espacios',
        icon: Building2,
        description: 'Gestión de venues y espacios para eventos',
    },
];

export const allNavSections = [
    { title: "Comercial y Ventas", items: commercialItems },
    { title: "Planificación", items: planningItems },
    { title: "Operaciones Centrales", items: coreOpsItems },
    { title: "Análisis y Reportes", items: reportingItems },
    { title: "Administración y Colaboradores", items: adminItems },
];
