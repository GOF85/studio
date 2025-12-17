'use client';

// ----------------------------------------------------------------------
// 1. IMPORTS
// ----------------------------------------------------------------------

// Librerías Externas
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, subMonths, startOfToday, isBefore, format } from 'date-fns';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { GlobalSearch } from '@/components/dashboard/global-search';

// Icons
import { 
    BookHeart, ChefHat, Component, BookCheck, AlertCircle, 
    TrendingUp, Activity, Trash2, ShieldCheck, 
    ShieldAlert, Sprout, ThermometerSnowflake, Flame, Cookie, PackageOpen,
    BarChart3, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

// Hooks & Libs
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { useEscandalloAnalytics } from '@/hooks/use-escandallo-analytics';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Dynamic Imports para componentes pesados (lazy loading)
const AnalisisEconomicoCard = dynamic(() => import('./components/analisis-economico-card'), {
    loading: () => <Card className="h-full bg-emerald-50/10 border-emerald-200/60"><CardContent className="p-5 py-20"><div className="h-32 bg-muted/20 animate-pulse rounded" /></CardContent></Card>,
    ssr: true
});

// ----------------------------------------------------------------------
// 2. SUB-COMPONENTES LOCALES (UI Cards)
// ----------------------------------------------------------------------

/** Tarjeta 1: RECETARIO GLOBAL */
interface RecipeSummaryCardProps {
    total: number;
    active: number;
    archived: number;
}

function RecipeSummaryCard({ total, active, archived }: RecipeSummaryCardProps) {
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
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
interface AllergenSummaryCardProps {
    total: number;
    withAllergens: number;
}

function AllergenSummaryCard({ total, withAllergens }: AllergenSummaryCardProps) {
    const cleanRecipes = total - withAllergens;
    const cleanPercentage = total > 0 ? Math.round((cleanRecipes / total) * 100) : 0;

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

/** Tarjeta 3: ELABORACIONES (Fix: Links Granulares) */
interface ElaboracionesDetailCardProps {
    total: number;
    stats: { frio: number; caliente: number; pasteleria: number; otros: number; };
}

function ElaboracionesDetailCard({ total, stats }: ElaboracionesDetailCardProps) {
    return (
        <Card className="h-full border-blue-200/60 shadow-sm relative overflow-hidden flex flex-col bg-blue-50/10">
            {/* Icono decorativo fondo */}
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Component className="w-24 h-24 text-blue-500" />
            </div>

            {/* Header con Link General */}
            <CardHeader className="p-5 pb-2 relative z-10">
                <Link href="/book/elaboraciones" className="w-fit group/title">
                    <CardTitle className="text-base font-bold text-blue-700 uppercase tracking-wide flex items-center gap-2 group-hover/title:text-blue-800 transition-colors">
                        <Component className="w-5 h-5" />
                        Elaboraciones
                    </CardTitle>
                </Link>
            </CardHeader>

            <CardContent className="p-5 pt-0 flex-1 relative z-10">
                {/* Total Count con Link General */}
                <Link href="/book/elaboraciones" className="block w-fit group/count mb-5">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-foreground group-hover/count:text-blue-700 transition-colors">{total}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase">Fichas Activas</span>
                    </div>
                </Link>

                {/* Grid de Categorías con Links Específicos */}
                <div className="grid grid-cols-2 gap-3">
                    
                    {/* FRIO */}
                    <Link 
                        href="/book/elaboraciones?partida=FRIO" 
                        className="flex items-center gap-2 bg-white/60 hover:bg-white p-2 rounded border border-blue-100 hover:border-blue-400 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded"><ThermometerSnowflake className="h-3.5 w-3.5"/></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Frío</span>
                            <span className="text-sm font-bold leading-none text-foreground">{stats.frio}</span>
                        </div>
                    </Link>

                    {/* CALIENTE */}
                    <Link 
                        href="/book/elaboraciones?partida=CALIENTE" 
                        className="flex items-center gap-2 bg-white/60 hover:bg-white p-2 rounded border border-orange-100 hover:border-orange-400 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Flame className="h-3.5 w-3.5"/></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Caliente</span>
                            <span className="text-sm font-bold leading-none text-foreground">{stats.caliente}</span>
                        </div>
                    </Link>

                    {/* PASTELERIA */}
                    <Link 
                        href="/book/elaboraciones?partida=PASTELERIA" 
                        className="flex items-center gap-2 bg-white/60 hover:bg-white p-2 rounded border border-pink-100 hover:border-pink-400 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="p-1.5 bg-pink-100 text-pink-600 rounded"><Cookie className="h-3.5 w-3.5"/></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Pastelería</span>
                            <span className="text-sm font-bold leading-none text-foreground">{stats.pasteleria}</span>
                        </div>
                    </Link>

                    {/* OTROS */}
                    <Link 
                        href="/book/elaboraciones?partida=OTROS" 
                        className="flex items-center gap-2 bg-white/60 hover:bg-white p-2 rounded border border-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <div className="p-1.5 bg-gray-100 text-gray-600 rounded"><PackageOpen className="h-3.5 w-3.5"/></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Otros</span>
                            <span className="text-sm font-bold leading-none text-foreground">{stats.otros}</span>
                        </div>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

/** Tarjeta 4: INGREDIENTES CPR */
interface IngredientesDetailCardProps {
    total: number;
    stats: Array<{ label: string; count: number }>;
}

function IngredientesDetailCard({ total, stats }: IngredientesDetailCardProps) {
    return (
        <Card className="h-full border-amber-200/60 shadow-sm hover:border-amber-300 transition-all group relative overflow-hidden flex flex-col bg-amber-50/10">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <ChefHat className="w-24 h-24 text-amber-500" />
            </div>
            <CardHeader className="p-5 pb-2 relative z-10">
                <Link href="/book/ingredientes" className="w-fit group/title">
                    <CardTitle className="text-base font-bold text-amber-700 uppercase tracking-wide flex items-center gap-2 group-hover/title:text-amber-800 transition-colors">
                        <ChefHat className="w-5 h-5" />
                        Ingredientes CPR
                    </CardTitle>
                </Link>
            </CardHeader>
            <CardContent className="p-5 pt-0 pb-3 flex-1 relative z-10">
                <Link href="/book/ingredientes" className="block w-fit group/count mb-5">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-foreground group-hover/count:text-amber-700 transition-colors">{total}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase">Componentes</span>
                    </div>
                </Link>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {stats.map((cat) => (
                        <Link
                            key={cat.label}
                            href={`/book/ingredientes?tipo=${encodeURIComponent(cat.label)}`}
                            className="flex justify-between items-center text-xs border-b border-dashed border-amber-200/50 pb-0.5 hover:border-amber-400 transition-colors"
                        >
                            <span className="text-muted-foreground font-medium truncate max-w-[80%] capitalize hover:text-amber-700 transition-colors" title={cat.label}>
                                {cat.label.toLowerCase()}
                            </span>
                            <span className="font-mono font-bold text-amber-900">{cat.count}</span>
                        </Link>
                    ))}
                    {stats.length === 0 && <span className="text-xs text-muted-foreground italic col-span-2">Sin categorizar</span>}
                </div>
            </CardContent>
        </Card>
    );
}

/** ACTION CARD */
interface ActionCardProps {
    title: string;
    count: number;
    icon: any;
    description: string;
    href: string;
    variant?: "default" | "danger" | "warning";
}

function ActionCard({ title, count, icon: Icon, description, href, variant = "default" }: ActionCardProps) {
    const isClean = count === 0;
    const statusColor = isClean 
        ? "bg-green-50/50 text-green-700 border-green-200 hover:border-green-300" 
        : variant === "danger" 
            ? "bg-red-50/50 text-red-700 border-red-200 hover:border-red-300" 
            : "bg-amber-50/50 text-amber-700 border-amber-200 hover:border-amber-300";
            
    const IconColor = isClean 
        ? "text-green-600" 
        : (variant === "danger" ? "text-red-600" : "text-amber-600");

    return (
        <Link href={href} className="block h-full">
            <Card className={cn("transition-all h-full border shadow-sm", statusColor)}>
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Icon className={cn("w-3.5 h-3.5", IconColor)} />{title}
                    </CardTitle>
                    {count > 0 && <Badge variant="secondary" className="bg-white/60 text-[10px] h-4 px-1 text-foreground font-mono">{count}</Badge>}
                </CardHeader>
                <CardContent className="p-3 pt-1">
                    <p className="text-[10px] opacity-80 leading-snug">{isClean ? "Todo correcto." : description}</p>
                </CardContent>
            </Card>
        </Link>
    );
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE
// ----------------------------------------------------------------------

export default function BookDashboardPage() {
    
    // UX: Scroll Reset
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, []);

    // Hooks de datos
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();

    // Consulta ingredientes_internos y articulos_erp para la tarjeta CPR (merge para obtener tipo)
    const { data: ingredientesData = [], isLoading: loadingIngredientes } = useQuery({
        queryKey: ['ingredientesDataWithTipo'],
        queryFn: async () => {
            // 1. Obtener ingredientes_internos
            const { data: ingredientes, error: errorIng } = await supabase
                .from('ingredientes_internos')
                .select('id, producto_erp_link_id, historial_revisiones');
            if (errorIng) throw errorIng;
            if (!ingredientes || ingredientes.length === 0) return [];

            // 2. Obtener articulos_erp solo para los productos linkeados
            const erpIds = ingredientes
                .map((i) => i.producto_erp_link_id)
                .filter(Boolean);
            let articulos = [];
            if (erpIds.length > 0) {
                const { data: articulosData, error: errorArt } = await supabase
                    .from('articulos_erp')
                    .select('erp_id, tipo')
                    .in('erp_id', erpIds);
                if (errorArt) throw errorArt;
                articulos = articulosData || [];
            }

            // 3. Merge ingredientes + tipo
            const erpMap = Object.fromEntries(articulos.map(a => [a.erp_id, a.tipo]));
            return ingredientes.map(ing => ({
                ...ing,
                tipo: erpMap[ing.producto_erp_link_id] || 'OTROS',
            }));
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // Ingredientes pendientes (antiguos)
    const { data: ingredientesPendingCount = 0, isLoading: loadingIngredientesPending } = useQuery({
        queryKey: ['ingredientesPendingCount'],
        queryFn: async () => {
            const sixMonthsAgo = subMonths(startOfToday(), 6);
            const { data, error } = await supabase
                .from('ingredientes_internos')
                .select('id, historial_revisiones');
            if (error) throw error;
            return (data || []).filter(item => {
                const latestRevision = item.historial_revisiones?.[item.historial_revisiones.length - 1];
                return !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
            }).length;
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 45 * 60 * 1000,
    });

    const isLoading = loadingRecetas || loadingElaboraciones || loadingIngredientes || loadingIngredientesPending;

    // Estadísticas Calculadas
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

        const elabStats = {
            frio: elaboraciones.filter(e => e.partidaProduccion === 'FRIO').length,
            caliente: elaboraciones.filter(e => e.partidaProduccion === 'CALIENTE').length,
            pasteleria: elaboraciones.filter(e => e.partidaProduccion === 'PASTELERIA').length,
            otros: elaboraciones.filter(e => !['FRIO', 'CALIENTE', 'PASTELERIA'].includes(e.partidaProduccion)).length
        };

        // 3. Ingredientes (usando ingredientes_internos)
        const totalIngredientes = ingredientesData.length;
        const catCount: Record<string, number> = {};
        ingredientesData.forEach((item: any) => {
            const tipo = (item.tipo || 'OTROS').toUpperCase().trim();
            catCount[tipo] = (catCount[tipo] || 0) + 1;
        });

        const topCategories = Object.entries(catCount)
            .sort(([, a], [, b]) => b - a)
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
    }, [recetas, elaboraciones, ingredientesData, ingredientesPendingCount, isLoading]);

    if (isLoading || !stats) return <LoadingSkeleton title="Cargando Dashboard..." />;

    return (
        <main className="min-h-screen bg-background pb-20">
            
            {/* HEADER STICKY */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center w-full">
                        <div className="flex-1 w-full">
                            <div className="relative shadow-md rounded-lg border-2 border-primary/20 focus-within:border-primary/50 transition-all bg-background">
                                <GlobalSearch />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                
                {/* SECCIÓN 1: ESTRUCTURA */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90">
                        <Activity className="w-4 h-4 text-primary" /> Estructura
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                {/* SECCIÓN 2: MANTENIMIENTO */}
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

                <Separator />

                {/* SECCIÓN 3: ANÁLISIS ECONÓMICO */}
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2 text-foreground/90">
                        <BarChart3 className="w-4 h-4 text-emerald-600" /> Análisis Económico
                    </h2>
                    <AnalisisEconomicoCard />
                </div>
            </div>
        </main>
    );
}