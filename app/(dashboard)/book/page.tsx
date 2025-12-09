'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subMonths, startOfToday, isBefore } from 'date-fns';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { GlobalSearch } from '@/components/dashboard/global-search';

// Iconos
import { 
    BookHeart, ChefHat, Component, BookCheck, AlertCircle, 
    TrendingUp, Activity, Trash2, ShieldCheck 
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
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 border-primary/20 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><BookHeart className="w-20 h-20 text-primary" /></div>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-base font-bold flex items-center gap-2"><BookHeart className="w-4 h-4 text-primary" />Recetario Global</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-2 mb-3"><span className="text-4xl font-extrabold text-foreground tracking-tight">{total}</span><span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recetas</span></div>
                <div className="space-y-1.5"><div className="flex justify-between text-[10px] uppercase font-semibold tracking-wide"><span className="text-green-600">Activas ({active})</span><span className="text-muted-foreground">Archivadas ({archived})</span></div><Progress value={activePercentage} className="h-1.5" /></div>
            </CardContent>
            <CardFooter className="p-3 pt-0 gap-2"><Button variant="outline" size="sm" className="flex-1 h-7 text-xs" asChild><Link href="/book/recetas?filter=active">Ver Activas</Link></Button><Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-muted-foreground" asChild><Link href="/book/recetas?filter=archived">Archivo</Link></Button></CardFooter>
        </Card>
    );
}

function MetricCard({ title, value, icon: Icon, href, color, label = "Gestionar" }: { title: string, value: number, icon: any, href: string, color: string, label?: string }) {
    return (
        <Link href={href} className="block h-full">
            <Card className="h-full border shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle><div className={cn("p-1.5 rounded-full bg-muted/20 group-hover:bg-transparent transition-colors", color)}><Icon className="h-4 w-4" /></div></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-foreground">{value}</div></CardContent>
            </Card>
        </Link>
    );
}

function ActionCard({ title, count, icon: Icon, description, href, variant = "default" }: { title: string, count: number, icon: any, description: string, href: string, variant?: "default" | "danger" | "warning" }) {
    const isClean = count === 0;
    const statusColor = isClean ? "bg-green-50/50 text-green-700 border-green-200 hover:border-green-300" : variant === "danger" ? "bg-red-50/50 text-red-700 border-red-200 hover:border-red-300" : "bg-amber-50/50 text-amber-700 border-amber-200 hover:border-amber-300";
    const IconColor = isClean ? "text-green-600" : (variant === "danger" ? "text-red-600" : "text-amber-600");
    return (
        <Link href={href} className="block h-full">
            <Card className={cn("transition-all h-full border shadow-sm", statusColor)}>
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-xs font-bold flex items-center gap-1.5"><Icon className={cn("w-3.5 h-3.5", IconColor)} />{title}</CardTitle>{count > 0 && <Badge variant="secondary" className="bg-white/60 text-[10px] h-4 px-1 text-foreground font-mono">{count}</Badge>}</CardHeader>
                <CardContent className="p-3 pt-1"><p className="text-[10px] opacity-80 leading-snug">{isClean ? "Todo correcto." : description}</p></CardContent>
            </Card>
        </Link>
    );
}

// --- PÁGINA PRINCIPAL ---

