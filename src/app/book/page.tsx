'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookHeart, ChefHat, Component, Package, PlusCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion, IngredienteInterno, ServiceOrder, GastronomyOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { startOfYear, endOfYear, isWithinInterval } from 'date-fns';

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
         <Card className={cn('hover:shadow-lg transition-all', href && 'cursor-pointer', bgColorClass)} onClick={() => href && router.push(href)}>
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
    recetasParaRevisar: 0,
  });
  const [topUsedRecipes, setTopUsedRecipes] = useState<{ nombre: string, count: number }[]>([]);
  const [mostUsedElaborations, setMostUsedElaborations] = useState<{ nombre: string, count: number }[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const storedElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const storedIngredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const serviceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const gastronomyOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];

    setStats({
      totalRecetas: storedRecetas.length,
      totalElaboraciones: storedElaboraciones.length,
      totalIngredientes: storedIngredientes.length,
      recetasParaRevisar: storedRecetas.filter(r => r.requiereRevision).length,
    });
    
    // Filter orders for the current year
    const now = new Date();
    const startOfCurrentYear = startOfYear(now);
    const endOfCurrentYear = endOfYear(now);
    
    const osIdsCurrentYear = new Set(
        serviceOrders
            .filter(os => {
                try {
                    const osDate = new Date(os.startDate);
                    return isWithinInterval(osDate, { start: startOfCurrentYear, end: endOfCurrentYear });
                } catch(e) { return false; }
            })
            .map(os => os.id)
    );

    const gastroOrdersCurrentYear = gastronomyOrders.filter(go => osIdsCurrentYear.has(go.osId));

    // Top 20 Recetas más utilizadas
    const recipeUsageCount = new Map<string, number>();
    gastroOrdersCurrentYear.forEach(order => {
        (order.items || []).forEach(item => {
            if(item.type === 'item') {
                const qty = item.quantity || 1;
                recipeUsageCount.set(item.id, (recipeUsageCount.get(item.id) || 0) + qty);
            }
        });
    });
    
    const sortedRecipes = Array.from(recipeUsageCount.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 20)
        .map(([recetaId, count]) => {
            const receta = storedRecetas.find(r => r.id === recetaId);
            return { nombre: receta?.nombre || 'Desconocido', count };
        });
    setTopUsedRecipes(sortedRecipes);


    // Top 20 Elaboraciones más utilizadas
    const elabUsageCount = new Map<string, number>();
    gastroOrdersCurrentYear.forEach(order => {
        (order.items || []).forEach(item => {
             if(item.type === 'item') {
                const receta = storedRecetas.find(r => r.id === item.id);
                const orderQty = item.quantity || 1;
                if (receta) {
                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elabId = elabEnReceta.elaboracionId;
                        const elabQtyInReceta = elabEnReceta.cantidad || 0;
                        elabUsageCount.set(elabId, (elabUsageCount.get(elabId) || 0) + (orderQty * elabQtyInReceta));
                    });
                }
            }
        });
    });
    
    const sortedElabs = Array.from(elabUsageCount.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 20)
        .map(([elabId, count]) => {
            const elab = storedElaboraciones.find(e => e.id === elabId);
            return { nombre: elab?.nombre || 'Desconocido', count };
        });
    setMostUsedElaborations(sortedElabs);

    setIsMounted(true);
  }, []);


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Panel de Control del Book..." />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} bgColorClass="bg-blue-50" href="/book/recetas" />
            <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} bgColorClass="bg-indigo-50" href="/book/elaboraciones"/>
            <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} bgColorClass="bg-violet-50" href="/book/ingredientes" />
            <StatCard title="Recetas para Revisar" value={stats.recetasParaRevisar} icon={AlertTriangle} bgColorClass={stats.recetasParaRevisar > 0 ? "bg-amber-100 text-amber-800" : "bg-green-50"} />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Top 20 Elaboraciones más Utilizadas (Año en curso)</CardTitle>
                    <CardDescription>Identifica las preparaciones clave para optimizar la producción.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={mostUsedElaborations} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="nombre" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{fill: 'hsl(var(--accent))'}}
                                content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <p className="font-bold">{`${payload[0].payload.nombre}: ${payload[0].value?.toLocaleString()} uds.`}</p>
                                    </div>
                                    )
                                }
                                return null
                                }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top 20 Recetas más Utilizadas (Año en curso)</CardTitle>
                     <CardDescription>Analiza las recetas con mayor demanda.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={topUsedRecipes} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="nombre" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{fill: 'hsl(var(--accent))'}}
                                content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <p className="font-bold">{`${payload[0].payload.nombre}: ${payload[0].value} veces`}</p>
                                    </div>
                                    )
                                }
                                return null
                                }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
