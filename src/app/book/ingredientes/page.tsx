

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, ChefHat, Link as LinkIcon, Menu, FileUp, FileDown, ChevronLeft, ChevronRight, Trash2, AlertTriangle, MoreHorizontal, Pencil, Check, CircleX } from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno, Elaboracion, Receta, FamiliaERP, ServiceOrder, GastronomyOrder, Proveedor } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import * as React from 'react';
import { isBefore, subMonths, startOfToday, addYears, isWithinInterval, addDays, format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import { Combobox } from '@/components/ui/combobox';

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
    precioCalculado?: number;
};

const CSV_HEADERS = ["id", "nombreIngrediente", "productoERPlinkId", "alergenosPresentes", "alergenosTrazas", "historialRevisiones"];
const ITEMS_PER_PAGE = 20;

const calculateErpPrice = (p?: ArticuloERP): number => {
    if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
    const basePrice = p.precioCompra / (p.unidadConversion || 1);
    const discount = p.descuento || 0;
    return basePrice * (1 - discount / 100);
}


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
        defaultValues: initialData || defaultFormValues
    });

    useEffect(() => {
        const storedErpData = localStorage.getItem('articulosERP') || '[]';
        setArticulosERP(JSON.parse(storedErpData));
    }, []);

    useEffect(() => {
        if (open) {
            let dataToReset = initialData ? { ...defaultFormValues, ...initialData } : { ...defaultFormValues };
            form.reset(dataToReset);
        }
    }, [initialData, open, form]);


    const selectedErpId = form.watch('productoERPlinkId');
    const selectedErpProduct = useMemo(() => {
        if (!selectedErpId) return null;
        const product = articulosERP.find(p => p.idreferenciaerp === selectedErpId);
        if (product) {
            // Recalculate price on selection/open
            return { ...product, precio: calculateErpPrice(product) };
        }
        return null;
    }, [articulosERP, selectedErpId]);

    const handleErpSelect = (erpId: string) => {
        form.setValue('productoERPlinkId', erpId, { shouldDirty: true });
        form.trigger('productoERPlinkId'); // Manually trigger validation
    };

    const AlergenosTable = ({ alergenosList }: { alergenosList: readonly Alergeno[] }) => (
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
                                <FormField control={form.control} name="alergenosPresentes" render={({ field }) => (
                                    <FormControl>
                                        <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                                const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) form.setValue('alergenosTrazas', (form.getValues('alergenosTrazas') || []).filter(t => t !== alergeno), { shouldDirty: true });
                                        }}/>
                                    </FormControl>
                                )}/>
                            </TableCell>
                            <TableCell className="text-center p-2">
                                <FormField control={form.control} name="alergenosTrazas" render={({ field }) => (
                                    <FormControl>
                                        <Checkbox checked={field.value?.includes(alergeno)} onCheckedChange={(checked) => {
                                                const newValue = checked ? [...(field.value || []), alergeno] : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) form.setValue('alergenosPresentes', (form.getValues('alergenosPresentes') || []).filter(p => p !== alergeno), { shouldDirty: true });
                                        }}/>
                                    </FormControl>
                                )}/>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
    const alergenosColumns = React.useMemo(() => [ALERGENOS.slice(0, 7), ALERGENOS.slice(7)], []);
    
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
                                                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" type="button" onClick={() => form.setValue('productoERPlinkId', '', {shouldDirty: true})}><CircleX className="mr-1 h-3 w-3"/>Desvincular</Button>
                                                    </div>
                                                     <p className="font-bold text-primary text-sm">{formatCurrency(selectedErpProduct.precio)} / {selectedErpProduct.unidad}</p>
                                                </div>
                                            ) : (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" className="w-full h-16 border-dashed border-2"><LinkIcon className="mr-2"/>Vincular Artículo ERP</Button>
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
                                <AlergenosTable alergenosList={alergenosColumns[0]} />
                                <AlergenosTable alergenosList={alergenosColumns[1]} />
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
                            <TableCell>{formatCurrency(calculateErpPrice(p))}/{p.unidad}</TableCell>
                            <TableCell>
                                <DialogClose asChild>
                                    <Button size="sm" onClick={() => onSelect(p.idreferenciaerp)}>
                                        <Check className="mr-2"/>Seleccionar
                                    </Button>
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

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { impersonatedUser } = useImpersonatedUser();
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [filterByUsage, setFilterByUsage] = useState(false);
  const [ingredientesEnUso, setIngredientesEnUso] = useState<Set<string>>(new Set());
  
  const loadIngredients = useCallback(() => {
    let storedErp = localStorage.getItem('articulosERP') || '[]';
    const articulosERP = JSON.parse(storedErp) as ArticuloERP[];
    const erpMap = new Map(articulosERP.map(item => [item.idreferenciaerp, item]));

    let storedIngredientes = localStorage.getItem('ingredientesInternos') || '[]';
    const ingredientesInternos = JSON.parse(storedIngredientes) as IngredienteInterno[];
    
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
        if(osDate < today) return; // Skip past events

        const gastroOrders = allGastroOrders.filter(go => go.osId === os.id);
        gastroOrders.forEach(go => {
            (go.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = allRecetas.find(r => r.id === item.id);
                    if(receta) {
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
        if(erpItem) {
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
            alergenos: [...new Set([...presentes, ...trazas])] as Alergeno[],
            urgency,
            precioCalculado: calculateErpPrice(erpItem)
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
  

  const handleExportCSV = () => {
    const dataToExport = ingredientes.map(item => {
        const { erp, alergenos, ...rest } = item;
        return {
            ...rest,
            alergenosPresentes: JSON.stringify(item.alergenosPresentes || []),
            alergenosTrazas: JSON.stringify(item.alergenosTrazas || []),
            historialRevisiones: JSON.stringify(item.historialRevisiones || []),
        };
    });
    
    if (dataToExport.length === 0) {
        dataToExport.push(Object.fromEntries(CSV_HEADERS.map(h => [h, ''])));
    }

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ingredientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo ingredientes.csv se ha descargado.' });
  };
  
  const safeJsonParse = (jsonString: string, fallback: any = []) => { try { const parsed = JSON.parse(jsonString); return Array.isArray(parsed) ? parsed : fallback; } catch (e) { return fallback; } };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
        header: true, skipEmptyLines: true, delimiter,
        complete: (results) => {
            const headers = results.meta.fields || [];
            if (!CSV_HEADERS.every(field => headers.includes(field))) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                setIsImportAlertOpen(false);
                return;
            }
            
            const importedData: IngredienteInterno[] = results.data.map(item => ({
                id: item.id || Date.now().toString() + Math.random(),
                nombreIngrediente: item.nombreIngrediente || '',
                productoERPlinkId: item.productoERPlinkId || '',
                alergenosPresentes: safeJsonParse(item.alergenosPresentes),
                alergenosTrazas: safeJsonParse(item.alergenosTrazas),
                historialRevisiones: safeJsonParse(item.historialRevisiones, null),
            }));
            
            localStorage.setItem('ingredientesInternos', JSON.stringify(importedData));
            loadIngredients();
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
            setIsImportAlertOpen(false);
        },
        error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
            setIsImportAlertOpen(false);
        }
    });
    if(event.target) event.target.value = '';
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

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

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

  const handleDelete = () => {
    if (!itemToDelete) return;
    
    let allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const updatedItems = allItems.filter(p => p.id !== itemToDelete.id);
    localStorage.setItem('ingredientesInternos', JSON.stringify(updatedItems));

    if (affectedElaboraciones.length > 0) {
        toast({
            title: 'Recetas marcadas para revisión',
            description: `${affectedElaboraciones.length} elaboración(es) usaban este ingrediente y sus recetas asociadas han sido marcadas para revisión.`
        });
    }

    loadIngredients();
    toast({ title: 'Ingrediente eliminado' });
    setItemToDelete(null);
  };

  const handleSave = (data: IngredienteFormValues) => {
    if (!impersonatedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al usuario.' });
        return;
    }

    const allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const index = allItems.findIndex(i => i.id === data.id);
    let message = '';

    const newRevision = { fecha: new Date().toISOString(), responsable: impersonatedUser.nombre };

    if (index > -1) {
        const updatedItem = { ...allItems[index], ...data, historialRevisiones: [...(allItems[index].historialRevisiones || []), newRevision] };
        allItems[index] = updatedItem;
        message = 'Ingrediente actualizado.';
    } else {
        const existing = allItems.find(p => p.nombreIngrediente.toLowerCase() === data.nombreIngrediente.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un ingrediente con este nombre.' });
            return;
        }
        const newItem: IngredienteInterno = { ...data, historialRevisiones: [newRevision] };
        allItems.push(newItem);
        message = 'Ingrediente creado.';
    }
    
    localStorage.setItem('ingredientesInternos', JSON.stringify(allItems));
    toast({ description: message });
    setEditingIngredient(null);
    loadIngredients();
  };
  
  const handleValidate = (item: IngredienteConERP) => {
      handleSave({
        id: item.id,
        nombreIngrediente: item.nombreIngrediente,
        productoERPlinkId: item.productoERPlinkId,
        alergenosPresentes: item.alergenosPresentes || [],
        alergenosTrazas: item.alergenosTrazas || [],
      });
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (!isMounted) return <LoadingSkeleton title="Cargando Ingredientes..." />;

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => setEditingIngredient({})}><PlusCircle className="mr-2" />Nuevo Ingrediente</Button>
      </div>
        
        <div className="flex items-center justify-between gap-4 mb-4">
          <Input placeholder="Buscar..." className="flex-grow max-w-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           <div className="flex items-center gap-4">
             <div className="flex items-center space-x-2"><Checkbox id="showPending" checked={showOnlyPending} onCheckedChange={(checked) => setShowOnlyPending(Boolean(checked))} /><Label htmlFor="showPending">Solo pendientes</Label></div>
             <div className="flex items-center space-x-2"><Checkbox id="filterUsage" checked={filterByUsage} onCheckedChange={(checked) => setFilterByUsage(Boolean(checked))} /><Label htmlFor="filterUsage">En uso futuro</Label></div>
           </div>
           <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader><TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Producto ERP Vinculado</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Precio/Ud.</TableHead>
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
                        <TableRow key={item.id} className={cn(needsReview && 'bg-amber-50', urgencyClass)}>
                            <TableCell className="font-medium">{item.nombreIngrediente}</TableCell>
                            <TableCell>{item.erp?.nombreProductoERP || <span className="text-destructive">No Vinculado</span>}</TableCell>
                            <TableCell>{item.erp?.nombreProveedor}</TableCell>
                            <TableCell className="font-mono text-right">{formatCurrency(item.precioCalculado || 0)}</TableCell>
                            <TableCell className={cn(needsReview && 'text-destructive font-bold')}>
                                {latestRevision ? format(new Date(latestRevision.fecha), 'dd/MM/yyyy') : 'Nunca'}
                                {needsReview && <AlertTriangle className="inline ml-2 h-4 w-4" />}
                            </TableCell>
                            <TableCell>{latestRevision ? getInitials(latestRevision.responsable) : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="secondary" onClick={() => handleValidate(item)}><Check className="mr-2 h-4 w-4" />Validar</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingIngredient(item)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                              </div>
                            </TableCell>
                        </TableRow>
                    )
                })
              ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron ingredientes.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

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
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>¿Estás seguro?</AlertDialogTitle>
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

```
- src/lib/fonts.ts:
```ts
import { Open_Sans, Roboto } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});

```
- tailwind.config.ts:
```ts
/** @type {import('tailwindcss').Config} */
import {fontFamily} from 'tailwindcss/defaultTheme';

module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
       fontFamily: {
        body: ['var(--font-body)', ...fontFamily.sans],
        headline: ['var(--font-headline)', ...fontFamily.sans],
      },
       typography: (theme: any) => ({
        DEFAULT: {
          css: {
            h1: {
              fontFamily: theme('fontFamily.headline'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
            },
            '--tw-prose-bullets': theme('colors.primary.DEFAULT'),
          },
        },
      }),
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('@tailwindcss/typography')],
}

```
- src/lib/fonts.ts:
```ts
import { Open_Sans, Roboto, Roboto_Mono } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});

export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-code',
});

```