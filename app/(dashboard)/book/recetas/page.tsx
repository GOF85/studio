'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { 
  PlusCircle, Search, Trash2, Eye, Archive, 
  ChevronRight, Download, Upload, Menu, AlertCircle
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// --- COMPONENTES AUXILIARES ---

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

export default function RecetasListPage() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { toast } = useToast();
  
  // 1. Estados
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

  // --- FIX SCROLL: Inicio de página ---
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Sincronizar Tab con URL
  useEffect(() => {
    if (filterParam) setActiveTab(filterParam);
  }, [filterParam]);

  // 2. Carga de Datos
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

  // 3. Handlers
  const handleTabChange = (val: string) => {
    const tab = val as 'active' | 'archived' | 'all';
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('filter', tab);
    router.replace(`/book/recetas?${params.toString()}`);
  };

  const handleExportCSV = () => {
    const dataToExport = items.map(r => ({
        id: r.id, nombre: r.nombre, categoria: r.categoria, precioVenta: r.precioVenta,
        costeMateriaPrima: r.costeMateriaPrima, alergenos: (r.alergenos || []).join(', '), isArchived: r.isArchived ? 'Sí' : 'No'
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'recetas.csv');
    link.click();
    toast({ title: 'Exportación completada' });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<any>(file, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
            const importedData = results.data.map((item: any) => ({
                id: item.id || crypto.randomUUID(), nombre: item.nombre, categoria: item.categoria,
                precio_venta: parseFloat(item.precioVenta) || 0, coste_materia_prima: parseFloat(item.costeMateriaPrima) || 0,
                is_archived: item.isArchived === 'Sí',
            }));
            const { error } = await supabase.from('recetas').upsert(importedData);
            if (error) toast({ variant: 'destructive', title: 'Error importando', description: error.message });
            else { loadData(); toast({ title: 'Importación completada' }); }
        }
    });
    if (event.target) event.target.value = '';
  };

  // Bulk selection handlers
  const isAllSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(items.map(item => item.id));
  };
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Clone handlers
  const handleCloneOne = (id: string) => {
    router.push(`/book/recetas/nueva?cloneId=${id}`);
  };

  const handleCloneMultiple = async () => {
    try {
      const toClone = items.filter(i => selectedIds.includes(i.id));
      const newRecetas = toClone.map(r => ({
        id: crypto.randomUUID(),
        nombre: `${r.nombre} (Copia)`,
        numero_receta: null,
        categoria: r.categoria,
        visible_para_comerciales: r.visible_para_comerciales,
        is_archived: false,
        descripcion_comercial: r.descripcion_comercial,
        descripcion_comercial_en: r.descripcion_comercial_en,
        responsable_escandallo: r.responsable_escandallo,
        gramaje_total: r.gramaje_total,
        estacionalidad: r.estacionalidad,
        tipo_dieta: r.tipo_dieta,
        porcentaje_coste_produccion: r.porcentaje_coste_produccion,
        elaboraciones: r.elaboraciones,
        menaje_asociado: r.menaje_asociado,
        instrucciones_mise_en_place: r.instrucciones_mise_en_place,
        fotos_mise_en_place: r.fotos_mise_en_place,
        instrucciones_regeneracion: r.instrucciones_regeneracion,
        fotos_regeneracion: r.fotos_regeneracion,
        instrucciones_emplatado: r.instrucciones_emplatado,
        fotos_emplatado: r.fotos_emplatado,
        fotos_comerciales: r.fotos_comerciales,
        perfil_sabor_principal: r.perfil_sabor_principal,
        perfil_sabor_secundario: r.perfil_sabor_secundario,
        perfil_textura: r.perfil_textura,
        tipo_cocina: r.tipo_cocina,
        receta_origen: r.receta_origen,
        temperatura_servicio: r.temperatura_servicio,
        tecnica_coccion_principal: r.tecnica_coccion_principal,
        potencial_mise_en_place: r.potencial_mise_en_place,
        formato_servicio_ideal: r.formato_servicio_ideal,
        equipamiento_critico: r.equipamiento_critico,
        dificultad_produccion: r.dificultad_produccion,
        estabilidad_buffet: r.estabilidad_buffet,
        escalabilidad: r.escalabilidad,
        etiquetas_tendencia: r.etiquetas_tendencia,
        requiere_revision: false,
        comentario_revision: null,
        fecha_revision: null,
        coste_materia_prima: r.coste_materia_prima,
        precio_venta: r.precio_venta,
        alergenos: r.alergenos,
        partida_produccion: r.partida_produccion
      }));

      const { error } = await supabase.from('recetas').insert(newRecetas);
      if (error) throw error;

      setSelectedIds([]);
      loadData();
      toast({ title: `${newRecetas.length} receta(s) clonada(s)` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    try {
      if (selectedIds.length === 0) return;
      const { error } = await supabase.from('recetas').delete().in('id', selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      loadData();
      toast({ title: 'Recetas eliminadas' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
    } finally {
      setShowBulkDeleteConfirm(false);
    }
  };

  // 4. Filtrado Lógico
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
       
       {/* 1. HEADER STICKY CON ALINEACIÓN CORREGIDA */}
       <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                
                {/* FIX: Contenedor con las mismas clases que el layout para alinear con breadcrumb */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
                    <TabsList className="w-full justify-start bg-transparent p-0 h-10 gap-6 border-none">
                        <TabsTrigger 
                            value="active" 
                            className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all"
                        >
                            Activas
                        </TabsTrigger>
                        <TabsTrigger 
                            value="archived" 
                            className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all"
                        >
                            Archivadas
                        </TabsTrigger>
                        <TabsTrigger 
                            value="all" 
                            className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all"
                        >
                            Todas
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* CONTENIDO PRINCIPAL ALINEADO */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-4">
                    <TabsContent value={activeTab} className="space-y-4 m-0 focus-visible:ring-0">
                        
                        {/* BARRA DE HERRAMIENTAS */}
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9 bg-background">
                                            <Menu className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones CSV</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleExportCSV}><Download className="mr-2 h-4 w-4"/> Exportar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleImportClick}><Upload className="mr-2 h-4 w-4"/> Importar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button onClick={() => router.push('/book/recetas/nueva')} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none shadow-sm h-9">
                                    <PlusCircle className="mr-2 h-4 w-4"/> 
                                    <span className="hidden sm:inline">Nueva Receta</span>
                                    <span className="sm:hidden">Nueva</span>
                                </Button>
                             </div>
                        </div>

                        {/* LISTA MÓVIL */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`bg-card border-l-4 rounded-lg p-3 shadow-sm active:scale-[0.98] transition-all group ${item.requiere_revision ? 'border-l-amber-500 border-r border-t border-b border-amber-200 bg-amber-50/30' : 'border-l-primary/20 border-r border-t border-b'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="checkbox"
                                                className="accent-blue-600 h-4 w-4 align-middle cursor-pointer"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectOne(item.id);
                                                }}
                                                aria-label="Seleccionar receta"
                                            />
                                            <span 
                                                className="font-bold text-sm text-foreground group-hover:text-primary transition-colors cursor-pointer flex-1"
                                                onClick={() => router.push(`/book/recetas/${item.id}`)}
                                            >
                                                {item.nombre}
                                            </span>
                                            {item.requiere_revision && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                                    <Menu className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>Abrir</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCloneOne(item.id)}>Clonar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => {
                                                    setSelectedIds([item.id]);
                                                    setShowBulkDeleteConfirm(true);
                                                }}>Eliminar</DropdownMenuItem>
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

                        {/* TABLA DESKTOP */}
                        <div className="hidden md:block">
                            {selectedIds.length > 0 && (
                                <div className="flex justify-end gap-2 mb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-xs shadow"
                                        onClick={handleCloneMultiple}
                                    >
                                        📋 Clonar ({selectedIds.length})
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 px-3 text-xs shadow"
                                        onClick={() => setShowBulkDeleteConfirm(true)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" /> Borrar ({selectedIds.length})
                                    </Button>
                                </div>
                            )}
                            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="w-8 pl-2 pr-1 align-middle">
                                                <input
                                                    type="checkbox"
                                                    className="accent-blue-600 h-4 w-4 align-middle"
                                                    checked={isAllSelected}
                                                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                                    onChange={handleSelectAll}
                                                    aria-label="Seleccionar todas"
                                                />
                                            </TableHead>
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
                                                <TableCell className="w-8 pl-2 pr-1 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="accent-blue-600 h-4 w-4 align-middle cursor-pointer"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleSelectOne(item.id)}
                                                        onClick={e => e.stopPropagation()}
                                                        aria-label="Seleccionar receta"
                                                    />
                                                </TableCell>
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
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                                <Menu className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>Abrir</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleCloneOne(item.id)}>Clonar</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => {
                                                                setSelectedIds([item.id]);
                                                                setShowBulkDeleteConfirm(true);
                                                            }}>Eliminar</DropdownMenuItem>
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

                        {/* Bulk delete confirmation dialog */}
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

                    </TabsContent>
                </div>
            </Tabs>
       </div>
    </main>
  );
}