'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ArticuloCatering } from '@/types';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Package, Search, Check, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadCSVTemplate, cn, normalizeCategoria } from '@/lib/utils';

import { useArticulosPaginated, useDeleteArticulo, useUpsertArticulo, useBulkDeleteArticulos, useSyncArticulosWithERP, useArticulosCategorias } from '@/hooks/use-data-queries';
import { supabase } from '@/lib/supabase';
import { getAllArticulos } from '@/services/articulos-service';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';
import { SyncProgressDialog } from './SyncProgressDialog';

const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", "es_habitual", "precio_venta", "precio_alquiler", "precio_reposicion", "unidad_venta", "stock_seguridad", "tipo", "loc", "imagen", "producido_por_partner", "partner_id", "receta_id", "subcategoria", "iva", "doc_drive_url"];

interface ArticulosClientProps {
  initialData: {
    items: ArticuloCatering[];
    totalCount: number;
  };
}

export function ArticulosClient({ initialData }: ArticulosClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);

  // Reset page on filter changes
  useEffect(() => {
    setPage(0);
  }, [categoryFilter, isPartnerFilter]);

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ categoria: string; loc: string }>({
    categoria: '',
    loc: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { 
    data, 
    isLoading, 
    isFetching,
    refetch
  } = useArticulosPaginated({
    page,
    pageSize,
    searchTerm: debouncedSearch,
    categoryFilter,
    isPartnerFilter: isPartnerFilter || undefined,
    tipoArticulo: 'micecatering'
  }, (page === 0 && !debouncedSearch && categoryFilter === 'all' && !isPartnerFilter) ? initialData : undefined);

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: categoriasData } = useArticulosCategorias('micecatering');
  const categoriasDisponibles = useMemo(() => categoriasData || [], [categoriasData]);

  const deleteArticulo = useDeleteArticulo();
  const upsertArticulo = useUpsertArticulo();
  const bulkDeleteArticulos = useBulkDeleteArticulos();
  const syncArticulos = useSyncArticulosWithERP();

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  // Sync state
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');

  const handleStartEdit = (item: ArticuloCatering) => {
    setEditingId(item.id);
    setEditValues({
      categoria: item.categoria,
      loc: item.loc || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('articulos')
        .update({
          categoria: editValues.categoria,
          loc: editValues.loc
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({ title: 'Cambios guardados' });
      setEditingId(null);
      refetch();
    } catch (error) {
      console.error('Error saving inline edit:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Definir columnas para la vista móvil
  const mobileColumns: MobileTableColumn<ArticuloCatering>[] = [
    { key: 'nombre', label: 'Nombre', isTitle: true },
    { key: 'categoria', label: 'Categoría' },
    { key: 'subcategoria', label: 'Subcategoría' },
    { key: 'precioVenta', label: 'Precio Venta', format: (value) => (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) },
    { key: 'precioAlquiler', label: 'Precio Alquiler', format: (value) => (value as number) > 0 ? (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' },
    { key: 'precioReposicion', label: 'Precio Reposición', format: (value) => (value as number) > 0 ? (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' },
  ];

  // Handlers de selección
  const handleToggleAll = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    if (checked) {
      setSelectedIds(new Set(items.map((item: ArticuloCatering) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenReviewDialog = () => {
    setIsReviewDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    
    // Validar dependencias
    const { data: dependencies, error: checkError } = await supabase
      .from('receta_detalles')
      .select('item_id')
      .eq('tipo', 'ARTICULO')
      .in('item_id', idsToDelete);

    if (checkError) {
      console.error('Error checking dependencies:', checkError);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo validar dependencias.' });
      return;
    }

    if (dependencies && dependencies.length > 0) {
      const articlesWithDeps = new Set(dependencies.map(d => d.item_id));
      toast({ 
        variant: 'destructive', 
        title: 'Artículos con dependencias', 
        description: `${articlesWithDeps.size} artículo(s) están referenciados en recetas y no pueden eliminarse.`,
        duration: 8000
      });
      return;
    }

    try {
      await bulkDeleteArticulos.mutateAsync(idsToDelete);
      toast({ title: `${idsToDelete.length} artículo(s) eliminado(s)` });
      setSelectedIds(new Set());
      setIsReviewDialogOpen(false);
      setIsBulkDeleteConfirmOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la eliminación.' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteArticulo.mutateAsync(itemToDelete);
      toast({ title: 'Artículo eliminado' });
      setItemToDelete(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    const parseBool = (val: any) => {
      if (val === true || val === 'true' || val === '1' || val === 'VERDADERO') return true;
      return false;
    };

    const parseNum = (val: any) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      }
      return parseFloat(val) || 0;
    };

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      worker: true,
      complete: async (results) => {
        if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
          toast({
            variant: 'destructive',
            title: 'Error de formato',
            description: `El CSV debe contener todas las columnas correctas. Columnas esperadas: ${CSV_HEADERS.join(', ')}`,
            duration: 10000,
          });
          return;
        }

        try {
          const BATCH_SIZE = 100;
          let processedCount = 0;
          const total = results.data.length;

          for (let i = 0; i < total; i += BATCH_SIZE) {
            const chunk = results.data.slice(i, i + BATCH_SIZE);
            
            const dbData = chunk.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              erp_id: item.erp_id || null,
              nombre: item.nombre,
              categoria: item.categoria,
              es_habitual: parseBool(item.es_habitual),
              precio_venta: parseNum(item.precio_venta),
              precio_alquiler: parseNum(item.precio_alquiler),
              precio_reposicion: parseNum(item.precio_reposicion),
              unidad_venta: parseNum(item.unidad_venta) || null,
              stock_seguridad: parseNum(item.stock_seguridad) || null,
              tipo: item.tipo || null,
              loc: item.loc || null,
              imagen: item.imagen || null,
              producido_por_partner: parseBool(item.producido_por_partner),
              partner_id: item.partner_id || null,
              receta_id: item.receta_id || null,
              subcategoria: item.subcategoria || null,
              iva: parseNum(item.iva) || 10,
              doc_drive_url: item.doc_drive_url || null,
              tipo_articulo: 'micecatering'
            }));

            const { error: upsertError } = await supabase
              .from('articulos')
              .upsert(dbData);

            if (upsertError) throw upsertError;
            
            processedCount += chunk.length;
            // Yield to main thread with a bit more time
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          toast({ title: 'Importación completada', description: `Se han importado ${processedCount} registros.` });
          refetch();
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        } finally {
          setIsImportAlertOpen(false);
        }
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleExportCSV = async () => {
    try {
      toast({ title: 'Exportando...', description: 'Obteniendo todos los datos...' });
      
      const allArticulos = await getAllArticulos(supabase, 'micecatering');
      
      if (allArticulos.length === 0) {
        toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
        return;
      }

      const dataToExport = allArticulos.map((item: any) => {
        // Obtener la URL de la imagen principal del bucket
        let imagenUrl = '';
        if (Array.isArray(item.imagenes) && item.imagenes.length > 0) {
          const principal = item.imagenes.find((img: any) => img?.esPrincipal);
          const img = principal || item.imagenes[0];
          if (typeof img === 'string') {
            imagenUrl = img;
          } else if (img?.url) {
            imagenUrl = img.url;
          }
        } else if (item.imagen) {
          // Fallback al campo imagen directo
          imagenUrl = item.imagen;
        }

        return {
          id: item.id,
          erp_id: item.erpId,
          nombre: item.nombre,
          categoria: item.categoria,
          es_habitual: item.esHabitual ? 'true' : 'false',
          precio_venta: item.precioVenta,
          precio_alquiler: item.precioAlquiler,
          precio_reposicion: item.precioReposicion,
          unidad_venta: item.unidadVenta,
          stock_seguridad: item.stockSeguridad,
          tipo: item.tipo,
          loc: item.loc,
          imagen: imagenUrl,
          producido_por_partner: item.producidoPorPartner ? 'true' : 'false',
          partner_id: item.partnerId,
          receta_id: item.recetaId,
          subcategoria: item.subcategoria,
          iva: item.iva,
          doc_drive_url: item.docDriveUrl,
        };
      });

      const csv = Papa.unparse(dataToExport, { 
        columns: CSV_HEADERS,
        delimiter: ';'
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `articulos-micecatering-completo.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Exportación completada', description: `Se exportaron ${allArticulos.length} artículos` });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo exportar los datos.' });
    }
  };

  const handleSyncERP = async () => {
    setIsSyncDialogOpen(true);
    setSyncLogs([]);
    setSyncProgress(0);
    setSyncStatus('syncing');

    try {
      await syncArticulos.mutateAsync((msg: string) => {
        setSyncLogs(prev => [...prev, msg]);
        
        // Intentar extraer progreso si el mensaje tiene formato (X/Y)
        const match = msg.match(/\((\d+)\/(\d+)\)/);
        if (match) {
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);
          setSyncProgress((current / total) * 100);
        } else if (msg.includes('finalizada')) {
          setSyncProgress(100);
        }
      });
      setSyncStatus('completed');
    } catch (error) {
      setSyncStatus('error');
      setSyncLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
    }
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <TableLoadingSplash isLoading={isLoading || isFetching} type="articulos" />
      
      {/* Header ultra compacto en desktop */}
      <div className="relative overflow-hidden rounded-xl bg-card/40 backdrop-blur-md border border-border/40 p-3 shadow-md mt-2 mb-2">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">Artículos MICE</h1>
              <p className="text-xs font-medium text-muted-foreground/70 leading-tight">Gestión de inventario y tarifas de catering</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button 
                variant="destructive" 
                className="rounded-2xl font-black px-6 h-12 shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-95 animate-in zoom-in"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Eliminar ({selectedIds.size})
              </Button>
            )}

            <Button 
              variant="outline" 
              className="rounded-2xl h-12 px-6 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all active:scale-95"
              onClick={handleSyncERP}
              disabled={syncArticulos.isPending}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", syncArticulos.isPending && "animate-spin")} />
              {syncArticulos.isPending ? "Sincronizando..." : "Actualizar desde ERP"}
            </Button>

            <Button 
              onClick={() => router.push('/bd/articulos/nuevo')}
              className="rounded-2xl font-black px-6 h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nuevo Artículo
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40 bg-background/40 hover:bg-primary/5 transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-xl p-3 font-bold">
                  <FileUp size={18} className="mr-3 text-primary" />Importar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_articulos.csv')} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Descargar Plantilla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-9 h-8 bg-background/40 border-border/40 rounded-lg focus:ring-primary/20 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[280px] h-8 bg-background/40 border-border/40 rounded-lg font-bold text-xs">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border/40 shadow-xl">
                <SelectItem value="all" className="font-bold text-xs">Todas las Categorías</SelectItem>
                {categoriasDisponibles.map(c => (
                  <SelectItem key={c} value={c} className="font-medium text-xs">
                    {normalizeCategoria(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-2 h-8 rounded-lg bg-background/40 border border-border/40 hover:border-primary/30 transition-colors group">
              <Checkbox
                id="partner-filter"
                checked={isPartnerFilter}
                onCheckedChange={(checked) => setIsPartnerFilter(Boolean(checked))}
                className="rounded h-4 w-4 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                tabIndex={0}
                disabled={false}
              />
              <label htmlFor="partner-filter" className="text-[10px] font-black text-muted-foreground/70 group-hover:text-primary cursor-pointer select-none uppercase tracking-widest" style={{ pointerEvents: 'auto' }}>
                Partner
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Vista Móvil: Tarjetas Apiladas */}
      <div className="md:hidden space-y-4">
        <MobileTableView
          data={items}
          columns={mobileColumns}
          renderActions={(item) => (
            <div className="flex gap-2 items-center">
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={(e) => handleToggleItem(item.id, e as any)}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg h-5 w-5"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/bd/articulos/${item.id}`)}
                className="flex-1 rounded-xl border-border/40 font-bold"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          )}
          isLoading={isLoading}
          emptyMessage="No se encontraron artículos."
        />
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="hidden md:block rounded-xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-8">
              <TableHead className="w-8 text-center p-0 align-middle">
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0 ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                  onCheckedChange={handleToggleAll}
                  className="rounded h-4 w-4 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 p-1 py-1">Nombre</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 p-1 py-1">Cat.</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 p-1 py-1">Sub.</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 p-1 py-1">Loc.</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 text-right p-1 py-1">PVP</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 text-right p-1 py-1">Alq.</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 text-right p-1 py-1 pr-3">Rep.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item: ArticuloCatering) => {
                const isSelected = selectedIds.has(item.id);
                const isEditing = editingId === item.id;
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "group cursor-pointer transition-all duration-200 border-border/40 h-8 text-xs align-middle",
                      isSelected 
                        ? "bg-primary/5 border-l-2 border-l-primary" 
                        : "hover:bg-primary/[0.03]",
                      item.tipoArticulo === 'entregas' && !isSelected && "bg-orange-50/30",
                      isEditing && "bg-primary/10"
                    )}
                    style={{ lineHeight: 1, padding: 0 }}
                    onClick={() => !isEditing && router.push(`/bd/articulos/${item.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-center p-0 py-1 align-middle">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="rounded h-4 w-4 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                    <TableCell className="p-1 py-1 align-middle">
                      <div className="relative group">
                        <span className="font-bold text-[9px] tracking-tight group-hover:text-primary transition-colors leading-tight cursor-pointer line-clamp-2">
                          {item.nombre}
                        </span>
                        {/* Tooltip imagen principal */}
                        {Array.isArray(item.imagenes) && item.imagenes.length > 0 && (
                          <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 hidden group-hover:flex flex-col items-center">
                            <div className="rounded-lg shadow-lg border border-border/40 bg-background p-1">
                              <img
                                src={(() => {
                                  const imgs = item.imagenes;
                                  if (!imgs || imgs.length === 0) return '';
                                  if (typeof imgs[0] === 'string') return imgs[0];
                                  const principal = imgs.find((img: any) => img?.esPrincipal);
                                  if (principal) return principal?.url || '';
                                  return imgs[0]?.url || '';
                                })()}
                                alt={item.nombre}
                                className="max-w-[150px] max-h-[100px] object-contain"
                                style={{ minWidth: 80, minHeight: 60 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="p-0 py-1">
                      {isEditing ? (
                        <Select 
                          value={editValues.categoria} 
                          onValueChange={(val) => setEditValues(prev => ({ ...prev, categoria: val }))}
                        >
                          <SelectTrigger className="h-7 w-[110px] bg-background/50 border-border/40 rounded-lg font-bold text-[9px] uppercase tracking-widest">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border-border/40 shadow-2xl">
                            {categoriasDisponibles.map(c => (
                              <SelectItem key={c} value={c} className="font-bold text-[9px] uppercase tracking-widest">
                                {normalizeCategoria(c)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="rounded-lg bg-background/50 border-border/40 font-black text-[8px] uppercase tracking-widest px-2 py-0 h-6 cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleStartEdit(item)}
                        >
                          {item.categoria}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="p-0 py-1">
                      <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest line-clamp-1">
                        {item.subcategoria || '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="p-0 py-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input 
                            value={editValues.loc}
                            onChange={(e) => setEditValues(prev => ({ ...prev, loc: e.target.value }))}
                            className="h-7 w-[90px] bg-background/50 border-border/40 rounded-lg font-bold text-[8px] uppercase tracking-widest px-2"
                            placeholder="LOC"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <div className="flex gap-0.5">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 rounded text-green-500 hover:bg-green-500/10"
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 rounded text-red-500 hover:bg-red-500/10"
                              onClick={() => setEditingId(null)}
                              disabled={isSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span 
                          className="text-[8px] font-bold text-muted-foreground/60 cursor-pointer hover:text-primary transition-colors uppercase tracking-widest"
                          onClick={() => handleStartEdit(item)}
                        >
                          {item.loc || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-[9px] tracking-tight p-0 py-1">
                      {item.precioVenta?.toLocaleString ? item.precioVenta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : (parseFloat(String(item.precioVenta || 0))).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[8px] text-muted-foreground/60 p-0 py-1">
                      {item.precioAlquiler?.toLocaleString ? (item.precioAlquiler > 0 ? item.precioAlquiler.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-') : (parseFloat(String(item.precioAlquiler || 0)) > 0 ? parseFloat(String(item.precioAlquiler || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[8px] text-muted-foreground/60 p-0 py-1 pr-2">
                      {item.precioReposicion?.toLocaleString ? (item.precioReposicion > 0 ? item.precioReposicion.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-') : (parseFloat(String(item.precioReposicion || 0)) > 0 ? parseFloat(String(item.precioReposicion || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-')}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Package className="h-12 w-12 mb-2 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-widest">No se encontraron artículos</p>
                    <p className="text-sm font-medium mt-1">Prueba a cambiar los filtros de búsqueda</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-t border-border/40">
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
              <span className="text-foreground font-black">{items.length}</span> de <span className="text-foreground font-black">{totalCount}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg font-bold uppercase tracking-widest text-[9px] h-8 px-2 border-border/40 bg-background/40 hover:bg-primary/5 transition-all"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Ant.
              </Button>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (totalPages > 5) {
                    if (page < 2) pageNum = i;
                    else if (page > totalPages - 3) pageNum = totalPages - 5 + i;
                    else pageNum = page - 2 + i;
                  } else {
                    pageNum = i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-7 h-7 rounded-lg font-bold text-[9px] p-0",
                        page === pageNum 
                          ? "shadow-lg shadow-primary/20 bg-primary text-primary-foreground" 
                          : "hover:bg-primary/10 text-muted-foreground"
                      )}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="rounded-lg font-bold uppercase tracking-widest text-[9px] h-8 px-2 border-border/40 bg-background/40 hover:bg-primary/5 transition-all"
              >
                Sig.
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante de eliminación masiva - Premium Style */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-background/80 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-4 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-primary/10 text-primary">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-black tracking-tight">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="rounded-xl font-bold hover:bg-muted/50"
            >
              Limpiar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleOpenReviewDialog}
              className="rounded-xl font-bold shadow-lg shadow-destructive/20 active:scale-95 transition-all"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de revisión de items seleccionados */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Revisar artículos a eliminar</DialogTitle>
            <DialogDescription>
              Se eliminarán {selectedIds.size} artículo{selectedIds.size > 1 ? 's' : ''}. Revisa la lista antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.filter((item: ArticuloCatering) => selectedIds.has(item.id)).map((item: ArticuloCatering) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.precioVenta?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsReviewDialogOpen(false);
                setIsBulkDeleteConfirmOpen(true);
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog confirmación final de eliminación masiva */}
      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente {selectedIds.size} artículo{selectedIds.size > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Eliminar {selectedIds.size} artículo{selectedIds.size > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de eliminación individual */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el artículo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center gap-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SyncProgressDialog
        isOpen={isSyncDialogOpen}
        logs={syncLogs}
        progress={syncProgress}
        status={syncStatus}
        onClose={() => setIsSyncDialogOpen(false)}
      />
    </div>
  );
}
