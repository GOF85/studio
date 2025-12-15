'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    PlusCircle, Link as LinkIcon, Menu, FileUp, FileDown, 
    ChevronRight, Check, CircleX, Search, X, AlertCircle, ChevronsRight, ChevronLeft, Activity,
    Pencil
} from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno } from '@/types';
import { ALERGENOS } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { supabase } from '@/lib/supabase';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isBefore, subMonths, startOfToday, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-is-mobile';

// --- SCHEMA & TYPES ---
const ingredienteFormSchema = z.object({
    id: z.string(),
    nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
    productoERPlinkId: z.string().nullable().optional(), 
    alergenosPresentes: z.array(z.string()).default([]),
    alergenosTrazas: z.array(z.string()).default([]),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

type IngredienteConERP = IngredienteInterno & {
    erp?: ArticuloERP;
    alergenos: Alergeno[];
    urgency?: 'high' | 'medium' | 'low';
};

const ITEMS_PER_PAGE = 20;
const CSV_HEADERS = ["id", "nombreIngrediente", "productoERPlinkId", "alergenosPresentes", "alergenosTrazas", "historialRevisiones"];

// Iconos para alérgenos
const AlergenoIcon = ({ name, className }: { name: string, className?: string }) => {
    return <span className={cn("font-bold text-xs uppercase", className)}>{name.substring(0,3)}</span>
}

// --- COMPONENTE EDITOR (FORMULARIO COMPARTIDO) ---
function ReviewPanelContent({ 
    ingrediente, 
    articulosERP, 
    onSave, 
    onCancel, 
    isMobile,
    hasPrev,
    hasNext,
    onNavigate
}: { 
    ingrediente: IngredienteConERP, 
    articulosERP: ArticuloERP[], 
    onSave: (data: IngredienteFormValues, action: 'save' | 'save_next') => void, 
    onCancel: () => void,
    isMobile: boolean,
    hasPrev: boolean,
    hasNext: boolean,
    onNavigate: (direction: 'prev' | 'next') => void
}) {
    const [erpSearchTerm, setErpSearchTerm] = useState('');
    const [alergenoTab, setAlergenoTab] = useState<'presentes' | 'trazas'>('presentes');
    const form = useForm<IngredienteFormValues>({
        resolver: zodResolver(ingredienteFormSchema),
        defaultValues: {
            id: ingrediente.id,
            nombreIngrediente: ingrediente.nombreIngrediente,
            productoERPlinkId: ingrediente.productoERPlinkId || '',
            alergenosPresentes: ingrediente.alergenosPresentes || [],
            alergenosTrazas: ingrediente.alergenosTrazas || [],
        }
    });

    useEffect(() => {
        form.reset({
            id: ingrediente.id,
            nombreIngrediente: ingrediente.nombreIngrediente,
            productoERPlinkId: ingrediente.productoERPlinkId || '',
            alergenosPresentes: ingrediente.alergenosPresentes || [],
            alergenosTrazas: ingrediente.alergenosTrazas || [],
        });
        setErpSearchTerm(''); 
    }, [ingrediente, form]);

    const selectedErpId = form.watch('productoERPlinkId');
    const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);

    const filteredErpList = useMemo(() => {
        if (!erpSearchTerm && !selectedErpProduct) return [];
        if (!erpSearchTerm) return [];
        return articulosERP.filter(p => 
            (p.nombreProductoERP || '').toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
            (p.nombreProveedor || '').toLowerCase().includes(erpSearchTerm.toLowerCase())
        ).slice(0, 10);
    }, [articulosERP, erpSearchTerm, selectedErpProduct]);

    const toggleAlergeno = (alergeno: string, type: 'presentes' | 'trazas') => {
        const currentPresentes = form.getValues('alergenosPresentes') || [];
        const currentTrazas = form.getValues('alergenosTrazas') || [];

        if (type === 'presentes') {
            if (currentPresentes.includes(alergeno)) {
                form.setValue('alergenosPresentes', currentPresentes.filter(a => a !== alergeno), { shouldDirty: true });
            } else {
                form.setValue('alergenosPresentes', [...currentPresentes, alergeno], { shouldDirty: true });
                form.setValue('alergenosTrazas', currentTrazas.filter(a => a !== alergeno), { shouldDirty: true });
            }
        } else {
            if (currentTrazas.includes(alergeno)) {
                form.setValue('alergenosTrazas', currentTrazas.filter(a => a !== alergeno), { shouldDirty: true });
            } else {
                form.setValue('alergenosTrazas', [...currentTrazas, alergeno], { shouldDirty: true });
                form.setValue('alergenosPresentes', currentPresentes.filter(a => a !== alergeno), { shouldDirty: true });
            }
        }
    };

    const currentPresentes = form.watch('alergenosPresentes');
    const currentTrazas = form.watch('alergenosTrazas');

    return (
        <Form {...form}>
            <form id="review-form" className="flex flex-col h-full bg-background" onSubmit={(e) => e.preventDefault()}>
                <ScrollArea className="flex-1 p-2.5 md:p-4">
                    <div className="space-y-4 pb-10">
                        <div className="space-y-2">
                            <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Nombre Interno</FormLabel>
                                    <FormControl><Input {...field} className="text-lg font-bold" /></FormControl>
                                </FormItem>
                            )} />

                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Artículo ERP Vinculado</FormLabel>
                                {selectedErpProduct ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 relative group">
                                        <div className="pr-8">
                                            <p className="font-bold text-emerald-900 text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                            <div className="flex gap-2 text-xs text-emerald-700 mt-1">
                                                <span>{selectedErpProduct.nombreProveedor}</span>
                                                <span>•</span>
                                                <span className="font-mono">{selectedErpProduct.referenciaProveedor}</span>
                                            </div>
                                            <div className="mt-2 font-bold text-emerald-800">
                                                {((selectedErpProduct.precioCompra || 0) / (selectedErpProduct.unidadConversion || 1)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {selectedErpProduct.unidad}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 text-emerald-700 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => { form.setValue('productoERPlinkId', '', { shouldDirty: true }); setErpSearchTerm(''); }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Buscar en ERP (min 3 letras)..." 
                                                value={erpSearchTerm}
                                                onChange={(e) => setErpSearchTerm(e.target.value)}
                                                className="pl-8 bg-muted/20"
                                            />
                                        </div>
                                        {filteredErpList.length > 0 && (
                                            <div className="border rounded-md shadow-sm max-h-48 overflow-y-auto bg-white divide-y">
                                                {filteredErpList.map(item => (
                                                    <button 
                                                        key={item.id} 
                                                        className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between items-center group"
                                                        onClick={() => {
                                                            form.setValue('productoERPlinkId', item.idreferenciaerp || '', { shouldDirty: true });
                                                            setErpSearchTerm('');
                                                        }}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium truncate">{item.nombreProductoERP}</div>
                                                            <div className="text-xs text-muted-foreground">{item.nombreProveedor}</div>
                                                        </div>
                                                        <PlusCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {erpSearchTerm.length > 2 && filteredErpList.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">No se encontraron productos.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Tabs value={alergenoTab} onValueChange={(v) => setAlergenoTab(v as 'presentes' | 'trazas')} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-8">
                                    <TabsTrigger value="presentes" className="flex items-center gap-0.5 text-xs py-0.5 px-1">
                                        <div className="p-0.5 bg-red-100 text-red-700 rounded text-xs"><AlertCircle className="w-2.5 h-2.5" /></div>
                                        <span className="hidden sm:inline">Contiene</span>
                                        <span className="sm:hidden">Contiene</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="trazas" className="flex items-center gap-0.5 text-xs py-0.5 px-1">
                                        <div className="p-0.5 bg-amber-100 text-amber-700 rounded text-xs"><Activity className="w-2.5 h-2.5" /></div>
                                        <span className="hidden sm:inline">Trazas</span>
                                        <span className="sm:hidden">Trazas</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="presentes" className="space-y-1 mt-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <div className="p-0.5 bg-red-100 rounded text-red-700"><AlertCircle className="w-2 h-2" /></div>
                                        <h4 className="font-bold text-[10px] uppercase text-red-900">Contiene</h4>
                                    </div>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1">
                                        {ALERGENOS.map((alergeno) => {
                                            const isSelected = currentPresentes?.includes(alergeno);
                                            return (
                                                <button
                                                    key={`presente-${alergeno}`}
                                                    type="button"
                                                    onClick={() => toggleAlergeno(alergeno, 'presentes')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-1 rounded-md border transition-all text-center h-14",
                                                        isSelected 
                                                            ? "bg-red-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500" 
                                                            : "bg-white border-muted hover:border-red-200 hover:bg-red-50/30 text-muted-foreground"
                                                    )}
                                                >
                                                    <AlergenoIcon name={alergeno} className={cn("text-sm mb-0.5", isSelected && "scale-110")} />
                                                    <span className="text-[7px] font-medium leading-tight">{alergeno.replace('_', ' ')}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </TabsContent>

                                <TabsContent value="trazas" className="space-y-1 mt-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <div className="p-0.5 bg-amber-100 rounded text-amber-700"><Activity className="w-2 h-2" /></div>
                                        <h4 className="font-bold text-[10px] uppercase text-amber-900">Puede Contener</h4>
                                    </div>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-1">
                                        {ALERGENOS.map((alergeno) => {
                                            const isSelected = currentTrazas?.includes(alergeno);
                                            const isPresente = currentPresentes?.includes(alergeno);
                                            
                                            return (
                                                <button
                                                    key={`traza-${alergeno}`}
                                                    type="button"
                                                    disabled={isPresente}
                                                    onClick={() => toggleAlergeno(alergeno, 'trazas')}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-1 rounded-md border transition-all text-center h-12",
                                                        isPresente && "opacity-20 cursor-not-allowed bg-gray-50 border-transparent",
                                                        !isPresente && isSelected && "bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-1 ring-amber-500",
                                                        !isPresente && !isSelected && "bg-white border-muted hover:border-amber-200 hover:bg-amber-50/30 text-muted-foreground"
                                                    )}
                                                >
                                                    <span className="text-[7px] font-medium leading-tight">{alergeno.replace('_', ' ')}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ScrollArea>

                <div className="px-2.5 py-2 border-t bg-background/95 backdrop-blur flex items-center justify-between gap-1.5 sticky bottom-0">
                    <Button variant="outline" type="button" size="sm" onClick={() => onNavigate('prev')} disabled={!hasPrev} className="h-7 w-7 p-0 text-xs">
                         <ChevronLeft className="h-3 w-3" />
                    </Button>
                    
                    <div className="flex gap-1.5 flex-1 justify-end">
                         <Button variant="secondary" onClick={form.handleSubmit((d) => onSave(d, 'save'))} className="hidden sm:flex text-[10px] h-7 px-2" size="sm">
                            Guardar
                         </Button>

                         <Button 
                            className={cn("flex-1 sm:flex-none sm:w-auto font-bold shadow-md text-[10px] h-7 px-2", hasNext ? "bg-emerald-600 hover:bg-emerald-700" : "")} 
                            size="sm"
                            onClick={form.handleSubmit((d) => onSave(d, 'save_next'))}
                         >
                            {hasNext ? 'Siguiente' : 'Finalizar'}
                            {hasNext ? <ChevronsRight className="ml-0.5 h-2.5 w-2.5" /> : <Check className="ml-0.5 h-2.5 w-2.5" />}
                         </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}

// --- PÁGINA PRINCIPAL ---

function IngredientesPageContent() {
    const isMobile = useIsMobile(); // Tu hook actual
    const isDesktop = !isMobile;

    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const searchParams = useSearchParams() ?? new URLSearchParams();
    const [showOnlyPending, setShowOnlyPending] = useState(() => searchParams.get('pending') !== 'false');
    const [tipoFilter, setTipoFilter] = useState(() => searchParams.get('tipo') || '');
    const [categoriaFilter, setCategoriaFilter] = useState(() => searchParams.get('categoria') || '');
    const [editingItem, setEditingItem] = useState<IngredienteConERP | null>(null);
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    const sixMonthsAgo = useMemo(() => subMonths(startOfToday(), 6), []);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

    // --- CARGA DE DATOS ---
    const loadData = useCallback(async () => {
        
        // 1. CARGA ARTICULOS ERP
        const { data: erpData, error: erpError } = await supabase
            .from('articulos_erp')
            .select('*'); 
        
        if (erpError) console.error("Error cargando ERP:", erpError);
        
        const mappedERP = (erpData || []).map((row: any) => ({
            id: row.id,
            // INTENTO DOBLE DE MAPEO (Snake Case vs Camel Case)
            idreferenciaerp: row.erp_id || row.erpId || '', 
            idProveedor: row.proveedor_id || row.proveedorId || '',
            nombreProveedor: row.nombre_proveedor || row.nombreProveedor || 'Sin proveedor',
            nombreProductoERP: row.nombre || row.nombreProducto || '',
            referenciaProveedor: row.referencia_proveedor || '',
            unidadConversion: row.unidad_conversion || 1,
            precioCompra: row.precio_compra || 0,
            descuento: row.descuento || 0,
            unidad: row.unidad_medida || 'UD',
            tipo: row.tipo || '',
            categoriaMice: row.categoria_mice || '',
        })) as ArticuloERP[];
        
        setArticulosERP(mappedERP);
        const erpMap = new Map(mappedERP.map(item => [item.idreferenciaerp, item]));

        // 2. CARGA INGREDIENTES INTERNOS
        const { data: ingData, error: ingError } = await supabase
            .from('ingredientes_internos')
            .select('*');

        if (ingError) console.error("Error cargando Ingredientes:", ingError);

        const mappedIngredientes = (ingData || []).map((row: any) => {
             // Parseo seguro de JSON
             let history = [];
             try {
                history = typeof row.historial_revisiones === 'string' 
                    ? JSON.parse(row.historial_revisiones) 
                    : row.historial_revisiones || [];
             } catch (e) { console.error("Error parseando historial", e); }

             const latestRevision = history.length > 0 ? history[history.length - 1] : null;
             const needsReview = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
             
             // MAPEO A PRUEBA DE FALLOS
             return {
                id: row.id,
                nombreIngrediente: row.nombre_ingrediente || row.nombreIngrediente || 'NOMBRE DESCONOCIDO', 
                productoERPlinkId: row.producto_erp_link_id || row.productoERPlinkId || '',
                alergenosPresentes: typeof row.alergenos_presentes === 'string' ? JSON.parse(row.alergenos_presentes) : (row.alergenos_presentes || []),
                alergenosTrazas: typeof row.alergenos_trazas === 'string' ? JSON.parse(row.alergenos_trazas) : (row.alergenos_trazas || []),
                historialRevisiones: history,
                erp: erpMap.get(row.producto_erp_link_id || row.productoERPlinkId), 
                alergenos: [],
                needsReview 
            }
        });

        setIngredientes(mappedIngredientes as any);
    }, [sixMonthsAgo]);

    useEffect(() => { loadData(); setIsMounted(true); }, [loadData]);

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
        const file = event.target.files?.[0];
        if (!file) { setIsImportAlertOpen(false); return; }
        Papa.parse<any>(file, {
            header: true, skipEmptyLines: true, delimiter,
            complete: async (results) => {
                const headers = results.meta.fields || [];
                if (!CSV_HEADERS.every(field => headers.includes(field))) {
                    toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
                    setIsImportAlertOpen(false);
                    return;
                }
                const importedData: IngredienteInterno[] = results.data.map(item => ({
                    id: item.id || crypto.randomUUID(),
                    nombreIngrediente: item.nombreIngrediente || '',
                    productoERPlinkId: item.productoERPlinkId || '',
                    alergenosPresentes: JSON.parse(item.alergenosPresentes || '[]'),
                    alergenosTrazas: JSON.parse(item.alergenosTrazas || '[]'),
                    historialRevisiones: JSON.parse(item.historialRevisiones || '[]'),
                }));
                const BATCH_SIZE = 100;
                let errorOccurred = false;
                let processedCount = 0;
                for (let i = 0; i < importedData.length; i += BATCH_SIZE) {
                    const batch = importedData.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('ingredientes_internos').upsert(batch.map(item => ({
                        id: item.id,
                        nombre_ingrediente: item.nombreIngrediente,
                        producto_erp_link_id: item.productoERPlinkId,
                        alergenos_presentes: item.alergenosPresentes,
                        alergenos_trazas: item.alergenosTrazas,
                        historial_revisiones: item.historialRevisiones,
                    })), { onConflict: 'id' });
                    if (error) {
                        console.error('Error importing batch:', error);
                        errorOccurred = true;
                        toast({ variant: 'destructive', title: 'Error de importación', description: `Error en el lote ${i / BATCH_SIZE + 1}: ${error.message}` });
                        break; 
                    }
                    processedCount += batch.length;
                }
                if (!errorOccurred) {
                    toast({ title: 'Importación completada', description: `Se han importado ${processedCount} registros correctamente.` });
                    window.location.reload(); 
                }
                setIsImportAlertOpen(false);
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
                setIsImportAlertOpen(false);
            }
        });
        if (event.target) event.target.value = '';
    };

    const handleExportCSV = async () => {
        try {
            const { data: ingredientesData, error } = await supabase.from('ingredientes_internos').select('*');
            if (error) throw error;
            const dataToExport = (ingredientesData || []).map((row: any) => ({
                id: row.id,
                nombreIngrediente: row.nombre_ingrediente,
                productoERPlinkId: row.producto_erp_link_id,
                alergenosPresentes: JSON.stringify(row.alergenos_presentes || []),
                alergenosTrazas: JSON.stringify(row.alergenos_trazas || []),
                historialRevisiones: JSON.stringify(row.historial_revisiones || []),
            }));
            if (dataToExport.length === 0) dataToExport.push(Object.fromEntries(CSV_HEADERS.map(h => [h, ''])) as any);
            const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `ingredientes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Exportación completada', description: `Se han exportado ${dataToExport.length} registros.` });
        } catch (error) {
            console.error('Error exporting CSV:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al exportar CSV.' });
        }
    };

    const filteredItems = useMemo(() => {
        return ingredientes.filter(item => {
            // @ts-ignore
            const needsReview = item.needsReview;
            
            if (showOnlyPending && !needsReview) return false;

            // Filtrar por tipo si está especificado
            if (tipoFilter) {
                const itemTipo = (item.erp?.tipo || 'OTROS').toUpperCase().trim();
                const filterTipo = tipoFilter.toUpperCase().trim();
                if (itemTipo !== filterTipo) return false;
            }

            // Filtrar por categoría si está especificado
            if (categoriaFilter) {
                const itemCategoria = (item.erp?.tipo || 'OTROS').toUpperCase().trim();
                const filterCategoria = categoriaFilter.toUpperCase().trim();
                if (itemCategoria !== filterCategoria) return false;
            }

            const term = searchTerm.toLowerCase();
            return (
                item.nombreIngrediente.toLowerCase().includes(term) ||
                (item.erp?.nombreProductoERP || '').toLowerCase().includes(term) ||
                (item.erp?.nombreProveedor || '').toLowerCase().includes(term)
            );
        }).sort((a, b) => {
             // @ts-ignore
            if (a.needsReview && !b.needsReview) return -1;
             // @ts-ignore
            if (!a.needsReview && b.needsReview) return 1;
            return a.nombreIngrediente.localeCompare(b.nombreIngrediente);
        });
    }, [ingredientes, searchTerm, showOnlyPending, tipoFilter, categoriaFilter]);

    const editingIndex = useMemo(() => {
        if (!editingItem) return -1;
        return filteredItems.findIndex(i => i.id === editingItem.id);
    }, [filteredItems, editingItem]);

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (editingIndex === -1) return;
        const newIndex = direction === 'next' ? editingIndex + 1 : editingIndex - 1;
        if (newIndex >= 0 && newIndex < filteredItems.length) {
            setEditingItem(filteredItems[newIndex]);
        }
    };

    const handleSave = async (data: IngredienteFormValues, action: 'save' | 'save_next') => {
        const responsable = impersonatedUser?.nombre || 'Usuario';
        const newRevision = { fecha: new Date().toISOString(), responsable };
        
        setIngredientes(prev => prev.map(item => {
            if (item.id === data.id) {
                return {
                    ...item,
                    nombreIngrediente: data.nombreIngrediente,
                    productoERPlinkId: data.productoERPlinkId || '', 
                    alergenosPresentes: data.alergenosPresentes as Alergeno[], 
                    alergenosTrazas: data.alergenosTrazas as Alergeno[],
                    historialRevisiones: [...(item.historialRevisiones || []), newRevision],
                    // @ts-ignore
                    needsReview: false
                }
            }
            return item;
        }));

        supabase.from('ingredientes_internos').update({
            nombre_ingrediente: data.nombreIngrediente,
            producto_erp_link_id: data.productoERPlinkId,
            alergenos_presentes: data.alergenosPresentes,
            alergenos_trazas: data.alergenosTrazas,
            historial_revisiones: [...(editingItem?.historialRevisiones || []), newRevision]
        }).eq('id', data.id).then(({ error }) => {
            if (error) {
                toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
                loadData(); 
            }
        });

        toast({ description: "Ingrediente validado.", duration: 1500 });

        if (action === 'save_next') {
            if (editingIndex < filteredItems.length - 1) {
                setEditingItem(filteredItems[editingIndex + 1]);
            } else {
                setEditingItem(null); 
                toast({ title: "¡Lista completada!", className: "bg-green-600 text-white" });
            }
        }
    };

    // Calcular categorías únicas disponibles
    const categoriasDisponibles = useMemo(() => {
        const cats = new Map<string, number>();
        ingredientes.forEach(item => {
            const cat = (item.erp?.tipo || 'OTROS').trim();
            if (cat) {
                cats.set(cat, (cats.get(cat) || 0) + 1);
            }
        });
        return Array.from(cats.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([categoria, count]) => ({ categoria, count }));
    }, [ingredientes]);

    if (!isMounted) return <LoadingSkeleton title="Cargando..." />;

    const paginatedItems = filteredItems.slice(0, currentPage * ITEMS_PER_PAGE);
    const hasMore = paginatedItems.length < filteredItems.length;

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header Fijo */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 justify-between">
                    <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar ingrediente..." 
                            className="pl-9 h-10 bg-muted/20"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                         <Button 
                            variant={showOnlyPending ? "destructive" : "outline"} 
                            size="sm"
                            className="rounded-full h-9"
                            onClick={() => setShowOnlyPending(!showOnlyPending)}
                        >
                            {showOnlyPending ? <AlertCircle className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                            {showOnlyPending ? "Pendientes" : "Todos"}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={categoriaFilter ? "default" : "outline"} size="sm" className="h-9">
                                    {categoriaFilter ? `Categoría: ${categoriaFilter}` : 'Categorías'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
                                <DropdownMenuItem onClick={() => setCategoriaFilter('')} className={!categoriaFilter ? 'bg-primary/10' : ''}>
                                    <Check className={cn("mr-2 h-4 w-4", !categoriaFilter ? "opacity-100" : "opacity-0")} />
                                    Todas las categorías
                                </DropdownMenuItem>
                                {categoriasDisponibles.map(({ categoria, count }) => (
                                    <DropdownMenuItem 
                                        key={categoria}
                                        onClick={() => setCategoriaFilter(categoria)}
                                        className={categoriaFilter === categoria ? 'bg-primary/10' : ''}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", categoriaFilter === categoria ? "opacity-100" : "opacity-0")} />
                                        <span>{categoria}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">({count})</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                                    <FileUp size={16} className="mr-2" />Importar CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportCSV}>
                                    <FileDown size={16} className="mr-2" />Exportar CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="icon" variant="ghost" onClick={() => setEditingItem({} as any)}><PlusCircle className="h-5 w-5" /></Button>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL: LÓGICA MOBILE VS DESKTOP */}
            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
                
                {/* Mostrar filtros activos */}
                {(tipoFilter || categoriaFilter) && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Filtros activos:</span>
                        {tipoFilter && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Tipo: {tipoFilter}
                                <button onClick={() => setTipoFilter('')} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {categoriaFilter && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Categoría: {categoriaFilter}
                                <button onClick={() => setCategoriaFilter('')} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}
                
                {isMobile ? (
                    /* --- VISTA MÓVIL (Lista Infinita) --- */
                    <InfiniteScroll
                        dataLength={paginatedItems.length}
                        next={() => setCurrentPage(p => p + 1)}
                        hasMore={hasMore}
                        loader={<div className="p-4 text-center">Cargando más...</div>}
                        className="space-y-2"
                    >
                        {paginatedItems.map(item => {
                             // @ts-ignore
                            const needsReview = item.needsReview;
                            return (
                                <Card 
                                    key={item.id} 
                                    onClick={() => setEditingItem(item)}
                                    className={cn(
                                        "cursor-pointer hover:border-primary/50 transition-all active:scale-[0.99]",
                                        needsReview ? "border-l-4 border-l-red-500 bg-red-50/10" : "border-l-4 border-l-emerald-500 opacity-80 bg-gray-50"
                                    )}
                                >
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-base truncate">{item.nombreIngrediente}</h3>
                                                {needsReview && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Revisar</Badge>}
                                            </div>
                                            
                                            <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                <span className={cn("flex items-center gap-1", !item.erp && "text-red-500 font-medium")}>
                                                    <LinkIcon className="h-3 w-3" />
                                                    {item.erp ? item.erp.nombreProductoERP : 'Sin vincular'}
                                                </span>
                                                {item.erp && (
                                                    <span className="hidden sm:inline text-xs border-l pl-3">
                                                        {item.erp.nombreProveedor}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </InfiniteScroll>
                ) : (
                    /* --- VISTA ESCRITORIO (Tabla Clásica) --- */
                    <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead>Ingrediente</TableHead>
                                    <TableHead>Producto ERP Vinculado</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Revisión</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedItems.length > 0 ? (
                                    paginatedItems.map(item => {
                                        // @ts-ignore
                                        const needsReview = item.needsReview;
                                        // Seguridad para array undefined
                                        const history = item.historialRevisiones || [];
                                        const lastRev = history.length > 0 ? history[history.length - 1] : null;

                                        return (
                                            <TableRow 
                                                key={item.id} 
                                                className={cn(
                                                    "cursor-pointer hover:bg-muted/50 transition-colors group",
                                                    needsReview ? "bg-red-50/50 hover:bg-red-50" : ""
                                                )}
                                                onClick={() => setEditingItem(item)}
                                            >
                                                <TableCell className="font-medium">
                                                    {item.nombreIngrediente}
                                                    {needsReview && <Badge variant="destructive" className="ml-2 text-[10px] h-5">Revisar</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    {item.erp ? (
                                                        <span className="text-sm">{item.erp.nombreProductoERP}</span>
                                                    ) : (
                                                        <span className="text-destructive flex items-center gap-1 text-xs font-medium"><AlertCircle className="w-3 h-3" /> Sin vincular</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{item.erp?.nombreProveedor || '-'}</TableCell>
                                                <TableCell>
                                                    {item.erp ? (() => {
                                                        const basePrice = (item.erp.precioCompra || 0) / (item.erp.unidadConversion || 1);
                                                        return `${basePrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/${item.erp.unidad}`;
                                                    })() : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{item.erp?.tipo || '-'}</TableCell>
                                                <TableCell className="text-xs">
                                                    {lastRev ? format(new Date(lastRev.fecha), 'dd/MM/yy') : 'Nunca'}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No se encontraron ingredientes.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="p-4 border-t flex justify-center">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => p + 1)} 
                                disabled={!hasMore}
                                className={cn(!hasMore && "hidden")}
                            >
                                Cargar más
                            </Button>
                        </div>
                    </div>
                )}
                
                {paginatedItems.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No hay ingredientes que coincidan con tu búsqueda.</p>
                    </div>
                )}
            </div>

            {/* --- PANELES DE EDICIÓN (Sheet / Drawer) --- */}
            {isDesktop ? (
                // Solución al error DialogTitle: Añadido Header con título oculto
                <Sheet open={!!editingItem} onOpenChange={(open: boolean) => !open && setEditingItem(null)}>
                    <SheetContent side="right" className="w-[600px] sm:w-[540px] p-0 border-l shadow-2xl">
                        <SheetHeader className="px-4 pt-4 pb-0">
                            <SheetTitle className="sr-only">Editar Ingrediente</SheetTitle>
                            <SheetDescription className="sr-only">Formulario de revisión de ingredientes y alérgenos</SheetDescription>
                        </SheetHeader>
                         {editingItem && (
                            <ReviewPanelContent 
                                ingrediente={editingItem} 
                                articulosERP={articulosERP}
                                onSave={handleSave}
                                onCancel={() => setEditingItem(null)}
                                isMobile={false}
                                hasNext={editingIndex < filteredItems.length - 1}
                                hasPrev={editingIndex > 0}
                                onNavigate={handleNavigate}
                            />
                         )}
                    </SheetContent>
                </Sheet>
            ) : (
                // Solución al error DialogTitle: Añadido Header con título oculto
                <Drawer open={!!editingItem} onOpenChange={(open: boolean) => !open && setEditingItem(null)}>
                    <DrawerContent className="h-[80vh] flex flex-col">
                        <DrawerHeader className="text-left px-2.5 py-1.5">
                            <DrawerTitle className="sr-only">Editar Ingrediente</DrawerTitle>
                            <DrawerDescription className="sr-only">Formulario de revisión</DrawerDescription>
                        </DrawerHeader>
                         {editingItem && (
                             <ReviewPanelContent 
                                ingrediente={editingItem} 
                                articulosERP={articulosERP}
                                onSave={handleSave}
                                onCancel={() => setEditingItem(null)}
                                isMobile={true}
                                hasNext={editingIndex < filteredItems.length - 1}
                                hasPrev={editingIndex > 0}
                                onNavigate={handleNavigate}
                            />
                         )}
                    </DrawerContent>
                </Drawer>
            )}

             <AlertDialog open={isImportAlertOpen} onOpenChange={(open: boolean) => setIsImportAlertOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle><AlertDialogDescription>Selecciona el tipo de delimitador que utiliza tu archivo CSV.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="!justify-center gap-4">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

export default function IngredientesPageWrapper() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <IngredientesPageContent />
        </Suspense>
    )
}