

'use client';

import { Database, Users, Package, Building, Layers, Box, Percent, Target, Factory, CreditCard, Banknote, Trash2, UserPlus, MapPin, History } from 'lucide-react';

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

