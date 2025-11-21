'use client';

import { BookHeart, ChefHat, Component, Sprout, Shield, CheckSquare, TrendingUp, BarChart3 } from 'lucide-react';

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
