'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    PlusCircle, Link as LinkIcon, Menu, FileUp, FileDown, 
    ChevronLeft, ChevronRight, Trash2, AlertTriangle, MoreHorizontal, 
    Pencil, Check, CircleX, Search, ArrowUp
} from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno, Elaboracion, Receta, FamiliaERP, ServiceOrder, GastronomyOrder } from '@/types';
import { ALERGENOS } from '@/types';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// CORRECCIÓN AQUÍ: Se añadieron CardHeader y CardTitle a la importación
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import * as React from 'react';
import { isBefore, subMonths, startOfToday, addYears, isWithinInterval, addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { supabase } from '@/lib/supabase';
import InfiniteScroll from 'react-infinite-scroll-component';

// --- SCHEMA & TYPES ---
const ingredienteFormSchema = z.object({
    id: z.string(),
    nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
    productoERPlinkId: z.string().min(1, 'Debe enlazar un producto ERP'),
    alergenosPresentes: z.array(z.string()).default([]),
    alergenosTrazas: z.array(z.string()).default([]),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

type IngredienteConERP = IngredienteInterno & {
    erp?: ArticuloERP;
    alergenos: Alergeno[];
    urgency?: 'high' | 'medium' | 'low';
};

const CSV_HEADERS = ["id", "nombreIngrediente", "productoERPlinkId", "alergenosPresentes", "alergenosTrazas", "historialRevisiones"];
const ITEMS_PER_PAGE = 20;

// --- MODALES Y COMPONENTES AUXILIARES ---

function IngredienteFormModal({ open, onOpenChange, initialData, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, initialData: Partial<IngredienteInterno> | null, onSave: (data: IngredienteFormValues) => void }) {
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [erpSearchTerm, setErpSearchTerm] = useState('');

    const defaultFormValues: IngredienteFormValues = {
        id: Date.now().toString(),
        nombreIngrediente: '',
        productoERPlinkId: '',
        alergenosPresentes: [],
        alergenosTrazas: [],
    };

    const form = useForm<IngredienteFormValues>({
        resolver: zodResolver(ingredienteFormSchema),
        defaultValues: { ...defaultFormValues, ...initialData }
    });

    useEffect(() => {
        async function loadArticulosERP() {
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('*')
                .in('categoria_mice', ['GASTRONOMIA', 'BIO']);

            if (error) {
                console.error('Error loading articulos_erp:', error);
                setArticulosERP([]);
            } else {
                const mappedArticulos = (data || []).map((row: any) => ({
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

                setArticulosERP(mappedArticulos);
            }
        }

        loadArticulosERP();
    }, []);

    useEffect(() => {
        if (open) {
            const formValues = {
                id: initialData?.id || crypto.randomUUID(),
                nombreIngrediente: initialData?.nombreIngrediente || '',
                productoERPlinkId: initialData?.productoERPlinkId || '',
                alergenosPresentes: initialData?.alergenosPresentes || [],
                alergenosTrazas: initialData?.alergenosTrazas || [],
            };
            form.reset(formValues);
        }
    }, [initialData, open, form]);


    const selectedErpId = form.watch('productoERPlinkId');
    const selectedErpProduct = useMemo(() => articulosERP.find(p => p.idreferenciaerp === selectedErpId), [articulosERP, selectedErpId]);

    const handleErpSelect = (erpId: string) => {
        form.setValue('productoERPlinkId', erpId, { shouldDirty: true });
        form.trigger('productoERPlinkId');
    };

    const alergenosColumns = React.useMemo(() => [ALERGENOS.slice(0, 7), ALERGENOS.slice(7)], []);

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Ingrediente</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} id="ingrediente-form-modal" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-5 space-y-4">
                                        <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre Ingrediente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="col-span-7">
                                        <FormItem>
                                            <FormLabel>Vínculo con Artículo ERP</FormLabel>
                                            {selectedErpProduct ? (
                                                <div className="border rounded-md p-2 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                                            <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" type="button" onClick={() => form.setValue('productoERPlinkId', '', { shouldDirty: true })}><CircleX className="mr-1 h-3 w-3" />Desvincular</Button>
                                                    </div>
                                                    <p className="font-bold text-primary text-sm">{calculatePrice(selectedErpProduct).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {selectedErpProduct.unidad}</p>
                                                </div>
                                            ) : (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" className="w-full h-16 border-dashed border-2"><LinkIcon className="mr-2" />Vincular Artículo ERP</Button>
                                                    </DialogTrigger>
                                                    <ErpSelectorDialog
                                                        onSelect={handleErpSelect}
                                                        articulosERP={articulosERP}
                                                        searchTerm={erpSearchTerm}
                                                        setSearchTerm={setErpSearchTerm}
                                                    />
                                                </Dialog>
                                            )}
                                            <FormMessage className="mt-2">{form.formState.errors.productoERPlinkId?.message}</FormMessage>
                                        </FormItem>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Gestión de Alérgenos</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <AlergenosTable alergenosList={alergenosColumns[0]} control={form.control} />
                                <AlergenosTable alergenosList={alergenosColumns[1]} control={form.control} />
                            </CardContent>
                        </Card>
                    </form>
                </Form>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button type="submit" form="ingrediente-form-modal">Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const AlergenosTable = ({ alergenosList, control }: { alergenosList: readonly Alergeno[], control: any }) => (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[60%] p-2">Alérgeno</TableHead>
                    <TableHead className="text-center p-2">Presente</TableHead>
                    <TableHead className="text-center p-2">Trazas</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alergenosList.map((alergeno) => (
                    <TableRow key={alergeno}>
                        <TableCell className="capitalize p-2 font-medium">{alergeno.toLowerCase().replace('_', ' ')}</TableCell>
                        <TableCell className="text-center p-2">
                            <FormField control={control} name="alergenosPresentes" render={({ field }) => (
                                <FormControl>
                                    <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                        const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter((v: string) => v !== alergeno);
                                        field.onChange(newValue);
                                    }} />
                                </FormControl>
                            )} />
                        </TableCell>
                        <TableCell className="text-center p-2">
                            <FormField control={control} name="alergenosTrazas" render={({ field }) => (
                                <FormControl>
                                    <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                        const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter((v: string) => v !== alergeno);
                                        field.onChange(newValue);
                                    }} />
                                </FormControl>
                            )} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

function ErpSelectorDialog({ onSelect, articulosERP, searchTerm, setSearchTerm }: { onSelect: (erpId: string) => void; articulosERP: ArticuloERP[]; searchTerm: string, setSearchTerm: (term: string) => void }) {

    const filteredErpProducts = useMemo(() => {
        return articulosERP.filter(p =>
            p && (
                (p.nombreProductoERP || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.nombreProveedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.referenciaProveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [articulosERP, searchTerm]);

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Proveedor</TableHead><TableHead>Precio</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{filteredErpProducts.map(p => (
                        <TableRow key={p.idreferenciaerp || p.id}>
                            <TableCell>{p.nombreProductoERP}</TableCell>
                            <TableCell>{p.nombreProveedor}</TableCell>
                            <TableCell>{calculatePrice(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/{p.unidad}</TableCell>
                            <TableCell>
                                <DialogClose asChild>
                                    <Button size="sm" onClick={() => onSelect(p.idreferenciaerp || '')}><Check className="mr-2" />Seleccionar</Button>
                                </DialogClose>
                            </TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </div>
        </DialogContent>
    )
}

function IngredientesPageContent() {
    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemToDelete, setItemToDelete] = useState<IngredienteConERP | null>(null);
    const [affectedElaboraciones, setAffectedElaboraciones] = useState<Elaboracion[]>([]);
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Partial<IngredienteInterno> | null>(null);
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
    const [showScrollTop, setShowScrollTop] = useState(false); // Estado para el botón flotante

    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { impersonatedUser } = useImpersonatedUser();
    
    // Filtros
    const [showOnlyPending, setShowOnlyPending] = useState(() => {
        const pendingParam = searchParams.get('pending');
        return pendingParam === 'true' ? true : true;
    });
    const [filterByUsage, setFilterByUsage] = useState(false);
    const [ingredientesEnUso, setIngredientesEnUso] = useState<Set<string>>(new Set());

    const loadIngredients = useCallback(async () => {
        const { data: articulosData, error: erpError } = await supabase
            .from('articulos_erp')
            .select('*');

        if (erpError) {
            console.error('Error loading articulos_erp:', erpError);
            return;
        }

        const articulosERP = (articulosData || []).map((row: any) => ({
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
        const erpMap = new Map(articulosERP.map(item => [item.idreferenciaerp, item]));

        const { data: ingredientesData, error: ingError } = await supabase
            .from('ingredientes_internos')
            .select('*');

        if (ingError) {
            console.error('Error loading ingredientes:', ingError);
            return;
        }

        const ingredientesInternos: IngredienteInterno[] = (ingredientesData || []).map((row: any) => ({
            id: row.id,
            nombreIngrediente: row.nombre_ingrediente,
            productoERPlinkId: row.producto_erp_link_id,
            alergenosPresentes: row.alergenos_presentes || [],
            alergenosTrazas: row.alergenos_trazas || [],
            historialRevisiones: row.historial_revisiones || [],
        }));

        const allFamilias = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
        const familiasMap = new Map(allFamilias.map(f => [f.familiaCategoria, f]));

        const today = new Date();
        const next7days = addDays(today, 7);
        const next30days = addDays(today, 30);

        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
        const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
        const allRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[]);
        const allElaboraciones = (JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]);

        const ingredientUsageDate = new Map<string, Date>();

        allServiceOrders.forEach(os => {
            const osDate = new Date(os.startDate);
            if (osDate < today) return; 

            const gastroOrders = allGastroOrders.filter(go => go.osId === os.id);
            gastroOrders.forEach(go => {
                (go.items || []).forEach(item => {
                    if (item.type === 'item') {
                        const receta = allRecetas.find(r => r.id === item.id);
                        if (receta) {
                            (receta.elaboraciones || []).forEach(elabEnReceta => {
                                const elab = allElaboraciones.find(e => e.id === elabEnReceta.elaboracionId);
                                if (elab) {
                                    (elab.componentes || []).forEach(comp => {
                                        if (comp.tipo === 'ingrediente') {
                                            const ingId = comp.componenteId;
                                            if (!ingredientUsageDate.has(ingId) || osDate < ingredientUsageDate.get(ingId)!) {
                                                ingredientUsageDate.set(ingId, osDate);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            });
        });

        const combinedData = ingredientesInternos.map(ing => {
            const erpItem = erpMap.get(ing.productoERPlinkId);
            if (erpItem) {
                const familia = familiasMap.get(erpItem.familiaCategoria || '');
                if (familia) {
                    erpItem.categoriaMice = familia.Categoria;
                    erpItem.tipo = familia.Familia;
                }
            }

            const presentes = ing.alergenosPresentes || [];
            const trazas = ing.alergenosTrazas || [];

            const usageDate = ingredientUsageDate.get(ing.id);
            let urgency: IngredienteConERP['urgency'] = 'low';
            if (usageDate) {
                if (isBefore(usageDate, next7days)) urgency = 'high';
                else if (isBefore(usageDate, next30days)) urgency = 'medium';
            }

            return {
                ...ing,
                erp: erpItem,
                alergenos: Array.from(new Set([...presentes, ...trazas])) as Alergeno[],
                urgency,
            }
        });

        setIngredientes(combinedData);

        const ingredientesActivos = new Set<string>();
        ingredientUsageDate.forEach((date, ingId) => {
            if (isWithinInterval(date, { start: today, end: addYears(today, 1) })) {
                ingredientesActivos.add(ingId);
            }
        });
        setIngredientesEnUso(ingredientesActivos);

    }, []);

    useEffect(() => {
        loadIngredients();
        setIsMounted(true);
    }, [loadIngredients]);

    // Lógica para mostrar/ocultar botón flotante
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Función para volver arriba
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Resetear paginación al filtrar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showOnlyPending, filterByUsage]);

    useEffect(() => {
        setHeaderActions(
            <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={() => setEditingIngredient({})} className="flex-1 md:flex-none"><PlusCircle className="mr-2 h-4 w-4" />Nuevo</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Menu /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}><FileUp size={16} className="mr-2" />Importar CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCSV}><FileDown size={16} className="mr-2" />Exportar CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }, []);

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

    const safeJsonParse = (jsonString: string, fallback: any = []) => { try { const parsed = JSON.parse(jsonString); return Array.isArray(parsed) ? parsed : fallback; } catch (e) { return fallback; } };

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
                    alergenosPresentes: safeJsonParse(item.alergenosPresentes),
                    alergenosTrazas: safeJsonParse(item.alergenosTrazas),
                    historialRevisiones: safeJsonParse(item.historialRevisiones, null),
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
                    loadIngredients();
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

    const sixMonthsAgo = useMemo(() => subMonths(startOfToday(), 6), []);

    const filteredItems = useMemo(() => {
        return ingredientes.filter(item => {
            const latestRevision = item.historialRevisiones?.[item.historialRevisiones.length - 1];
            const needsReview = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
            if (showOnlyPending && !needsReview) return false;

            if (filterByUsage && !ingredientesEnUso.has(item.id)) return false;

            const term = searchTerm.toLowerCase();
            return (
                item.nombreIngrediente.toLowerCase().includes(term) ||
                (item.erp?.nombreProductoERP || '').toLowerCase().includes(term) ||
                (item.erp?.idreferenciaerp || '').toLowerCase().includes(term) ||
                (item.erp?.categoriaMice || '').toLowerCase().includes(term) ||
                (item.erp?.tipo || '').toLowerCase().includes(term) ||
                (latestRevision?.responsable || '').toLowerCase().includes(term)
            );
        }).sort((a, b) => {
            const dateA = a.historialRevisiones?.[a.historialRevisiones.length - 1]?.fecha;
            const dateB = b.historialRevisiones?.[b.historialRevisiones.length - 1]?.fecha;
            return (dateA ? new Date(dateA).getTime() : 0) - (dateB ? new Date(dateB).getTime() : 0);
        });
    }, [ingredientes, searchTerm, showOnlyPending, filterByUsage, sixMonthsAgo, ingredientesEnUso]);

    // Variables de paginación para tabla de escritorio
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    // Variables para Infinite Scroll en Móvil
    const currentLimit = currentPage * ITEMS_PER_PAGE;
    const mobileVisibleItems = useMemo(() => {
        return filteredItems.slice(0, currentLimit);
    }, [filteredItems, currentLimit]);
    const hasMoreMobile = mobileVisibleItems.length < filteredItems.length;

    const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

    const handleAttemptDelete = (ingrediente: IngredienteConERP) => {
        const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const elaboracionesUsingIngredient = allElaboraciones.filter(elab =>
            elab.componentes.some(c => c.tipo === 'ingrediente' && c.componenteId === ingrediente.id)
        );
        setAffectedElaboraciones(elaboracionesUsingIngredient);
        setItemToDelete(ingrediente);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            const { error } = await supabase.from('ingredientes_internos').delete().eq('id', itemToDelete.id);
            if (error) throw error;
            if (affectedElaboraciones.length > 0) {
                toast({ title: 'Recetas marcadas para revisión', description: `${affectedElaboraciones.length} elaboración(es) usaban este ingrediente...` });
            }
            loadIngredients();
            toast({ title: 'Ingrediente eliminado' });
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting ingrediente:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al eliminar el ingrediente.' });
        }
    };

    const handleSave = async (data: IngredienteFormValues) => {
        const responsable = impersonatedUser?.nombre || 'Usuario';
        const newRevision = { fecha: new Date().toISOString(), responsable };
        try {
            const { data: existing } = await supabase.from('ingredientes_internos').select('*').eq('id', data.id).single();
            if (existing) {
                const updatedRevisiones = [...(existing.historial_revisiones || []), newRevision];
                const { error } = await supabase.from('ingredientes_internos').update({
                        nombre_ingrediente: data.nombreIngrediente,
                        producto_erp_link_id: data.productoERPlinkId,
                        alergenos_presentes: data.alergenosPresentes,
                        alergenos_trazas: data.alergenosTrazas,
                        historial_revisiones: updatedRevisiones,
                    }).eq('id', data.id);
                if (error) throw error;
                toast({ description: 'Ingrediente actualizado.' });
            } else {
                const { data: duplicate } = await supabase.from('ingredientes_internos').select('id').ilike('nombre_ingrediente', data.nombreIngrediente).single();
                if (duplicate) { toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un ingrediente con este nombre.' }); return; }
                const { error } = await supabase.from('ingredientes_internos').insert({
                        id: data.id || crypto.randomUUID(),
                        nombre_ingrediente: data.nombreIngrediente,
                        producto_erp_link_id: data.productoERPlinkId,
                        alergenos_presentes: data.alergenosPresentes,
                        alergenos_trazas: data.alergenosTrazas,
                        historial_revisiones: [newRevision],
                    });
                if (error) throw error;
                toast({ description: 'Ingrediente creado.' });
            }
            setEditingIngredient(null);
            loadIngredients();
        } catch (error) {
            console.error('Error saving ingrediente:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al guardar el ingrediente.' });
        }
    };

    if (!isMounted) return <LoadingSkeleton title="Cargando Ingredientes..." />;

    return (
        <>
            {/* --- HEADER: ACCIONES Y BÚSQUEDA MÓVIL OPTIMIZADA --- */}
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="relative flex-grow md:max-w-lg">
                         <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                         <Input 
                            placeholder="Buscar ingrediente..." 
                            className="pl-9 h-11 text-base shadow-sm"
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                         />
                    </div>

                     <div className="flex justify-end">
                        {headerActions}
                     </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-1">
                    
                    {/* Filtros tipo Toggle/Badge */}
                    <div className="flex items-center gap-2">
                         <Button 
                            variant={showOnlyPending ? "default" : "outline"} 
                            size="sm"
                            className={cn("h-8 rounded-full text-xs transition-all", showOnlyPending ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground border-dashed")}
                            onClick={() => setShowOnlyPending(!showOnlyPending)}
                         >
                            {showOnlyPending && <Check className="mr-1 h-3 w-3" />}
                            Pendientes
                         </Button>

                         <Button 
                            variant={filterByUsage ? "default" : "outline"} 
                            size="sm"
                            className={cn("h-8 rounded-full text-xs transition-all", filterByUsage ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground border-dashed")}
                            onClick={() => setFilterByUsage(!filterByUsage)}
                         >
                             {filterByUsage && <Check className="mr-1 h-3 w-3" />}
                             En uso futuro
                         </Button>
                    </div>

                    <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                        <span>{currentPage}/{totalPages || 1}</span>
                        <div className="flex">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- VISTA MÓVIL: Tarjetas SOLO TEXTO --- */}
            <div className="md:hidden flex flex-col gap-4">
                <InfiniteScroll
                    dataLength={mobileVisibleItems.length} // Corregido: usa la longitud dinámica
                    next={() => setCurrentPage((prev) => prev + 1)}
                    hasMore={hasMoreMobile}
                    loader={<h4 className="col-span-full text-center py-4">Cargando más...</h4>}
                    className="flex flex-col gap-4"
                >
                    {mobileVisibleItems.map((item) => {
                        const latestRevision = item.historialRevisiones?.[item.historialRevisiones.length - 1];
                        const needsReview = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
                        
                        // Cálculo de precio
                        let formattedPrice = '-';
                        if (item.erp) {
                            const basePrice = (item.erp.precioCompra || 0) / (item.erp.unidadConversion || 1);
                            const discount = item.erp.descuento || 0;
                            const finalPrice = basePrice * (1 - discount / 100);
                            formattedPrice = `${finalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/${item.erp.unidad}`;
                        }

                        const formattedDate = latestRevision ? format(new Date(latestRevision.fecha), 'dd/MM/yyyy') : 'Nunca';

                        return (
                            <div key={item.id} className="bg-card border rounded-lg p-4 shadow-sm relative">
                                {/* Header: Nombre + Menu */}
                                <div className="flex justify-between items-start mb-3 pr-8">
                                    <h3 className="font-bold text-lg leading-tight text-foreground">{item.nombreIngrediente}</h3>
                                </div>
                                
                                {/* Absolute Menu (Top-Right) */}
                                 <div className="absolute top-3 right-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditingIngredient(item)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleAttemptDelete(item)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                 </div>

                                {/* Grid de Detalles (Texto) - Limpio */}
                                <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-sm">
                                    <div className="col-span-2">
                                         <span className="text-muted-foreground text-xs block uppercase tracking-wider">Producto ERP</span>
                                         <span className={cn("font-medium", !item.erp && "text-destructive italic")}>
                                            {item.erp?.nombreProductoERP || 'No vinculado'}
                                         </span>
                                    </div>
                                    
                                    <div>
                                         <span className="text-muted-foreground text-xs block uppercase tracking-wider">Proveedor</span>
                                         <span className="font-medium text-foreground">{item.erp?.nombreProveedor || '-'}</span>
                                    </div>

                                    <div>
                                         <span className="text-muted-foreground text-xs block uppercase tracking-wider">Precio</span>
                                         <span className="font-medium text-foreground">{formattedPrice}</span>
                                    </div>

                                    <div>
                                         <span className="text-muted-foreground text-xs block uppercase tracking-wider">Cat. ERP</span>
                                         <span className="font-medium text-foreground">{item.erp?.tipo || '-'}</span>
                                    </div>

                                    <div>
                                         <span className="text-muted-foreground text-xs block uppercase tracking-wider">Responsable</span>
                                         <span className="font-medium text-foreground">{latestRevision?.responsable || '-'}</span>
                                    </div>

                                     <div className="col-span-2 border-t pt-2 mt-1 flex justify-between items-center">
                                         <span className="text-muted-foreground text-xs uppercase tracking-wider">Última Revisión</span>
                                         <span className={cn("font-medium", needsReview ? "text-destructive flex items-center gap-1" : "text-foreground")}>
                                            {needsReview && <AlertTriangle className="h-3 w-3" />}
                                            {formattedDate}
                                         </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </InfiniteScroll>
                
                {filteredItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No se encontraron ingredientes.</p>
                    </div>
                )}
            </div>

            {/* --- VISTA ESCRITORIO --- */}
            <div className="hidden md:block border rounded-lg">
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead>Producto ERP Vinculado</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Categoría MICE</TableHead>
                        <TableHead>Categoría ERP</TableHead>
                        <TableHead>Última Revisión</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {paginatedItems.length > 0 ? (
                            paginatedItems.map(item => {
                                const latestRevision = item.historialRevisiones?.[item.historialRevisiones.length - 1];
                                const needsReview = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);
                                const urgencyClass = needsReview && item.urgency === 'high' ? 'bg-red-100/50'
                                    : needsReview && item.urgency === 'medium' ? 'bg-amber-100/50'
                                        : '';
                                return (
                                    <TableRow key={item.id} className={cn(needsReview && !urgencyClass && 'bg-amber-50', urgencyClass)}>
                                        <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                                        <TableCell>{item.erp?.nombreProductoERP || <span className="text-destructive">No Vinculado</span>}</TableCell>
                                        <TableCell>{item.erp?.nombreProveedor || '-'}</TableCell>
                                        <TableCell>
                                            {item.erp ? (() => {
                                                const basePrice = (item.erp.precioCompra || 0) / (item.erp.unidadConversion || 1);
                                                const discount = item.erp.descuento || 0;
                                                const finalPrice = basePrice * (1 - discount / 100);
                                                return `${finalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/${item.erp.unidad}`;
                                            })() : '-'}
                                        </TableCell>
                                        <TableCell>{item.erp?.categoriaMice || '-'}</TableCell>
                                        <TableCell>{item.erp?.tipo || '-'}</TableCell>
                                        <TableCell className={cn(needsReview && 'text-destructive font-bold')}>
                                            {latestRevision ? format(new Date(latestRevision.fecha), 'dd/MM/yyyy') : 'Nunca'}
                                            {needsReview && <AlertTriangle className="inline ml-2 h-4 w-4" />}
                                        </TableCell>
                                        <TableCell>{latestRevision?.responsable || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="outline" onClick={() => setEditingIngredient(item)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleAttemptDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : <TableRow><TableCell colSpan={9} className="h-24 text-center">No se encontraron ingredientes.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>

            {/* --- BOTÓN FLOTANTE SCROLL TO TOP --- */}
            {showScrollTop && (
                <Button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 h-12 w-12 bg-primary hover:bg-primary/90 transition-all duration-300 animate-in fade-in zoom-in"
                    size="icon"
                >
                    <ArrowUp className="h-6 w-6" />
                </Button>
            )}

            {/* Modales */}
            {editingIngredient && (
                <IngredienteFormModal
                    open={!!editingIngredient}
                    onOpenChange={(isOpen) => !isOpen && setEditingIngredient(null)}
                    initialData={editingIngredient}
                    onSave={handleSave}
                />
            )}

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {affectedElaboraciones.length > 0 ? (
                                <div>
                                    <span className="font-bold text-destructive">Este ingrediente se usa en {affectedElaboraciones.length} elaboración(es).</span>
                                    <p className="mt-2">Si lo eliminas, las recetas que usen estas elaboraciones podrían tener costes y alérgenos incorrectos. Se recomienda marcarlas para revisión.</p>
                                </div>
                            ) : 'Esta acción no se puede deshacer. Se eliminará permanentemente el ingrediente.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setItemToDelete(null); setAffectedElaboraciones([]); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>{affectedElaboraciones.length > 0 ? 'Eliminar y Marcar Recetas' : 'Eliminar Ingrediente'}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle><AlertDialogDescription>Selecciona el tipo de delimitador que utiliza tu archivo CSV.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="!justify-center gap-4">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


export default function IngredientesPageWrapper() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Ingredientes..." />}>
            <IngredientesPageContent />
        </Suspense>
    )
}