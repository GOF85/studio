
'use client';

import { Users, ClipboardList, BarChart3, Factory, UserPlus } from 'lucide-react';

export const rrhhNav = [
    { title: 'Solicitudes Eventos', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para los eventos de Catering.' },
    { title: 'Solicitudes CPR', href: '/rrhh/solicitudes-cpr', icon: Factory, description: 'Gestiona las peticiones de personal de apoyo del CPR.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
