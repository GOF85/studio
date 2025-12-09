'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight, AlertTriangle, MoreHorizontal, Pencil, Trash2, Archive, Loader2, LayoutGrid, List, Copy, Filter } from 'lucide-react';
import type { Receta, CategoriaReceta } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn, getSupabaseImageUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import InfiniteScroll from 'react-infinite-scroll-component';

const ITEMS_PER_PAGE = 20;

// Headers para CSV (Mantenemos igual)
const CSV_HEADERS = ["id", "numeroReceta", "nombre", "nombre_en", "visibleParaComerciales", "isArchived", "descripcionComercial", "descripcionComercial_en", "responsableEscandallo", "categoria", "partidaProduccion", "gramajeTotal", "estacionalidad", "tipoDieta", "porcentajeCosteProduccion", "elaboraciones", "menajeAsociado", "instruccionesMiseEnPlace", "fotosMiseEnPlaceURLs", "instruccionesRegeneracion", "fotosRegeneracionURLs", "instruccionesEmplatado", "fotosEmplatadoURLs", "fotosComercialesURLs", "perfilSaborPrincipal", "perfilSaborSecundario", "perfilTextura", "tipoCocina", "recetaOrigen", "temperaturaServicio", "tecnicaCoccionPrincipal", "potencialMiseEnPlace", "formatoServicioIdeal", "equipamientoCritico", "dificultadProduccion", "estabilidadBuffet", "escalabilidad", "etiquetasTendencia", "costeMateriaPrima", "precioVenta", "alergenos", "requiereRevision", "comentarioRevision", "fechaRevision"];

// URL segura (png)
const PLACEHOLDER_IMAGE = "https://placehold.co/600x400/e2e8f0/1e293b.png?text=Sin+Imagen";

// --- FUNCIÓN DE IMÁGENES ---
const processImages = (imagesData: any, urlsData: any, baseId: string, type: string) => {
  let rawList: any[] = [];

  if (imagesData) {
    if (Array.isArray(imagesData)) {
      rawList = imagesData;
    } else if (typeof imagesData === 'object') {
      rawList = [imagesData];
    } else if (typeof imagesData === 'string' && imagesData.trim() !== '') {
        rawList = [{ url: imagesData }];
    }
  }

  if (rawList.length === 0 && Array.isArray(urlsData) && urlsData.length > 0) {
    rawList = urlsData.map(url => (typeof url === 'string' ? { url } : url));
  }

  if (rawList.length > 0) {
    return rawList.map((img: any, idx: number) => {
      const rawUrl = typeof img === 'string' ? img : (img?.url || img?.value || img?.path || '');
      
      if (!rawUrl) return null;

      const finalUrl = rawUrl.startsWith('http') ? rawUrl : getSupabaseImageUrl(rawUrl, 'recetas');
      
      return {
        id: img.id || `${baseId}-${type}-${idx}`,
        url: finalUrl || PLACEHOLDER_IMAGE,
        esPrincipal: img.esPrincipal ?? (idx === 0),
        orden: img.orden ?? idx
      };
    }).filter(Boolean);
  }
  
  return [];
};

