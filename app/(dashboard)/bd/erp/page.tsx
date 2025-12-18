'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Upload, RefreshCw, FileDown, Filter, History, PlusCircle, Save, Trash2, Loader2, Menu, FileUp, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ArticuloERP, UnidadMedida, Proveedor, FamiliaERP, HistoricoPreciosERP } from '@/types';
import { UNIDADES_MEDIDA, articuloErpSchema } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalLoadingIndicator } from '@/components/layout/global-loading-indicator';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Label } from '@/components/ui/label';
import { differenceInDays, parseISO } from 'date-fns';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "idreferenciaerp", "idProveedor", "nombreProveedor", "nombreProductoERP", "referenciaProveedor", "familiaCategoria", "precioCompra", "descuento", "unidadConversion", "precioAlquiler", "unidad", "tipo", "categoriaMice", "alquiler", "observaciones"];

const ITEMS_PER_PAGE = 20;

function ArticulosERPPageContent() {
    const [items, setItems] = useState<ArticuloERP[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [types, setTypes] = useState<string[]>(['all']);
    const [providers, setProviders] = useState<string[]>(['all']);
    const [typesCount, setTypesCount] = useState(0);
    const [providersCount, setProvidersCount] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLog, setSyncLog] = useState<string[]>([]);
    const [syncController, setSyncController] = useState<EventSource | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ percent: number; current: number; total: number } | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseCurrency = (value: string | number) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
            const number = parseFloat(cleaned);
            return isNaN(number) ? 0 : number;
        }
        return 0;
    };

    const calculatePrice = (item: any): number => {
        const precioCompra = parseCurrency(item.precioCompra || item.precio_compra);
        const descuento = parseCurrency(item.descuento);
        const unidadConversion = parseCurrency(item.unidadConversion || item.unidad_conversion) || 1;
        const precioConDescuento = precioCompra * (1 - (descuento / 100));
        return unidadConversion > 0 ? precioConDescuento / unidadConversion : 0;
    }

    // Keyset pagination (cursor-based) over compound key (nombre, erp_id)
    const useKeyset = true;
    const prevCursors = useRef<Array<{ nombre: string; erp_id: string }>>([]);
    const [cursor, setCursor] = useState<{ nombre: string | null; erp_id: string | null }>({ nombre: null, erp_id: null });
    const [isAppending, setIsAppending] = useState(false);

    // Server-side pagination loader (keyset-based, nombre + erp_id)
    const loadPage = async (direction: 'init' | 'next' | 'prev' | 'append' = 'init') => {
        setIsLoadingPage(true);
        if (direction === 'append') setIsAppending(true);
        // Count query with same filters
        let countQuery = supabase.from('articulos_erp').select('erp_id', { count: 'exact', head: true });
        const term = debouncedSearch.trim();
        if (term) {
            const like = `%${term}%`;
            countQuery = countQuery.or([
                `nombre.ilike.${like}`,
                `nombre_proveedor.ilike.${like}`,
                `referencia_proveedor.ilike.${like}`,
                `erp_id.ilike.${like}`,
                `tipo.ilike.${like}`,
            ].join(','));
        }
        if (typeFilter !== 'all') countQuery = countQuery.eq('tipo', typeFilter);
        if (providerFilter !== 'all') countQuery = countQuery.eq('nombre_proveedor', providerFilter);

        // Data query (keyset)
        let dataQuery = supabase.from('articulos_erp').select('*');
        if (term) {
            const like = `%${term}%`;
            dataQuery = dataQuery.or([
                `nombre.ilike.${like}`,
                `nombre_proveedor.ilike.${like}`,
                `referencia_proveedor.ilike.${like}`,
                `erp_id.ilike.${like}`,
                `tipo.ilike.${like}`,
            ].join(','));
        }
        if (typeFilter !== 'all') dataQuery = dataQuery.eq('tipo', typeFilter);
        if (providerFilter !== 'all') dataQuery = dataQuery.eq('nombre_proveedor', providerFilter);

        // Determine direction
        if (!useKeyset) {
            // Fallback to offset (not used currently)
            dataQuery = dataQuery.order('nombre', { ascending: true }).order('erp_id', { ascending: true }).range(0, ITEMS_PER_PAGE - 1);
        } else {
            const limit = ITEMS_PER_PAGE;
            if (direction === 'prev') {
                const anchor = prevCursors.current.pop();
                if (anchor) {
                    // nombre < anchor.nombre OR (nombre = anchor.nombre AND erp_id < anchor.erp_id)
                    dataQuery = dataQuery
                        .or(
                            [
                                `nombre.lt.${anchor.nombre}`,
                                `and(nombre.eq.${anchor.nombre},erp_id.lt.${anchor.erp_id})`,
                            ].join(',')
                        )
                        .order('nombre', { ascending: false })
                        .order('erp_id', { ascending: false })
                        .limit(limit);
                } else {
                    // No previous; init
                    prevCursors.current = [];
                    setCursor({ nombre: null, erp_id: null });
                    dataQuery = dataQuery.order('nombre', { ascending: true }).order('erp_id', { ascending: true }).limit(limit);
                }
            } else if (direction === 'next' || direction === 'append') {
                if (cursor.nombre && cursor.erp_id) {
                    // Push first row cursor for back navigation if moving next (not for append)
                    if (direction === 'next' && items.length > 0) {
                        prevCursors.current.push({ nombre: items[0].nombreProductoERP || '', erp_id: String(items[0].idreferenciaerp) });
                    }
                    // nombre > cursor.nombre OR (nombre = cursor.nombre AND erp_id > cursor.erp_id)
                    dataQuery = dataQuery
                        .or(
                            [
                                `nombre.gt.${cursor.nombre}`,
                                `and(nombre.eq.${cursor.nombre},erp_id.gt.${cursor.erp_id})`,
                            ].join(',')
                        )
                        .order('nombre', { ascending: true })
                        .order('erp_id', { ascending: true })
                        .limit(limit);
                } else {
                    dataQuery = dataQuery.order('nombre', { ascending: true }).order('erp_id', { ascending: true }).limit(limit);
                }
            } else {
                // init
                prevCursors.current = [];
                setCursor({ nombre: null, erp_id: null });
                dataQuery = dataQuery.order('nombre', { ascending: true }).order('erp_id', { ascending: true }).limit(limit);
            }
        }

        const [{ count, error: countError }, { data, error }] = await Promise.all([
            countQuery,
            dataQuery,
        ]);

        if (error || countError) {
            console.error('Error loading articulos_erp:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar los artículos.' });
            setItems([]);
            setTotalCount(0);
        } else {
            // For prev direction with descending order, reverse for UI
            let rows = data || [];
            if (useKeyset && direction === 'prev') rows = [...rows].reverse();
            const mappedItems = (rows || []).map((row: any) => ({
                id: row.id,
                idreferenciaerp: row.erp_id || '',
                idProveedor: row.proveedor_id || '',
                nombreProveedor: row.nombre_proveedor || 'Sin proveedor',
                nombreProductoERP: row.nombre || '',
                referenciaProveedor: row.referencia_proveedor || '',
                familiaCategoria: row.familia_categoria || '',
                precioCompra: row.precio_compra || 0,
                descuento: row.descuento || 0,
                unidadConversion: row.unidad_conversion || 1,
                precio: row.precio || 0,
                precioAlquiler: row.precio_alquiler || 0,
                unidad: row.unidad_medida || 'UD',
                tipo: row.tipo || '',
                categoriaMice: row.categoria_mice || '',
                alquiler: row.alquiler || false,
                observaciones: row.observaciones || '',
            })) as ArticuloERP[];
            if (direction === 'append') {
                setItems(prev => [...prev, ...mappedItems]);
            } else {
                setItems(mappedItems);
            }
            setTotalCount(count || 0);
            // Update cursor (last compound key of this page)
            const lastItem = mappedItems[mappedItems.length - 1];
            setCursor({ nombre: lastItem?.nombreProductoERP || null, erp_id: lastItem?.idreferenciaerp || null });
            if (direction === 'init') setCurrentPage(1);
            else if (direction === 'next') setCurrentPage(p => p + 1);
            else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        }
        setIsLoadingPage(false);
        if (direction === 'append') setIsAppending(false);
        setIsMounted(true);
    };

    useEffect(() => {
        // Initial load
        loadPage('init');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounce search input
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(id);
    }, [searchTerm]);

    useEffect(() => {
        // Reload when filters or debounced search change
        loadPage('init');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, typeFilter, providerFilter]);

    // Distinct lists for filters (independent of page data)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [{ data: tData }, { data: pData }] = await Promise.all([
                supabase.from('articulos_erp').select('tipo').not('tipo', 'is', null).order('tipo', { ascending: true }).limit(2000),
                supabase.from('articulos_erp').select('nombre_proveedor').not('nombre_proveedor', 'is', null).order('nombre_proveedor', { ascending: true }).limit(5000),
            ]);
            if (cancelled) return;
            const tSet = new Set<string>(['all']);
            (tData || []).forEach((r: any) => r.tipo && tSet.add(r.tipo));
            setTypes(Array.from(tSet));
            setTypesCount(tSet.size - 1); // exclude 'all'
            const pSet = new Set<string>(['all']);
            (pData || []).forEach((r: any) => r.nombre_proveedor && pSet.add(r.nombre_proveedor));
            setProviders(Array.from(pSet));
            setProvidersCount(pSet.size - 1);
        })();
        return () => { cancelled = true };
    }, []);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    // Para infinite scroll en móvil: mostrar todos los items filtrados
    const mobileItems = items;

    // Hook para infinite scroll
    const sentinelRef = useInfiniteScroll({
        fetchNextPage: () => {
            if (!isAppending && items.length < totalCount) {
                void loadPage('append');
            }
        },
        hasNextPage: items.length < totalCount,
        isFetchingNextPage: isAppending,
        enabled: true,
    });

    // Definir columnas para la vista móvil
    const mobileColumns: MobileTableColumn<ArticuloERP>[] = [
        { key: 'nombreProductoERP', label: 'Producto', isTitle: true },
        { key: 'idreferenciaerp', label: 'Ref. ERP' },
        { key: 'nombreProveedor', label: 'Proveedor' },
        { key: 'precioCompra', label: 'P. Compra', format: (value) => formatCurrency(value as number) },
        { key: 'descuento', label: 'Desc. %', format: (value) => `${value}%` },
        { key: 'unidadConversion', label: 'Factor Conv.' },
        { key: 'precio', label: 'Precio/Unidad', format: (value, row) => formatCurrency((row.precio || 0)) },
        { key: 'unidad', label: 'Unidad', format: (value) => formatUnit(value as string) },
        { key: 'tipo', label: 'Tipo (Familia)' },
        { key: 'categoriaMice', label: 'Categoría MICE' },
    ];

    const handlePreviousPage = () => { if (currentPage > 1) void loadPage('prev'); };
    const handleNextPage = () => { if (currentPage < totalPages) void loadPage('next'); };


    const handleFactusolSync = () => {
        setIsSyncing(true);
        setSyncLog(['Iniciando sincronización...']);
        setSyncProgress(null);

        // Defer the heavy async work so the modal paints immediately
        requestAnimationFrame(() => {
            const timeoutId = setTimeout(() => {
                setIsSyncing(false);
                setSyncProgress(null);
                toast({
                    variant: 'destructive',
                    title: 'Timeout',
                    description: 'La sincronización tardó demasiado. Verifica los logs para más detalles.'
                });
            }, 900000); // 15 minutes
            // Start SSE stream for real-time logs
            try {
                setSyncLog(prev => [...prev, '⏳ Conectando al stream de logs...']);
                const es = new EventSource('/api/factusol/sync-articulos/stream');
                setSyncController(es);
                const onMessage = (e: MessageEvent) => setSyncLog(prev => [...prev, e.data]);
                const onProgress = (e: MessageEvent) => {
                    try {
                        const data = JSON.parse(e.data);
                        setSyncProgress(data);
                    } catch {}
                };
                const onResult = async (e: MessageEvent) => {
                    try {
                        const result = JSON.parse(e.data);
                        setSyncProgress(null);
                        if (result.success) {
                            toast({ title: 'Sincronización completada', description: `Se han sincronizado ${result.count} artículos desde Factusol.` });
                            setSyncLog(prev => [...prev, 'Recargando datos desde Supabase...']);
                            await loadPage('init');
                            setSyncLog(prev => [...prev, '✅ Sincronización completada exitosamente']);
                        } else {
                            setSyncLog(prev => [...prev, `❌ Error: ${result.error}`]);
                            toast({ variant: 'destructive', title: 'Error en la sincronización', description: result.error });
                        }
                    } catch {}
                };
                const onEnd = () => {
                    es.removeEventListener('message', onMessage as any);
                    es.removeEventListener('progress', onProgress as any);
                    es.removeEventListener('result', onResult as any);
                    es.close();
                    setSyncController(null);
                    setSyncProgress(null);
                    clearTimeout(timeoutId);
                    setIsSyncing(false);
                };
                es.onmessage = onMessage;
                es.addEventListener('progress', onProgress as any);
                es.addEventListener('result', onResult as any);
                es.addEventListener('end', onEnd as any);
                es.onerror = () => {
                    setSyncLog(prev => [...prev, '❌ Error en el stream de logs']);
                    onEnd();
                };
            } catch (err: any) {
                setSyncLog(prev => [...prev, `❌ ${err?.message || 'Error desconocido'}`]);
                setSyncProgress(null);
                clearTimeout(timeoutId);
                setIsSyncing(false);
            }
        });
    };

    const handleExportCSV = () => {
        if (items.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay artículos para exportar.' });
            return;
        }
        const dataToExport = items.map(item => {
            const exportItem: any = {};
            CSV_HEADERS.forEach(header => {
                exportItem[header] = (item as any)[header] ?? '';
            });
            return exportItem;
        });

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'articulos_erp.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

    const parseBoolean = (value: any) => {
        const s = String(value).toLowerCase().trim();
        return s === 'true' || s === '1';
    }

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
        const file = event.target.files?.[0];
        if (!file) {
            setIsImportAlertOpen(false);
            return;
        }

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter,
            complete: async (results) => {
                const headers = results.meta.fields || [];
                const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

                if (!hasAllHeaders) {
                    toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
                    return;
                }



                // --- Smart Snapshot Logic ---
                const today = new Date();

                // Fetch existing price history from Supabase (optimized: last 30 days only)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data: existingHistory } = await supabase
                    .from('historico_precios_erp')
                    .select('*')
                    .gte('fecha', thirtyDaysAgo.toISOString());

                const historicoPrecios: HistoricoPreciosERP[] = (existingHistory || []).map(h => ({
                    id: h.id,
                    articuloErpId: h.articulo_erp_id,
                    fecha: h.fecha,
                    precioCalculado: h.precio_calculado,
                    proveedorId: h.proveedor_id,
                }));

                const currentArticulosMap = new Map(items.map(i => [i.idreferenciaerp, i]));
                const newPriceHistoryEntries: Array<{
                    articulo_erp_id: string;
                    fecha: string;
                    precio_calculado: number;
                    proveedor_id: string | null;
                }> = [];

                results.data.forEach((item: any) => {
                    const idreferenciaerp = item.idreferenciaerp;
                    if (!idreferenciaerp) return;

                    const existingItem = currentArticulosMap.get(idreferenciaerp);
                    const newPrice = calculatePrice(item);

                    if (existingItem) {
                        const oldPrice = calculatePrice(existingItem);
                        const lastHistoryEntry = historicoPrecios
                            .filter(h => h.articuloErpId === idreferenciaerp)
                            .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime())[0];

                        const hasPriceChanged = Math.abs(newPrice - oldPrice) > 0.001;
                        const daysSinceLastLog = lastHistoryEntry ? differenceInDays(today, parseISO(lastHistoryEntry.fecha)) : Infinity;

                        if (hasPriceChanged || daysSinceLastLog > 7) {
                            newPriceHistoryEntries.push({
                                articulo_erp_id: idreferenciaerp,
                                fecha: today.toISOString(),
                                precio_calculado: newPrice,
                                proveedor_id: item.idProveedor || null,
                            });
                        }
                    } else {
                        // If it's a new item, add it to the history
                        newPriceHistoryEntries.push({
                            articulo_erp_id: idreferenciaerp,
                            fecha: today.toISOString(),
                            precio_calculado: newPrice,
                            proveedor_id: item.idProveedor || null,
                        });
                    }
                });

                // Insert new price history entries to Supabase
                if (newPriceHistoryEntries.length > 0) {
                    const { error: historyError } = await supabase
                        .from('historico_precios_erp')
                        .insert(newPriceHistoryEntries);

                    if (historyError) {
                        console.error('Error saving price history:', historyError);
                        toast({
                            variant: 'destructive',
                            title: 'Advertencia',
                            description: `Artículos importados pero error al guardar historial de precios: ${historyError.message}`
                        });
                    }
                }
                // --- End Smart Snapshot Logic ---


                const allFamilias = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
                const familiasMap = new Map(allFamilias.map(f => [f.familiaCategoria, { tipo: f.Familia, categoriaMice: f.Categoria }]));

                const importedData: ArticuloERP[] = results.data.map((item: any) => {
                    const familiaInfo = familiasMap.get(item.familiaCategoria || '');
                    const precioCalculado = calculatePrice(item);
                    return {
                        id: item.id || Date.now().toString() + Math.random(),
                        idreferenciaerp: item.idreferenciaerp || '',
                        idProveedor: item.idProveedor || '',
                        nombreProductoERP: item.nombreProductoERP || '',
                        referenciaProveedor: item.referenciaProveedor || '',
                        nombreProveedor: proveedoresMap.get(item.idProveedor || '') || item.nombreProveedor || 'Proveedor no identificado',
                        familiaCategoria: item.familiaCategoria || '',
                        precioCompra: parseCurrency(item.precioCompra),
                        descuento: parseCurrency(item.descuento),
                        unidadConversion: parseCurrency(item.unidadConversion) || 1,
                        precio: precioCalculado,
                        precioAlquiler: parseCurrency(item.precioAlquiler),
                        unidad: UNIDADES_MEDIDA.includes(item.unidad) ? item.unidad : 'UD',
                        tipo: familiaInfo?.tipo || item.tipo || '',
                        categoriaMice: familiaInfo?.categoriaMice || item.categoriaMice || '',
                        alquiler: parseBoolean(item.alquiler),
                        observaciones: item.observaciones || ''
                    }
                });

                localStorage.setItem('articulosERP', JSON.stringify(importedData));
                setItems(importedData);
                toast({
                    title: 'Importación completada',
                    description: `Se han cargado ${importedData.length} registros. ${newPriceHistoryEntries.length} cambios de precio registrados.`
                });
                setIsImportAlertOpen(false);
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
                setIsImportAlertOpen(false);
            }
        });
        if (event.target) {
            event.target.value = '';
        }
    };

    if (!isMounted) {
        return <GlobalLoadingIndicator />;
    }

    return (
        <>
            {isSyncing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-auto max-h-[90vh] flex flex-col space-y-4">
                        {/* Header */}
                        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-gray-900">Sincronizando con Factusol...</h2>
                                    <p className="text-sm text-gray-600">Por favor espera mientras se actualizan los artículos.</p>
                                </div>
                                {/* Cancel button */}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    aria-label="Cancelar sincronización"
                                    className="ml-2"
                                    onClick={() => {
                                        if (syncController) {
                                            syncController.close();
                                            setSyncController(null);
                                        }
                                        setIsSyncing(false);
                                        setSyncProgress(null);
                                        setSyncLog(prev => [...prev, '❌ Sincronización cancelada por el usuario.']);
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                            {/* Barra de progreso */}
                            {syncProgress && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${syncProgress.percent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs mt-1">
                                        <span>{syncProgress.current} / {syncProgress.total} lotes</span>
                                        <span>{syncProgress.percent}%</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logs - Full verbose output */}
                        <div className="flex-1 px-6 py-4 overflow-y-auto font-mono text-xs bg-gray-900 text-green-400 rounded-none border">
                            <div className="space-y-1">
                                {syncLog.length > 0 ? (
                                    syncLog.map((log, idx) => (
                                        <div key={idx} className="whitespace-pre-wrap break-words">
                                            <span className="text-gray-500">[{String(idx + 1).padStart(3, '0')}]</span> {log}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500">Iniciando sincronización...</div>
                                )}
                                {/* Auto-scroll to bottom */}
                                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                            </div>
                        </div>

                        {/* Footer - Status info */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">
                                <span>{syncLog.length} líneas de log</span>
                                {syncLog.length > 0 && (
                                    <span className="ml-4">
                                        {syncLog[syncLog.length - 1]?.includes('✅') ? (
                                            <span className="text-green-600 font-medium">✅ Completado</span>
                                        ) : syncLog[syncLog.length - 1]?.includes('❌') ? (
                                            <span className="text-red-600 font-medium">❌ Error detectado</span>
                                        ) : (
                                            <span className="text-blue-600 font-medium">⏳ En progreso...</span>
                                        )}
                                    </span>
                                )}
                            </div>
                            {syncLog.length > 0 && syncLog[syncLog.length - 1]?.includes('❌') && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        setIsSyncing(false);
                                        setSyncProgress(null);
                                        setSyncLog([]);
                                    }}
                                >
                                    Cerrar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-4">
                <Input
                    placeholder="Buscar..."
                    className="flex-grow max-w-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="relative">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]">
                            <SelectValue />
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{typesCount}</span>
                        </SelectTrigger>
                        <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'Todos los Tipos' : t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="relative">
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]">
                            <SelectValue />
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{providersCount}</span>
                        </SelectTrigger>
                        <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'Todos los Proveedores' : p}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-grow flex justify-end items-center gap-2">
                    <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
                    <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Menu />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleFactusolSync} disabled={isSyncing}>
                                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />Sincronizar con Factusol
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); window.open('/erp/sync-logs', '_blank'); }}>
                                <Database size={16} className="mr-2" />Ver logs de sincronización
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsImportAlertOpen(true); }}>
                                <FileUp size={16} className="mr-2" />Importar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportCSV}>
                                <FileDown size={16} className="mr-2" />Exportar CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Desktop "Cargar más" button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 hidden md:inline-flex"
                        disabled={isAppending || items.length >= totalCount}
                        onClick={() => { if (!isAppending && items.length < totalCount) loadPage('append'); }}
                    >
                        {isAppending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                        Cargar más
                    </Button>
                </div>
            </div>


            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={(e) => {
                    const delimiter = fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';';
                    if (delimiter) {
                        handleImportCSV(e, delimiter);
                    }
                }}
            />

            {/* Vista Móvil: Tarjetas Apiladas */}
            <div className="md:hidden space-y-4">
                <MobileTableView
                    data={mobileItems}
                    columns={mobileColumns}
                    renderActions={(item) => (
                        <Link href={`/bd/erp/${item.idreferenciaerp}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full">
                                <History className="mr-2 h-4 w-4" />
                                Ver Historial
                            </Button>
                        </Link>
                    )}
                    sentinelRef={sentinelRef}
                    isLoading={false}
                    emptyMessage="No se encontraron artículos que coincidan con la búsqueda."
                />
            </div>

            {/* Vista Escritorio: Tabla Tradicional */}
            <div className="hidden md:block border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="p-2">Producto</TableHead>
                            <TableHead className="p-2">Ref. ERP</TableHead>
                            <TableHead className="p-2">Proveedor</TableHead>
                            <TableHead className="p-2 text-right">P. Compra</TableHead>
                            <TableHead className="p-2 text-right">Desc. %</TableHead>
                            <TableHead className="p-2 text-right">Factor Conv.</TableHead>
                            <TableHead className="p-2 text-right">Precio/Unidad</TableHead>
                            <TableHead className="p-2">Unidad</TableHead>
                            <TableHead className="p-2">Tipo (Familia)</TableHead>
                            <TableHead className="p-2">Categoría MICE</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map(item => {
                                const precioCalculado = item.precio || 0;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-2 text-xs font-medium">{item.nombreProductoERP}</TableCell>
                                        <TableCell className="p-2 text-xs">{item.idreferenciaerp}</TableCell>
                                        <TableCell className="p-2 text-xs">{item.nombreProveedor}</TableCell>
                                        <TableCell className="p-2 text-xs text-right">{formatCurrency(item.precioCompra)}</TableCell>
                                        <TableCell className="p-2 text-xs text-right">{item.descuento}%</TableCell>
                                        <TableCell className="p-2 text-xs text-right">{item.unidadConversion}</TableCell>
                                        <TableCell className="p-2 text-xs text-right font-semibold">{formatCurrency(precioCalculado)}</TableCell>
                                        <TableCell className="p-2 text-xs">{formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="p-2 text-xs">{item.tipo}</TableCell>
                                        <TableCell className="p-2 text-xs">{item.categoriaMice}</TableCell>
                                        <TableCell className="p-2 text-xs">
                                            <Link href={`/bd/erp/${item.idreferenciaerp}`}>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                    <History className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">{isLoadingPage ? 'Cargando...' : 'No se encontraron artículos que coincidan con la búsqueda.'}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                        <AlertDialogDescription>
                            Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="!justify-center gap-4">
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {syncLog.length > 0 && (
                <AlertDialog open={syncLog.length > 0 && !isSyncing} onOpenChange={() => setSyncLog([])}>
                    <AlertDialogContent className="max-w-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Log de Sincronización</AlertDialogTitle>
                            <AlertDialogDescription>
                                Detalles del proceso de sincronización con Factusol.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="max-h-96 overflow-y-auto">
                            <pre className="text-xs bg-secondary p-4 rounded">
                                {syncLog.join('\n')}
                            </pre>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setSyncLog([])}>Cerrar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

export default function ArticulosERPPage() {
    return (
        <Suspense fallback={<GlobalLoadingIndicator />}> 
            <ArticulosERPPageContent />
        </Suspense>
    )
}
