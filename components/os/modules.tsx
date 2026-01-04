"use client";

import {
  ClipboardList,
  Package,
  Warehouse,
  Truck,
  Users,
  Box,
  Wrench,
  Coffee,
  Zap,
} from 'lucide-react';

export const osModules = [
  { key: 'comercial', title: 'Comercial', icon: ClipboardList },
  { key: 'gastronomia', title: 'Gastronomía', icon: Coffee },
  { key: 'almacen', title: 'Almacén', icon: Warehouse },
  { key: 'bodega', title: 'Bodega', icon: Package },
  { key: 'alquiler', title: 'Alquiler', icon: Box },
  { key: 'hielo', title: 'Hielo', icon: Zap },
  { key: 'transporte', title: 'Transporte', icon: Truck },
  { key: 'personal-externo', title: 'Personal', icon: Users },
  { key: 'decoracion', title: 'Decoración', icon: Wrench },
  { key: 'atipicos', title: 'Atípicos', icon: Wrench },
];

export default osModules;
