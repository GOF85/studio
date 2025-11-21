
'use client';

import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart } from 'lucide-react';
import { cprNav, bookNavLinks, bdNavLinks, rrhhNav } from './cpr-nav';

export const mainNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList, exact: true },
    { title: 'Calendario de Servicios', href: '/calendario', icon: Calendar, exact: true },
    { title: 'Entregas MICE', href: '/entregas', icon: Truck },
    { title: 'Almacén', href: '/almacen', icon: Warehouse },
    { title: 'Analítica', href: '/analitica', icon: BarChart3 },
    { title: 'Control de Explotación', href: '/control-explotacion', icon: AreaChart },
    { title: 'Configuración', href: '/configuracion', icon: Settings },
];

export { cprNav, bookNavLinks, bdNavLinks, rrhhNav };
