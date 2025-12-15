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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
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
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLog, setSyncLog] = useState<string[]>([]);

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

    useEffect(() => {
        async function loadData() {
            // Load articulos from Supabase
            const { data: articulosData, error } = await supabase
                .from('articulos_erp')
                .select('*')
                .limit(10000);

            if (error) {
                console.error('Error loading articulos_erp:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar los artículos.' });
                setItems([]);
            } else {
                // Map Supabase data to ArticuloERP type
                const mappedItems = (articulosData || []).map((row: any) => ({
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

                setItems(mappedItems);
            }

            setIsMounted(true);
        }

        loadData();
    }, [toast]);

    const { types, providers } = useMemo(() => {
        if (!items) return { types: [], providers: [] };
        const typeSet = new Set<string>();
        const provSet = new Set<string>();
        items.forEach(item => {
            if (item.tipo) typeSet.add(item.tipo);
            if (item.nombreProveedor) provSet.add(item.nombreProveedor);
        });
        return {
            types: ['all', ...Array.from(typeSet).sort()],
            providers: ['all', ...Array.from(provSet).sort()],
        };
    }, [items]);

    const filteredItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            const term = searchTerm.toLowerCase();
            const searchMatch =
                (item.nombreProductoERP || '').toLowerCase().includes(term) ||
                (item.nombreProveedor || '').toLowerCase().includes(term) ||
                (item.referenciaProveedor || '').toLowerCase().includes(term) ||
                (item.idreferenciaerp || '').toLowerCase().includes(term) ||
                (item.tipo || '').toLowerCase().includes(term);

            const typeMatch = typeFilter === 'all' || item.tipo === typeFilter;
            const providerMatch = providerFilter === 'all' || item.nombreProveedor === providerFilter;

            return searchMatch && typeMatch && providerMatch;
        });
    }, [items, searchTerm, typeFilter, providerFilter]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    // Para infinite scroll en móvil: mostrar todos los items filtrados
    const mobileItems = useMemo(() => {
        return filteredItems;
    }, [filteredItems]);

    // Hook para infinite scroll
    const sentinelRef = useInfiniteScroll({
        fetchNextPage: () => {
            if (currentPage < totalPages) {
                setCurrentPage(prev => prev + 1);
            }
        },
        hasNextPage: currentPage < totalPages,
        isFetchingNextPage: false,
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

    const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));


    const handleFactusolSync = () => {
        setIsSyncing(true);
        setSyncLog(['Iniciando sincronización...']);

        // Defer the heavy async work so the modal paints immediately
        requestAnimationFrame(() => {
            const timeoutId = setTimeout(() => {
                setIsSyncing(false);
                toast({
                    variant: 'destructive',
                    title: 'Timeout',
                    description: 'La sincronización tardó demasiado. Verifica los logs para más detalles.'
                });
            }, 900000); // 15 minutes

            const runSync = async () => {
                try {
                    setSyncLog(prev => [...prev, '⏳ Enviando petición al servidor...']);
                    
                    const controller = new AbortController();
                    const fetchTimeoutId = setTimeout(() => controller.abort(), 840000); // 14 minutes
                    
                    const response = await fetch('/api/factusol/sync-articulos', {
                        method: 'POST',
                        signal: controller.signal,
                    });

                    clearTimeout(fetchTimeoutId);

                    if (!response.ok) {
                        setSyncLog(prev => [...prev, `❌ Error HTTP ${response.status}: ${response.statusText}`]);
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    setSyncLog(prev => [...prev, '⏳ Recibiendo respuesta del servidor...']);
                    const result = await response.json();

                    if (result.success) {
                        setSyncLog(result.debugLog || []);
                        toast({
                            title: 'Sincronización completada',
                            description: `Se han sincronizado ${result.count} artículos desde Factusol.`
                        });

                        // Reload data from Supabase after sync
                        setSyncLog(prev => [...prev, 'Recargando datos desde Supabase...']);
                        const { data: articulosData, error } = await supabase
                            .from('articulos_erp')
                            .select('*')
                            .limit(10000);

                        if (!error && articulosData) {
                            setSyncLog(prev => [...prev, `Cargados ${articulosData.length} artículos de Supabase`]);
                            const mappedItems = articulosData.map((row: any) => ({
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

                            setItems(mappedItems);
                            setSyncLog(prev => [...prev, '✅ Sincronización completada exitosamente']);
                        } else {
                            setSyncLog(prev => [...prev, `⚠️ Error cargando datos: ${error?.message || 'desconocido'}`]);
                        }
                    } else {
                        setSyncLog(result.debugLog || []);
                        setSyncLog(prev => [...prev, `❌ Error: ${result.error}`]);
                        toast({
                            variant: 'destructive',
                            title: 'Error en la sincronización',
                            description: result.error
                        });
                    }
                } catch (error) {
                    let errorMessage = 'Error desconocido';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                        if (error.name === 'AbortError') {
                            errorMessage = 'La solicitud fue cancelada por timeout (14 minutos)';
                        }
                    }
                    setSyncLog(prev => [...prev, `❌ ${errorMessage}`]);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: errorMessage
                    });
                } finally {
                    clearTimeout(timeoutId);
                    setIsSyncing(false);
                }
            };

            void runSync();
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
        return <LoadingSkeleton title="Cargando Artículos ERP..." />;
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
                            </div>
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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'Todos los Tipos' : t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger className="w-full md:w-auto flex-grow md:flex-grow-0 md:w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'Todos los Proveedores' : p}</SelectItem>)}</SelectContent>
                </Select>
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
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsImportAlertOpen(true); }}>
                                <FileUp size={16} className="mr-2" />Importar CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportCSV}>
                                <FileDown size={16} className="mr-2" />Exportar CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                        {paginatedItems.length > 0 ? (
                            paginatedItems.map(item => {
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
                                <TableCell colSpan={10} className="h-24 text-center">No se encontraron artículos que coincidan con la búsqueda.</TableCell>
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
                <AlertDialog open={syncLog.length > 0} onOpenChange={() => setSyncLog([])}>
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
        <Suspense fallback={<LoadingSkeleton title="Cargando Artículos ERP..." />}>
            <ArticulosERPPageContent />
        </Suspense>
    )
}
