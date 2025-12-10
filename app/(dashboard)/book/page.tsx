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
    TrendingUp, Activity, Trash2, ShieldCheck, 
    ShieldAlert, Sprout, ThermometerSnowflake, Flame, Cookie, PackageOpen
} from 'lucide-react';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// --- COMPONENTES UI INTERNOS ---

/** Tarjeta 1: RECETARIO GLOBAL */
function RecipeSummaryCard({ total, active, archived }: { total: number, active: number, archived: number }) {
    const activePercentage = total > 0 ? (active / total) * 100 : 0;
    return (
        <Card className="h-full border-primary/20 shadow-sm relative overflow-hidden group flex flex-col bg-card hover:border-primary/40 transition-colors">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookHeart className="w-24 h-24 text-primary" />
            </div>
            <CardHeader className="p-5 pb-2 relative z-10">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                    <BookHeart className="w-5 h-5" />
                    Recetario Global
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1 relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-foreground tracking-tight">{total}</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Recetas</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-wide text-muted-foreground">
                        <span className="text-green-600">Activas ({active})</span>
                        <span>Archivadas ({archived})</span>
                    </div>
                    <Progress value={activePercentage} className="h-2" />
                </div>
            </CardContent>
            <CardFooter className="p-5 pt-0 gap-3 mt-auto relative z-10">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-medium" asChild>
                    <Link href="/book/recetas?filter=active">Ver Activas</Link>
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-muted-foreground" asChild>
                    <Link href="/book/recetas?filter=archived">Archivo</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

/** Tarjeta 2: ÍNDICE DE ALÉRGENOS */
function AllergenSummaryCard({ total, withAllergens }: { total: number, withAllergens: number }) {
    const cleanRecipes = total - withAllergens;
    const cleanPercentage = total > 0 ? (cleanRecipes / total) * 100 : 0;

    return (
        <Card className="h-full border-rose-200 shadow-sm relative overflow-hidden group flex flex-col bg-rose-50/20 hover:border-rose-300 transition-colors">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck className="w-24 h-24 text-rose-500" />
            </div>
            <CardHeader className="p-5 pb-2 relative z-10">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
                    <ShieldCheck className="w-5 h-5" />
                    Seguridad Alimentaria
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1 relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-foreground tracking-tight">{total}</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Analizadas</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-wide">
                        <span className="text-green-700 flex items-center gap-1"><Sprout className="w-3 h-3"/> Libres ({cleanRecipes})</span>
                        <span className="text-rose-700 flex items-center gap-1">Con Alérgenos ({withAllergens}) <ShieldAlert className="w-3 h-3"/></span>
                    </div>
                    {/* Barra con indicador verde inyectado */}
                    <Progress value={cleanPercentage} className="h-2 bg-rose-200 [&>div]:bg-green-600" />
                </div>
            </CardContent>
            <CardFooter className="p-5 pt-0 gap-3 mt-auto relative z-10">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-rose-200 hover:bg-rose-100 text-rose-700 font-medium" asChild>
                    <Link href="/book/alergenos">Ver Todas</Link>
                </Button>
                <Button variant="default" size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm" asChild>
                    <Link href="/book/alergenos?filter=clean">Intolerantes</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

/** Tarjeta 3: ELABORACIONES (Rediseñada) */
function ElaboracionesDetailCard({ total, stats }: { total: number, stats: any }) {
    return (
        <Link href="/book/elaboraciones" className="block h-full">
            <Card className="h-full border-blue-200/60 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col bg-blue-50/10">
                {/* Icono Grande Fondo */}
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Component className="w-24 h-24 text-blue-500" />
                </div>
                
                <CardHeader className="p-5 pb-2 relative z-10">
                    <CardTitle className="text-base font-bold text-blue-700 uppercase tracking-wide flex items-center gap-2">
                        <Component className="w-5 h-5" />
                        Elaboraciones
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 flex-1 relative z-10">
                    <div className="flex items-baseline gap-2 mb-5">
                        <span className="text-4xl font-extrabold text-foreground">{total}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase">Fichas Activas</span>
                    </div>
                    
                    {/* Grid de Partidas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 bg-white/60 p-2 rounded border border-blue-100 shadow-sm">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded"><ThermometerSnowflake className="h-3.5 w-3.5"/></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Frío</span>
                                <span className="text-sm font-bold leading-none">{stats.frio}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 p-2 rounded border border-orange-100 shadow-sm">
                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Flame className="h-3.5 w-3.5"/></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Caliente</span>
                                <span className="text-sm font-bold leading-none">{stats.caliente}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 p-2 rounded border border-pink-100 shadow-sm">
                            <div className="p-1.5 bg-pink-100 text-pink-600 rounded"><Cookie className="h-3.5 w-3.5"/></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Pastelería</span>
                                <span className="text-sm font-bold leading-none">{stats.pasteleria}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 p-2 rounded border border-gray-100 shadow-sm">
                            <div className="p-1.5 bg-gray-100 text-gray-600 rounded"><PackageOpen className="h-3.5 w-3.5"/></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Otros</span>
                                <span className="text-sm font-bold leading-none">{stats.otros}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

/** Tarjeta 4: INGREDIENTES CPR (Rediseñada y Compacta) */
function IngredientesDetailCard({ total, stats }: { total: number, stats: any }) {
    return (
        <Link href="/book/ingredientes" className="block h-full">
            <Card className="h-full border-amber-200/60 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col bg-amber-50/10">
                {/* Icono Grande Fondo */}
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ChefHat className="w-24 h-24 text-amber-500" />
                </div>

                <CardHeader className="p-5 pb-2 relative z-10">
                    <CardTitle className="text-base font-bold text-amber-700 uppercase tracking-wide flex items-center gap-2">
                        <ChefHat className="w-5 h-5" />
                        Ingredientes CPR
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 flex-1 relative z-10">
                    <div className="flex items-baseline gap-2 mb-5">
                        <span className="text-4xl font-extrabold text-foreground">{total}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase">Componentes</span>
                    </div>
                    
                    {/* Lista densa en 2 columnas */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {stats.slice(0, 6).map((cat: any) => (
                            <div key={cat.label} className="flex justify-between items-center text-xs border-b border-dashed border-amber-200/50 pb-1">
                                <span className="text-muted-foreground font-medium truncate max-w-[80%] capitalize" title={cat.label}>
                                    {cat.label.toLowerCase()}
                                </span>
                                <span className="font-mono font-bold text-amber-900">{cat.count}</span>
                            </div>
                        ))}
                        {stats.length === 0 && <span className="text-xs text-muted-foreground italic col-span-2">Sin categorizar</span>}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ... [ActionCard se mantiene igual, no necesita cambios] ...
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
    
    // Consulta mejorada de ingredientes
    const { data: erpData = [], isLoading: loadingErp } = useQuery({ 
        queryKey: ['erpData'], 
        queryFn: async () => { 
            const { data, error } = await supabase.from('articulos_erp').select('tipo'); 
            if (error) throw error; 
            return data || []; 
        }, 
    });

    const { data: ingredientesPendingCount = 0, isLoading: loadingIngredientesPending } = useQuery({ queryKey: ['ingredientesPendingCount'], queryFn: async () => { const sixMonthsAgo = subMonths(startOfToday(), 6); const { data, error } = await supabase.from('ingredientes_internos').select('id, historial_revisiones'); if (error) throw error; return (data || []).filter(item => { const latestRevision = item.historial_revisiones?.[item.historial_revisiones.length - 1]; return !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo); }).length; }, });

    const isLoading = loadingRecetas || loadingElaboraciones || loadingErp || loadingIngredientesPending;

    const stats = useMemo(() => {
        if (isLoading) return null;

        // 1. Recetas
        const totalRecetas = recetas.length;
        const totalRecetasActivas = recetas.filter(r => !r.isArchived).length;
        const totalRecetasArchivadas = totalRecetas - totalRecetasActivas;
        const recetasConAlergenos = recetas.filter(r => r.alergenos && r.alergenos.length > 0).length;
        const recetasParaRevisarCount = recetas.filter(r => r.requiereRevision).length;

        // 2. Elaboraciones
        const elaboracionesEnUso = new Set<string>();
        recetas.forEach(receta => { (receta.elaboraciones || []).forEach((elab: any) => elaboracionesEnUso.add(elab.elaboracionId)); });
        const elaboracionesHuerfanas = elaboraciones.filter(elab => !elaboracionesEnUso.has(elab.id)).length;
        const elaboracionesParaRevisarCount = elaboraciones.filter(e => e.requiereRevision).length;
        
        // Desglose Elaboraciones
        const elabStats = {
            frio: elaboraciones.filter(e => e.partidaProduccion === 'FRIO').length,
            caliente: elaboraciones.filter(e => e.partidaProduccion === 'CALIENTE').length,
            pasteleria: elaboraciones.filter(e => e.partidaProduccion === 'PASTELERIA').length,
            otros: elaboraciones.filter(e => !['FRIO', 'CALIENTE', 'PASTELERIA'].includes(e.partidaProduccion)).length
        };

        // 3. Ingredientes CPR
        const totalIngredientes = erpData.length;
        const catCount: Record<string, number> = {};
        erpData.forEach((item: any) => {
            const tipo = (item.tipo || 'OTROS').toUpperCase().trim();
            catCount[tipo] = (catCount[tipo] || 0) + 1;
        });
        
        // Ordenar y coger top 6 para el grid de 2 columnas
        const topCategories = Object.entries(catCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6)
            .map(([label, count]) => ({ 
                label: label.charAt(0) + label.slice(1).toLowerCase(), 
                count 
            }));

        return { 
            totalRecetas, totalRecetasActivas, totalRecetasArchivadas, recetasConAlergenos, recetasParaRevisarCount,
            totalElaboraciones: elaboraciones.length, elabStats, elaboracionesHuerfanas, elaboracionesParaRevisarCount,
            totalIngredientes, ingStats: topCategories, ingredientesPendingCount
        };
    }, [recetas, elaboraciones, erpData, ingredientesPendingCount, isLoading]);

    if (isLoading || !stats) return <LoadingSkeleton title="Cargando Dashboard..." />;

    return (
        <main className="min-h-screen bg-background pb-20">
            
            {/* HEADER STICKY */}
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center w-full">
                        <div className="flex-1 w-full">
                            <GlobalSearch />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                
                {/* SECCIÓN 1: ESTRUCTURA (GRID 2x2 SIMÉTRICO) */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90">
                        <Activity className="w-4 h-4 text-primary" /> Estructura
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* COLUMNA IZQUIERDA: RECETAS + ELABORACIONES */}
                        <div className="space-y-4 flex flex-col h-full">
                            <div className="flex-1 min-h-[220px]">
                                <RecipeSummaryCard 
                                    total={stats.totalRecetas} 
                                    active={stats.totalRecetasActivas} 
                                    archived={stats.totalRecetasArchivadas} 
                                />
                            </div>
                            <div className="flex-1 min-h-[220px]">
                                <ElaboracionesDetailCard 
                                    total={stats.totalElaboraciones} 
                                    stats={stats.elabStats} 
                                />
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: ALÉRGENOS + INGREDIENTES */}
                        <div className="space-y-4 flex flex-col h-full">
                            <div className="flex-1 min-h-[220px]">
                                <AllergenSummaryCard 
                                    total={stats.totalRecetas} 
                                    withAllergens={stats.recetasConAlergenos} 
                                />
                            </div>
                            <div className="flex-1 min-h-[220px]">
                                <IngredientesDetailCard 
                                    total={stats.totalIngredientes} 
                                    stats={stats.ingStats} 
                                />
                            </div>
                        </div>

                    </div>
                </div>

                <Separator />

                {/* SECCIÓN 2: MANTENIMIENTO (ALERTAS) */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90">
                        <TrendingUp className="w-4 h-4 text-primary" /> Mantenimiento
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <ActionCard title="Recetas a Revisar" count={stats.recetasParaRevisarCount} icon={BookCheck} description="Marcadas para revisión." href="/book/revision-ingredientes?tab=recetas" variant="warning" />
                        <ActionCard title="Elaboraciones a Revisar" count={stats.elaboracionesParaRevisarCount} icon={Component} description="Requieren atención técnica." href="/book/revision-ingredientes?tab=elaboraciones" variant="warning" />
                        <ActionCard title="Ingredientes Antiguos" count={stats.ingredientesPendingCount} icon={AlertCircle} description="Precios > 6 meses sin actualizar." href="/book/ingredientes?pending=true" variant="danger" />
                        <ActionCard title="Huérfanas" count={stats.elaboracionesHuerfanas} icon={Trash2} description="Elaboraciones sin uso. Limpiar." href="/book/elaboraciones?huérfanas=true" variant="danger" />
                    </div>
                </div>
            </div>
        </main>
    );
}