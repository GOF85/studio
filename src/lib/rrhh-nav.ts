

'use client';

import { Users, ClipboardList, BarChart3, Factory } from 'lucide-react';

export const rrhhNav = [
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para los eventos.' },
    { title: 'Solicitudes CPR', href: '/rrhh/solicitudes-cpr', icon: Factory, description: 'Gestiona las peticiones de personal de apoyo del CPR.' },
    { title: 'Gestión de Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Gestión de Personal Externo', href: '/bd/personal-externo-db', icon: Users, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
