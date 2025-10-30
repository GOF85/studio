

'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BookHeart, ChefHat, Component, AlertTriangle, Shield } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion, IngredienteInterno, ServiceOrder, GastronomyOrder } from '@/types';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { format, isWithinInterval, addYears, startOfToday, subMonths } from 'date-fns';

type StatCardProps = {
    title: string;
    value: number;
    icon: React.ElementType;
    bgColorClass: string;
    href?: string;
}

function StatCard({ title, value, icon: Icon, bgColorClass, href }: StatCardProps) {
    const router = useRouter();
    const content = (
         <Card className={`hover:shadow-lg transition-all ${href ? 'cursor-pointer' : ''} ${bgColorClass}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

export default function BookDashboardPage() {
  const [stats, setStats] = useState({
    totalRecetas: 0,
    totalElaboraciones: 0,
    totalIngredientes: 0,
    recetasParaRevisarCount: 0,
    elaboracionesParaRevisarCount: 0,
    ingredientesPorVerificarCount: 0,
  });
  
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    const storedRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[]);
    const storedElaboraciones = (JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]);
    const storedIngredientes = (JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[]);
    
    // --- Lógica para el KPI de Ingredientes por Verificar ---
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
    const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);

    const today = startOfToday();
    const oneYearFromNow = addYears(today, 1);

    // 1. Encontrar todas las recetas que se usarán en el próximo año
    const recetasEnUsoIds = new Set<string>();
    allServiceOrders.forEach(os => {
        const osDate = new Date(os.startDate);
        if (isWithinInterval(osDate, { start: today, end: oneYearFromNow })) {
            const pedidosGastro = allGastroOrders.filter(go => go.osId === os.id);
            pedidosGastro.forEach(pedido => {
                (pedido.items || []).forEach(item => {
                    if (item.type === 'item') {
                        recetasEnUsoIds.add(item.id);
                    }
                });
            });
        }
    });

    // 2. Obtener todas las elaboraciones de esas recetas
    const elaboracionesEnUsoIds = new Set<string>();
    storedRecetas.forEach(receta => {
        if (recetasEnUsoIds.has(receta.id)) {
            (receta.elaboraciones || []).forEach(elab => {
                elaboracionesEnUsoIds.add(elab.elaboracionId);
            });
        }
    });

    // 3. Obtener todos los ingredientes de esas elaboraciones
    const ingredientesEnUsoIds = new Set<string>();
    storedElaboraciones.forEach(elab => {
        if (elaboracionesEnUsoIds.has(elab.id)) {
            (elab.componentes || []).forEach(comp => {
                if (comp.tipo === 'ingrediente') {
                    ingredientesEnUsoIds.add(comp.componenteId);
                }
            });
        }
    });

    // 4. Filtrar los ingredientes que necesitan verificación Y están en uso
    const sixMonthsAgo = subMonths(today, 6);
    const ingredientesPorVerificar = storedIngredientes.filter(ing => {
        const necesitaRevision = !ing.lastRevision || isBefore(new Date(ing.lastRevision), sixMonthsAgo);
        const estaEnUso = ingredientesEnUsoIds.has(ing.id);
        return necesitaRevision && estaEnUso;
    });
    // --- Fin de la lógica del KPI ---
    
    setStats({
      totalRecetas: storedRecetas.length,
      totalElaboraciones: storedElaboraciones.length,
      totalIngredientes: storedIngredientes.length,
      recetasParaRevisarCount: storedRecetas.filter(r => r.requiereRevision).length,
      elaboracionesParaRevisarCount: storedElaboraciones.filter(e => e.requiereRevision).length,
      ingredientesPorVerificarCount: ingredientesPorVerificar.length,
    });
    
    setIsMounted(true);
  }, []);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Panel de Control del Book..." />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} bgColorClass="bg-blue-50" href="/book/recetas" />
            <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} bgColorClass="bg-indigo-50" href="/book/elaboraciones"/>
            <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} bgColorClass="bg-violet-50" href="/book/ingredientes" />
            <StatCard title="Ingredientes por Verificar" value={stats.ingredientesPorVerificarCount} icon={Shield} bgColorClass={stats.ingredientesPorVerificarCount > 0 ? "bg-red-100" : "bg-green-50"} href="/book/verificacionIngredientes" />
            <StatCard title="Necesitan Revisión" value={stats.elaboracionesParaRevisarCount + stats.recetasParaRevisarCount} icon={AlertTriangle} bgColorClass="bg-amber-50" href="/book/revision-ingredientes" />
        </div>
      </main>
    </div>
  );
}
