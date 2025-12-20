'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, Suspense } from 'react';
import { subDays, format } from 'date-fns';
import { Download, TrendingUp, TrendingDown, Activity, Search, BarChart3, ChefHat, Scroll, Carrot, Package, AlertCircle } from 'lucide-react';
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
import { useEscandalloAnalyticsNew, VariacionItem } from '@/hooks/use-escandallo-analytics-mejorado';
import { ComparisonTable } from '@/components/book/analitica/comparison-table';
import { EvolutionChart } from '@/components/book/analitica/evolution-chart'; 
import { ItemHistoryModal } from '@/components/book/analitica/item-history-modal';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AnalyticsLoader } from '@/components/book/analitica/analytics-loader';
import { calculateSummaryStats, isValidDateRange } from '@/lib/escandallo-helpers';
import { cn } from '@/lib/utils';

// --- COMPONENTES LOCALES ---

interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: any;
    isLoading?: boolean;
}

function StatCard({ title, value, subtext, trend = 'neutral', icon: Icon, isLoading }: StatCardProps) {
    if (isLoading) return <div className="h-28 bg-muted/20 rounded-xl animate-pulse" />;

    const trendColor = trend === 'up' 
        ? "text-rose-600 bg-rose-50 border-rose-100" 
        : trend === 'down' 
            ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
            : "text-blue-600 bg-blue-50 border-blue-100";
            
    const iconColor = trend === 'up' ? "text-rose-500" : trend === 'down' ? "text-emerald-500" : "text-blue-500";
    
    return (
        <Card className={cn("relative overflow-hidden border shadow-sm transition-all hover:shadow-md")}>
            <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] pointer-events-none">
                <Icon className={cn("w-20 h-20", iconColor)} />
            </div>

            <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                    <span className={cn("text-2xl font-bold tracking-tight text-foreground")}>
                        {value}
                    </span>
                </div>
                {subtext && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className={cn("text-[10px] font-mono px-1.5 h-5", trendColor)}>
                            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : ''} {subtext}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- PÁGINA PRINCIPAL ---

function DiferenciasEscandalloPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // 1. Estado URL-Driven
  const activeTab = (searchParams.get('tab') || 'recetas') as 'recetas' | 'elaboraciones' | 'ingredientes' | 'articulos';
  
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

  // Estado para el Modal de Detalle
  const [selectedItem, setSelectedItem] = useState<VariacionItem | null>(null);

  const dateFrom = dateFromParam || (dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const dateTo = dateToParam || (dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const isValidRange = isValidDateRange(dateFrom, dateTo);

  // 2. Fetch de Datos
  const { data, snapshots, isLoading, loadingMessage, error, calculateHistory } = useEscandalloAnalyticsNew(activeTab, dateFrom, dateTo);

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
      // Opcional: resetear scroll si se desea
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from && range?.to) updateUrl({ dateFrom: format(range.from, 'yyyy-MM-dd'), dateTo: format(range.to, 'yyyy-MM-dd') });
  };

  const handleExport = () => {
    if (!data.length) return;
    const csvContent = [
      ['Nombre', 'Tipo', 'Coste Inicial', 'Coste Final', 'Variación €', 'Variación %'],
      ...data.map(i => [i.nombre, i.tipo, i.startPrice.toFixed(4), i.endPrice.toFixed(4), i.diff.toFixed(4), i.percent.toFixed(2)])
    ].map(e => e.join(',')).join('\n');
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `analitica-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (error && !isLoading) return <div className="p-8 text-center text-red-500">Error cargando analítica: {error}</div>;

  return (
    <main className="min-h-screen bg-background pb-20">
      
      <AnalyticsLoader isLoading={isLoading} message={loadingMessage} />

      {/* HEADER + CONTROLS */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Título */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shadow-sm">
                    <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                        Análisis de Costes
                    </h1>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                        Evolución e Impacto
                    </span>
                </div>
            </div>

            {/* Selector de Fechas y Acciones */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
                <div className="flex-1 md:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
                </div>
                <Button variant="outline" size="icon" onClick={handleExport} disabled={data.length === 0} title="Exportar CSV">
                    <Download className="h-4 w-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                    onClick={() => window.open('/erp/sync-logs', '_blank')}
                >
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Logs</span>
                </Button>
            </div>
          </div>

        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {!isValidRange ? (
             <div className="p-10 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Selecciona un rango de fechas</h3>
                <p className="text-muted-foreground text-sm">Necesitamos un periodo inicial y final para comparar los precios.</p>
             </div>
        ) : (
            <>
                {/* 1. SELECCIÓN DE PESTAÑA (MOVIDO ARRIBA DE TODO EL CONTENIDO) */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex items-center justify-between border-b mb-6 overflow-x-auto no-scrollbar">
                         <TabsList className="bg-transparent h-10 p-0 gap-6 w-full justify-start">
                            <TabsTrigger value="recetas" className="rounded-none border-b-2 border-transparent px-2 py-2 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 bg-transparent shadow-none transition-all"><ChefHat className="w-4 h-4 mr-2"/>Recetas</TabsTrigger>
                            <TabsTrigger value="elaboraciones" className="rounded-none border-b-2 border-transparent px-2 py-2 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 bg-transparent shadow-none transition-all"><Scroll className="w-4 h-4 mr-2"/>Elaboraciones</TabsTrigger>
                            <TabsTrigger value="ingredientes" className="rounded-none border-b-2 border-transparent px-2 py-2 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 bg-transparent shadow-none transition-all"><Carrot className="w-4 h-4 mr-2"/>Ingredientes</TabsTrigger>
                            <TabsTrigger value="articulos" className="rounded-none border-b-2 border-transparent px-2 py-2 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 bg-transparent shadow-none transition-all"><Package className="w-4 h-4 mr-2"/>Artículos ERP</TabsTrigger>
                         </TabsList>
                    </div>

                    {/* CONTENIDO DE PESTAÑAS (COMÚN PARA TODAS) */}
                    <div className="space-y-6">
                        
                        {/* 2. KPIs RESUMEN (Solo los globales) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatCard 
                                title="Items Analizados" 
                                value={summaryStats.totalItems} 
                                icon={Activity}
                                isLoading={isLoading}
                                trend="neutral"
                                subtext="Registros procesados"
                            />
                            <StatCard 
                                title="Var. Media Costes" 
                                value={`${summaryStats.avgVariation > 0 ? '+' : ''}${summaryStats.avgVariation.toFixed(2)}%`}
                                icon={TrendingUp}
                                isLoading={isLoading}
                                trend={summaryStats.avgVariation > 0 ? 'up' : summaryStats.avgVariation < 0 ? 'down' : 'neutral'}
                                subtext="Impacto global medio"
                            />
                        </div>

                        {/* 3. GRÁFICA DE EVOLUCIÓN */}
                        <Card className="border-muted/50 shadow-sm overflow-hidden">
                            <CardHeader className="pb-2 border-b bg-muted/5 px-6 pt-5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Evolución Global ({activeTab})
                                    </CardTitle>
                                    {!isLoading && snapshots.length > 0 && (
                                        <span className={cn("text-xs font-bold", snapshots[snapshots.length-1].precio > snapshots[0].precio ? "text-rose-600" : "text-emerald-600")}>
                                            {snapshots[snapshots.length-1].precio > snapshots[0].precio ? 'SUBIDA' : 'BAJADA'} GLOBAL
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6 h-[300px]">
                                {isLoading ? <LoadingSkeleton title="Cargando gráfica..." /> : (
                                    <EvolutionChart snapshots={snapshots} isLoading={isLoading} activeTab={activeTab} />
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. TOOLBAR Y TABLA */}
                        <TabsContent value={activeTab} className="space-y-4 m-0">
                            {/* Toolbar de Filtros */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-muted/10 p-4 rounded-lg border border-muted/20">
                                <div className="relative flex-1 w-full sm:max-w-xs">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder={`Buscar en ${activeTab}...`}
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
                                data={data} // Data ya viene filtrada por tipo desde el hook
                                snapshots={snapshots}
                                isLoading={isLoading}
                                searchTerm={searchTerm}
                                filterVariation={filterVariation}
                                minPercent={minPercent}
                                onRowClick={(item) => setSelectedItem(item)}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </>
        )}

        {/* MODAL DE DETALLE */}
        <ItemHistoryModal 
            isOpen={!!selectedItem} 
            onClose={() => setSelectedItem(null)} 
            item={selectedItem} 
            calculateHistory={calculateHistory}
        />

      </div>
    </main>
  );
}
export default function DiferenciasEscandalloPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <DiferenciasEscandalloPageInner />
        </Suspense>
    );
}
