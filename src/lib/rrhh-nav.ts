
'use client';

import { Users, ClipboardList, BarChart3 } from 'lucide-react';

export const rrhhNav = [
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para los eventos.' },
    { title: 'Gestión de Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Gestión de Personal Externo', href: '/bd/personal-externo-db', icon: Users, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
