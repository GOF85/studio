'use client';

import { useState, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Search, Check, X, Menu, FileUp, FileDown, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import Papa from 'papaparse';
import { downloadCSVTemplate } from '@/lib/utils';

type DecoracionCatalogo = {
  id: string;
  nombre: string;
  precio_referencia: number;
  descripcion: string | null;
};

const CSV_HEADERS = ["id", "nombre", "precio_referencia", "descripcion"];

function DecoracionPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<DecoracionCatalogo> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DecoracionCatalogo | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['decoracion-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decoracion_catalogo')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return data as DecoracionCatalogo[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (item: Partial<DecoracionCatalogo>) => {
      const { error } = await supabase
        .from('decoracion_catalogo')
        .upsert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoracion-catalogo'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem?.id ? 'Decoración actualizada' : 'Decoración creada' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('decoracion_catalogo')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoracion-catalogo'] });
      setItemToDelete(null);
      toast({ title: 'Decoración eliminada' });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('decoracion_catalogo')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoracion-catalogo'] });
      setSelectedIds([]);
      setIsBulkDeleteAlertOpen(false);
      toast({ title: 'Decoraciones eliminadas correctamente' });
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
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
    link.setAttribute('download', `decoracion_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mobileColumns: MobileTableColumn<DecoracionCatalogo>[] = [
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
  ];

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Premium Sticky */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Flower2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Catálogo de Decoración</h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona los elementos de decoración del sistema
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
                  <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_decoracion.csv')} className="rounded-lg">
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
                Nueva Decoración
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
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
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
                {filteredItems.map((item) => (
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

          <div className="md:hidden">
            <MobileTableView
              data={filteredItems}
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
              {editingItem?.id ? 'Editar Decoración' : 'Nueva Decoración'}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del elemento de decoración.
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
              Esta acción no se puede deshacer. Se eliminará el elemento "{itemToDelete?.nombre}".
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
              Esta acción eliminará permanentemente los elementos seleccionados.
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

export default function DecoracionPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DecoracionPageContent />
    </Suspense>
  );
}
