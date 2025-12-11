
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown } from 'lucide-react';
import { downloadCSVTemplate } from '@/lib/utils';

import { useDataStore } from '@/hooks/use-data-store';
import { supabase } from '@/lib/supabase';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", "es_habitual", "precio_venta", "precio_alquiler", "precio_reposicion", "unidad_venta", "stock_seguridad", "tipo", "loc", "imagen", "producido_por_partner", "partner_id", "receta_id", "subcategoria"];

function ArticulosPageContent() {
  const { data, loadAllData } = useDataStore();
  const items = data.articulos || [];
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [tipoArticuloFilter, setTipoArticuloFilter] = useState<'all' | 'micecatering' | 'entregas'>('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadAllData();
  }, [loadAllData]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.nombre || '').toLowerCase().includes(term) ||
        (item.id || '').toLowerCase().includes(term);
      const categoryMatch = categoryFilter === 'all' || item.categoria === categoryFilter;
      const partnerMatch = !isPartnerFilter || item.producidoPorPartner;
      const tipoArticuloMatch = tipoArticuloFilter === 'all' || item.tipoArticulo === tipoArticuloFilter;
      return searchMatch && categoryMatch && partnerMatch && tipoArticuloMatch;
    });
  }, [items, searchTerm, categoryFilter, isPartnerFilter, tipoArticuloFilter]);

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
    { key: 'tipoArticulo', label: 'Tipo' },
    { key: 'precioVenta', label: 'Precio Venta', format: (value) => (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) },
    { key: 'precioAlquiler', label: 'Precio Alquiler', format: (value) => (value as number) > 0 ? (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' },
  ];

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
          subcategoria: item.subcategoria || null
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
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const dataToExport = items.map((item: any) => ({
      id: item.id,
      erp_id: item.erpId,
      nombre: item.nombre,
      categoria: item.categoria,
      es_habitual: item.esHabitual,
      precio_venta: item.precioVenta,
      precio_alquiler: item.precioAlquiler,
      precio_reposicion: item.precioReposicion,
      unidad_venta: item.unidadVenta,
      stock_seguridad: item.stockSeguridad,
      tipo: item.tipo,
      loc: item.loc,
      imagen: item.imagen,
      producido_por_partner: item.producidoPorPartner,
      partner_id: item.partnerId,
      receta_id: item.recetaId,
      subcategoria: item.subcategoria,
    }));

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `articulos.csv`);
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
        <Select value={tipoArticuloFilter} onValueChange={setTipoArticuloFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Tipos</SelectItem>
            <SelectItem value="micecatering">Micecatering</SelectItem>
            <SelectItem value="entregas">Entregas</SelectItem>
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
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/bd/articulos/${item.id}`)}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }}
                className="flex-1 text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </>
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
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Precio Alquiler</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                console.log('DEBUG ARTICULO:', item);
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer ${item.tipo_articulo === 'entregas' ? 'bg-orange-50' : ''}`}
                    style={item.tipo_articulo === 'entregas' ? { backgroundColor: '#FFF7ED' } : {}}
                    onClick={() => router.push(`/bd/articulos/${item.id}`)}
                  >
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.tipo_articulo === 'entregas' ? 'Entregas' : item.tipo_articulo === 'micecatering' ? 'Micecatering' : ''}</TableCell>
                    <TableCell>{item.precioVenta?.toLocaleString ? item.precioVenta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : (parseFloat(item.precio_venta || '0')).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{item.precioAlquiler?.toLocaleString ? (item.precioAlquiler > 0 ? item.precioAlquiler.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-') : (parseFloat(item.precio_alquiler || '0') > 0 ? parseFloat(item.precio_alquiler || '0').toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/bd/articulos/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
