'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Pencil, Trash2, MapPin, Menu, FileUp, FileDown, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteEspacio, deleteEspaciosBulk, getEspaciosPaginated } from '@/services/espacios-service';
import type { EspacioV2 } from '@/types/espacios';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportEspaciosToCSV, downloadCSVTemplate } from '@/lib/csv-utils';
import { CSVImporter } from './csv/CSVImporter';
import { calculateEspacioCompleteness, getCompletenessBadgeColor } from '@/lib/espacios-utils';
import { cn } from '@/lib/utils';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useDebounce } from '@/hooks/use-debounce';

interface EspaciosClientProps {
  initialData: {
    items: EspacioV2[];
    totalCount: number;
    totalPages: number;
  };
}

export function EspaciosClient({ initialData }: EspaciosClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data, isLoading } = useQuery({
    queryKey: ['espacios-paginated', page, debouncedSearch],
    queryFn: () => getEspaciosPaginated(supabase, {
      page,
      pageSize,
      searchTerm: debouncedSearch
    }),
    initialData: page === 1 && !debouncedSearch ? initialData : undefined
  });

  const filteredEspacios = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalCount = data?.totalCount || 0;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredEspacios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEspacios.map(e => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEspacio(id);
      toast({ title: 'Espacio eliminado' });
      queryClient.invalidateQueries({ queryKey: ['espacios-paginated'] });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el espacio',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteEspaciosBulk(selectedIds);
      toast({ title: `${selectedIds.length} espacios eliminados` });
      setSelectedIds([]);
      setIsBulkDeleteAlertOpen(false);
      queryClient.invalidateQueries({ queryKey: ['espacios-paginated'] });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron eliminar los espacios',
      });
    }
  };

  const mobileColumns = useMemo<MobileTableColumn<EspacioV2>[]>(() => [
    {
      key: 'nombre',
      label: 'Nombre',
      isTitle: true,
      format: (value) => (
        <div className="font-medium text-foreground">{value}</div>
      )
    },
    {
      key: 'calle',
      label: 'Dirección',
      format: (value, item) => (
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
          {value || item.ciudad || 'Sin dirección'}
        </div>
      )
    }
  ], []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Premium Sticky */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Espacios</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona los recintos y espacios para eventos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/5">
                    <Menu className="h-4 w-4 mr-2" />
                    Acciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-border/40 shadow-xl">
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="rounded-lg">
                    <FileUp className="h-4 w-4 mr-2" />
                    Importar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportEspaciosToCSV(filteredEspacios as any)} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadCSVTemplate(['nombre', 'direccion', 'ciudad', 'provincia', 'pais', 'codigo_postal', 'telefono', 'email', 'web', 'notas'], 'plantilla_espacios.csv')} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => router.push('/bd/espacios/nuevo')}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Nuevo Espacio
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full bg-muted/50 border-none focus-visible:ring-primary w-full"
              />
            </div>
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setIsBulkDeleteAlertOpen(true)}
                className="rounded-full shadow-lg animate-in fade-in slide-in-from-right-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-[2rem] border border-border/40 bg-card/50 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length === filteredEspacios.length && filteredEspacios.length > 0}
                      onCheckedChange={handleToggleSelectAll}
                      className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Dirección</TableHead>
                  <TableHead className="font-semibold">Completitud</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEspacios.map((espacio) => {
                  const completeness = calculateEspacioCompleteness(espacio as any);
                  return (
                    <TableRow key={espacio.id} className="hover:bg-primary/5 transition-colors border-b border-border/40 last:border-0">
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(espacio.id)}
                          onCheckedChange={() => handleToggleSelect(espacio.id)}
                          className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{espacio.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{espacio.calle || espacio.ciudad || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-full", getCompletenessBadgeColor(completeness))}>
                          {completeness}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/bd/espacios/${espacio.id}`)}
                            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(espacio.id)}
                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 border-t border-border/20 bg-muted/10">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                  Mostrando <span className="text-foreground">{filteredEspacios.length}</span> de <span className="text-foreground">{totalCount}</span> espacios
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all gap-2 font-bold text-xs uppercase tracking-wider"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          "h-9 w-9 rounded-xl font-bold text-xs transition-all",
                          page === pageNum 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                            : "border-border/40 hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all gap-2 font-bold text-xs uppercase tracking-wider"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <MobileTableView
              data={filteredEspacios}
              columns={mobileColumns}
              renderActions={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/bd/espacios/${item.id}`)}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(item.id)}
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl max-w-4xl">
          <DialogHeader>
            <DialogTitle>Importar Espacios</DialogTitle>
          </DialogHeader>
          <CSVImporter onImportComplete={() => {
            setShowImportDialog(false);
            queryClient.invalidateQueries({ queryKey: ['espacios-paginated'] });
          }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el espacio seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.length} espacios?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los espacios seleccionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              Eliminar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
