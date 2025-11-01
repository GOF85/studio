

'use client';

import { Database, Users, Package, Building, Layers, Box, Percent, Target, Factory, CreditCard, Banknote, Trash2, UserPlus } from 'lucide-react';

export const bdNavLinks = [
    { title: 'Personal Interno', path: '/bd/personal', icon: Users },
    { title: 'Personal Externo', path: '/bd/personal-externo', icon: UserPlus },
    { title: 'Proveedores', path: '/bd/proveedores', icon: Building },
    { title: 'Catálogo Personal Externo', path: '/bd/tipos-personal', icon: Users },
    { title: 'Espacios', path: '/bd/espacios', icon: Building },
    { title: 'Artículos MICE', path: '/bd/articulos', icon: Package },
    { title: 'Base de Datos ERP', path: '/bd/erp', icon: Database },
    { title: 'Familias ERP', path: '/bd/familiasERP', icon: Layers },
    { title: 'Formatos de Expedición', path: '/bd/formatos-expedicion', icon: Box },
    { title: 'Objetivos de Gasto', path: '/bd/objetivos-gasto', icon: Target },
    { title: 'Objetivos CPR', path: '/bd/objetivos-cpr', icon: CreditCard },
    { title: 'Costes Fijos CPR', path: '/bd/costes-fijos-cpr', icon: Banknote },
    { title: 'Administración', path: '/bd/borrar', icon: Trash2 },
];
