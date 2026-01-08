'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, FileUp, FileDown, UserPlus, Search, Trash, Check, X, ChevronLeft, ChevronRight, Users, Plus, Star, History, Info } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';
import { usePersonalExternoPaginated, useDeletePersonalExternoDB, useProveedores, useUpsertPersonalExternoDB, useDeletePersonalExternoBulk, useExternalWorkerStats } from '@/hooks/use-data-queries';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/ui/rating-stars';
import { WorkerHistoryPopover } from '@/components/portal/worker-history-popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonalExternoItem } from '@/services/personal-externo-service';

const CSV_HEADERS = ["id", "proveedorId", "nombre", "apellido1", "apellido2", "categoria", "nombreCompleto", "nombreCompacto", "telefono", "email", "activo"];

interface PersonalExternoClientProps {
  initialData: {
    items: PersonalExternoItem[];
    totalCount: number;
  };
}

export function PersonalExternoClient({ initialData }: PersonalExternoClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading: isLoadingItems } = usePersonalExternoPaginated({
    page,
    pageSize,
    searchTerm: debouncedSearch,
    providerFilter,
    isActive: isActiveFilter,
    initialData
  });

  // Use initialData for the first render if data is not yet available
  const currentData = data || initialData;
  const items = currentData.items || [];
  const totalCount = currentData.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: proveedores = [], isLoading: isLoadingProveedores } = useProveedores();
  const workerStatsMap = useExternalWorkerStats();
  const deleteMutation = useDeletePersonalExternoDB();
  const bulkDeleteMutation = useDeletePersonalExternoBulk();
  const upsertMutation = useUpsertPersonalExternoDB();

  const proveedoresMap = useMemo(() => new Map(proveedores.map(p => [p.id, p.nombreComercial])), [proveedores]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete);
      setItemToDelete(null);
      toast({ title: 'Trabajador eliminado' });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsBulkDeleteConfirmOpen(false);
      toast({ title: 'Trabajadores eliminados' });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleAll = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    if (checked) {
      setSelectedIds(new Set(items.map((i: any) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    const REQUIRED_FIELDS = ["id", "nombre", "apellido1", "proveedorId"];

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        if (!results.meta.fields || !REQUIRED_FIELDS.every(field => results.meta.fields?.includes(field))) {
          toast({ 
            variant: 'destructive', 
            title: 'Error de formato', 
            description: `El CSV debe contener al menos las columnas: ${REQUIRED_FIELDS.join(', ')}.` 
          });
          return;
        }

        const importedData = results.data.map((item: any) => {
          // Generate names if not provided but parts are
          const nombreCompleto = item.nombreCompleto || `${item.nombre} ${item.apellido1} ${item.apellido2 || ''}`.trim();
          const nombreCompacto = item.nombreCompacto || `${item.nombre} ${item.apellido1}`;
          
          return {
            ...item,
            nombreCompleto,
            nombreCompacto,
            activo: item.activo === 'false' || item.activo === '0' ? false : true // Default to true unless explicitly false
          };
        });

        try {
          // Process in small batches or one by one for better error handling
          let successCount = 0;
          for (const item of importedData) {
            try {
              await upsertMutation.mutateAsync(item);
              successCount++;
            } catch (err) {
              console.error('Error importing item:', item.id, err);
            }
          }
          toast({ 
            title: 'Importación completada', 
            description: `Se han procesado ${successCount} de ${importedData.length} registros.` 
          });
        } catch (error) {
          toast({ 
            variant: 'destructive', 
            title: 'Error en importación', 
            description: 'Hubo un problema procesando el archivo.' 
          });
        }
        
        setIsImportAlertOpen(false);
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if (event.target) event.target.value = '';
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const csv = Papa.unparse(items, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personal_externo.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header Premium */}
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Personal Externo</h1>
              <p className="text-[10px] font-bold text-muted-foreground/60 tracking-[0.2em] uppercase">Gestión de trabajadores y colaboradores</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                className="h-11 px-6 rounded-xl font-black uppercase tracking-tighter flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar ({selectedIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl font-bold flex items-center gap-2 border-border/40 hover:bg-accent transition-all"
              onClick={() => setIsImportAlertOpen(true)}
            >
              <FileUp className="h-4 w-4" />
              Importar
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl font-bold flex items-center gap-2 border-border/40 hover:bg-accent transition-all"
              onClick={handleExportCSV}
            >
              <FileDown className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              className="h-11 px-6 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => router.push('/bd/personal-externo-db/nuevo')}
            >
              <Plus className="h-4 w-4" />
              Nuevo Trabajador
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card/50 backdrop-blur-sm p-6 rounded-[2rem] border border-border/40 shadow-sm items-center">
            <div className="relative group md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                className="pl-11 h-12 rounded-2xl border-border/40 bg-background/50 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-12 rounded-2xl border-border/40 bg-background/50">
                <SelectValue placeholder="Filtrar por proveedor" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/40">
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between px-4 h-12 rounded-2xl border border-border/40 bg-background/50">
                <span className="text-sm font-bold text-muted-foreground">Solo activos</span>
                <Switch 
                    checked={isActiveFilter} 
                    onCheckedChange={(val) => {
                        setIsActiveFilter(val);
                        setPage(0);
                    }} 
                />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-card rounded-[2rem] border border-border/40 shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40 h-16 bg-muted/30">
                  <TableHead className="w-[50px] pl-8">
                    <Checkbox 
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onCheckedChange={handleToggleAll}
                      className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">DNI / ID</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Trabajador</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Proveedor</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70 text-center">Calific.</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Categoría</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Estado</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Teléfono</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Email</TableHead>
                  <TableHead className="text-right pr-8 font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item: any) => (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "group h-20 border-b border-border/20 transition-colors",
                        selectedIds.has(item.id) ? "bg-primary/5" : "hover:bg-primary/[0.02]"
                      )}
                    >
                      <TableCell className="pl-8">
                        <Checkbox 
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                          className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] font-bold bg-primary/5 text-primary px-2 py-1 rounded-lg border border-primary/10">
                          {item.id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-sm tracking-tight uppercase">{item.nombreCompleto}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg font-bold border-primary/20 bg-primary/5 text-primary uppercase text-[10px] px-2 py-0.5">
                          {proveedoresMap.get(item.proveedorId) || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {workerStatsMap[item.id] ? (
                          <div className="flex flex-col items-center gap-1">
                            <RatingStars value={workerStatsMap[item.id].averageRating} readonly size="sm" />
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">
                                 {workerStatsMap[item.id].totalServices} Serv.
                               </span>
                               <WorkerHistoryPopover stats={workerStatsMap[item.id]} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
                             <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Nuevo</span>
                             <div className="flex gap-0.5">
                               {[1,2,3,4,5].map(i => <Star key={i} className="h-2 w-2 text-muted-foreground" />)}
                             </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-xs uppercase text-muted-foreground/80">{item.categoria || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.activo ? "default" : "secondary"} 
                          className={cn(
                            "rounded-lg font-black uppercase text-[10px] px-2 py-0.5",
                            item.activo ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-xs text-muted-foreground/60">{item.telefono || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-xs text-muted-foreground/60">{item.email || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => router.push(`/bd/personal-externo-db/${item.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setItemToDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                        <UserPlus className="h-16 w-16 mb-4 opacity-10" />
                        <p className="text-lg font-black uppercase tracking-widest">No se encontraron trabajadores</p>
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
                  Mostrando <span className="text-foreground font-black">{items.length}</span> de <span className="text-foreground font-black">{totalCount}</span> trabajadores
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-4 border-border/40 bg-background/40 hover:bg-primary/5 transition-all"
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
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-4 border-border/40 bg-background/40 hover:bg-primary/5 transition-all"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del trabajador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleDelete}
            >
              Eliminar Trabajador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              ¿Eliminar {selectedIds.size} registros?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Estás a punto de eliminar {selectedIds.size} trabajadores de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}
            >
              Comas ( , )
            </Button>
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}
            >
              Punto y Coma ( ; )
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
