

'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, Shield, TrendingUp, Users, UserCheck, Archive, HistoryIcon, Calculator, Box, Layers, Percent, Target, Banknote, CreditCard, Building, Trash2, UserPlus, Database } from 'lucide-react';

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

export const rrhhNav = [
    { title: 'Dashboard RRHH', href: '/rrhh', icon: LayoutDashboard, description: 'Vista general y accesos directos del módulo de RRHH.' },
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Users, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Base de Datos de Personal', href: '/bd/personal', icon: Users, description: 'Administra los empleados internos.', adminOnly: true },
    { title: 'Base de Datos de ETTs', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra los trabajadores externos.', adminOnly: true },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];

export const bookNavLinks = [
    { title: 'Dashboard', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Verificación de Ingredientes', path: '/book/verificacionIngredientes', icon: Shield },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Evolución de Costes', path: '/book/evolucion-costes', icon: TrendingUp },
    { title: 'Info. Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

    
export const bdNavLinks = [
    { title: 'Personal Interno', href: '/bd/personal', icon: Users },
    { title: 'Personal Externo', href: '/bd/personal-externo-db', icon: UserPlus },
    { title: 'Proveedores', href: '/bd/proveedores', icon: Building },
    { title: 'Catálogo Personal Externo', href: '/bd/tipos-personal', icon: Users },
    { title: 'Espacios', href: '/bd/espacios', icon: Building },
    { title: 'Artículos MICE', href: '/bd/articulos', icon: Package },
    { title: 'Base de Datos ERP', href: '/bd/erp', icon: Database },
    { title: 'Familias ERP', href: '/bd/familiasERP', icon: Layers },
    { title: 'Categorías de Recetas', href: '/bd/categorias-recetas', icon: BookHeart },
    { title: 'Formatos de Expedición', href: '/bd/formatos-expedicion', icon: Box },
    { title: 'Centros y Ubicaciones', href: '/bd/centros', icon: Factory },
    { title: 'Objetivos CPR', href: '/bd/objetivos-cpr', icon: CreditCard },
    { title: 'Administración', href: '/bd/borrar', icon: Trash2 },
];