export default function BookDashboardPage() {
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();
    const { data: ingredientesCount = 0, isLoading: loadingIngredientes } = useQuery({ queryKey: ['ingredientesCount'], queryFn: async () => { const { count, error } = await supabase.from('ingredientes_internos').select('*', { count: 'exact', head: true }); if (error) throw error; return count || 0; }, });
    const { data: ingredientesPendingCount = 0, isLoading: loadingIngredientesPending } = useQuery({ queryKey: ['ingredientesPendingCount'], queryFn: async () => { const sixMonthsAgo = subMonths(startOfToday(), 6); const { data, error } = await supabase.from('ingredientes_internos').select('id, historial_revisiones'); if (error) throw error; return (data || []).filter(item => { const latestRevision = item.historial_revisiones?.[item.historial_revisiones.length - 1]; return !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo); }).length; }, });

    const isLoading = loadingRecetas || loadingElaboraciones || loadingIngredientes || loadingIngredientesPending;

    const stats = useMemo(() => {
        if (isLoading) return { totalRecetas: 0, totalRecetasActivas: 0, totalRecetasArchivadas: 0, totalElaboraciones: 0, totalIngredientes: 0, elaboracionesHuerfanas: 0, recetasParaRevisarCount: 0, elaboracionesParaRevisarCount: 0, ingredientesPendingCount: 0, recetasConAlergenos: 0 };
        const totalRecetas = recetas.length;
        const totalRecetasActivas = recetas.filter(r => !r.isArchived).length;
        const totalRecetasArchivadas = totalRecetas - totalRecetasActivas;
        const elaboracionesEnUso = new Set<string>();
        recetas.forEach(receta => { (receta.elaboraciones || []).forEach((elab: any) => elaboracionesEnUso.add(elab.elaboracionId)); });
        const elaboracionesHuerfanas = elaboraciones.filter(elab => !elaboracionesEnUso.has(elab.id)).length;
        const recetasConAlergenos = recetas.filter(r => r.alergenos && r.alergenos.length > 0).length;
        return { totalRecetas, totalRecetasActivas, totalRecetasArchivadas, totalElaboraciones: elaboraciones.length, totalIngredientes: ingredientesCount, elaboracionesHuerfanas, recetasParaRevisarCount: recetas.filter(r => r.requiereRevision).length, elaboracionesParaRevisarCount: elaboraciones.filter(e => e.requiereRevision).length, ingredientesPendingCount, recetasConAlergenos };
    }, [recetas, elaboraciones, ingredientesCount, ingredientesPendingCount, isLoading]);

    if (isLoading) return <LoadingSkeleton title="Cargando Dashboard..." />;

    return (
        <main className="min-h-screen bg-background pb-20">
            
            {/* HEADER STICKY MINIMALISTA (SOLO BUSCADOR) */}
            {/* FIX: Usamos top-12 para compensar la altura del header del layout */}
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center w-full">
                        <div className="flex-1 max-w-xl">
                            <GlobalSearch />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                {/* SECCIÓN 1: ESTRUCTURA (KPIs) */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90"><Activity className="w-4 h-4 text-primary" /> Estructura</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <RecipeSummaryCard total={stats.totalRecetas} active={stats.totalRecetasActivas} archived={stats.totalRecetasArchivadas} />
                        <MetricCard title="Elaboraciones" value={stats.totalElaboraciones} icon={Component} href="/book/elaboraciones" color="text-blue-500" />
                        <MetricCard title="Ingredientes" value={stats.totalIngredientes} icon={ChefHat} href="/book/ingredientes" color="text-amber-500" />
                        <MetricCard title="Con Alérgenos" value={stats.recetasConAlergenos} icon={ShieldCheck} href="/book/alergenos" color="text-rose-500" />
                    </div>
                </div>

                <Separator />

                {/* SECCIÓN 2: MANTENIMIENTO (ALERTAS) */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90"><TrendingUp className="w-4 h-4 text-primary" /> Mantenimiento</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <ActionCard title="Recetas a Revisar" count={stats.recetasParaRevisarCount} icon={BookCheck} description="Marcadas para revisión manual." href="/book/revision-ingredientes?tab=recetas" variant="warning" />
                        <ActionCard title="Elaboraciones a Revisar" count={stats.elaboracionesParaRevisarCount} icon={Component} description="Requieren atención técnica." href="/book/revision-ingredientes?tab=elaboraciones" variant="warning" />
                        <ActionCard title="Ingredientes Antiguos" count={stats.ingredientesPendingCount} icon={AlertCircle} description="Precios > 6 meses sin actualizar." href="/book/ingredientes?pending=true" variant="danger" />
                        <ActionCard title="Huérfanas" count={stats.elaboracionesHuerfanas} icon={Trash2} description="Elaboraciones sin uso. Limpiar." href="/book/elaboraciones?huérfanas=true" variant="danger" />
                    </div>
                </div>
            </div>
        </main>
    );
}