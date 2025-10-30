
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BookHeart, ChefHat, Component, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta, Elaboracion, IngredienteInterno, ServiceOrder, GastronomyOrder } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';
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

export default function BookInformePage() {
  const [stats, setStats] = useState({
    totalRecetas: 0,
    totalElaboraciones: 0,
    totalIngredientes: 0,
  });
  const [topUsedRecipes, setTopUsedRecipes] = useState<{ nombre: string, count: number, pvp: number, coste: number, margen: number }[]>([]);
  const [mostUsedElaborationsByUnit, setMostUsedElaborationsByUnit] = useState<{ nombre: string; count: number; pvp: number; coste: number; margen: number; unidad: string; }[]>([]);
  const [mostUsedElaborationsByWeight, setMostUsedElaborationsByWeight] = useState<{ nombre: string; count: number; pvp: number; coste: number; margen: number; unidad: string; }[]>([]);
  const [isMounted, setIsMounted] = useState(false);

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
    });
    
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

    const recipeUsage = new Map<string, { count: number; pvp: number; coste: number }>();
    gastroOrdersCurrentYear.forEach(order => {
        (order.items || []).forEach(item => {
            if(item.type === 'item') {
                const qty = item.quantity || 1;
                const existing = recipeUsage.get(item.id) || { count: 0, pvp: 0, coste: 0 };
                existing.count += qty;
                existing.pvp += (item.precioVenta || 0) * qty;
                existing.coste += (item.costeMateriaPrima || 0) * qty;
                recipeUsage.set(item.id, existing);
            }
        });
    });
    
    const sortedRecipes = Array.from(recipeUsage.entries())
        .sort(([, dataA], [, dataB]) => dataB.count - dataA.count)
        .slice(0, 20)
        .map(([recetaId, data]) => {
            const receta = storedRecetas.find(r => r.id === recetaId);
            return { nombre: receta?.nombre || 'Desconocido', ...data, margen: data.pvp - data.coste };
        });
    setTopUsedRecipes(sortedRecipes);

    const elabUsage = new Map<string, { count: number; pvp: number; coste: number; unidad: string }>();
    gastroOrdersCurrentYear.forEach(order => {
        (order.items || []).forEach(item => {
             if(item.type === 'item') {
                const receta = storedRecetas.find(r => r.id === item.id);
                const orderQty = item.quantity || 1;
                if (receta) {
                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elabId = elabEnReceta.elaboracionId;
                        const elabData = storedElaboraciones.find(e => e.id === elabId);
                        if(elabData) {
                            const qty = orderQty * elabEnReceta.cantidad;
                            const elabCoste = (elabData.costePorUnidad || 0) * qty;
                            const elabPvp = receta.precioVenta ? (receta.precioVenta * (elabCoste / (receta.costeMateriaPrima || 1))) : 0;
                            
                            const existing = elabUsage.get(elabId) || { count: 0, pvp: 0, coste: 0, unidad: elabData.unidadProduccion };
                            existing.count += qty;
                            existing.coste += elabCoste;
                            existing.pvp += elabPvp;
                            elabUsage.set(elabId, existing);
                        }
                    });
                }
            }
        });
    });

    const allSortedElabs = Array.from(elabUsage.entries())
      .map(([elabId, data]) => {
          const elab = storedElaboraciones.find(e => e.id === elabId);
          return { nombre: elab?.nombre || 'Desconocido', ...data, margen: data.pvp - data.coste };
      });

    setMostUsedElaborationsByUnit(allSortedElabs.filter(e => e.unidad === 'UD').sort((a,b) => b.count - a.count).slice(0, 20));
    setMostUsedElaborationsByWeight(allSortedElabs.filter(e => e.unidad === 'KG' || e.unidad === 'L').sort((a,b) => b.count - a.count).slice(0, 20));

    setIsMounted(true);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
          <p className="font-bold text-base mb-2">{label}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="font-semibold text-muted-foreground">Cantidad:</span>
            <span className="text-right font-mono">{formatNumber(data.count, 2)} {data.unidad || 'uds'}</span>
            <span className="font-semibold text-muted-foreground">Facturación:</span>
            <span className="text-right font-mono">{formatCurrency(data.pvp)}</span>
            <span className="font-semibold text-muted-foreground">Coste MP:</span>
            <span className="text-right font-mono">{formatCurrency(data.coste)}</span>
            <span className="font-bold text-primary">Margen Bruto:</span>
            <span className="text-right font-bold font-mono text-primary">{formatCurrency(data.margen)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Informe Gastronómico..." />;
  }

  return (
    <main>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <StatCard title="Total Recetas" value={stats.totalRecetas} icon={BookHeart} bgColorClass="bg-blue-50" href="/book/recetas" />
            <StatCard title="Total Elaboraciones" value={stats.totalElaboraciones} icon={Component} bgColorClass="bg-indigo-50" href="/book/elaboraciones"/>
            <StatCard title="Total Ingredientes" value={stats.totalIngredientes} icon={ChefHat} bgColorClass="bg-violet-50" href="/book/ingredientes" />
        </div>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Top 20 Recetas más Utilizadas (Año en curso)</CardTitle>
                <CardDescription>Analiza las recetas con mayor demanda.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={topUsedRecipes} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="nombre" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--accent))'}}/>
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        <div className="grid lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Top 20 Elaboraciones por Peso/Volumen (Año en curso)</CardTitle>
                    <CardDescription>Bases, salsas y guarniciones más producidas en Kg o Litros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={mostUsedElaborationsByWeight} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="nombre" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--accent))'}}/>
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top 20 Elaboraciones por Unidad (Año en curso)</CardTitle>
                    <CardDescription>Aperitivos, postres y otras elaboraciones unitarias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={mostUsedElaborationsByUnit} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="nombre" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--accent))'}}/>
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
