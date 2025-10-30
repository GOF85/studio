

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

  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const storedElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const storedIngredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    
    setStats({
      totalRecetas: storedRecetas.length,
      totalElaboraciones: storedElaboraciones.length,
      totalIngredientes: storedIngredientes.length,
      recetasParaRevisar: storedRecetas.filter(r => r.requiereRevision).length,
    });
    
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
            <StatCard title="Recetas para Revisar" value={stats.recetasParaRevisar} icon={AlertTriangle} bgColorClass={stats.recetasParaRevisar > 0 ? "bg-amber-100 text-amber-800" : "bg-green-50"} href="/book/informe" />
        </div>
      </main>
    </div>
  );
}
