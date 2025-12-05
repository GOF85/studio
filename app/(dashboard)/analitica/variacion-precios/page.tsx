'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useAllPrecioHistory } from '@/hooks/use-precio-history';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';

export default function VariacionPreciosPage() {
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

                console.log('[DEBUG] Recetas from Supabase:', recetasRes.data?.length || 0);

                // Log the structure of the first recipe to verify JSONB path
                if (recetasRes.data && recetasRes.data.length > 0) {
                    console.log('[DEBUG] First recipe raw elaboraciones:', JSON.stringify(recetasRes.data[0].elaboraciones));
                }

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

                console.log('[DEBUG] Mapped recetas:', mappedRecetas.length, mappedRecetas);

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
        if (!ingredientesInternos || !articulosErp) {
            console.log('[DEBUG] getIngredientCost: Missing data', { hasIngredientes: !!ingredientesInternos, hasArticulos: !!articulosErp });
            return 0;
        }

        const ingrediente = ingredientesInternos.find((i: any) => i.id === ingredienteId);
        if (!ingrediente) {
            console.log('[DEBUG] getIngredientCost: Ingrediente not found', ingredienteId);
            return 0;
        }

        if (!ingrediente.productoERPlinkId) {
            console.log('[DEBUG] getIngredientCost: No ERP link', { ingrediente: ingrediente.nombreIngrediente, id: ingredienteId });
            return 0;
        }

        // IMPORTANT: productoERPlinkId stores the ERP code (erpId), not the UUID!
        const erpItem = articulosErp.find(a => a.erpId === ingrediente.productoERPlinkId);
        if (!erpItem) {
            console.log('[DEBUG] getIngredientCost: ERP item not found', { linkId: ingrediente.productoERPlinkId, ingrediente: ingrediente.nombreIngrediente });
            return 0;
        }

        if (!erpItem.erpId) {
            console.log('[DEBUG] getIngredientCost: No erpId', { erpItem: erpItem.nombre });
            return 0;
        }

        const cost = getEffectivePrice(erpItem.erpId, date, erpItem.precioCompra);
        console.log('[DEBUG] getIngredientCost SUCCESS:', {
            ingrediente: ingrediente.nombreIngrediente,
            erpItem: erpItem.nombre,
            erpId: erpItem.erpId,
            cost
        });
        return cost;
    }, [ingredientesInternos, articulosErp, getEffectivePrice]);

    const getElaboracionCost = useCallback((elaboracionId: string, date: Date): number => {
        if (!elaboraciones) return 0;

        const elaboracion = elaboraciones.find((e: any) => e.id === elaboracionId);
        if (!elaboracion) {
            console.log('[DEBUG] getElaboracionCost: Elaboracion not found', elaboracionId);
            return 0;
        }

        console.log('[DEBUG] getElaboracionCost:', {
            elaboracion: elaboracion.nombre,
            componentes: elaboracion.componentes?.length || 0
        });

        let totalCost = 0;
        for (const comp of elaboracion.componentes || []) {
            let componentCost = 0;
            if (comp.tipo === 'ingrediente') {
                componentCost = getIngredientCost(comp.componenteId, date);
            } else {
                // Recursive call - be careful with circular dependencies
                componentCost = getElaboracionCost(comp.componenteId, date);
            }
            console.log('[DEBUG] Component cost:', { tipo: comp.tipo, cantidad: comp.cantidad, unitCost: componentCost, total: componentCost * comp.cantidad });
            totalCost += componentCost * comp.cantidad;
        }
        console.log('[DEBUG] Total elaboracion cost:', { elaboracion: elaboracion.nombre, totalCost });
        return totalCost;
    }, [elaboraciones, getIngredientCost]);

    const getRecetaCost = useCallback((recetaId: string, date: Date): number => {
        if (!recetas) {
            console.log('[DEBUG] getRecetaCost: Missing recetas data');
            return 0;
        }

        const receta = recetas.find((r: any) => r.id === recetaId);
        if (!receta) {
            console.log('[DEBUG] getRecetaCost: Receta not found', recetaId);
            return 0;
        }

        console.log('[DEBUG] getRecetaCost:', receta.nombre, 'elaboraciones:', receta.elaboraciones?.length || 0, 'data:', JSON.stringify(receta.elaboraciones));

        let totalCost = 0;
        for (const elab of receta.elaboraciones || []) {
            const elabCost = getElaboracionCost(elab.elaboracionId, date);
            console.log('[DEBUG] Elaboracion in receta - cantidad:', elab.cantidad, 'unitCost:', elabCost, 'total:', elabCost * elab.cantidad);
            totalCost += elabCost * elab.cantidad;
        }
        console.log('[DEBUG] Total receta cost for', receta.nombre, '=', totalCost);
        return totalCost;
    }, [recetas, getElaboracionCost]);

    // --- Variations Memos ---

    const erpVariations = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || !articulosErp) {
            return [];
        }

        const results = articulosErp.map((item, index) => {
            // Use erpId (the ERP article code) to match with history, not the UUID
            const startPrice = getEffectivePrice(item.erpId, dateRange.from!, item.precioCompra);
            const endPrice = getEffectivePrice(item.erpId, dateRange.to!, item.precioCompra);
            const diff = endPrice - startPrice;
            const percent = startPrice > 0 ? (diff / startPrice) * 100 : 0;

            return { ...item, startPrice, endPrice, diff, percent, type: 'ERP' };
        });

        return results;
    }, [articulosErp, dateRange, getEffectivePrice]);

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
        console.log('[DEBUG] recetaVariations:', { hasDateRange: !!dateRange, hasRecetas: !!recetas, recetasCount: recetas?.length });
        if (!dateRange?.from || !dateRange?.to || !recetas) return [];

        console.log('[DEBUG] Processing recetas:', recetas.length);
        return recetas.map((item: any) => {
            console.log('[DEBUG] Processing receta:', item.nombre);
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

    // --- Active Tab Data ---
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

    // Sorting
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

    const renderTable = (data: any[]) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('nombre')}>Nombre</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('startPrice')}>Coste Inicial</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('endPrice')}>Coste Final</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('diff')}>Var. €</TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('percent')}>Var. %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No se encontraron resultados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.slice(0, 100).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    <div>{item.nombre}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {item.type === 'ERP'
                                            ? `${item.erpId || ''} - ${item.nombreProveedor || 'Sin proveedor'}`
                                            : item.id}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.startPrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.endPrice)}</TableCell>
                                <TableCell className={`text-right ${item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-green-500' : ''}`}>
                                    {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${item.percent > 0 ? 'text-red-500' : item.percent < 0 ? 'text-green-500' : ''}`}>
                                    {item.percent !== 0 ? (
                                        <span className="flex items-center justify-end gap-1">
                                            {item.percent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                            {item.percent.toFixed(2)}%
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Variación de Precios</h1>
                    <p className="text-muted-foreground">
                        Analiza la evolución de costes por periodo.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <Tabs defaultValue="erp" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="erp">Artículos ERP</TabsTrigger>
                    <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
                    <TabsTrigger value="elaboraciones">Elaboraciones</TabsTrigger>
                    <TabsTrigger value="recetas">Recetas</TabsTrigger>
                </TabsList>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {activeTab === 'erp' && 'Artículos ERP'}
                            {activeTab === 'ingredientes' && 'Ingredientes Internos'}
                            {activeTab === 'elaboraciones' && 'Elaboraciones'}
                            {activeTab === 'recetas' && 'Recetas'}
                        </CardTitle>
                        <CardDescription>
                            Comparativa de costes ({sortedVariations.length} items)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center py-4">
                            <Input
                                placeholder="Buscar por nombre, proveedor o referencia..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="w-[480px]"
                            />
                        </div>

                        {renderTable(sortedVariations)}

                        <div className="mt-4 text-xs text-muted-foreground text-center">
                            Mostrando los primeros 100 resultados
                        </div>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
