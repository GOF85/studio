'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useArticulosERPPaginated } from '@/hooks/use-data-queries';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "idreferenciaerp", "idProveedor", "nombreProveedor", "nombreProductoERP", "referenciaProveedor", "familiaCategoria", "precioCompra", "descuento", "unidadConversion", "precioAlquiler", "unidad", "tipo", "categoriaMice", "alquiler", "observaciones"];

const ITEMS_PER_PAGE = 20;

interface ArticulosERPClientProps {
    initialData: {
        items: ArticuloERP[];
        totalCount: number;
    };
}

export function ArticulosERPClient({ initialData }: ArticulosERPClientProps) {
    const [types, setTypes] = useState<string[]>(['all']);
    const [providers, setProviders] = useState<string[]>(['all']);
    const [typesCount, setTypesCount] = useState(0);
    const [providersCount, setProvidersCount] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [typeFilter, setTypeFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0); // 0-indexed for the hook
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLog, setSyncLog] = useState<string[]>([]);
    const [syncController, setSyncController] = useState<EventSource | null>(null);
    const [syncProgress, setSyncProgress] = useState<{ percent: number; current: number; total: number } | null>(null);

    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, isLoading: isLoadingPage, refetch } = useArticulosERPPaginated({
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        searchTerm: debouncedSearch,
        typeFilter,
        providerFilter
    }, initialData);

    const items = data?.items || [];
    const totalCount = data?.totalCount || 0;

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(0);
    }, [debouncedSearch, typeFilter, providerFilter]);

    useEffect(() => {
        setIsMounted(true);
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const { data: typesData } = await supabase.from('articulos_erp').select('tipo').not('tipo', 'is', null);
            const uniqueTypes = Array.from(new Set(typesData?.map(t => t.tipo))).sort();
            setTypes(['all', ...uniqueTypes]);
            setTypesCount(uniqueTypes.length);

            const { data: providersData } = await supabase.from('articulos_erp').select('nombre_proveedor').not('nombre_proveedor', 'is', null);
            const uniqueProviders = Array.from(new Set(providersData?.map(p => p.nombre_proveedor))).sort();
            setProviders(['all', ...uniqueProviders]);
            setProvidersCount(uniqueProviders.length);
        } catch (error) {
            console.error('Error fetching filters:', error);
        }
    };

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
    };

    const handleExport = () => {
        const exportData = items.map((item: ArticuloERP) => ({
            id: item.id,
            idreferenciaerp: item.idreferenciaerp,
            idProveedor: item.idProveedor,
            nombreProveedor: item.nombreProveedor,
            nombreProductoERP: item.nombreProductoERP,
            referenciaProveedor: item.referenciaProveedor,
            familiaCategoria: item.familiaCategoria,
            precioCompra: item.precioCompra,
            descuento: item.descuento,
            unidadConversion: item.unidadConversion,
            precioAlquiler: item.precioAlquiler,
            unidad: item.unidad,
            tipo: item.tipo,
            categoriaMice: item.categoriaMice,
            alquiler: item.alquiler,
            observaciones: item.observaciones
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `articulos_erp_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const { data: rows } = results;
                let successCount = 0;
                let errorCount = 0;

                toast({
                    title: "Importando...",
                    description: `Procesando ${rows.length} registros.`,
                });

                for (const row of rows as any[]) {
                    try {
                        const precioCompra = parseCurrency(row.precioCompra);
                        const descuento = parseCurrency(row.descuento);
                        const unidadConversion = parseCurrency(row.unidadConversion) || 1;
                        const precioConDescuento = precioCompra * (1 - (descuento / 100));
                        const precioFinal = unidadConversion > 0 ? precioConDescuento / unidadConversion : 0;

                        const upsertData = {
                            erp_id: row.idreferenciaerp,
                            proveedor_id: row.idProveedor,
                            nombre_proveedor: row.nombreProveedor,
                            nombre: row.nombreProductoERP,
                            referencia_proveedor: row.referenciaProveedor,
                            familia_categoria: row.familiaCategoria,
                            precio_compra: precioCompra,
                            descuento: descuento,
                            unidad_conversion: unidadConversion,
                            precio_alquiler: parseCurrency(row.precioAlquiler),
                            unidad_medida: row.unidad,
                            tipo: row.tipo,
                            categoria_mice: row.categoriaMice,
                            alquiler: row.alquiler === 'true' || row.alquiler === true,
                            observaciones: row.observaciones,
                            precio: precioFinal
                        };

                        const { error } = await supabase
                            .from('articulos_erp')
                            .upsert(upsertData, { onConflict: 'erp_id' });

                        if (error) throw error;
                        successCount++;
                    } catch (err) {
                        console.error('Error importing row:', err);
                        errorCount++;
                    }
                }

                toast({
                    title: "Importación completada",
                    description: `Éxito: ${successCount}, Errores: ${errorCount}`,
                    variant: errorCount > 0 ? "destructive" : "default",
                });
                refetch();
            }
        });
    };

    const handleSync = async () => {
        if (isSyncing) {
            syncController?.close();
            setIsSyncing(false);
            return;
        }

        setIsSyncing(true);
        setSyncLog([]);
        setSyncProgress(null);

        const eventSource = new EventSource('/api/factusol/sync-articulos/stream');
        setSyncController(eventSource);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'log') {
                    setSyncLog(prev => [...prev, data.message].slice(-10));
                } else if (data.type === 'progress') {
                    setSyncProgress({
                        percent: Math.round((data.current / data.total) * 100),
                        current: data.current,
                        total: data.total
                    });
                } else if (data.type === 'done') {
                    toast({
                        title: "Sincronización completada",
                        description: `Se han procesado ${data.total} artículos.`,
                    });
                    eventSource.close();
                    setIsSyncing(false);
                    refetch();
                } else if (data.type === 'error') {
                    toast({
                        title: "Error en la sincronización",
                        description: data.message,
                        variant: "destructive",
                    });
                    eventSource.close();
                    setIsSyncing(false);
                }
            } catch (e) {
                // Si no es JSON, podría ser un log directo
                setSyncLog(prev => [...prev, event.data].slice(-10));
            }
        };

        // También escuchar eventos específicos si el backend los envía
        eventSource.addEventListener('log', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                setSyncLog(prev => [...prev, data.message || data].slice(-10));
            } catch (e) {
                setSyncLog(prev => [...prev, event.data].slice(-10));
            }
        });

        eventSource.addEventListener('progress', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                setSyncProgress({
                    percent: Math.round((data.current / data.total) * 100),
                    current: data.current,
                    total: data.total
                });
            } catch (e) {}
        });

        eventSource.addEventListener('done', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                toast({
                    title: "Sincronización completada",
                    description: `Se han procesado ${data.total} artículos.`,
                });
            } catch (e) {}
            eventSource.close();
            setIsSyncing(false);
            refetch();
        });

        eventSource.onerror = (err) => {
            console.error('EventSource error:', err);
            eventSource.close();
            setIsSyncing(false);
        };
    };

    const columns: MobileTableColumn<ArticuloERP>[] = [
        {
            label: 'Producto',
            key: 'nombreProductoERP',
            isTitle: true,
            format: (_, item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{item.nombreProductoERP}</span>
                    <span className="text-xs text-muted-foreground">{item.idreferenciaerp}</span>
                </div>
            )
        },
        {
            label: 'Proveedor',
            key: 'nombreProveedor',
            format: (_, item) => <span className="text-xs">{item.nombreProveedor}</span>
        },
        {
            label: 'Precio',
            key: 'precio',
            format: (_, item) => (
                <div className="flex flex-col items-end">
                    <span className="font-bold text-primary">{formatCurrency(item.precio)}</span>
                    <span className="text-[10px] text-muted-foreground">/{item.unidad}</span>
                </div>
            )
        }
    ];

    if (!isMounted) return null;

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Database className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Base de Datos ERP</h1>
                                <p className="text-sm text-muted-foreground">
                                    {totalCount} artículos sincronizados
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={isSyncing ? "border-primary text-primary" : ""}
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sincronizando ({syncProgress?.percent || 0}%)
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sincronizar Factusol
                                    </>
                                )}
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open('/erp/sync-logs', '_blank')}
                            >
                                <History className="mr-2 h-4 w-4" />
                                Ver Logs
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <FileUp className="mr-2 h-4 w-4" />
                                Importar CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Exportar
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por tipo" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {types.map(t => (
                                    <SelectItem key={t} value={t}>
                                        {t === 'all' ? `Todos los tipos (${typesCount})` : t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={providerFilter} onValueChange={setProviderFilter}>
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por proveedor" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {providers.map(p => (
                                    <SelectItem key={p} value={p}>
                                        {p === 'all' ? `Todos los proveedores (${providersCount})` : p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[100px]">ID ERP</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Familia</TableHead>
                                    <TableHead className="text-right">P. Compra</TableHead>
                                    <TableHead className="text-right">Desc.</TableHead>
                                    <TableHead className="text-right">U. Conv.</TableHead>
                                    <TableHead className="text-right font-bold text-primary">P. Final</TableHead>
                                    <TableHead>Unidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingPage ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 9 }).map((_, j) => (
                                                <TableCell key={j}>
                                                    <div className="h-4 bg-muted animate-pulse rounded" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                            No se encontraron artículos
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item: ArticuloERP) => (
                                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-mono text-xs">{item.idreferenciaerp}</TableCell>
                                            <TableCell className="font-medium">{item.nombreProductoERP}</TableCell>
                                            <TableCell className="text-sm">{item.nombreProveedor}</TableCell>
                                            <TableCell className="text-sm">{item.familiaCategoria}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.precioCompra)}</TableCell>
                                            <TableCell className="text-right">{item.descuento}%</TableCell>
                                            <TableCell className="text-right">{item.unidadConversion}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {formatCurrency(item.precio)}
                                            </TableCell>
                                            <TableCell className="text-sm">{item.unidad}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                        <MobileTableView
                            data={items}
                            columns={columns}
                            isLoading={isLoadingPage}
                        />
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {items.length} de {totalCount} artículos
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={currentPage === 0 || isLoadingPage}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <div className="text-sm font-medium">
                                Página {currentPage + 1} de {totalPages || 1}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                disabled={currentPage >= totalPages - 1 || isLoadingPage}
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sync Log Overlay */}
            {isSyncing && syncLog.length > 0 && (
                <div className="fixed bottom-4 right-4 w-80 bg-card border rounded-lg shadow-xl p-4 z-50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">Registro de sincronización</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSyncLog([])}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncLog.map((log, i) => (
                            <p key={i} className="text-[10px] font-mono text-muted-foreground border-l-2 border-primary/30 pl-2">
                                {log}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
