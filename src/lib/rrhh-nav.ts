

'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Gestión de Solicitudes', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona todas las necesidades de personal para Eventos y CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo (ETT)', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];

