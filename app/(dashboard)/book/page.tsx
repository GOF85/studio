'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subMonths, startOfToday, isBefore } from 'date-fns';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

// Iconos
import { 
    BookHeart, ChefHat, Component, BookCheck, AlertCircle, 
    TrendingUp, ArrowRight, Activity, Trash2, ShieldCheck 
} from 'lucide-react';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// --- COMPONENTES UI INTERNOS ---

function RecipeSummaryCard({ total, active, archived }: { total: number, active: number, archived: number }) {
    const activePercentage = total > 0 ? (active / total) * 100 : 0;

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 border-primary/20 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookHeart className="w-24 h-24 text-primary" />
            </div>
            
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BookHeart className="w-5 h-5 text-primary" />
                    Recetario Global
                </CardTitle>
            </CardHeader>
            
            <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-extrabold text-foreground">{total}</span>
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Recetas Totales</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-green-600">Activas ({active})</span>
                        <span className="text-muted-foreground">Archivadas ({archived})</span>
                    </div>
                    <Progress value={activePercentage} className="h-2" />
                </div>
            </CardContent>

            <CardFooter className="pt-2 gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <Link href="/book/recetas?filter=active">Ver Activas</Link>
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs text-muted-foreground" asChild>
                    <Link href="/book/recetas?filter=archived">Ver Archivo</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function MetricCard({ title, value, icon: Icon, href, color, label = "Gestionar" }: { title: string, value: number, icon: any, href: string, color: string, label?: string }) {
    return (
        <Link href={href} className="block h-full">
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", color)} />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{value}</div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                        {label} <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function ActionCard({ title, count, icon: Icon, description, href, variant = "default" }: { title: string, count: number, icon: any, description: string, href: string, variant?: "default" | "danger" | "warning" }) {
    const isClean = count === 0;
    const statusColor = isClean 
        ? "bg-green-50 text-green-700 border-green-200 hover:border-green-300" 
        : variant === "danger" 
            ? "bg-red-50 text-red-700 border-red-200 hover:border-red-300" 
            : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300";

    const IconColor = isClean ? "text-green-600" : (variant === "danger" ? "text-red-600" : "text-amber-600");

    return (
        <Link href={href} className="block">
            <Card className={cn("transition-all h-full border", statusColor)}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", IconColor)} />
                        {title}
                    </CardTitle>
                    {count > 0 && <Badge variant="secondary" className="bg-white/50 text-foreground font-mono">{count}</Badge>}
                </CardHeader>
                <CardContent>
                    <p className="text-xs opacity-90 leading-snug">
                        {isClean ? "Todo en orden. No hay elementos pendientes." : description}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function BookDashboardPage() {
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();

    const { data: ingredientesCount = 0, isLoading: loadingIngredientes } = useQuery({
        queryKey: ['ingredientesCount'],
        queryFn: async () => {
            const { count, error } = await supabase.from('ingredientes_internos').select('*', { count: 'exact', head: true });
            if (error) throw error;
            return count || 0;
        },
    });

    const { data: ingredientesPendingCount = 0, isLoading: loadingIngredientesPending } = useQuery({
        queryKey: ['ingredientesPendingCount'],
        queryFn: async () => {
            const sixMonthsAgo = subMonths(startOfToday(), 6);
            const { data, error } = await supabase.from('ingredientes_internos').select('id, historial_revisiones');
            if (error) throw error;
            return (data || []).filter(item => {
                const latestRevision = item.historial_revisiones?.[item.historial_revisiones.length - 1];
                return !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
            }).length;
        },
    });

    const isLoading = loadingRecetas || loadingElaboraciones || loadingIngredientes || loadingIngredientesPending;

    const stats = useMemo(() => {
        if (isLoading) return {
            totalRecetas: 0, totalRecetasActivas: 0, totalRecetasArchivadas: 0,
            totalElaboraciones: 0, totalIngredientes: 0, elaboracionesHuerfanas: 0,
            recetasParaRevisarCount: 0, elaboracionesParaRevisarCount: 0, ingredientesPendingCount: 0,
            recetasConAlergenos: 0
        };

        const totalRecetas = recetas.length;
        const totalRecetasActivas = recetas.filter(r => !r.isArchived).length;
        const totalRecetasArchivadas = totalRecetas - totalRecetasActivas;
        
        const elaboracionesEnUso = new Set<string>();
        recetas.forEach(receta => {
            (receta.elaboraciones || []).forEach((elab: any) => elaboracionesEnUso.add(elab.elaboracionId));
        });
        const elaboracionesHuerfanas = elaboraciones.filter(elab => !elaboracionesEnUso.has(elab.id)).length;
        const recetasConAlergenos = recetas.filter(r => r.alergenos && r.alergenos.length > 0).length;

        return {
            totalRecetas,
            totalRecetasActivas,
            totalRecetasArchivadas,
            totalElaboraciones: elaboraciones.length,
            totalIngredientes: ingredientesCount,
            elaboracionesHuerfanas,
            recetasParaRevisarCount: recetas.filter(r => r.requiereRevision).length,
            elaboracionesParaRevisarCount: elaboraciones.filter(e => e.requiereRevision).length,
            ingredientesPendingCount,
            recetasConAlergenos,
        };
    }, [recetas, elaboraciones, ingredientesCount, ingredientesPendingCount, isLoading]);

    if (isLoading) return <LoadingSkeleton title="Cargando Dashboard..." />;

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
            
            {/* SECCIÓN 1: KPI PRINCIPALES */}
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Estructura del Book
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <RecipeSummaryCard 
                        total={stats.totalRecetas} 
                        active={stats.totalRecetasActivas} 
                        archived={stats.totalRecetasArchivadas} 
                    />
                    <MetricCard 
                        title="Elaboraciones" 
                        value={stats.totalElaboraciones} 
                        icon={Component} 
                        href="/book/elaboraciones" 
                        color="text-blue-500" 
                    />
                    <MetricCard 
                        title="Ingredientes" 
                        value={stats.totalIngredientes} 
                        icon={ChefHat} 
                        href="/book/ingredientes" 
                        color="text-amber-500" 
                    />
                     <MetricCard 
                        title="Índice Alérgenos" 
                        value={stats.recetasConAlergenos} 
                        icon={ShieldCheck} 
                        href="/book/alergenos" 
                        color="text-rose-500" 
                        label="Consultar"
                    />
                </div>
            </div>

            <Separator />

            {/* SECCIÓN 2: CALIDAD Y MANTENIMIENTO */}
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Control de Calidad
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard
                        title="Recetas a Revisar"
                        count={stats.recetasParaRevisarCount}
                        icon={BookCheck}
                        description="Recetas marcadas manualmente para revisión."
                        // FIX: Enlace con parámetro de pestaña
                        href="/book/revision-ingredientes?tab=recetas"
                        variant="warning"
                    />
                    <ActionCard
                        title="Elaboraciones a Revisar"
                        count={stats.elaboracionesParaRevisarCount}
                        icon={Component}
                        description="Elaboraciones que requieren atención técnica."
                        // FIX: Enlace con parámetro de pestaña
                        href="/book/revision-ingredientes?tab=elaboraciones"
                        variant="warning"
                    />
                     <ActionCard
                        title="Ingredientes Desactualizados"
                        count={stats.ingredientesPendingCount}
                        icon={AlertCircle}
                        description="Precios no actualizados en +6 meses."
                        href="/book/ingredientes?pending=true"
                        variant="danger"
                    />
                    <ActionCard
                        title="Elaboraciones Huérfanas"
                        count={stats.elaboracionesHuerfanas}
                        icon={Trash2}
                        description="No se usan en ninguna receta. Limpiar DB."
                        href="/book/elaboraciones?huérfanas=true"
                        variant="danger"
                    />
                </div>
            </div>
        </div>
    );
}