

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, MoreHorizontal, Copy, Download, Upload, Menu, AlertTriangle, CheckCircle, RefreshCw, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, ArticuloERP, Alergeno, Personal, CategoriaReceta, SaborPrincipal, TipoCocina, PartidaProduccion, ElaboracionEnReceta, ComponenteElaboracion } from '@/types';
import { SABORES_PRINCIPALES, PARTIDAS_PRODUCCION } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Label } from '@/components/ui/label';


const CSV_HEADERS_ELABORACIONES = ["id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotosProduccionURLs", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion"];
const CSV_HEADERS_COMPONENTES = ["id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma"];

type ElaboracionConAlergenos = Elaboracion & { alergenosCalculados?: Alergeno[] };
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteInterno>): Alergeno[] => {
  if (!elaboracion || !elaboracion.componentes) {
    return [];
  }
  const elabAlergenos = new Set<Alergeno>();
  elaboracion.componentes.forEach(comp => {
    if (comp.tipo === 'ingrediente') {
      const ingData = ingredientesMap.get(comp.componenteId);
      if (ingData) {
        (ingData.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
        (ingData.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
      }
    }
  });
  return Array.from(elabAlergenos);
};

const ITEMS_PER_PAGE = 20;

function ElaboracionesListPage() {
  const [items, setItems] = useState<(ElaboracionConAlergenos & { usageCount: number; usedIn: string[] })[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partidaFilter, setPartidaFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);

  const loadData = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');

    const [
      elaboracionesResult,
      elaboracionComponentesResult,
      recetasResult,
      recetaDetallesResult,
      ingredientesResult,
      erpResult
    ] = await Promise.all([
      supabase.from('elaboraciones').select('*'),
      supabase.from('elaboracion_componentes').select('*'),
      supabase.from('recetas').select('id, nombre, elaboraciones'),
      supabase.from('receta_detalles').select('*'),
      supabase.from('ingredientes_internos').select('*'),
      supabase.from('articulos_erp').select('*')
    ]);

    if (elaboracionesResult.error) {
      console.error('Error loading elaboraciones:', elaboracionesResult.error);
      toast({ variant: 'destructive', title: 'Error al cargar elaboraciones' });
      return;
    }

    const rawElaboraciones = elaboracionesResult.data || [];
    const rawComponentes = elaboracionComponentesResult.data || [];

    // Reconstruct Elaboracion objects with components
    const storedElaboraciones: Elaboracion[] = rawElaboraciones.map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      partidaProduccion: e.partida,
      unidadProduccion: e.unidad_produccion,
      instruccionesPreparacion: e.instrucciones,
      caducidadDias: e.caducidad_dias,
      costePorUnidad: e.coste_unitario, // This might be recalculated
      produccionTotal: e.produccion_total || 1,
      fotosProduccionURLs: e.fotos_produccion_urls || [],
      videoProduccionURL: e.video_produccion_url || '',
      formatoExpedicion: e.formato_expedicion || '',
      ratioExpedicion: e.ratio_expedicion || 0,
      tipoExpedicion: e.tipo_expedicion || 'REFRIGERADO',
      requiereRevision: e.requiere_revision || false,
      comentarioRevision: e.comentario_revision || '',
      fechaRevision: e.fecha_revision || undefined,
      componentes: rawComponentes
        .filter((c: any) => c.elaboracion_padre_id === e.id)
        .map((c: any) => ({
          id: c.id,
          tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
          componenteId: c.componente_id,
          nombre: '', // Will be filled later or fetched if needed, but for calculation we need IDs
          cantidad: c.cantidad_neta,
          merma: c.merma_aplicada,
          costePorUnidad: 0 // Will be calculated
        }))
    }));

    const storedRecetas = (recetasResult.data || []) as Receta[]; // Partial
    const recetaDetalles = recetaDetallesResult.data || [];

    // Map recipes to include their details for usage calculation
    const recetasWithDetails = storedRecetas.map(r => ({
      ...r,
      elaboraciones: recetaDetalles.filter((d: any) => d.receta_id === r.id && d.tipo === 'ELABORACION').map((d: any) => ({
        elaboracionId: d.item_id
      }))
    }));

    const storedIngredientes = (ingredientesResult.data || []).map((row: any) => ({
      id: row.id,
      nombreIngrediente: row.nombre_ingrediente,
      productoERPlinkId: row.producto_erp_link_id,
      alergenosPresentes: row.alergenos_presentes || [],
      alergenosTrazas: row.alergenos_trazas || [],
      historialRevisiones: row.historial_revisiones || [],
    })) as IngredienteInterno[];

    const storedErp = (erpResult.data || []).map((row: any) => ({
      idreferenciaerp: row.erp_id, // Assuming erp_id is the ID we use for linking
      nombreProductoERP: row.nombre,
      precioCompra: parseFloat(row.precio_compra || '0'),
      unidad: row.unidad_medida,
      unidadConversion: parseFloat(row.unidad_conversion || '1'),
      descuento: parseFloat(row.descuento || '0'),
    })) as ArticuloERP[];

    const ingredientesMap = new Map(storedIngredientes.map(i => [i.id, i]));
    const erpMap = new Map(storedErp.map(e => [e.idreferenciaerp, e])); // Check if ID matches
    // Also map by UUID if needed, but usually link is via erp_id (int/string) or UUID. 
    // Let's assume erp_id is what's stored in producto_erp_link_id. 
    // Wait, in `use-data-store.ts` it maps `id` to `id`. Let's check `articulos_erp` schema.
    // Schema says `id UUID`. `ingredientes_internos` has `producto_erp_link_id`.
    // If `producto_erp_link_id` is UUID, then we map by `id`.
    // Let's map by `id` as well just in case.
    const erpMapById = new Map((erpResult.data || []).map((e: any) => [e.id, {
      ...e,
      unidadConversion: parseFloat(e.unidad_conversion || '1'),
      precioCompra: parseFloat(e.precio_compra || '0'),
      descuento: parseFloat(e.descuento || '0')
    }]));


    const elaboracionesMap = new Map(storedElaboraciones.map(e => [e.id, e]));

    // Build usage map by checking elaboraciones field in recetas
    const usageMap = new Map<string, string[]>();

    // For each elaboracion, find which recipes use it
    for (const elab of rawElaboraciones) {
      const recipesUsingThis: string[] = [];

      // Check each recipe's elaboraciones JSONB field
      for (const receta of storedRecetas) {
        // elaboraciones is a JSONB array of objects with elaboracionId
        const recetaElaboraciones = (receta as any).elaboraciones || [];
        const usesThisElab = recetaElaboraciones.some((e: any) => e.elaboracionId === elab.id);

        if (usesThisElab) {
          recipesUsingThis.push(receta.nombre);
        }
      }

      usageMap.set(elab.id, recipesUsingThis);
    }

    // Función para calcular el coste de una elaboración
    const calculateElaboracionCost = (elab: Elaboracion): number => {
      let total = 0;
      (elab.componentes || []).forEach(componente => {
        let costeReal = componente.costePorUnidad || 0;

        if (componente.tipo === 'ingrediente') {
          const ingData = ingredientesMap.get(componente.componenteId);
          if (ingData) {
            // Try to find ERP data by link ID (which might be UUID or legacy ID)
            let erpData = erpMapById.get(ingData.productoERPlinkId);
            // If not found, maybe it's using the other ID?
            if (!erpData) erpData = erpMap.get(ingData.productoERPlinkId);

            if (erpData) {
              const unidadConversion = (erpData.unidadConversion && erpData.unidadConversion > 0) ? erpData.unidadConversion : 1;
              costeReal = (erpData.precioCompra / unidadConversion) * (1 - (erpData.descuento || 0) / 100);
            }
          }
        } else if (componente.tipo === 'elaboracion') {
          // Recursive cost calculation could be expensive or cause infinite loops if circular.
          // For now, assume linear dependency or use stored cost if available/calculated.
          // To be safe, we can use the stored cost from the map which we are iterating.
          // But we need to be careful about order. 
          // Ideally, we should calculate costs in topological order.
          // For simplicity here, we use the cost already in the object (which might be from DB).
          // If we want dynamic recalc, we need a better approach.
          // Let's try to find it in the map.
          const childElab = elaboracionesMap.get(componente.componenteId);
          if (childElab) {
            costeReal = childElab.costePorUnidad || 0;
          }
        }

        const costeConMerma = costeReal * (1 + (componente.merma || 0) / 100);
        total += costeConMerma * (componente.cantidad || 0);
      });

      const produccionTotal = elab.produccionTotal > 0 ? elab.produccionTotal : 1;
      return total / produccionTotal;
    };

    // Calculate costs (simple pass - might need multiple passes or topological sort for deep nesting)
    // For now, we trust the DB cost or simple calculation.
    const elaboracionesConDatos = storedElaboraciones.map((elab: Elaboracion) => {
      const usedInRecetas = usageMap.get(elab.id) || [];
      const costeCalculado = calculateElaboracionCost(elab);

      return {
        ...elab,
        costePorUnidad: costeCalculado, // Override with calculated cost
        alergenosCalculados: calculateElabAlergenos(elab, ingredientesMap as any),
        usageCount: usedInRecetas.length,
        usedIn: usedInRecetas
      }
    });

    setItems(elaboracionesConDatos);
    setIsMounted(true);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchMatch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const orphanMatch = !showOrphanedOnly || item.usageCount === 0;
      const partidaMatch = partidaFilter === 'all' || item.partidaProduccion === partidaFilter;
      return searchMatch && orphanMatch && partidaMatch;
    });
  }, [items, searchTerm, showOrphanedOnly, partidaFilter]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;

    // Check if any selected item is in use
    const itemsInUse = Array.from(selectedItems).filter(id => {
      const item = items.find(i => i.id === id);
      return item && item.usageCount > 0;
    });

    if (itemsInUse.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: `${itemsInUse.length} de las elaboraciones seleccionadas están en uso y no pueden ser eliminadas.`,
      });
      return;
    }

    const { supabase } = await import('@/lib/supabase');

    // Delete from Supabase
    const { error } = await supabase
      .from('elaboraciones')
      .delete()
      .in('id', Array.from(selectedItems));

    if (error) {
      console.error('Error deleting elaboraciones:', error);
      toast({ variant: 'destructive', title: 'Error al eliminar elaboraciones' });
      return;
    }

    toast({ title: `${selectedItems.size} elaboraciones eliminadas` });
    setSelectedItems(new Set());
    setShowDeleteConfirm(false);
    loadData(); // Reload data
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
  };


  const handleExportElaboracionesCSV = () => {
    const dataToExport = items.map(item => {
      const { componentes, alergenosCalculados, usageCount, usedIn, ...rest } = item;
      return {
        ...rest,
        fotosProduccionURLs: JSON.stringify(item.fotosProduccionURLs || []),
      };
    });
    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS_ELABORACIONES });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'elaboraciones.csv');
    link.click();
    toast({ title: 'Exportación de Elaboraciones Completada' });
  }

  const handleExportComponentesCSV = () => {
    const allComponentes: any[] = [];
    items.forEach(elab => {
      (elab.componentes || []).forEach(comp => {
        allComponentes.push({
          id_elaboracion_padre: elab.id,
          tipo_componente: comp.tipo,
          id_componente: comp.componenteId,
          cantidad: comp.cantidad,
          merma: comp.merma,
        });
      });
    });
    const csv = Papa.unparse(allComponentes, { columns: CSV_HEADERS_COMPONENTES });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'componentes.csv');
    link.click();
    toast({ title: 'Exportación de Componentes Completada' });
  }

  const handleImportClick = (type: 'elaboraciones' | 'componentes') => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !importType) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { supabase } = await import('@/lib/supabase');

        if (importType === 'elaboraciones') {
          const importedData = results.data.map((item: any) => ({
            id: item.id || crypto.randomUUID(), // Ensure ID
            nombre: item.nombre,
            partida: item.partidaProduccion,
            unidad_produccion: item.unidadProduccion,
            instrucciones: item.instruccionesPreparacion,
            produccion_total: parseFloat(item.produccionTotal) || 1,
            coste_unitario: parseFloat(item.costePorUnidad) || 0,
            ratio_expedicion: parseFloat(item.ratioExpedicion) || 0,
            formato_expedicion: item.formatoExpedicion,
            tipo_expedicion: item.tipoExpedicion,
            fotos_produccion_urls: item.fotosProduccionURLs ? JSON.parse(item.fotosProduccionURLs) : [],
            video_produccion_url: item.videoProduccionURL
          }));

          const { error } = await supabase.from('elaboraciones').upsert(importedData);

          if (error) {
            toast({ variant: 'destructive', title: 'Error importando elaboraciones', description: error.message });
          } else {
            loadData();
            toast({ title: 'Importación de Elaboraciones completada', description: `Se importaron ${importedData.length} registros.` });
          }

        } else if (importType === 'componentes') {
          const importedComponentes = results.data.map((compData: any) => ({
            elaboracion_padre_id: compData.id_elaboracion_padre,
            tipo_componente: compData.tipo_componente === 'ingrediente' ? 'ARTICULO' : 'ELABORACION',
            componente_id: compData.id_componente,
            cantidad_neta: parseFloat(compData.cantidad) || 0,
            merma_aplicada: parseFloat(compData.merma) || 0
          }));

          // We might want to clear existing components for these elaborations first?
          // For now just insert.
          const { error } = await supabase.from('elaboracion_componentes').insert(importedComponentes);

          if (error) {
            toast({ variant: 'destructive', title: 'Error importando componentes', description: error.message });
          } else {
            loadData();
            toast({ title: 'Importación de Componentes completada', description: `Se procesaron ${results.data.length} componentes.` });
          }
        }
      },
      error: (err) => toast({ variant: 'destructive', title: 'Error de importación', description: err.message })
    });

    if (event.target) event.target.value = '';
    setImportType(null);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Elaboraciones..." />;
  }

  const numSelected = selectedItems.size;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nombre..."
            className="flex-grow max-w-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={partidaFilter} onValueChange={setPartidaFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por partida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Partidas</SelectItem>
              {PARTIDAS_PRODUCCION.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="orphan-filter" checked={showOrphanedOnly} onCheckedChange={(checked) => setShowOrphanedOnly(!!checked)} />
            <Label htmlFor="orphan-filter">Solo Huérfanas</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
          <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
          <Button asChild>
            <Link href="/book/elaboraciones/nueva">
              <PlusCircle className="mr-2" />
              Nueva Elaboración
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Exportar a CSV</DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleExportElaboracionesCSV}><Download size={16} className="mr-2" />Elaboraciones (Maestro)</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportComponentesCSV}><Download size={16} className="mr-2" />Componentes (Detalle)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Importar desde CSV</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleImportClick('elaboraciones')}><Upload size={16} className="mr-2" />Elaboraciones (Maestro)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleImportClick('componentes')}><Upload size={16} className="mr-2" />Componentes (Detalle)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileSelected}
      />

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
              <TableHead>Nombre Elaboración</TableHead>
              <TableHead>Partida</TableHead>
              <TableHead>Coste / Ud.</TableHead>
              <TableHead>Presente en Recetas</TableHead>
              <TableHead>Alérgenos</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow key={item.id} >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => handleSelect(item.id)} />
                  </TableCell>
                  <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{item.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{item.partidaProduccion}</Badge></TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{formatCurrency(item.costePorUnidad)} / {formatUnit(item.unidadProduccion)}</TableCell>
                  <TableCell className="text-center font-semibold">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{item.usageCount}</span>
                      </TooltipTrigger>
                      {item.usedIn && item.usedIn.length > 0 && (
                        <TooltipContent>
                          <ul className="list-disc pl-4 text-xs">
                            {item.usedIn.map(recetaName => <li key={recetaName}>{recetaName}</li>)}
                          </ul>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.alergenosCalculados || []).map(alergeno => (
                        <AllergenBadge key={alergeno} allergen={alergeno} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/nueva?cloneId=${item.id}`)}>
                          <Copy className="mr-2 h-4 w-4" /> Clonar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron elaboraciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" />
              ¿Confirmar Borrado Masivo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar permanentemente <strong>{numSelected}</strong> elaboraciones. Las elaboraciones que estén en uso en alguna receta no se podrán eliminar. ¿Estás seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Sí, eliminar selección
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function ElaborationFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams();

  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const isNew = idParam === 'nueva';
  const isEditing = !isNew && idParam;
  const cloneId = searchParams.get('cloneId');

  const [initialData, setInitialData] = useState<Partial<ElaborationFormValues> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const loadElaboration = async () => {
      const { supabase } = await import('@/lib/supabase');
      let elabToLoad: Partial<ElaborationFormValues> | null = null;

      try {
        if (cloneId) {
          // Fetch clone source
          const { data: elabData, error } = await supabase.from('elaboraciones').select('*').eq('id', cloneId).single();
          if (elabData) {
            const { data: componentesData } = await supabase.from('elaboracion_componentes').select('*').eq('elaboracion_padre_id', cloneId);

            elabToLoad = {
              id: crypto.randomUUID(), // New ID
              nombre: `${elabData.nombre} (Copia)`,
              produccionTotal: elabData.produccion_total || 1,
              unidadProduccion: elabData.unidad_produccion,
              partidaProduccion: elabData.partida,
              instruccionesPreparacion: elabData.instrucciones,
              videoProduccionURL: elabData.video_produccion_url,
              fotos: elabData.fotos || [],
              formatoExpedicion: elabData.formato_expedicion,
              ratioExpedicion: elabData.ratio_expedicion,
              tipoExpedicion: elabData.tipo_expedicion,
              componentes: (componentesData || []).map((c: any) => ({
                id: crypto.randomUUID(),
                tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
                componenteId: c.componente_id,
                nombre: '', // Will be resolved by form
                cantidad: c.cantidad_neta,
                merma: c.merma_aplicada,
                costePorUnidad: 0
              }))
            };
          }
        } else if (isEditing) {
          const { data: elabData, error } = await supabase.from('elaboraciones').select('*').eq('id', idParam).single();
          if (elabData) {
            const { data: componentesData } = await supabase.from('elaboracion_componentes').select('*').eq('elaboracion_padre_id', idParam);

            elabToLoad = {
              id: elabData.id,
              nombre: elabData.nombre,
              produccionTotal: elabData.produccion_total || 1,
              unidadProduccion: elabData.unidad_produccion,
              partidaProduccion: elabData.partida,
              instruccionesPreparacion: elabData.instrucciones,
              videoProduccionURL: elabData.video_produccion_url,
              fotos: elabData.fotos || [],
              formatoExpedicion: elabData.formato_expedicion,
              ratioExpedicion: elabData.ratio_expedicion,
              tipoExpedicion: elabData.tipo_expedicion,
              requiereRevision: elabData.requiere_revision,
              comentarioRevision: elabData.comentario_revision,
              fechaRevision: elabData.fecha_revision,
              componentes: (componentesData || []).map((c: any) => ({
                id: c.id,
                tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
                componenteId: c.componente_id,
                nombre: '', // Will be resolved by form
                cantidad: c.cantidad_neta,
                merma: c.merma_aplicada,
                costePorUnidad: 0
              }))
            };
          }
        } else if (isNew) {
          elabToLoad = {
            id: crypto.randomUUID(),
            nombre: '',
            produccionTotal: 1,
            unidadProduccion: 'KG',
            partidaProduccion: 'FRIO',
            componentes: [],
            tipoExpedicion: 'REFRIGERADO',
            formatoExpedicion: '',
            ratioExpedicion: 0,
            instruccionesPreparacion: '',
            videoProduccionURL: '',
            fotos: [],
          };
        }

        setInitialData(elabToLoad);
      } catch (e) {
        console.error('[DEBUG] Error during data loading:', e);
        toast({ variant: 'destructive', title: 'Error cargando datos' });
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadElaboration();
  }, [idParam, isNew, isEditing, cloneId, toast]);

  const handleSave = async (data: ElaborationFormValues, costePorUnidad: number) => {
    setIsLoading(true);
    const { supabase } = await import('@/lib/supabase');

    try {
      const elaboracionData = {
        id: data.id,
        nombre: data.nombre,
        partida: data.partidaProduccion,
        unidad_produccion: data.unidadProduccion,
        instrucciones: data.instruccionesPreparacion,
        produccion_total: data.produccionTotal,
        coste_unitario: costePorUnidad,
        fotos: data.fotos,
        video_produccion_url: data.videoProduccionURL,
        formato_expedicion: data.formatoExpedicion,
        ratio_expedicion: data.ratioExpedicion,
        tipo_expedicion: data.tipoExpedicion,
        requiere_revision: data.requiereRevision,
        comentario_revision: data.comentarioRevision,
        fecha_revision: data.fechaRevision
      };

      // Upsert elaboracion
      const { error: elabError } = await supabase.from('elaboraciones').upsert(elaboracionData);
      if (elabError) throw elabError;

      // Handle components
      // First delete existing components for this elaboration
      const { error: deleteError } = await supabase.from('elaboracion_componentes').delete().eq('elaboracion_padre_id', data.id);
      if (deleteError) throw deleteError;

      // Insert new components
      if (data.componentes && data.componentes.length > 0) {
        const componentesToInsert = data.componentes.map(c => ({
          elaboracion_padre_id: data.id,
          tipo_componente: c.tipo === 'ingrediente' ? 'ARTICULO' : 'ELABORACION',
          componente_id: c.componenteId,
          cantidad_neta: c.cantidad,
          merma_aplicada: c.merma
        }));

        const { error: compError } = await supabase.from('elaboracion_componentes').insert(componentesToInsert);
        if (compError) throw compError;
      }

      toast({ description: 'Elaboración guardada correctamente.' });
      router.push('/book/elaboraciones');
    } catch (error: any) {
      console.error('Error saving elaboration:', error);
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isDataLoaded) {
    return <LoadingSkeleton title="Cargando elaboración..." />;
  }

  if (!initialData) {
    toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la elaboración." });
    router.push('/book/elaboraciones');
    return <LoadingSkeleton title="Redirigiendo..." />;
  }

  const pageTitle = cloneId ? 'Clonar Elaboración' : (isNew ? 'Nueva Elaboración' : 'Editar Elaboración');

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Component className="h-8 w-8" />
          <h1 className="text-3xl font-headline font-bold">{pageTitle}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => router.push('/book/elaboraciones')}> <X className="mr-2" /> Cancelar</Button>
          <Button type="submit" form="elaboration-form" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
            <span className="ml-2">{isNew || cloneId ? 'Guardar Elaboración' : 'Guardar Cambios'}</span>
          </Button>
        </div>
      </div>
      <ElaborationForm
        initialData={initialData}
        onSave={handleSave}
        isSubmitting={isLoading}
      />
    </main>
  );
}

export default function ElaboracionesPage() {
  const params = useParams();
  const isListPage = !params.id || params.id.length === 0;

  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando elaboraciones..." />}>
      {isListPage ? <ElaboracionesListPage /> : <ElaborationFormPage />}
    </Suspense>
  );
}





