'use client';

import { useState, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, BookHeart, Check, X, Database, ChevronRight, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { downloadCSVTemplate, cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { useCategoriasRecetas, useUpsertCategoriaReceta, useDeleteCategoriaReceta } from '@/hooks/use-data-queries';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "nombre", "snack"];

function CategoriasRecetasPageContent() {
  const { data, isLoading } = useCategoriasRecetas();
  const items = data || [];
  const upsertMutation = useUpsertCategoriaReceta();
  const deleteMutation = useDeleteCategoriaReceta();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id?: string; nombre: string; snack: boolean } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const { toast } = useToast();

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('categorias_recetas')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-recetas'] });
      setSelectedIds([]);
      setIsBulkDeleteAlertOpen(false);
      toast({ title: 'Categorías eliminadas correctamente' });
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
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
      data: items.map(i => [i.id, i.nombre, i.snack])
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `categorias_recetas_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!editingItem?.nombre) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre es obligatorio' });
      return;
    }

    try {
      await upsertMutation.mutateAsync(editingItem);
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem.id ? 'Categoría actualizada' : 'Categoría creada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la categoría' });
    }
  };

  const mobileColumns: MobileTableColumn<any>[] = [
    {
      key: 'nombre',
      label: 'Nombre',
      isTitle: true,
      format: (val) => <span className="font-black uppercase tracking-tight text-primary">{val}</span>
    },
    {
      key: 'tipo',
      label: 'Tipo',
      format: (_, item) => (
        <div className="mt-1">
          {item.snack ? (
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase tracking-widest">
              Snack
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold border border-border/40 uppercase tracking-widest">
              Estándar
            </span>
          )}
        </div>
      )
    }
  ];

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      {/* Standard Header Pattern */}
      <div className="sticky top-[calc(3rem+57px)] z-20 -mx-6 px-6 mb-6 bg-background/60 backdrop-blur-md border-b border-border/40 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="hidden md:flex p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
              <BookHeart className="h-5 w-5" />
            </div>
            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar categorías..."
                className="pl-9 h-10 bg-background/50 border-border/40 rounded-full focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setIsBulkDeleteAlertOpen(true)}
                className="rounded-xl font-bold h-10 px-4 animate-in zoom-in duration-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedIds.length})
              </Button>
            )}
            
            <Button 
              onClick={() => {
                setEditingItem({ nombre: '', snack: false });
                setIsDialogOpen(true);
              }}
              className="rounded-xl font-bold h-10 px-4 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/40 bg-background/40 hover:bg-primary/5 transition-all">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_categorias_recetas.csv')} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Descargar Plantilla
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40 h-16">
                  <TableHead className="w-12 pl-6">
                    <Checkbox 
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={handleToggleSelectAll}
                      className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Nombre</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">¿Es Snack?</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className={cn(
                      "group transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]",
                      selectedIds.includes(item.id) && "bg-primary/[0.05]"
                    )}
                  >
                    <TableCell className="pl-6">
                      <Checkbox 
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                        className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors uppercase">{item.nombre}</span>
                    </TableCell>
                    <TableCell>
                      {item.snack ? (
                        <div className="flex items-center text-primary font-bold text-xs uppercase tracking-widest">
                          <Check className="h-4 w-4 mr-1" />
                          Sí
                        </div>
                      ) : (
                        <div className="flex items-center text-muted-foreground/40 font-bold text-xs uppercase tracking-widest">
                          <X className="h-4 w-4 mr-1" />
                          No
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemToDelete(item.id)}
                          className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
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
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(item);
                      setIsDialogOpen(true);
                    }}
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemToDelete(item.id)}
                    className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">
              {editingItem?.id ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Introduce el nombre de la categoría y si se considera un snack.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                Nombre
              </Label>
              <Input
                id="nombre"
                value={editingItem?.nombre || ''}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary h-12 font-bold text-lg"
                placeholder="Ej. Entrantes Fríos"
              />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-border/40 group transition-colors hover:bg-primary/5">
              <Checkbox 
                id="snack"
                checked={editingItem?.snack || false}
                onCheckedChange={(checked) => setEditingItem(prev => prev ? { ...prev, snack: !!checked } : null)}
                className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="snack" className="font-bold text-sm cursor-pointer select-none">¿Es Snack?</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="rounded-xl font-black h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem?.id ? 'Actualizar Categoría' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría seleccionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete)}
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Eliminar {selectedIds.length} elementos?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción eliminará permanentemente las categorías seleccionadas. Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
            >
              Eliminar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CategoriasRecetasPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CategoriasRecetasPageContent />
    </Suspense>
  );
}
