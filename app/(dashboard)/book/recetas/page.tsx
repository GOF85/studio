'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  PlusCircle, Search, Pencil, Copy, MoreHorizontal, 
  Trash2, Eye, Archive, BookHeart, Filter, ChevronRight
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- COMPONENTES AUXILIARES ---

// Renderizado de Alérgenos (Compacto)
const AllergenList = ({ alergenos }: { alergenos: Alergeno[] | null | undefined }) => {
  // FIX: Asegurar que es un array válido
  const safeAlergenos = Array.isArray(alergenos) ? alergenos : [];

  if (safeAlergenos.length === 0) return <span className="text-[10px] text-muted-foreground italic">Sin alérgenos</span>;
  
  // Mostrar solo los primeros 4 y un contador si hay más
  const visible = safeAlergenos.slice(0, 4);
  const remaining = safeAlergenos.length - 4;
  
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(a => (
         <div key={a} className="transform scale-90 origin-left">
            <AllergenBadge allergen={a} />
         </div>
      ))}
      {remaining > 0 && <span className="text-[10px] text-muted-foreground font-medium">+{remaining}</span>}
    </div>
  );
};

export default function RecetasListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. Lectura del filtro de URL (Por defecto 'active')
  const filterParam = searchParams.get('filter') as 'active' | 'archived' | 'all' || 'active';
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'all'>(filterParam);

  // 2. Estados locales
  const [items, setItems] = useState<Receta[]>([]);
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Sincronizar Tab con URL
  useEffect(() => {
    if (filterParam) setActiveTab(filterParam);
  }, [filterParam]);

  // Manejar cambio de pestaña
  const handleTabChange = (value: string) => {
    const tab = value as 'active' | 'archived' | 'all';
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('filter', tab);
    router.replace(`/book/recetas?${params.toString()}`);
  };

  // 3. Carga de Datos
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [recetasRes, catRes] = await Promise.all([
            supabase.from('recetas').select('*').order('nombre'),
            supabase.from('categorias_recetas').select('*').order('nombre')
        ]);

        if (recetasRes.data) {
             const mappedRecetas = recetasRes.data.map((r: any) => ({
                 ...r,
                 // FIX: Conversión estricta a boolean y camelCase
                 isArchived: r.is_archived === true, 
                 precioVenta: r.precio_venta || 0,
                 // FIX: Asegurar array para alérgenos
                 alergenos: r.alergenos || []
             }));
             setItems(mappedRecetas);
        }
        if (catRes.data) setCategorias(catRes.data);
        
      } catch (error) {
        console.error("Error cargando recetas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 4. Filtrado Lógico
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
      
      let matchesStatus = true;
      if (activeTab === 'active') matchesStatus = !item.isArchived; 
      if (activeTab === 'archived') matchesStatus = item.isArchived; 

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, activeTab]);

  if (isLoading) return <LoadingSkeleton title="Cargando Recetario..." />;

  return (
    <main className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
        
        {/* BARRA DE HERRAMIENTAS (Filtros y Tabs) */}
        <div className="flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-end sm:items-center">
                 {/* TABS DE ESTADO */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
                        <TabsTrigger value="active">Activas</TabsTrigger>
                        <TabsTrigger value="archived">Archivadas</TabsTrigger>
                        <TabsTrigger value="all">Todas</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button onClick={() => router.push('/book/recetas/nueva')} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4"/> Nueva Receta
                </Button>
            </div>

            {/* FILTROS BUSCADOR Y CATEGORÍA */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-muted/20 p-2 rounded-lg border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar receta..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 bg-background h-9 text-sm"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background h-9 text-sm">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        {categorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* VISTA MÓVIL: TARJETAS COMPACTAS CLICABLES */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredItems.map(item => (
                <div 
                    key={item.id} 
                    className="bg-card border rounded-lg p-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                    onClick={() => router.push(`/book/recetas/${item.id}`)}
                >
                    {/* Borde lateral de estado */}
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", item.isArchived ? "bg-gray-300" : "bg-green-500")} />

                    <div className="flex justify-between items-start pl-2 mb-2">
                        <div>
                            <h3 className="font-bold text-sm text-foreground leading-tight">{item.nombre}</h3>
                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5 font-medium tracking-wide">
                                {item.categoria}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(item.precioVenta)}</span>
                        </div>
                    </div>

                    <div className="pl-2 flex items-center justify-between">
                         <div className="flex-1 min-w-0">
                            <AllergenList alergenos={item.alergenos} />
                         </div>
                         <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-2" />
                    </div>
                </div>
            ))}
            {filteredItems.length === 0 && (
                 <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed text-sm">
                    No hay recetas {activeTab === 'active' ? 'activas' : 'archivadas'} que coincidan.
                 </div>
            )}
        </div>

        {/* VISTA DESKTOP: TABLA COMPLETA */}
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
                                    <div className="opacity-70 origin-left transform scale-90">
                                        <AllergenList alergenos={item.alergenos} />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-normal text-xs">{item.categoria}</Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                     {item.isArchived 
                                        ? <><Archive className="h-3.5 w-3.5 text-muted-foreground"/><span className="text-xs text-muted-foreground">Archivada</span></>
                                        : <><Eye className="h-3.5 w-3.5 text-green-600"/><span className="text-xs text-green-600 font-medium">Activa</span></>
                                     }
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-sm">
                                {formatCurrency(item.precioVenta)}
                            </TableCell>
                            <TableCell className="text-right">
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                No se encontraron recetas.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </main>
  );
}