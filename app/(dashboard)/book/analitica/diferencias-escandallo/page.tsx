'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { subDays, format } from 'date-fns';
import { Download, TrendingUp, TrendingDown, AlertCircle, Minus, Activity, Search, BarChart3 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Hooks & External Components
import { useEscandalloAnalytics } from '@/hooks/use-escandallo-analytics';
import { ComparisonTable } from '@/components/book/analitica/comparison-table';
// Asegúrate de haber creado el archivo del PASO 1
import { EvolutionChart } from '@/components/book/analitica/evolution-chart'; 
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AnalyticsLoader } from '@/components/book/analitica/analytics-loader';
import { calculateSummaryStats, isValidDateRange } from '@/lib/escandallo-helpers';
import { cn } from '@/lib/utils';

// --- COMPONENTES LOCALES (Rich Cards Pattern) ---

interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: any;
    isLoading?: boolean;
}

function StatCard({ title, value, subtext, trend = 'neutral', icon: Icon, isLoading }: StatCardProps) {
    if (isLoading) return <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />;

    const trendColor = trend === 'up' 
        ? "text-rose-600 bg-rose-50 border-rose-100" 
        : trend === 'down' 
            ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
            : "text-blue-600 bg-blue-50 border-blue-100";
            
    const iconColor = trend === 'up' ? "text-rose-500" : trend === 'down' ? "text-emerald-500" : "text-blue-500";
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    return (
        <Card className={cn("relative overflow-hidden border shadow-sm transition-all hover:shadow-md", trend === 'up' ? "hover:border-rose-200" : trend === 'down' ? "hover:border-emerald-200" : "hover:border-blue-200")}>
            <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] pointer-events-none">
                <Icon className={cn("w-24 h-24", iconColor)} />
            </div>

            <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                    <span className={cn("text-2xl font-bold tracking-tight", trend === 'up' ? "text-rose-700" : trend === 'down' ? "text-emerald-700" : "text-foreground")}>
                        {value}
                    </span>
                </div>
                {subtext && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className={cn("text-[10px] font-mono px-1 h-5", trendColor)}>
                            <TrendIcon className="w-3 h-3 mr-1" />
                            {trend === 'up' ? '+' : ''}{subtext}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- PÁGINA PRINCIPAL ---

export default function DiferenciasEscandalloPage() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // 1. Estado URL-Driven
  const activeTab = (searchParams.get('tab') || 'recetas') as 'recetas' | 'elaboraciones' | 'ingredientes';
  
  const dateFromParam = searchParams.get('dateFrom');
  const dateToParam = searchParams.get('dateTo');
  const searchTerm = searchParams.get('q') || '';
  const filterVariation = (searchParams.get('filterVar') || 'todos') as 'todos' | 'aumentos' | 'reducciones';
  const minPercent = parseFloat(searchParams.get('minPercent') || '0');

  // Estado local para fechas
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dateFromParam && dateToParam) return { from: new Date(dateFromParam), to: new Date(dateToParam) };
    return { from: subDays(new Date(), 30), to: new Date() };
  });

  const dateFrom = dateFromParam || (dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const dateTo = dateToParam || (dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const isValidRange = isValidDateRange(dateFrom, dateTo);

  // 2. Fetch de Datos
  const { data, snapshots, isLoading, loadingMessage, error } = useEscandalloAnalytics(activeTab, dateFrom, dateTo);

  // 3. Cálculos
  const summaryStats = useMemo(() => calculateSummaryStats(data), [data]);

  // 4. Handlers
  const updateUrl = useCallback((params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => value === null ? current.delete(key) : current.set(key, value));
      router.replace(`?${current.toString()}`, { scroll: false });
    }, [searchParams, router]);

  const handleTabChange = (newTab: string) => {
      updateUrl({ tab: newTab });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from && range?.to) updateUrl({ dateFrom: format(range.from, 'yyyy-MM-dd'), dateTo: format(range.to, 'yyyy-MM-dd') });
  };

  const handleExport = () => {
    if (!data.length) return;
    const csvContent = [
      ['Nombre', 'Tipo', 'Coste Inicial', 'Coste Final', 'Variación €', 'Variación %'],
      ...data.map(i => [i.nombre, i.tipo, i.startPrice.toFixed(2), i.endPrice.toFixed(2), i.diff.toFixed(2), i.percent.toFixed(2)])
    ].map(e => e.join(',')).join('\n');
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `escandallo-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (error && !isLoading) return <div className="p-8 text-center text-red-500">Error cargando analítica: {error}</div>;

  return (
    <main className="min-h-screen bg-background pb-20">
      
      {/* SPLASH SCREEN DE CARGA */}
      <AnalyticsLoader isLoading={isLoading} message={loadingMessage} />

      {/* 1. STICKY HEADER & CONTROLS */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          
          {/* HEADER FLEXIBLE: Título + Controles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            
            {/* TÍTULO PÁGINA (Sustituto Visual del Breadcrumb) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shadow-sm">
                    <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                        Análisis de Costes
                    </h1>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                        Diferencias de Escandallo
                    </span>
                </div>
            </div>

            {/* CONTROLES */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
                </div>
                <Button variant="outline" size="icon" onClick={handleExport} disabled={data.length === 0} title="Exportar CSV">
                    <Download className="h-4 w-4" />
                </Button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {!isValidRange ? (
             <div className="p-10 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Selecciona un rango de fechas</h3>
                <p className="text-muted-foreground text-sm">Necesitamos un periodo inicial y final para comparar los precios.</p>
             </div>
        ) : (
            <>
                {/* KPIs SECTION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Items Afectados" 
                        value={summaryStats.totalItems} 
                        icon={Activity}
                        isLoading={isLoading}
                        trend="neutral"
                        subtext="Registros analizados"
                    />
                    <StatCard 
                        title="Var. Promedio" 
                        value={`${summaryStats.avgVariation > 0 ? '+' : ''}${summaryStats.avgVariation.toFixed(2)}%`}
                        icon={TrendingUp}
                        isLoading={isLoading}
                        trend={summaryStats.avgVariation > 0 ? 'up' : summaryStats.avgVariation < 0 ? 'down' : 'neutral'}
                        subtext="Media global"
                    />
                    <StatCard 
                        title="Mayor Aumento" 
                        value={`+${summaryStats.maxIncrease.percent.toFixed(2)}%`}
                        icon={AlertCircle}
                        isLoading={isLoading}
                        trend="up"
                        subtext={summaryStats.maxIncrease.nombre || '-'}
                    />
                    <StatCard 
                        title="Mayor Ahorro" 
                        value={`${summaryStats.maxDecrease.percent.toFixed(2)}%`}
                        icon={TrendingDown}
                        isLoading={isLoading}
                        trend="down"
                        subtext={summaryStats.maxDecrease.nombre || '-'}
                    />
                </div>

                {/* CHART SECTION */}
                <Card className="border-muted/50 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/5 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Evolución de {activeTab}
                            </CardTitle>
                            {!isLoading && snapshots.length > 0 && (
                                <span className={cn("text-xs font-bold", snapshots[snapshots.length-1].precio > snapshots[0].precio ? "text-rose-600" : "text-emerald-600")}>
                                    {snapshots[snapshots.length-1].precio > snapshots[0].precio ? '+' : ''}
                                    {((snapshots[snapshots.length-1].precio - snapshots[0].precio) / snapshots[0].precio * 100).toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    {/* IMPORTANTE: Altura definida aquí */}
                    <CardContent className="p-0 sm:p-6 h-[350px]">
                        {isLoading ? <LoadingSkeleton title="Cargando gráfica..." /> : (
                            <EvolutionChart snapshots={snapshots} isLoading={isLoading} activeTab={activeTab} />
                        )}
                    </CardContent>
                </Card>

                {/* TABS & DATA TABLE */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex items-center justify-between border-b mb-6">
                         <TabsList className="bg-transparent h-10 p-0 gap-6">
                            {(['recetas', 'elaboraciones', 'ingredientes'] as const).map(tab => (
                                <TabsTrigger 
                                    key={tab} 
                                    value={tab} 
                                    className="capitalize rounded-none border-b-2 border-transparent px-2 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 bg-transparent shadow-none"
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                         </TabsList>
                    </div>

                    {(['recetas', 'elaboraciones', 'ingredientes'] as const).map(tab => (
                        <TabsContent key={tab} value={tab} className="space-y-4 m-0">
                            
                            {/* Toolbar de Filtros */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-muted/10 p-4 rounded-lg border border-muted/20">
                                <div className="relative flex-1 w-full sm:max-w-xs">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar..." 
                                        value={searchTerm} 
                                        onChange={(e) => updateUrl({ q: e.target.value || null })} 
                                        className="pl-9 bg-background h-9"
                                    />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Select value={filterVariation} onValueChange={(val) => updateUrl({ filterVar: val === 'todos' ? null : val })}>
                                        <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="Tipo Var." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todos</SelectItem>
                                            <SelectItem value="aumentos">Aumentos</SelectItem>
                                            <SelectItem value="reducciones">Ahorros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2 border rounded-md px-3 bg-background h-9">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Min %</span>
                                        <Input 
                                            type="number" 
                                            className="w-16 h-6 p-0 border-none focus-visible:ring-0 text-right" 
                                            placeholder="0"
                                            value={minPercent || ''}
                                            onChange={(e) => updateUrl({ minPercent: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Datos */}
                            <ComparisonTable
                                data={data.filter(item => {
                                    if (tab === 'ingredientes') return item.tipo === 'ingrediente';
                                    if (tab === 'elaboraciones') return item.tipo === 'elaboracion';
                                    return item.tipo === 'receta';
                                })}
                                snapshots={snapshots}
                                isLoading={isLoading}
                                searchTerm={searchTerm}
                                filterVariation={filterVariation}
                                minPercent={minPercent}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </>
        )}
      </div>
    </main>
  );
}