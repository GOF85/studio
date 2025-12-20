'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { 
  PlusCircle, Search, Trash2, Eye, Archive, 
  ChevronRight, Download, Upload, Menu, AlertCircle, RefreshCw
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { Receta, CategoriaReceta, Alergeno } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// --- UTILIDAD DE PARSEO BLINDADA ---
const safeFloat = (input: any): number => {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    let clean = input.trim();
    if (!clean) return 0;
    // Gestión de comas y puntos
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf('.') < clean.indexOf(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const AllergenList = ({ alergenos }: { alergenos: Alergeno[] | null | undefined }) => {
  const safeAlergenos = Array.isArray(alergenos) ? alergenos : [];
  if (safeAlergenos.length === 0) return <span className="text-[10px] text-muted-foreground italic">Sin alérgenos</span>;
  const visible = safeAlergenos.slice(0, 4);
  const remaining = safeAlergenos.length - 4;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(a => <div key={a} className="transform scale-90 origin-left"><AllergenBadge allergen={a} /></div>)}
      {remaining > 0 && <span className="text-[10px] text-muted-foreground font-medium">+{remaining}</span>}
    </div>
  );
};

function RecetasListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterParam = (searchParams.get('filter') as 'active' | 'archived' | 'all') || 'active';
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'all'>(filterParam);
  const [items, setItems] = useState<Receta[]>([]);
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState(0);
  const [recalcStatus, setRecalcStatus] = useState('');
  const [recalcChanges, setRecalcChanges] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (filterParam) setActiveTab(filterParam);
  }, [filterParam]);

  const loadData = async () => {
      setIsLoading(true);
      try {
        const [recetasRes, catRes] = await Promise.all([
            supabase.from('recetas').select('*').order('nombre'),
            supabase.from('categorias_recetas').select('*').order('nombre')
        ]);

        if (recetasRes.data) {
             const mappedRecetas = recetasRes.data.map((r: any) => ({
                 ...r,
                 isArchived: r.is_archived === true, 
                 precioVenta: r.precio_venta || 0,
                 alergenos: r.alergenos || []
             }));
             setItems(mappedRecetas);
        }
        if (catRes.data) setCategorias(catRes.data);
      } catch (error) {
        console.error("Error:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las recetas." });
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => { loadData(); }, []);

  const handleTabChange = (val: string) => {
    const tab = val as 'active' | 'archived' | 'all';
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('filter', tab);
    router.replace(`/book/recetas?${params.toString()}`);
  };

  const handleExportCSV = () => { /* Implementar si se requiere */ }; 
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { /* Implementar si se requiere */ };

  const isAllSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(items.map(item => item.id));
  };
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCloneOne = (id: string) => router.push(`/book/recetas/nueva?cloneId=${id}`);
  const handleCloneMultiple = async () => { /* Implementar si se requiere */ };
  const handleBulkDelete = async () => { /* Implementar si se requiere */ };

  // ===========================================================================
  // FUNCIÓN RECALCULAR MAESTRA (VERSIÓN PRODUCCIÓN)
  // ===========================================================================
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    setRecalcProgress(0);
    setRecalcStatus('Iniciando recálculo masivo...');
    setRecalcChanges(0); 

    let counts = { ingredientes: 0, elaboraciones: 0, recetas: 0 };

    try {
      // 1. CARGA DE DATOS
      const [ingRes, elabRes, compRes, recetasRes] = await Promise.all([
        supabase.from('ingredientes_internos').select('id, precio_unitario'),
        supabase.from('elaboraciones').select('id, nombre, coste_unitario, produccion_total'),
        supabase.from('elaboracion_componentes').select('*'),
        supabase.from('recetas').select('*')
      ]);

      const ingredientesData = ingRes.data || [];
      const elaboracionesData = elabRes.data || [];
      const componentesData = compRes.data || [];
      const recetasData = recetasRes.data || [];

      // 2. MAPA DE PRECIOS INGREDIENTES
      const ingredientPriceMap = new Map<string, number>();
      ingredientesData.forEach((ing: any) => {
        const precio = safeFloat(ing.precio_unitario);
        ingredientPriceMap.set(ing.id, precio);
      });

      setRecalcProgress(30);

      // 3. RECALCULAR COSTES DE ELABORACIONES
      setRecalcStatus('Actualizando costes de elaboraciones...');
      const elaborationCostMap = new Map<string, number>();
      const elaboracionesAActualizar: any[] = [];

      elaboracionesData.forEach((elab: any) => {
        const comps = componentesData.filter((c: any) => c.elaboracion_padre_id === elab.id);
        
        let costeTotalBatch = 0;
        
        comps.forEach((comp: any) => {
          const ingID = comp.componente_id;
          const precioIng = ingredientPriceMap.get(ingID) || 0;
          const cantidad = safeFloat(comp.cantidad_neta);
          costeTotalBatch += (precioIng * cantidad);
        });

        // Aplicar factor de producción (Batch size)
        const produccionTotal = safeFloat(elab.produccion_total);
        const divisor = produccionTotal > 0 ? produccionTotal : 1;
        const costeUnitarioReal = costeTotalBatch / divisor;

        // Fallback: Si el cálculo falla (da 0), mantener el precio antiguo para no romper datos
        const costeAntiguo = safeFloat(elab.coste_unitario);
        let costeFinal = costeUnitarioReal;

        if (costeUnitarioReal <= 0.0001 && costeAntiguo > 0) {
            costeFinal = costeAntiguo;
        }

        elaborationCostMap.set(elab.id, costeFinal);

        // Solo actualizar DB si hay cambio significativo (> 0.1 céntimo)
        if (Math.abs(costeFinal - costeAntiguo) > 0.001) {
          elaboracionesAActualizar.push({ 
            id: elab.id,
            coste_unitario: costeFinal, 
            updated_at: new Date().toISOString() 
          });
        }
      });
      
      if (elaboracionesAActualizar.length > 0) {
        await supabase.from('elaboraciones').upsert(elaboracionesAActualizar);
        counts.elaboraciones = elaboracionesAActualizar.length;
      }

      setRecalcProgress(60);

      // 4. RECALCULAR RECETAS
      setRecalcStatus('Actualizando precios de recetas...');
      const recetasAActualizar: any[] = [];

      recetasData.forEach((receta: any) => {
        let costeMP = 0;
        let listaElabs: any[] = [];
        
        const rawElabs = receta.elaboraciones;
        if (Array.isArray(rawElabs)) listaElabs = rawElabs;
        else if (typeof rawElabs === 'string') {
            try { listaElabs = JSON.parse(rawElabs); } catch(e) {}
        }

        listaElabs.forEach((item: any) => {
            let elabId: string | null = null;
            let cantidad = 1;

            if (typeof item === 'string') elabId = item;
            else if (typeof item === 'object' && item !== null) {
                // Soporte para diferentes formatos de ID
                elabId = item.elaboracionId || item.elaboracion_id || item.id || null;
                if (item.cantidad) cantidad = safeFloat(item.cantidad) || 1;
            }

            // Limpiar ID de timestamps pegados (bug fix)
            if (elabId && elabId.length > 36) {
                 const match = elabId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                 if (match) elabId = match[0];
            }

            if (elabId && elaborationCostMap.has(elabId)) {
                costeMP += (elaborationCostMap.get(elabId) || 0) * cantidad;
            }
        });

        const margen = safeFloat(receta.porcentaje_coste_produccion);
        // Fórmula PVP: Coste * (1 + Margen%)
        let precioVenta = costeMP * (1 + (margen / 100));

        const costeAntiguo = safeFloat(receta.coste_materia_prima);
        const precioAntiguo = safeFloat(receta.precio_venta);

        // Actualizar solo si hay cambios y el coste es válido
        if (costeMP > 0.001) {
             if (Math.abs(costeMP - costeAntiguo) > 0.001 || Math.abs(precioVenta - precioAntiguo) > 0.001) {
                recetasAActualizar.push({
                    id: receta.id,
                    coste_materia_prima: costeMP,
                    precio_venta: precioVenta,
                    updated_at: new Date().toISOString()
                });
            }
        }
      });

      if (recetasAActualizar.length > 0) {
        const { error } = await supabase.from('recetas').upsert(recetasAActualizar);
        if (error) throw new Error(error.message);
        counts.recetas = recetasAActualizar.length;
      }

      setRecalcProgress(100);
      setRecalcChanges(counts.recetas); 
      setRecalcStatus('Finalizado.');
      
      // Registro de auditoría
      await supabase.from('activity_logs').insert({
        accion: 'RECALCULO_MASIVO',
        entidad: 'SISTEMA',
        detalles: { resumen: "Recálculo completado exitosamente", cambios: counts, fecha: new Date().toISOString() }
      });

      // Recargar UI
      await loadData();
      
      toast({ 
        title: "Recálculo Finalizado", 
        description: `Se han actualizado ${counts.elaboraciones} elaboraciones y ${counts.recetas} recetas.`,
        duration: 4000
      });
      
      setTimeout(() => setIsRecalculating(false), 1500);

    } catch (error: any) {
      console.error("Error en recálculo:", error);
      setRecalcStatus('Error');
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsRecalculating(false);
    }
  };

  // Resto del componente...
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
      
      let matchesStatus = true;
      if (activeTab === 'active') matchesStatus = item.isArchived !== true; 
      if (activeTab === 'archived') matchesStatus = item.isArchived === true; 

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, activeTab]);

  if (isLoading) return <LoadingSkeleton title="Cargando Recetario..." />;

  return (
    <main className="pb-24 bg-background min-h-screen">
       <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelected} />
       
       <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
                    <TabsList className="w-full justify-start bg-transparent p-0 h-10 gap-6 border-none">
                        <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all">Activas</TabsTrigger>
                        <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all">Archivadas</TabsTrigger>
                        <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all">Todas</TabsTrigger>
                    </TabsList>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-4">
                    <TabsContent value={activeTab} className="space-y-4 m-0 focus-visible:ring-0">
                        <div className="flex flex-col sm:flex-row justify-between gap-4 items-end sm:items-center">
                             <div className="flex gap-2 w-full sm:w-auto flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Buscar receta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm bg-background" />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[140px] h-9 text-sm bg-background"><SelectValue placeholder="Categoría" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {categorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>

                             <div className="flex gap-2 w-full sm:w-auto">
                                <Button onClick={handleRecalculateAll} disabled={isRecalculating} variant="outline" className="h-9 bg-background hover:bg-blue-50">
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                                  <span className="hidden sm:inline">Recalcular TODO</span>
                                  <span className="sm:hidden">Recalc.</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9 bg-background"><Menu className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones CSV</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleExportCSV}><Download className="mr-2 h-4 w-4"/> Exportar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleImportClick}><Upload className="mr-2 h-4 w-4"/> Importar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button onClick={() => router.push('/book/recetas/nueva')} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none shadow-sm h-9">
                                    <PlusCircle className="mr-2 h-4 w-4"/> <span className="hidden sm:inline">Nueva Receta</span>
                                </Button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredItems.map(item => (
                                <div key={item.id} className={`bg-card border-l-4 rounded-lg p-3 shadow-sm active:scale-[0.98] transition-all group ${item.requiere_revision ? 'border-l-amber-500 border-r border-t border-b border-amber-200 bg-amber-50/30' : 'border-l-primary/20 border-r border-t border-b'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 flex-1">
                                            <input type="checkbox" className="accent-blue-600 h-4 w-4 align-middle cursor-pointer" checked={selectedIds.includes(item.id)} onChange={(e) => { e.stopPropagation(); handleSelectOne(item.id); }} />
                                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors cursor-pointer flex-1" onClick={() => router.push(`/book/recetas/${item.id}`)}>{item.nombre}</span>
                                            {item.requiere_revision && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><Menu className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>Abrir</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCloneOne(item.id)}>Clonar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedIds([item.id]); setShowBulkDeleteConfirm(true); }}>Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>{formatCurrency(item.precioVenta)}</span>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{item.categoria}</Badge>
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed text-sm">No se encontraron recetas.</div>}
                        </div>

                        <div className="hidden md:block">
                            {selectedIds.length > 0 && (
                                <div className="flex justify-end gap-2 mb-2">
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs shadow" onClick={handleCloneMultiple}>📋 Clonar ({selectedIds.length})</Button>
                                    <Button variant="destructive" size="sm" className="h-8 px-3 text-xs shadow" onClick={() => setShowBulkDeleteConfirm(true)}><Trash2 className="h-4 w-4 mr-1" /> Borrar ({selectedIds.length})</Button>
                                </div>
                            )}
                            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="w-8 pl-2 pr-1 align-middle"><input type="checkbox" className="accent-blue-600 h-4 w-4 align-middle" checked={isAllSelected} ref={el => { if (el) el.indeterminate = isIndeterminate; }} onChange={handleSelectAll} /></TableHead>
                                            <TableHead className="w-[40%]">Nombre Receta</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">PVP Teórico</TableHead>
                                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.length > 0 ? filteredItems.map((item) => (
                                            <TableRow key={item.id} className={`${selectedIds.includes(item.id) ? "bg-blue-50/40" : item.requiere_revision ? "bg-amber-50/40 hover:bg-amber-50/60" : "cursor-pointer hover:bg-muted/50"} group transition-colors`}>
                                                <TableCell className="w-8 pl-2 pr-1 align-middle"><input type="checkbox" className="accent-blue-600 h-4 w-4 align-middle cursor-pointer" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} onClick={e => e.stopPropagation()} /></TableCell>
                                                <TableCell className="font-medium" onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-semibold">{item.nombre}</span>
                                                            <div className="opacity-70 origin-left transform scale-90"><AllergenList alergenos={item.alergenos} /></div>
                                                        </div>
                                                        {item.requiere_revision && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={() => router.push(`/book/recetas/${item.id}`)}><Badge variant="outline" className="font-normal text-xs">{item.categoria}</Badge></TableCell>
                                                <TableCell onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                                    <div className="flex items-center gap-2">
                                                        {item.isArchived ? <><Archive className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-xs text-muted-foreground">Archivada</span></> : <><Eye className="h-3.5 w-3.5 text-green-600"/><span className="text-xs text-green-600 font-medium">Activa</span></>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium text-sm" onClick={() => router.push(`/book/recetas/${item.id}`)}>{formatCurrency(item.precioVenta)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><Menu className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>Abrir</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleCloneOne(item.id)}>Clonar</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedIds([item.id]); setShowBulkDeleteConfirm(true); }}>Eliminar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No se encontraron recetas.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar seleccionadas?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción eliminará todas las recetas seleccionadas. ¿Desea continuar?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {isRecalculating && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded">
                                <div className="bg-white dark:bg-slate-950 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                                    <div className="text-center mb-6">
                                        <h2 className="text-xl font-bold mb-2">Recalculando recetas...</h2>
                                        <p className="text-sm text-muted-foreground">{recalcStatus}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-medium">Progreso</span>
                                                <span className="text-xs font-medium">{recalcProgress}%</span>
                                            </div>
                                            <Progress value={recalcProgress} className="h-2" />
                                        </div>
                                        {recalcProgress === 100 && (
                                            <div className="text-center py-4">
                                                <p className="text-sm font-semibold text-green-600">
                                                    ✓ Completado: {recalcChanges} recetas actualizadas
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </TabsContent>
                </div>
            </Tabs>
       </div>
    </main>
  );
}
export default function RecetasListPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <RecetasListPageInner />
        </Suspense>
    );
}
