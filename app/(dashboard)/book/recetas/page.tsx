

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight, Eye, Copy, AlertTriangle, Menu, FileUp, FileDown, MoreHorizontal, Pencil, Trash2, Archive, CheckSquare, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Receta, CategoriaReceta, Elaboracion, IngredienteInterno, ArticuloERP, ComponenteElaboracion } from '@/types';
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
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Image from 'next/image';
import { EmptyState } from '@/components/ui/empty-state';

const ITEMS_PER_PAGE = 20;

const CSV_HEADERS = ["id", "numeroReceta", "nombre", "nombre_en", "visibleParaComerciales", "isArchived", "descripcionComercial", "descripcionComercial_en", "responsableEscandallo", "categoria", "partidaProduccion", "gramajeTotal", "estacionalidad", "tipoDieta", "porcentajeCosteProduccion", "elaboraciones", "menajeAsociado", "instruccionesMiseEnPlace", "fotosMiseEnPlaceURLs", "instruccionesRegeneracion", "fotosRegeneracionURLs", "instruccionesEmplatado", "fotosEmplatadoURLs", "fotosComercialesURLs", "perfilSaborPrincipal", "perfilSaborSecundario", "perfilTextura", "tipoCocina", "recetaOrigen", "temperaturaServicio", "tecnicaCoccionPrincipal", "potencialMiseEnPlace", "formatoServicioIdeal", "equipamientoCritico", "dificultadProduccion", "estabilidadBuffet", "escalabilidad", "etiquetasTendencia", "costeMateriaPrima", "precioVenta", "alergenos", "requiereRevision", "comentarioRevision", "fechaRevision"];

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
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showImages, setShowImages] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load recipes from Supabase
        const { data: recetas, error: recetasError } = await supabase
          .from('recetas')
          .select('*')
          .order('nombre', { ascending: true });

        if (recetasError) {
          console.error('Error loading recetas:', JSON.stringify(recetasError, null, 2));
          toast({
            variant: 'destructive',
            title: 'Error al cargar recetas',
            description: recetasError.message
          });
        }

        // Load recipe details from Supabase
        const { data: detalles, error: detallesError } = await supabase
          .from('receta_detalles')
          .select('*');

        if (detallesError) {
          console.error('Error loading receta_detalles:', detallesError);
        }

        // Map to Receta type
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
          fotosMiseEnPlace: Array.isArray(r.fotos_mise_en_place_urls)
            ? r.fotos_mise_en_place_urls.map((url: string, idx: number) => ({
              id: `${r.id}-mise-${idx}`,
              url,
              esPrincipal: idx === 0,
              orden: idx
            }))
            : [],
          instruccionesRegeneracion: r.instrucciones_regeneracion || '',
          fotosRegeneracion: Array.isArray(r.fotos_regeneracion_urls)
            ? r.fotos_regeneracion_urls.map((url: string, idx: number) => ({
              id: `${r.id}-regen-${idx}`,
              url,
              esPrincipal: idx === 0,
              orden: idx
            }))
            : [],
          instruccionesEmplatado: r.instrucciones_emplatado || '',
          fotosEmplatado: Array.isArray(r.fotos_emplatado_urls)
            ? r.fotos_emplatado_urls.map((url: string, idx: number) => ({
              id: `${r.id}-empl-${idx}`,
              url,
              esPrincipal: idx === 0,
              orden: idx
            }))
            : [],
          fotosComerciales: Array.isArray(r.fotos_comerciales_urls)
            ? r.fotos_comerciales_urls.map((url: string, idx: number) => ({
              id: `${r.id}-com-${idx}`,
              url,
              esPrincipal: idx === 0,
              orden: idx
            }))
            : [],
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

        // Load categories from Supabase
        const { data: categorias, error: categoriasError } = await supabase
          .from('categorias_recetas')
          .select('*')
          .order('nombre', { ascending: true });

        if (categoriasError) {
          console.error('Error loading categorias:', categoriasError);
        } else {
          setCategories(categorias || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los datos'
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

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay recetas para exportar.' });
      return;
    }
    const dataToExport = items.map(item => {
      const arrayFieldsToString = (key: keyof Receta) => {
        const value = item[key];
        return Array.isArray(value) ? JSON.stringify(value) : value;
      }

      const exportItem: any = {};
      CSV_HEADERS.forEach(header => {
        const key = header as keyof Receta;
        const value = item[key];
        if (Array.isArray(value)) {
          exportItem[key] = JSON.stringify(value);
        } else {
          exportItem[key] = value ?? '';
        }
      });
      return exportItem;
    });

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'recetas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo recetas.csv se ha descargado.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const safeJsonParse = (jsonString: string, fallback: any = []) => {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

        if (!hasAllHeaders) {
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        const importedData: Receta[] = results.data.map(item => ({
          ...item,
          visibleParaComerciales: item.visibleParaComerciales === 'true',
          isArchived: item.isArchived === 'true',
          requiereRevision: item.requiereRevision === 'true',
          porcentajeCosteProduccion: parseFloat(item.porcentajeCosteProduccion) || 0,
          costeMateriaPrima: parseFloat(item.costeMateriaPrima) || 0,
          gramajeTotal: parseFloat(item.gramajeTotal) || 0,
          precioVenta: parseFloat(item.precioVenta) || 0,
          dificultadProduccion: parseInt(item.dificultadProduccion) || 3,
          estabilidadBuffet: parseInt(item.estabilidadBuffet) || 3,
          elaboraciones: safeJsonParse(item.elaboraciones),
          menajeAsociado: safeJsonParse(item.menajeAsociado),
          fotosMiseEnPlaceURLs: safeJsonParse(item.fotosMiseEnPlaceURLs),
          fotosRegeneracionURLs: safeJsonParse(item.fotosRegeneracionURLs),
          fotosEmplatadoURLs: safeJsonParse(item.fotosEmplatadoURLs),
          fotosComercialesURLs: safeJsonParse(item.fotosComercialesURLs),
          perfilSaborSecundario: safeJsonParse(item.perfilSaborSecundario),
          perfilTextura: safeJsonParse(item.perfilTextura),
          tipoCocina: safeJsonParse(item.tipoCocina),
          formatoServicioIdeal: safeJsonParse(item.formatoServicioIdeal),
          equipamientoCritico: safeJsonParse(item.equipamientoCritico),
          etiquetasTendencia: safeJsonParse(item.etiquetasTendencia),
          alergenos: safeJsonParse(item.alergenos),
        }));

        // localStorage.setItem('recetas', JSON.stringify(importedData)); // REMOVED LEGACY
        setItems(importedData);
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros. (Nota: No se guardan en BD permanentemente en esta versión, usar 'Guardar' individualmente)` });
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
      }
    });
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleMassAction = async (action: 'archive' | 'delete') => {
    try {
      const selectedIds = Array.from(selectedItems);

      if (action === 'archive') {
        // Update is_archived in Supabase
        const { error } = await supabase
          .from('recetas')
          .update({ is_archived: true })
          .in('id', selectedIds);

        if (error) throw error;

        // Update local state
        const updatedItems = items.map(item =>
          selectedItems.has(item.id) ? { ...item, isArchived: true } : item
        );
        setItems(updatedItems);
        toast({ title: `${selectedItems.size} recetas archivadas.` });
      } else if (action === 'delete') {
        // Delete from Supabase
        const { error } = await supabase
          .from('recetas')
          .delete()
          .in('id', selectedIds);

        if (error) throw error;

        // Update local state
        const updatedItems = items.filter(item => !selectedItems.has(item.id));
        setItems(updatedItems);
        toast({ title: `${selectedItems.size} recetas eliminadas.` });
      }

      setSelectedItems(new Set());
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error in mass action:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo completar la operación'
      });
    }
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }

  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    toast({ title: 'Recalculando costes...', description: 'Esto puede tardar unos segundos.' });

    try {
      // 1. Load all necessary data from Supabase
      const [
        { data: erpData },
        { data: ingData },
        { data: elabData },
        { data: elabCompData },
        { data: recetasData },
        { data: recetaDetallesData }
      ] = await Promise.all([
        supabase.from('articulos_erp').select('*'),
        supabase.from('ingredientes_internos').select('*'),
        supabase.from('elaboraciones').select('*'),
        supabase.from('elaboracion_componentes').select('*'),
        supabase.from('recetas').select('*'),
        supabase.from('receta_detalles').select('*')
      ]);

      if (!erpData || !ingData || !elabData || !recetasData) throw new Error("Error al cargar datos de Supabase");

      // Map Data for easier access
      const erpMap = new Map(erpData.map((item: any) => [item.erp_id || item.id_referencia_erp, item]));
      const ingMap = new Map(ingData.map((item: any) => [
        item.id,
        { ...item, erp: erpMap.get(item.producto_erp_link_id) }
      ]));

      // 2. Recalculate Elaborations
      // We need to order elaborations to handle dependencies (simple approach: iterative)
      let elabCostesMap = new Map<string, number>();
      let updatedElabs = elabData.map((e: any) => ({
        id: e.id,
        produccionTotal: e.produccion_total,
        componentes: (elabCompData || []).filter((c: any) => c.elaboracion_padre_id === e.id),
        costeUnitario: e.coste_unitario
      }));

      // Iterative calculation (max 5 passes)
      for (let i = 0; i < 5; i++) {
        updatedElabs.forEach(elab => {
          let costeTotal = 0;
          elab.componentes.forEach((comp: any) => {
            let costeComp = 0;
            if (comp.tipo_componente === 'ARTICULO') {
              const ing = ingMap.get(comp.componente_id);
              if (ing?.erp) {
                const precioBase = (ing.erp.precio_compra || 0) / (ing.erp.unidad_conversion || 1);
                costeComp = precioBase * (1 - (ing.erp.descuento || 0) / 100);
              }
            } else { // ELABORACION
              costeComp = elabCostesMap.get(comp.componente_id) || 0;
            }
            costeTotal += costeComp * comp.cantidad_neta * (1 + (comp.merma_aplicada || 0) / 100);
          });
          const costeUnitario = elab.produccionTotal > 0 ? costeTotal / elab.produccionTotal : 0;
          elab.costeUnitario = costeUnitario;
          elabCostesMap.set(elab.id, costeUnitario);
        });
      }

      // 3. Batch Update Elaborations (Supabase doesn't support massive batch update easily, so we do it in parallel chunks or one by one if low volume)
      // For safety/speed balance:
      const elabUpdates = updatedElabs.map(e => ({
        id: e.id,
        coste_unitario: e.costeUnitario
      }));

      await supabase.from('elaboraciones').upsert(elabUpdates);


      // 4. Recalculate Recipes
      const updatedRecetas = recetasData.map((r: any) => {
        const detalles = (recetaDetallesData || []).filter((d: any) => d.receta_id === r.id);

        const costeMateriaPrima = detalles.reduce((sum: number, det: any) => {
          const elabCoste = elabCostesMap.get(det.elaboracion_id) || 0;
          // Note: receta_detalles might imply 'merma' differently? standard is (cost * qty)
          return sum + (elabCoste * det.cantidad); // Assuming simple cost * qty for now
        }, 0);

        const precioVenta = costeMateriaPrima * (1 + (r.porcentaje_coste_produccion || 0) / 100);

        return {
          id: r.id,
          coste_materia_prima: costeMateriaPrima,
          precio_venta: precioVenta
        };
      });

      await supabase.from('recetas').upsert(updatedRecetas);

      // Refresh local state
      window.location.reload(); // Simple refresh to show new data
      toast({ title: "¡Éxito!", description: "Costes recalculados y guardados en la nube." });

    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al recalcular: ' + e.message });
    } finally {
      setIsRecalculating(false);
    }
  }


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Recetas..." />;
  }

  const numSelected = selectedItems.size;

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center justify-between mb-6">
          <Input
            placeholder="Buscar recetas por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            {numSelected > 0 && (
              <>
                <Button variant="outline" onClick={() => handleMassAction('archive')}><Archive className="mr-2" />Archivar ({numSelected})</Button>
                <Button variant="destructive" onClick={() => setItemToDelete('mass')}><Trash2 className="mr-2" />Borrar ({numSelected})</Button>
              </>
            )}
            {/* Temporarily disabled - needs Supabase integration */}
            {/*
            <Button variant="outline" size="icon" onClick={handleRecalculateAll} disabled={isRecalculating}>
              {isRecalculating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
            */}
            <Button asChild>
              <Link href="/book/recetas/nueva"><PlusCircle className="mr-2" />Nueva Receta</Link>
            </Button>
            {/* Temporarily disabled - needs Supabase integration */}
            {/*
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImportClick}>
                  <FileUp size={16} className="mr-2" />Importar CSV
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleImportCSV}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileDown size={16} className="mr-2" />Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            */}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-center">
          <div className="lg:col-span-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2 flex items-center justify-between gap-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <span className="text-sm text-muted-foreground">
                Pág. {currentPage}/{totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 justify-end mb-4">
          <Switch id="show-images" checked={showImages} onCheckedChange={setShowImages} />
          <Label htmlFor="show-images" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
            <ImageIcon className="h-4 w-4" /> Mostrar Fotos
          </Label>
        </div>

        <div className="border rounded-lg">
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
                {showImages && <TableHead className="w-20 py-2">Imagen</TableHead>}
                <TableHead className="py-2">Nombre Receta</TableHead>
                <TableHead className="py-2">Categoría</TableHead>
                <TableHead className="py-2">Partida Producción</TableHead>
                <TableHead className="py-2">Coste M.P.</TableHead>
                <TableHead className="py-2">PVP Teórico</TableHead>
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
                    {showImages && (
                      <TableCell className="p-1">
                        {item.fotosComerciales?.find(f => f.esPrincipal) ? (
                          <div className="relative h-12 w-16 rounded-md overflow-hidden bg-muted">
                            <Image
                              src={item.fotosComerciales.find(f => f.esPrincipal)!.url}
                              alt={item.nombre}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-16 rounded-md bg-secondary/30 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </TableCell>
                    )}
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
                    <TableCell className="py-2">{formatCurrency(item.costeMateriaPrima)}</TableCell>
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
                  <TableCell colSpan={showImages ? 8 : 7} className="h-64 p-0">
                    <div className="flex items-center justify-center h-full w-full">
                      <EmptyState
                        icon={BookHeart}
                        title="No hay recetas"
                        description="No se encontraron recetas que coincidan con tus filtros. Crea una nueva o ajusta la búsqueda."
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

