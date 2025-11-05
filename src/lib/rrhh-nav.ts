
'use client';

import { Users, ClipboardList, BarChart3, UserPlus, Shuffle, UserCheck } from 'lucide-react';

export const rrhhNav = [
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Shuffle, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Personal Interno', href: '/bd/personal', icon: Users, description: 'Administra la base de datos de empleados de MICE.' },
    { title: 'Personal Externo', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra la base de datos de trabajadores de ETTs.' },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
