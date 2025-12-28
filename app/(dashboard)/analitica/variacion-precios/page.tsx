'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, ArrowDown, Minus, Search, TrendingUp, TrendingDown, AlertTriangle, Package, ChefHat, UtensilsCrossed, Database } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useAllPrecioHistory } from '@/hooks/use-precio-history';
import { supabase } from '@/lib/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import SplashScreen from '@/components/layout/splash-screen';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';

// Local KPI Card Component
function KpiCard({ title, value, icon: Icon, color, description }: { title: string, value: string | number, icon: any, color: 'primary' | 'emerald' | 'rose' | 'amber' | 'blue', description?: string }) {
    const colorClasses = {
        primary: "text-indigo-600 bg-indigo-50 border-indigo-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100"
    };

    const iconColorClasses = {
        primary: "text-indigo-600",
        emerald: "text-emerald-600",
        rose: "text-rose-600",
        amber: "text-amber-600",
        blue: "text-blue-600"
    };

    return (
        <Card className="bg-card/60 backdrop-blur-md border-border/40 shadow-xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden relative">
            <div className={cn("absolute top-0 left-0 w-1 h-full",
                color === 'primary' ? 'bg-indigo-500' :
                    color === 'emerald' ? 'bg-emerald-500' :
                        color === 'rose' ? 'bg-rose-500' :
                            color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
            )} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-xl transition-colors duration-500", colorClasses[color])}>
                    <Icon className={cn("h-4 w-4", iconColorClasses[color])} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default function VariacionPreciosPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [articulosErp, setArticulosErp] = useState<any[]>([]);
    const [ingredientesInternos, setIngredientesInternos] = useState<any[]>([]);
    const [elaboraciones, setElaboraciones] = useState<any[]>([]);
    const [recetas, setRecetas] = useState<any[]>([]);
    const [isLoadingArticulos, setIsLoadingArticulos] = useState(true);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch ERP articles and related data directly
    useEffect(() => {
        async function loadData() {
            try {
                // Load all data in parallel
                const [articulosRes, ingredientesRes, elaboracionesRes, recetasRes, componentsRes] = await Promise.all([
                    supabase.from('articulos_erp').select('*').limit(10000),
                    supabase.from('ingredientes_internos').select('*'),
                    supabase.from('elaboraciones').select('*'),
                    supabase.from('recetas').select('*'),
                    supabase.from('elaboracion_componentes').select('*')
                ]);

                if (articulosRes.error) throw articulosRes.error;

                const mappedArticulos = (articulosRes.data || []).map((a: any) => ({
                    id: a.id,
                    erpId: a.erp_id,
                    nombre: a.nombre,
                    referenciaProveedor: a.referencia_proveedor,
                    proveedorId: a.proveedor_id,
                    nombreProveedor: a.nombre_proveedor,
                    familiaId: a.familia_id,
                    precioCompra: a.precio_compra,
                    unidadMedida: a.unidad_medida,
                    mermaDefecto: a.merma_defecto,
                    alergenos: a.alergenos
                }));

                const mappedIngredientes = (ingredientesRes.data || []).map((i: any) => ({
                    id: i.id,
                    nombreIngrediente: i.nombre_ingrediente,
                    productoERPlinkId: i.producto_erp_link_id,
                    alergenosPresentes: i.alergenos_presentes,
                    alergenosTrazas: i.alergenos_trazas
                }));

                const mappedElaboraciones = (elaboracionesRes.data || []).map((e: any) => ({
                    id: e.id,
                    nombre: e.nombre,
                    partidaProduccion: e.partida,
                    unidadProduccion: e.unidad_produccion,
                    componentes: (componentsRes.data || [])
                        .filter((c: any) => c.elaboracion_padre_id === e.id)
                        .map((c: any) => ({
                            id: c.id,
                            tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
                            componenteId: c.componente_id, // This is the ingrediente_interno ID or elaboracion ID
                            cantidad: c.cantidad_neta,
                            merma: c.merma_aplicada
                        }))
                }));

                const mappedRecetas = (recetasRes.data || []).map((r: any) => {
                    // Handle both direct array and nested object structure for elaboraciones
                    let elaboracionesData = [];
                    if (Array.isArray(r.elaboraciones)) {
                        elaboracionesData = r.elaboraciones;
                    } else if (r.elaboraciones?.elaboraciones && Array.isArray(r.elaboraciones.elaboraciones)) {
                        elaboracionesData = r.elaboraciones.elaboraciones;
                    }

                    return {
                        id: r.id,
                        nombre: r.nombre,
                        elaboraciones: elaboracionesData.map((d: any) => ({
                            id: d.id,
                            // The log showed "elaboracionId" is present in the object
                            elaboracionId: d.elaboracionId || d.elaboracion_id || d.id,
                            cantidad: d.cantidad || 0
                        }))
                    };
                });

                setArticulosErp(mappedArticulos);
                setIngredientesInternos(mappedIngredientes);
                setElaboraciones(mappedElaboraciones);
                setRecetas(mappedRecetas);
            } catch (error) {
                console.error('[ERROR] Failed to load data:', error);
            } finally {
                setIsLoadingArticulos(false);
            }
        }

        loadData();
    }, []);

    // Fetch data
    const { data: history, isLoading: isLoadingHistory } = useAllPrecioHistory(null);

    const isLoading = isLoadingHistory || isLoadingArticulos;

    // Helper to get price at a specific date
    const getEffectivePrice = useCallback((erpId: string, targetDate: Date, currentPrice: number) => {
        if (!history) return currentPrice;

        // Get history for this item, sorted by date desc
        const itemHistory = history
            .filter(h => h.articuloErpId === erpId)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        if (itemHistory.length === 0) return currentPrice;

        // Find the first entry where fecha <= targetDate
        const entry = itemHistory.find(h => new Date(h.fecha) <= targetDate);

        if (entry) {
            return entry.precioCalculado;
        }

        return itemHistory[itemHistory.length - 1].precioCalculado;
    }, [history]);

    // --- Cost Calculation Helpers ---

    const getIngredientCost = useCallback((ingredienteId: string, date: Date) => {
        if (!ingredientesInternos || !articulosErp) return 0;

        const ingrediente = ingredientesInternos.find((i: any) => i.id === ingredienteId);
        if (!ingrediente || !ingrediente.productoERPlinkId) return 0;

        const erpItem = articulosErp.find(a => a.erpId === ingrediente.productoERPlinkId);
        if (!erpItem || !erpItem.erpId) return 0;

        return getEffectivePrice(erpItem.erpId, date, erpItem.precioCompra);
    }, [ingredientesInternos, articulosErp, getEffectivePrice]);

    const getElaboracionCost = useCallback((elaboracionId: string, date: Date): number => {
        if (!elaboraciones) return 0;

        const elaboracion = elaboraciones.find((e: any) => e.id === elaboracionId);
        if (!elaboracion) return 0;

        let totalCost = 0;
        for (const comp of elaboracion.componentes || []) {
            let componentCost = 0;
            if (comp.tipo === 'ingrediente') {
                componentCost = getIngredientCost(comp.componenteId, date);
            } else {
                componentCost = getElaboracionCost(comp.componenteId, date);
            }
            totalCost += componentCost * comp.cantidad;
        }
        return totalCost;
    }, [elaboraciones, getIngredientCost]);

    const getRecetaCost = useCallback((recetaId: string, date: Date): number => {
        if (!recetas) return 0;

        const receta = recetas.find((r: any) => r.id === recetaId);
        if (!receta) return 0;

        let totalCost = 0;
        for (const elab of receta.elaboraciones || []) {
            const elabCost = getElaboracionCost(elab.elaboracionId, date);
            totalCost += elabCost * elab.cantidad;
        }
        return totalCost;
    }, [recetas, getElaboracionCost]);

    // --- Variations Memos ---

    const erpVariations = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || !articulosErp) return [];

        return articulosErp.map((item) => {
            const startPrice = getEffectivePrice(item.erpId, dateRange.from!, item.precioCompra);
            const endPrice = getEffectivePrice(item.erpId, dateRange.to!, item.precioCompra);
            const diff = endPrice - startPrice;
            const percent = startPrice > 0 ? (diff / startPrice) * 100 : 0;
            return { ...item, startPrice, endPrice, diff, percent, type: 'ERP' };
        });
    }, [articulosErp, dateRange, history, getEffectivePrice]);

    const ingredientVariations = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || !ingredientesInternos) return [];

        return ingredientesInternos.map((item: any) => {
            const startPrice = getIngredientCost(item.id, dateRange.from!);
            const endPrice = getIngredientCost(item.id, dateRange.to!);
            const diff = endPrice - startPrice;
            const percent = startPrice > 0 ? (diff / startPrice) * 100 : 0;

            return {
                id: item.id,
                nombre: item.nombreIngrediente,
                startPrice,
                endPrice,
                diff,
                percent,
                type: 'Ingrediente'
            };
        });
    }, [ingredientesInternos, dateRange, getIngredientCost]);

    const elaboracionVariations = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || !elaboraciones) return [];

        return elaboraciones.map((item: any) => {
            const startPrice = getElaboracionCost(item.id, dateRange.from!);
            const endPrice = getElaboracionCost(item.id, dateRange.to!);
            const diff = endPrice - startPrice;
            const percent = startPrice > 0 ? (diff / startPrice) * 100 : 0;

            return {
                id: item.id,
                nombre: item.nombre,
                startPrice,
                endPrice,
                diff,
                percent,
                type: 'Elaboracion'
            };
        });
    }, [elaboraciones, dateRange, getElaboracionCost]);

    const recetaVariations = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || !recetas) return [];

        return recetas.map((item: any) => {
            const startPrice = getRecetaCost(item.id, dateRange.from!);
            const endPrice = getRecetaCost(item.id, dateRange.to!);
            const diff = endPrice - startPrice;
            const percent = startPrice > 0 ? (diff / startPrice) * 100 : 0;

            return {
                id: item.id,
                nombre: item.nombre,
                startPrice,
                endPrice,
                diff,
                percent,
                type: 'Receta'
            };
        });
    }, [recetas, dateRange, getRecetaCost]);

    const [activeTab, setActiveTab] = useState('erp');

    const currentVariations = useMemo(() => {
        let data = [];
        switch (activeTab) {
            case 'erp': data = erpVariations; break;
            case 'ingredientes': data = ingredientVariations; break;
            case 'elaboraciones': data = elaboracionVariations; break;
            case 'recetas': data = recetaVariations; break;
            default: data = erpVariations;
        }

        return data.filter((item: any) => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return item.nombre.toLowerCase().includes(term) ||
                item.id.toLowerCase().includes(term) ||
                (item.erpId && item.erpId.toLowerCase().includes(term)) ||
                (item.nombreProveedor && item.nombreProveedor.toLowerCase().includes(term));
        });
    }, [activeTab, erpVariations, ingredientVariations, elaboracionVariations, recetaVariations, searchTerm]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'percent', direction: 'desc' });

    const sortedVariations = useMemo(() => {
        if (!sortConfig) return currentVariations;
        return [...currentVariations].sort((a, b) => {
            // @ts-ignore
            const aValue = a[sortConfig.key];
            // @ts-ignore
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [currentVariations, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const summaryKpis = useMemo(() => {
        if (currentVariations.length === 0) return { avg: 0, up: 0, down: 0, max: { nombre: '-', percent: 0 } };

        const up = currentVariations.filter(v => v.percent > 0).length;
        const down = currentVariations.filter(v => v.percent < 0).length;
        const avg = currentVariations.reduce((acc, v) => acc + v.percent, 0) / currentVariations.length;
        const max = [...currentVariations].sort((a, b) => b.percent - a.percent)[0];

        return { avg, up, down, max };
    }, [currentVariations]);

    if (!isMounted || isLoading) return <SplashScreen />;

    const renderTable = (data: any[]) => (
        <div className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-primary/5 hover:bg-primary/5 border-border/40">
                        <TableHead className="pl-6 cursor-pointer group" onClick={() => handleSort('nombre')}>
                            <div className="flex items-center gap-2">
                                Nombre
                                <Search className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('startPrice')}>Coste Inicial</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('endPrice')}>Coste Final</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('diff')}>Var. €</TableHead>
                        <TableHead className="text-right pr-6 cursor-pointer" onClick={() => handleSort('percent')}>Var. %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <AlertTriangle className="h-8 w-8 opacity-20" />
                                    <p>No se encontraron variaciones en este periodo.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.slice(0, 100).map((item) => (
                            <TableRow key={item.id} className="group hover:bg-primary/5 border-border/40 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="font-semibold text-sm">{item.nombre}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5 flex items-center gap-2">
                                        {item.type === 'ERP' ? (
                                            <>
                                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{item.erpId}</span>
                                                <span className="truncate max-w-[200px]">{item.nombreProveedor || 'Sin proveedor'}</span>
                                            </>
                                        ) : (
                                            <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">{item.id}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(item.startPrice)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(item.endPrice)}</TableCell>
                                <TableCell className={cn("text-right font-medium", item.diff > 0 ? 'text-rose-500' : item.diff < 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                                    {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                                        item.percent > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            item.percent < 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                    )}>
                                        {item.percent > 0 ? <ArrowUp className="h-3 w-3" /> : item.percent < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                        {Math.abs(item.percent).toFixed(2)}%
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-6">
                <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md p-2 rounded-2xl border border-border/40 shadow-sm">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Variación Media"
                    value={`${summaryKpis.avg.toFixed(2)}%`}
                    icon={summaryKpis.avg > 0 ? TrendingUp : TrendingDown}
                    color={summaryKpis.avg > 0 ? 'rose' : 'emerald'}
                    description="Promedio de todos los items"
                />
                <KpiCard
                    title="Incrementos"
                    value={summaryKpis.up}
                    icon={ArrowUp}
                    color="rose"
                    description="Items que han subido de precio"
                />
                <KpiCard
                    title="Descensos"
                    value={summaryKpis.down}
                    icon={ArrowDown}
                    color="emerald"
                    description="Items que han bajado de precio"
                />
                <KpiCard
                    title="Máxima Subida"
                    value={`${summaryKpis.max.percent.toFixed(1)}%`}
                    icon={AlertTriangle}
                    color="amber"
                    description={summaryKpis.max.nombre}
                />
            </div>

            <Tabs defaultValue="erp" className="space-y-6" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 h-auto">
                        <TabsTrigger value="erp" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all flex gap-2">
                            <Database className="h-4 w-4" /> ERP
                        </TabsTrigger>
                        <TabsTrigger value="ingredientes" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all flex gap-2">
                            <Package className="h-4 w-4" /> Ingredientes
                        </TabsTrigger>
                        <TabsTrigger value="elaboraciones" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all flex gap-2">
                            <ChefHat className="h-4 w-4" /> Elaboraciones
                        </TabsTrigger>
                        <TabsTrigger value="recetas" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all flex gap-2">
                            <UtensilsCrossed className="h-4 w-4" /> Recetas
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Buscar por nombre, proveedor o referencia..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-10 rounded-full bg-card/60 backdrop-blur-md border-border/40 focus-visible:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                <Card className="bg-card/60 backdrop-blur-md border-border/40 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-border/40 bg-primary/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">
                                    {activeTab === 'erp' && 'Artículos ERP'}
                                    {activeTab === 'ingredientes' && 'Ingredientes Internos'}
                                    {activeTab === 'elaboraciones' && 'Elaboraciones'}
                                    {activeTab === 'recetas' && 'Recetas'}
                                </CardTitle>
                            </div>
                            <div className="text-xs font-medium text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border/40">
                                Mostrando top 100
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {renderTable(sortedVariations)}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
