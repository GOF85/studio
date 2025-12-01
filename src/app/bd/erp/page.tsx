
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Save, Trash2, Loader2, Menu, FileUp, FileDown, Database, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
import { formatCurrency, formatUnit } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { Label } from '@/components/ui/label';
import { differenceInDays, parseISO } from 'date-fns';

import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "idreferenciaerp", "idProveedor", "nombreProveedor", "nombreProductoERP", "referenciaProveedor", "familiaCategoria", "precioCompra", "descuento", "unidadConversion", "precioAlquiler", "unidad", "tipo", "categoriaMice", "alquiler", "observaciones"];

const ITEMS_PER_PAGE = 20;

function ArticulosERPPageContent() {
    const [items, setItems] = useState<ArticuloERP[]>([]);
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

    const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));


    const handleFactusolSync = async () => {
        setIsSyncing(true);
        setSyncLog([]);

        try {
            const response = await fetch('/api/factusol/sync-articulos', {
                method: 'POST',
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Sincronización completada',
                    description: `Se han sincronizado ${result.count} artículos desde Factusol.`
                });
                setSyncLog(result.debugLog || []);

                // Reload data from Supabase after sync
                const { data: articulosData, error } = await supabase
                    .from('articulos_erp')
                    .select('*')
                    .limit(10000);

                if (!error && articulosData) {
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
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error en la sincronización',
                    description: result.error
                });
                setSyncLog(result.debugLog || []);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: errorMessage
            });
        } finally {
            setIsSyncing(false);
        }
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
            complete: (results) => {
                const headers = results.meta.fields || [];
                const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

                if (!hasAllHeaders) {
                    toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
                    return;
                }

                // --- Smart Snapshot Logic ---
                const today = new Date();
                const historicoPrecios: HistoricoPreciosERP[] = JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]') as HistoricoPreciosERP[];
                const currentArticulosMap = new Map(items.map(i => [i.idreferenciaerp, i]));

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
                            historicoPrecios.push({
                                id: `${idreferenciaerp}-${today.toISOString()}`,
                                articuloErpId: idreferenciaerp,
                                fecha: today.toISOString(),
                                precioCalculado: newPrice,
                                proveedorId: item.idProveedor,
                            });
                        }
                    } else {
                        // If it's a new item, add it to the history
                        historicoPrecios.push({
                            id: `${idreferenciaerp}-${today.toISOString()}`,
                            articuloErpId: idreferenciaerp,
                            fecha: today.toISOString(),
                            precioCalculado: newPrice,
                            proveedorId: item.idProveedor,
                        });
                    }
                });
                localStorage.setItem('historicoPreciosERP', JSON.stringify(historicoPrecios));
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
                toast({ title: 'Importación completada', description: `Se han cargado ${importedData.length} registros y se ha actualizado el histórico de precios.` });
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


export default function ArticulosERPPage() {
    return (
        <Suspense>
            <ArticulosERPPageContent />
        </Suspense>
    )
}
