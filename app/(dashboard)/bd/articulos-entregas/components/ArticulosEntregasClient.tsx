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
import { Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Truck, ArrowUpDown, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { downloadCSVTemplate, cn } from '@/lib/utils';
import { useArticulosPaginated, useDeleteArticulo, useBulkDeleteArticulos, useUpsertArticulo } from '@/hooks/use-data-queries';
import { DPT_ENTREGAS_OPTIONS, CATEGORIAS_ENTREGAS } from './ArticuloEntregasForm';
import { supabase } from '@/lib/supabase';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { SearchInput } from './SearchInput';

const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", "referencia_articulo_entregas", "dpt_entregas", "precio_coste", "precio_coste_alquiler", "precio_alquiler_entregas", "precio_venta_entregas", "precio_venta_entregas_ifema", "precio_alquiler_ifema", "iva", "doc_drive_url", "imagenes", "producido_por_partner", "partner_id", "subcategoria", "unidad_venta", "loc", "imagen", "stock_seguridad", "pack"];

interface ArticulosEntregasClientProps {
  initialData: {
    items: ArticuloCatering[];
    totalCount: number;
  };
}

export function ArticulosEntregasClient({ initialData }: ArticulosEntregasClientProps) {
  const isMobile = useIsMobile();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ categoria: string; dptEntregas: string }>({
    categoria: '',
    dptEntregas: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const { 
    data, 
    isLoading, 
    refetch
  } = useArticulosPaginated({
    page,
    pageSize,
    searchTerm: debouncedSearch,
    categoryFilter,
    departmentFilter,
    isPartnerFilter,
    tipoArticulo: 'entregas',
    sortBy,
    sortOrder
  }, initialData);

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const deleteArticulo = useDeleteArticulo();
  const upsertArticulo = useUpsertArticulo();
  const bulkDeleteArticulos = useBulkDeleteArticulos();

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartEdit = (item: ArticuloCatering) => {
    setEditingId(item.id);
    setEditValues({
      categoria: item.categoria,
      dptEntregas: (item as any).dptEntregas || ''
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
          dpt_entregas: editValues.dptEntregas
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

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const mobileColumns: MobileTableColumn<ArticuloCatering>[] = [
    { key: 'nombre', label: 'Nombre', isTitle: true },
    { key: 'categoria', label: 'Categoría', format: (value) => <Badge variant="outline" className="rounded-xl bg-orange-500/5 border-orange-500/20 text-orange-600 font-black text-[9px] uppercase tracking-widest px-3 py-1">{value as string}</Badge> },
    { key: 'loc', label: 'Localización', format: (value) => <span className="font-bold text-xs uppercase tracking-widest">{value as string || 'Sin loc.'}</span> },
    { key: 'precioVenta', label: 'Precio Venta', format: (value) => (value as number)?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-' },
  ];

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
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
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

        const importedData = results.data.map((item: any) => {
          let imagenes = [];
          if (item.imagenes && typeof item.imagenes === 'string') {
            try {
              imagenes = JSON.parse(item.imagenes);
            } catch (e) {
              imagenes = [];
            }
          } else if (Array.isArray(item.imagenes)) {
            imagenes = item.imagenes;
          }

          let packs = [];
          const packsRaw = item.pack || item.packs;
          if (packsRaw && typeof packsRaw === 'string') {
            try {
              packs = JSON.parse(packsRaw);
            } catch (e) {
              packs = [];
            }
          } else if (Array.isArray(packsRaw)) {
            packs = packsRaw;
          }

          // Normalizar categoría para entregas
          let categoria = (item.categoria || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (categoria === 'ALMACEN') categoria = 'ALMACEN';
          else if (categoria === 'BEBIDA' || categoria === 'BEBIDAS' || categoria === 'BODEGA') categoria = 'BODEGA';
          else if (categoria === 'GASTRONOMIA') categoria = 'GASTRONOMIA';
          else if (categoria === 'BIO') categoria = 'BIO';
          else categoria = 'OTROS';

          return {
            id: item.id || crypto.randomUUID(),
            erpId: item.erp_id || null,
            nombre: item.nombre,
            categoria: categoria as any,
            referenciaArticuloEntregas: item.referencia_articulo_entregas,
            dptEntregas: (item.dpt_entregas || 'ALMACEN').toUpperCase() as any,
            precioCoste: (parseFloat(item.precio_coste) || 0) * (parseFloat(item.unidad_venta) || 1),
            precioCosteAlquiler: parseFloat(item.precio_coste_alquiler) || null,
            precioAlquilerEntregas: parseFloat(item.precio_alquiler_entregas) || 0,
            precioVentaEntregas: parseFloat(item.precio_venta_entregas) || 0,
            precioVentaEntregasIfema: parseFloat(item.precio_venta_entregas_ifema) || 0,
            precioAlquilerIfema: parseFloat(item.precio_alquiler_ifema) || 0,
            iva: parseFloat(item.iva) || 10,
            docDriveUrl: item.doc_drive_url || null,
            imagenes: imagenes,
            producidoPorPartner: item.producido_por_partner === 'true' || item.producido_por_partner === true,
            partnerId: item.partner_id || null,
            subcategoria: item.subcategoria || null,
            unidadVenta: parseFloat(item.unidad_venta) || null,
            loc: item.loc || null,
            imagen: item.imagen || null,
            stockSeguridad: parseFloat(item.stock_seguridad) || 0,
            packs: packs,
            tipoArticulo: 'entregas'
          } as ArticuloCatering;
        });

        try {
          // Importar secuencialmente para evitar problemas de concurrencia
          for (const articulo of importedData) {
            await upsertArticulo.mutateAsync(articulo);
          }
          toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} artículos.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        }
        setIsImportAlertOpen(false);
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

  const handleExportCSV = () => {
    const entregasItems = items.filter((item: ArticuloCatering) => item.tipoArticulo === 'entregas');
    if (entregasItems.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const dataToExport = entregasItems.map((item: any) => ({
      id: item.id,
      erp_id: item.erpId,
      nombre: item.nombre,
      categoria: item.categoria,
      referencia_articulo_entregas: item.referenciaArticuloEntregas,
      dpt_entregas: item.dptEntregas,
      precio_coste: item.precioCoste,
      precio_coste_alquiler: item.precioCosteAlquiler,
      precio_alquiler_entregas: item.precioAlquilerEntregas,
      precio_venta_entregas: item.precioVentaEntregas,
      precio_venta_entregas_ifema: item.precioVentaEntregasIfema,
      precio_alquiler_ifema: item.precioAlquilerIfema,
      iva: item.iva,
      doc_drive_url: item.docDriveUrl,
      imagenes: item.imagenes ? JSON.stringify(item.imagenes) : '[]',
      producido_por_partner: item.producidoPorPartner ? 'true' : 'false',
      partner_id: item.partnerId,
      subcategoria: item.subcategoria,
      unidad_venta: item.unidadVenta,
      loc: item.loc,
      imagen: item.imagen,
      stock_seguridad: item.stockSeguridad || 0,
      pack: item.packs ? JSON.stringify(item.packs) : '[]',
    }));

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `articulos-entregas.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos Entregas..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <TableLoadingSplash isLoading={isLoading} type="entregas" />
      
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-orange-500/10 text-orange-600 shadow-inner">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Artículos Entregas</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de inventario y tarifas para servicios de entrega</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={() => router.push('/bd/articulos-entregas/nuevo')}
              className="rounded-2xl font-black px-6 h-12 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-95 bg-orange-500 hover:bg-orange-600 text-white border-none"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nuevo Artículo
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40 bg-background/40 hover:bg-orange-500/5 transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-xl p-3 font-bold">
                  <FileUp size={18} className="mr-3 text-orange-600" />Importar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_articulos_entregas.csv')} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-orange-600" />Descargar Plantilla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-orange-600" />Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
          <SearchInput 
            placeholder="Buscar por nombre o referencia..."
            onSearch={setDebouncedSearch}
            defaultValue={debouncedSearch}
          />
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12 bg-background/40 border-border/40 rounded-2xl font-bold">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                <SelectItem value="all" className="font-bold">Todas las Categorías</SelectItem>
                {CATEGORIAS_ENTREGAS.map(c => <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12 bg-background/40 border-border/40 rounded-2xl font-bold">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                <SelectItem value="all" className="font-bold">Todos los Dptos</SelectItem>
                {DPT_ENTREGAS_OPTIONS.map(d => <SelectItem key={d} value={d} className="font-medium">{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-background/40 border border-border/40 hover:border-orange-500/30 transition-colors cursor-pointer group">
              <Checkbox 
                id="partner-filter" 
                checked={isPartnerFilter} 
                onCheckedChange={(checked) => setIsPartnerFilter(Boolean(checked))}
                className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <label htmlFor="partner-filter" className="text-xs font-black text-muted-foreground/70 group-hover:text-orange-600 cursor-pointer select-none uppercase tracking-widest">Partner</label>
            </div>
          </div>
        </div>
      </div>

      {/* Vista Móvil: Tarjetas Apiladas */}
      {isMobile && (
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
                  onClick={() => router.push(`/bd/articulos-entregas/${item.id}`)}
                  className="flex-1 rounded-xl border-border/40 font-bold"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>
            )}
            isLoading={isLoading}
            emptyMessage="No se encontraron artículos de entregas."
          />
        </div>
      )}

      {/* Vista Escritorio: Tabla Premium */}
      {!isMobile && (
        <div className="hidden md:block rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40 h-16">
                <TableHead className="w-16 text-center">
                  <Checkbox
                    checked={selectedIds.size === items.length && items.length > 0 ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                    onCheckedChange={handleToggleAll}
                    className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                </TableHead>
                <TableHead 
                  className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 cursor-pointer hover:text-orange-600 transition-colors"
                  onClick={() => toggleSort('nombre')}
                >
                  <div className="flex items-center gap-2">
                    Nombre del Artículo
                    <ArrowUpDown className={cn("h-3 w-3", sortBy === 'nombre' ? "text-orange-600" : "opacity-30")} />
                  </div>
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Categoría</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Localización</TableHead>
                <TableHead 
                  className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 cursor-pointer hover:text-orange-600 transition-colors"
                  onClick={() => toggleSort('referencia_articulo_entregas')}
                >
                  <div className="flex items-center gap-2">
                    Referencia
                    <ArrowUpDown className={cn("h-3 w-3", sortBy === 'referencia_articulo_entregas' ? "text-orange-600" : "opacity-30")} />
                  </div>
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Dpto</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Precio Venta</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Precio Coste</TableHead>
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
                        "group cursor-pointer transition-all duration-300 border-border/40 h-20",
                        isSelected 
                          ? "bg-orange-500/5 border-l-4 border-l-orange-500" 
                          : "hover:bg-orange-500/[0.03]",
                        isEditing && "bg-orange-500/10"
                      )}
                      onClick={() => !isEditing && router.push(`/bd/articulos-entregas/${item.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleItem(item.id)}
                          className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-sm tracking-tight group-hover:text-orange-600 transition-colors">{item.nombre}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">ID: {item.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <Select 
                            value={editValues.categoria} 
                            onValueChange={(val) => setEditValues(prev => ({ ...prev, categoria: val }))}
                          >
                            <SelectTrigger className="h-9 w-[140px] bg-background/50 border-border/40 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                              {CATEGORIAS_ENTREGAS.map(c => (
                                <SelectItem key={c} value={c} className="font-bold text-[10px] uppercase tracking-widest">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="rounded-xl bg-background/50 border-border/40 font-black text-[9px] uppercase tracking-widest px-3 py-1 cursor-pointer hover:bg-orange-500/10 transition-colors"
                            onClick={() => handleStartEdit(item)}
                          >
                            {item.categoria}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {item.loc || 'Sin loc.'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground/60">
                        {(item as any).referenciaArticuloEntregas || '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={editValues.dptEntregas} 
                              onValueChange={(val) => setEditValues(prev => ({ ...prev, dptEntregas: val }))}
                            >
                              <SelectTrigger className="h-9 w-[120px] bg-background/50 border-border/40 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                                {DPT_ENTREGAS_OPTIONS.map(opt => (
                                  <SelectItem key={opt} value={opt} className="font-bold text-[10px] uppercase tracking-widest">{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg text-green-500 hover:bg-green-500/10"
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-500/10"
                                onClick={() => setEditingId(null)}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="rounded-xl bg-background/50 border-border/40 font-black text-[9px] uppercase tracking-widest px-3 py-1 cursor-pointer hover:bg-orange-500/10 transition-colors"
                            onClick={() => handleStartEdit(item)}
                          >
                            {(item as any).dptEntregas || '-'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-black text-sm tracking-tight">
                        {((item as any).precioVentaEntregas || item.precioVenta)?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-muted-foreground/60 pr-8">
                        {(item as any).precioCoste?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                      <Truck className="h-16 w-16 mb-4 opacity-10" />
                      <p className="text-lg font-black uppercase tracking-widest">No se encontraron artículos</p>
                      <p className="text-sm font-medium mt-1">Prueba a cambiar los filtros de búsqueda</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 bg-muted/10 border-t border-border/40">
              <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
                Mostrando <span className="text-foreground font-black">{items.length}</span> de <span className="text-foreground font-black">{totalCount}</span> artículos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-4 border-border/40 bg-background/40 hover:bg-orange-500/5 transition-all"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1 mx-4">
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
                          "w-10 h-10 rounded-xl font-black text-[10px]",
                          page === pageNum 
                            ? "shadow-lg shadow-orange-500/20 bg-orange-500 text-white border-none" 
                            : "hover:bg-orange-500/10 text-muted-foreground"
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
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-4 border-border/40 bg-background/40 hover:bg-orange-500/5 transition-all"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón flotante de eliminación masiva */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-background border border-amber-400 rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
          >
            Limpiar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleOpenReviewDialog}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      )}

      {/* Dialog de revisión de items seleccionados */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar artículos a eliminar</DialogTitle>
            <DialogDescription>
              Se eliminarán {selectedIds.size} artículo{selectedIds.size > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0">
                  <TableHead className="p-3">Nombre</TableHead>
                  <TableHead className="p-3">Categoría</TableHead>
                  <TableHead className="p-3">Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.filter((item: ArticuloCatering) => selectedIds.has(item.id)).map((item: ArticuloCatering) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-3 font-medium">{item.nombre}</TableCell>
                    <TableCell className="p-3">{item.categoria}</TableCell>
                    <TableCell className="p-3 font-mono text-xs">{(item as any).referenciaArticuloEntregas || '-'}</TableCell>
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

      {/* AlertDialog de importación */}
      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el delimitador que utiliza tu archivo CSV.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center gap-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>
              Comas (,)
            </Button>
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>
              Punto y Coma (;)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
