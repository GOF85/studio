'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Loader2, Search, Menu, FileDown, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import Papa from 'papaparse';
import { downloadCSVTemplate } from '@/lib/csv-utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useQuery } from '@tanstack/react-query';
import { getAtipicosCatalogoPaginated, type AtipicoCatalogo } from '@/services/atipicos-service';

const CSV_HEADERS = ["id", "nombre", "precio_referencia", "descripcion"];

interface AtipicosClientProps {
  initialData: {
    items: AtipicoCatalogo[];
    totalCount: number;
  };
}

export function AtipicosClient({ initialData }: AtipicosClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<AtipicoCatalogo> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AtipicoCatalogo | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['atipicos-catalogo', page, debouncedSearch],
    queryFn: () => getAtipicosCatalogoPaginated(supabase, {
      page,
      pageSize,
      searchTerm: debouncedSearch
    }),
    initialData: page === 0 && !debouncedSearch ? initialData : undefined
  });

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const upsertMutation = useMutation({
    mutationFn: async (item: Partial<AtipicoCatalogo>) => {
      const { error } = await supabase
        .from('atipicos_catalogo')
        .upsert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos-catalogo'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem?.id ? 'Atípico actualizado' : 'Atípico creado' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('atipicos_catalogo')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos-catalogo'] });
      setItemToDelete(null);
      toast({ title: 'Atípico eliminado' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('atipicos_catalogo')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos-catalogo'] });
      setSelectedIds([]);
      setIsBulkDeleteAlertOpen(false);
      toast({ title: 'Atípicos eliminados correctamente' });
    },
  });

  const handleToggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse({
      fields: CSV_HEADERS,
      data: items.map(i => [i.id, i.nombre, i.precio_referencia, i.descripcion])
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `atipicos_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mobileColumns = useMemo<MobileTableColumn<AtipicoCatalogo>[]>(() => [
    {
      key: 'nombre',
      label: 'Nombre',
      isTitle: true,
      format: (value) => (
        <div className="font-medium text-foreground">{value}</div>
      )
    },
    {
      key: 'precio_referencia',
      label: 'Precio Ref.',
      format: (value) => (
        <div className="text-primary font-semibold">{value}€</div>
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
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Catálogo de Atípicos</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona los servicios y productos atípicos del sistema
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
                  <DropdownMenuItem onClick={handleExportCSV} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_atipicos.csv')} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => {
                  setEditingItem({});
                  setIsDialogOpen(true);
                }}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Nuevo Atípico
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o descripción..."
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
                      checked={selectedIds.length === items.length && items.length > 0}
                      onCheckedChange={handleToggleSelectAll}
                      className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold text-right">Precio Ref.</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-primary/5 transition-colors border-b border-border/40 last:border-0">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                        className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{item.descripcion}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{item.precio_referencia}€</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemToDelete(item)}
                          className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-muted/10 border-t border-border/40">
              <p className="text-sm font-medium text-muted-foreground">
                Mostrando <span className="text-foreground font-bold">{items.length}</span> de <span className="text-foreground font-bold">{totalCount}</span> elementos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl font-bold"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1 mx-2">
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
                          "w-9 h-9 rounded-xl font-bold",
                          page === pageNum ? "shadow-lg shadow-primary/20" : ""
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
                  className="rounded-xl font-bold"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <MobileTableView
              data={items}
              columns={mobileColumns}
              renderActions={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(item);
                      setIsDialogOpen(true);
                    }}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemToDelete(item)}
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingItem?.id ? 'Editar Atípico' : 'Nuevo Atípico'}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del servicio o producto atípico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={editingItem?.nombre || ''}
                onChange={(e) => setEditingItem({ ...editingItem, nombre: e.target.value })}
                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precio">Precio de Referencia (€)</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                value={editingItem?.precio_referencia || ''}
                onChange={(e) => setEditingItem({ ...editingItem, precio_referencia: parseFloat(e.target.value) })}
                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={editingItem?.descripcion || ''}
                onChange={(e) => setEditingItem({ ...editingItem, descripcion: e.target.value })}
                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button 
              onClick={() => upsertMutation.mutate(editingItem!)}
              disabled={upsertMutation.isPending}
              className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem?.id ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el atípico "{itemToDelete?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
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
            <AlertDialogTitle>¿Eliminar {selectedIds.length} elementos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los atípicos seleccionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
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
