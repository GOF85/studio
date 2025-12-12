
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown } from 'lucide-react';
import { downloadCSVTemplate } from '@/lib/utils';

import { useDataStore } from '@/hooks/use-data-store';
import { supabase } from '@/lib/supabase';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { TableLoadingSplash } from '@/components/layout/table-loading-splash';

const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", "es_habitual", "precio_venta", "precio_alquiler", "precio_reposicion", "unidad_venta", "stock_seguridad", "tipo", "loc", "imagen", "producido_por_partner", "partner_id", "receta_id", "subcategoria", "iva", "doc_drive_url"];

function ArticulosPageContent() {
  const { data, loadAllData } = useDataStore();
  const items = data.articulos || [];
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    (async () => {
      await loadAllData();
      setIsLoading(false);
    })();
  }, [loadAllData]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.nombre || '').toLowerCase().includes(term) ||
        (item.id || '').toLowerCase().includes(term);
      const categoryMatch = categoryFilter === 'all' || item.categoria === categoryFilter;
      const partnerMatch = !isPartnerFilter || item.producidoPorPartner;
      const tipoMatch = item.tipoArticulo === 'micecatering';
      return searchMatch && categoryMatch && partnerMatch && tipoMatch;
    });
  }, [items, searchTerm, categoryFilter, isPartnerFilter]);

  // Para infinite scroll en móvil: mostrar todos los items filtrados
  const mobileItems = useMemo(() => {
    return filteredItems;
  }, [filteredItems]);

  // Hook para infinite scroll (sin paginación tradicional, mostrar todos)
  const sentinelRef = useInfiniteScroll({
    fetchNextPage: () => {
      // TODO: Conectar lógica de carga infinita aquí si se implementa paginación
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    enabled: false, // Deshabilitado ya que no hay paginación
  });

  // Definir columnas para la vista móvil
  const mobileColumns: MobileTableColumn<ArticuloCatering>[] = [
    { key: 'nombre', label: 'Nombre', isTitle: true },
    { key: 'categoria', label: 'Categoría' },
    { key: 'precioVenta', label: 'Precio Venta', format: (value) => (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) },
    { key: 'precioAlquiler', label: 'Precio Alquiler', format: (value) => (value as number) > 0 ? (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' },
    { key: 'precioReposicion', label: 'Precio Reposición', format: (value) => (value as number) > 0 ? (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' },
  ];

  // Handlers de selección
  const handleToggleAll = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    if (checked) {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
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
      .select('articulo_id')
      .in('articulo_id', idsToDelete);

    if (checkError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo validar dependencias.' });
      return;
    }

    if (dependencies && dependencies.length > 0) {
      const articlesWithDeps = new Set(dependencies.map(d => d.articulo_id));
      toast({ 
        variant: 'destructive', 
        title: 'Artículos con dependencias', 
        description: `${articlesWithDeps.size} artículo(s) están referenciados en recetas y no pueden eliminarse.`,
        duration: 8000
      });
      return;
    }

    const { error } = await supabase
      .from('articulos')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la eliminación.' });
      return;
    }

    await loadAllData();
    toast({ title: `${idsToDelete.length} artículo(s) eliminado(s)` });
    setSelectedIds(new Set());
    setIsReviewDialogOpen(false);
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from('articulos')
      .delete()
      .eq('id', itemToDelete);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
      return;
    }

    await loadAllData();
    toast({ title: 'Artículo eliminado' });
    setItemToDelete(null);
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

        const importedData = results.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          erp_id: item.erp_id || null,
          nombre: item.nombre,
          categoria: item.categoria,
          es_habitual: item.es_habitual === 'true' || item.es_habitual === true,
          precio_venta: parseFloat(item.precio_venta) || 0,
          precio_alquiler: parseFloat(item.precio_alquiler) || 0,
          precio_reposicion: parseFloat(item.precio_reposicion) || 0,
          unidad_venta: parseFloat(item.unidad_venta) || null,
          stock_seguridad: parseFloat(item.stock_seguridad) || null,
          tipo: item.tipo || null,
          loc: item.loc || null,
          imagen: item.imagen || null,
          producido_por_partner: item.producido_por_partner === 'true' || item.producido_por_partner === true,
          partner_id: item.partner_id || null,
          receta_id: item.receta_id || null,
          subcategoria: item.subcategoria || null,
          iva: parseFloat(item.iva) || 10,
          doc_drive_url: item.doc_drive_url || null,
          tipo_articulo: 'micecatering'
        }));

        const { error } = await supabase
          .from('articulos')
          .upsert(importedData, { onConflict: 'id' });

        if (error) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
          setIsImportAlertOpen(false);
          return;
        }

        await loadAllData();
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
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
    const micecateringItems = filteredItems.filter(item => item.tipoArticulo === 'micecatering');
    if (micecateringItems.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const dataToExport = micecateringItems.map((item: any) => ({
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
      imagen: item.imagen,
      producido_por_partner: item.producidoPorPartner ? 'true' : 'false',
      partner_id: item.partnerId,
      receta_id: item.recetaId,
      subcategoria: item.subcategoria,
      iva: item.iva,
      doc_drive_url: item.docDriveUrl,
    }));

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `articulos-micecatering.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos..." />;
  }

  return (
    <>
      <TableLoadingSplash isLoading={isLoading} type="articulos" />
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar por nombre o ID..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Categorías</SelectItem>
            {ARTICULO_CATERING_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox id="partner-filter" checked={isPartnerFilter} onCheckedChange={(checked) => setIsPartnerFilter(Boolean(checked))} />
          <label htmlFor="partner-filter" className="text-sm font-medium">Producido por Partner</label>
        </div>
        <div className="flex-grow flex justify-end gap-2">
          <Button onClick={() => router.push('/bd/articulos/nuevo')}>
            <PlusCircle className="mr-2" />
            Nuevo
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><Menu /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                <FileUp size={16} className="mr-2" />Importar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_articulos.csv')}>
                <FileDown size={16} className="mr-2" />Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown size={16} className="mr-2" />Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Vista Móvil: Tarjetas Apiladas */}
      <div className="md:hidden space-y-4">
        <MobileTableView
          data={mobileItems}
          columns={mobileColumns}
          renderActions={(item) => (
            <div className="flex gap-2 items-center">
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={(e) => handleToggleItem(item.id, e as any)}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/bd/articulos/${item.id}`)}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          )}
          sentinelRef={sentinelRef}
          isLoading={false}
          emptyMessage="No se encontraron artículos."
        />
      </div>

      {/* Vista Escritorio: Tabla Tradicional */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === filteredItems.length && filteredItems.length > 0 ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                  onCheckedChange={handleToggleAll}
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Precio Alquiler</TableHead>
              <TableHead>Precio Reposición</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer ${
                      isSelected 
                        ? 'bg-muted border-l-4 border-l-primary' 
                        : item.tipoArticulo === 'entregas' 
                        ? 'bg-orange-50' 
                        : ''
                    }`}
                    onClick={() => router.push(`/bd/articulos/${item.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleItem(item.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.precioVenta?.toLocaleString ? item.precioVenta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : (parseFloat(String(item.precioVenta || 0))).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{item.precioAlquiler?.toLocaleString ? (item.precioAlquiler > 0 ? item.precioAlquiler.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-') : (parseFloat(String(item.precioAlquiler || 0)) > 0 ? parseFloat(String(item.precioAlquiler || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-')}</TableCell>
                    <TableCell>{item.precioReposicion?.toLocaleString ? (item.precioReposicion > 0 ? item.precioReposicion.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-') : (parseFloat(String(item.precioReposicion || 0)) > 0 ? parseFloat(String(item.precioReposicion || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-')}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron artículos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Botón flotante de eliminación masiva */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-background border rounded-lg shadow-lg p-4">
          <span className="text-sm font-medium">
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
                {filteredItems.filter(item => selectedIds.has(item.id)).map(item => (
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
    </>
  );
}

export default function ArticulosPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Artículos..." />}>
      <ArticulosPageContent />
    </Suspense>
  )
}