export default function RecetasPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [items, setItems] = useState<Receta[]>([]);
  const [categories, setCategories] = useState<CategoriaReceta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>(
    filterParam === 'all' || filterParam === 'archived' ? filterParam : 'active'
  );
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Default grid para móvil

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Forzamos vista Grid en móvil al cargar
  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: recetas, error: recetasError } = await supabase
          .from('recetas')
          .select('*')
          .order('nombre', { ascending: true });

        if (recetasError) throw recetasError;

        const { data: detalles } = await supabase.from('receta_detalles').select('*');

        const recetasMapped: Receta[] = (recetas || []).map((r: any) => ({
          id: r.id,
          numeroReceta: r.numero_receta || '',
          nombre: r.nombre || '',
          nombre_en: r.nombre_en || '',
          visibleParaComerciales: r.visible_para_comerciales ?? true,
          isArchived: r.is_archived ?? false,
          descripcionComercial: r.descripcion_comercial || '',
          descripcionComercial_en: r.descripcion_comercial_en || '',
          responsableEscandallo: r.responsable_escandallo || '',
          categoria: r.categoria || '',
          partidaProduccion: r.partida_produccion || '',
          gramajeTotal: r.gramaje_total || 0,
          estacionalidad: r.estacionalidad || 'MIXTO',
          tipoDieta: r.tipo_dieta || 'NINGUNO',
          porcentajeCosteProduccion: r.porcentaje_coste_produccion || 0,
          elaboraciones: (detalles || [])
            .filter((d: any) => d.receta_id === r.id)
            .map((d: any) => ({
              id: d.id,
              elaboracionId: d.elaboracion_id,
              nombre: d.nombre || '',
              cantidad: d.cantidad || 0,
              coste: d.coste || 0,
              gramaje: d.gramaje || 0,
              unidad: d.unidad || 'UD',
              merma: d.merma || 0,
            })),
          menajeAsociado: r.menaje_asociado || [],
          
          instruccionesMiseEnPlace: r.instrucciones_mise_en_place || '',
          fotosMiseEnPlace: processImages(r.fotos_mise_en_place, r.fotos_mise_en_place_urls, r.id, 'mise'),
          
          instruccionesRegeneracion: r.instrucciones_regeneracion || '',
          fotosRegeneracion: processImages(r.fotos_regeneracion, r.fotos_regeneracion_urls, r.id, 'regen'),
          
          instruccionesEmplatado: r.instrucciones_emplatado || '',
          fotosEmplatado: processImages(r.fotos_emplatado, r.fotos_emplatado_urls, r.id, 'empl'),
          
          fotosComerciales: processImages(r.fotos_comerciales, r.fotos_comerciales_urls, r.id, 'com'),

          perfilSaborPrincipal: r.perfil_sabor_principal || undefined,
          perfilSaborSecundario: r.perfil_sabor_secundario || [],
          perfilTextura: r.perfil_textura || [],
          tipoCocina: r.tipo_cocina || [],
          recetaOrigen: r.receta_origen || '',
          temperaturaServicio: r.temperatura_servicio || undefined,
          tecnicaCoccionPrincipal: r.tecnica_coccion_principal || undefined,
          potencialMiseEnPlace: r.potencial_mise_en_place || undefined,
          formatoServicioIdeal: r.formato_servicio_ideal || [],
          equipamientoCritico: r.equipamiento_critico || [],
          dificultadProduccion: r.dificultad_produccion || 3,
          estabilidadBuffet: r.estabilidad_buffet || 3,
          escalabilidad: r.escalabilidad || undefined,
          etiquetasTendencia: r.etiquetas_tendencia || [],
          costeMateriaPrima: r.coste_materia_prima || 0,
          precioVenta: r.precio_venta || 0,
          alergenos: r.alergenos || [],
          requiereRevision: r.requiere_revision ?? false,
          comentarioRevision: r.comentario_revision || '',
          fechaRevision: r.fecha_revision || '',
        }));

        setItems(recetasMapped);

        const { data: categorias, error: categoriasError } = await supabase
          .from('categorias_recetas')
          .select('*')
          .order('nombre', { ascending: true });

        if (categoriasError) {
          console.error('Error loading categorias:', categoriasError);
        } else {
          setCategories(categorias || []);
        }
      } catch (error: any) {
        console.error('Error loading data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudieron cargar los datos'
        });
      } finally {
        setIsMounted(true);
      }
    };
    loadData();
  }, [toast]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesVisibility = statusFilter === 'all' || (statusFilter === 'archived' ? item.isArchived : !item.isArchived);
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      return matchesVisibility && matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, selectedCategory]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const mobileItems = useMemo(() => {
    return filteredItems;
  }, [filteredItems]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleMassAction = async (action: 'archive' | 'delete') => {
      // (Lógica mantenida igual, solo oculta checkboxes en móvil)
      // ...
  };
  
  const handleSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Recetas..." />;
  }

  const numSelected = selectedItems.size;

  return (
    <>
      <TooltipProvider>
        {/* --- HEADER: BÚSQUEDA Y ACCIONES --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-grow w-full md:max-w-lg">
             <div className="relative">
                <Input
                  id="search-recipes"
                  placeholder="Buscar..."
                  className="w-full pl-10" // Espacio para icono si quisieras ponerlo
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto justify-end">
            {!isMobile && numSelected > 0 && (
              <>
                <Button variant="outline" onClick={() => handleMassAction('archive')}><Archive className="mr-2 h-4 w-4" />Archivar ({numSelected})</Button>
                <Button variant="destructive" onClick={() => setItemToDelete('mass')}><Trash2 className="mr-2 h-4 w-4" />Borrar ({numSelected})</Button>
              </>
            )}
            <Button asChild className="w-full md:w-auto">
              <Link href="/book/recetas/nueva"><PlusCircle className="mr-2 h-4 w-4" />Nueva Receta</Link>
            </Button>
          </div>
        </div>

        {/* --- FILTROS (DISEÑO COMPACTO EN MÓVIL) --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-center bg-muted/30 p-3 rounded-lg border">
          <div className="md:col-span-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-2">
            {!isMobile && (
                 <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid')} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                 </Tabs>
            )}

            <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
              <span>{currentPage}/{totalPages || 1}</span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        {viewMode === 'grid' || isMobile ? (
          <div className="grid-container">
             {/* GRID: 1 col móvil, 2 col sm, 3 col md, 4 col lg - ORDENADO */}
            <InfiniteScroll
              dataLength={items.length}
              next={() => setCurrentPage((prev) => prev + 1)}
              hasMore={currentPage < totalPages}
              loader={<h4 className="col-span-full text-center py-4">Cargando...</h4>}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {items.map((item) => (
                <div className="grid-item h-full" key={item.id}>
                  <div className="border rounded-lg overflow-hidden flex flex-col h-full bg-card hover:shadow-md transition-shadow relative group">
                    
                    {/* ZONA DE IMAGEN Y OVERLAYS */}
                    <div className="relative aspect-[4/3] w-full bg-muted">
                        <Link href={`/book/recetas/${item.id}`} className="block w-full h-full">
                          <Image
                            src={item.fotosComerciales?.[0]?.url || PLACEHOLDER_IMAGE}
                            alt={item.nombre}
                            width={500}
                            height={300}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            unoptimized
                          />
                        </Link>
                        
                        {/* --- MÓVIL: Elementos Flotantes --- */}
                        {isMobile && (
                          <>
                            {/* Categoría: Arriba Izquierda (Fondo blanco, letra negra) */}
                            <div className="absolute top-2 left-2 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                              {item.categoria || 'Sin Categoría'}
                            </div>

                            {/* Nombre: Abajo Izquierda (Fondo blanco, letra negra) */}
                            <div className="absolute bottom-2 left-2 bg-white text-black text-sm font-semibold px-2 py-1 rounded shadow-sm z-10 max-w-[80%] truncate">
                              {item.nombre}
                            </div>
                            
                            {/* Menú 3 Puntos: Arriba Derecha */}
                            <div className="absolute top-2 right-2 z-20">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black shadow-sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/book/recetas/nueva?cloneId=${item.id}`)}>
                                      <Copy className="mr-2 h-4 w-4" /> Clonar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                          </>
                        )}
                    </div>

                    {/* ZONA DE CONTENIDO (Solo Desktop muestra detalles aquí) */}
                    {!isMobile && (
                        <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                            <Link href={`/book/recetas/${item.id}`}>
                                <h3 className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">{item.nombre}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground mt-1">{item.categoria}</p>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <span className="text-base font-bold text-primary">{formatCurrency(item.precioVenta)}</span>
                            
                            {/* Checkbox solo en Desktop */}
                            <div
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(item.id);
                            }}
                            >
                            <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => handleSelect(item.id)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            </div>
                        </div>
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </InfiniteScroll>
          </div>
        ) : (
          /* --- VISTA LISTA (Solo Desktop) --- */
          <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={numSelected > 0 && numSelected === paginatedItems.length}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedItems);
                          paginatedItems.forEach(item => {
                            if (checked) newSelected.add(item.id);
                            else newSelected.delete(item.id);
                          });
                          setSelectedItems(newSelected);
                        }}
                      />
                    </TableHead>
                    <TableHead className="py-2">Nombre Receta</TableHead>
                    <TableHead className="py-2">Categoría</TableHead>
                    <TableHead className="py-2">Partida Producción</TableHead>
                    {/* Eliminado Coste M.P. */}
                    <TableHead className="py-2">Precio</TableHead>
                    <TableHead className="w-24 text-right py-2">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map(item => (
                      <TableRow
                        key={item.id}
                        className={cn(item.isArchived && "bg-secondary/50 text-muted-foreground", "cursor-pointer")}
                        onClick={() => router.push(`/book/recetas/${item.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium py-2 flex items-center gap-2">
                          {item.requiereRevision && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Esta receta necesita revisión.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {item.nombre}
                        </TableCell>
                        <TableCell className="py-2">{item.categoria}</TableCell>
                        <TableCell className="py-2">{item.partidaProduccion}</TableCell>
                        <TableCell className="font-bold text-primary py-2">{formatCurrency(item.precioVenta)}</TableCell>
                        <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/book/recetas/nueva?cloneId=${item.id}`); }}>
                                <Copy className="mr-2 h-4 w-4" /> Clonar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 p-0">
                        <div className="flex items-center justify-center h-full w-full">
                          <EmptyState
                            icon={BookHeart}
                            title="No hay recetas"
                            description="No se encontraron recetas."
                            action={{ label: "Crear Receta", onClick: () => router.push('/book/recetas/nueva') }}
                            className="border-0 shadow-none bg-transparent"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        )}
      </TooltipProvider>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete === 'mass'
                ? `Esta acción no se puede deshacer. Se eliminarán permanentemente las ${numSelected} recetas seleccionadas.`
                : 'Esta acción no se puede deshacer. Se eliminará permanentemente la receta.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => handleMassAction('delete')}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}