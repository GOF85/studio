
'use client';

import { Users, ClipboardList, BarChart3, UserPlus, Shuffle, UserCheck, LayoutDashboard } from 'lucide-react';

export const rrhhNav = [
    { title: 'Dashboard RRHH', href: '/rrhh', icon: LayoutDashboard, description: 'Vista general y accesos directos del módulo de RRHH.' },
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Shuffle, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Base de Datos de Personal', href: '/bd/personal', icon: Users, description: 'Administra los empleados internos.', adminOnly: true },
    { title: 'Base de Datos de ETTs', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra los trabajadores externos.', adminOnly: true },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
