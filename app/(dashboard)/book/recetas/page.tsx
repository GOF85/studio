'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { 
  PlusCircle, Search, Pencil, Copy, MoreHorizontal, 
  Trash2, Eye, Archive, BookHeart, Filter, ChevronRight,
  Download, Upload, ChevronLeft, Menu
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { Receta, CategoriaReceta, Alergeno } from '@/types';
import { ALERGENOS } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// --- COMPONENTES AUXILIARES ---

const AllergenList = ({ alergenos }: { alergenos: Alergeno[] | null | undefined }) => {
  // Asegurar que siempre es un array para evitar errores de map
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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // 1. Estados
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterParam = searchParams.get('filter') as 'active' | 'archived' | 'all' || 'active';
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'all'>(filterParam);
  const [items, setItems] = useState<Receta[]>([]);
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
                 // FIX CRÍTICO: Mapeo explícito de snake_case (BD) a camelCase (App)
                 // Forzamos a boolean para evitar tipos 'undefined' o 'null'
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

  // 4. Filtrado Lógico (Con FIX para isArchived)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
      
      let matchesStatus = true;
      // FIX: Comparación explícita con true/false para evitar problemas de tipos 'undefined'
      if (activeTab === 'active') matchesStatus = item.isArchived !== true; 
      if (activeTab === 'archived') matchesStatus = item.isArchived === true; 

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, activeTab]);

  if (isLoading) return <LoadingSkeleton title="Cargando Recetario..." />;

  return (
    <main className="pb-24 bg-background min-h-screen">
       <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelected} />
       
       {/* 1. HEADER STICKY */}
       <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Fila 1: Navegación */}
                <div className="flex items-center px-3 pb-2 gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/book')} className="-ml-2 h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <TabsList className="w-full justify-start bg-transparent p-0 h-9 gap-4">
                            <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all whitespace-nowrap">Activas</TabsTrigger>
                            <TabsTrigger value="archived" className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all whitespace-nowrap">Archivadas</TabsTrigger>
                            <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all whitespace-nowrap">Todas</TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5 mt-0 absolute left-0 right-0 top-[100%] overflow-y-auto pb-32">
                    <TabsContent value={activeTab} className="space-y-4 mt-2">
                        
                        {/* BARRA DE HERRAMIENTAS DE CONTENIDO */}
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
                                {/* MENÚ CSV RESTAURADO */}
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
                                <div key={item.id} className="bg-card border rounded-lg p-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden" onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", item.isArchived ? "bg-gray-300" : "bg-green-500")} />
                                    <div className="flex justify-between items-start pl-2 mb-2">
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground leading-tight">{item.nombre}</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5 font-medium tracking-wide">{item.categoria}</p>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(item.precioVenta)}</span>
                                    </div>
                                    <div className="pl-2 flex items-center justify-between">
                                         <div className="flex-1 min-w-0"><AllergenList alergenos={item.alergenos} /></div>
                                         <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-2" />
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed text-sm">No se encontraron recetas.</div>}
                        </div>

                        {/* TABLA DESKTOP */}
                        <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="w-[40%]">Nombre Receta</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">PVP Teórico</TableHead>
                                        <TableHead className="text-right w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length > 0 ? filteredItems.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer group" onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-semibold">{item.nombre}</span>
                                                    <div className="opacity-70 origin-left transform scale-90"><AllergenList alergenos={item.alergenos} /></div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="font-normal text-xs">{item.categoria}</Badge></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                     {item.isArchived ? <><Archive className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-xs text-muted-foreground">Archivada</span></> : <><Eye className="h-3.5 w-3.5 text-green-600"/><span className="text-xs text-green-600 font-medium">Activa</span></>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-sm">{formatCurrency(item.precioVenta)}</TableCell>
                                            <TableCell className="text-right"><ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No se encontraron recetas.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                    </TabsContent>
                </div>
            </Tabs>
       </div>
    </main>
  );
}