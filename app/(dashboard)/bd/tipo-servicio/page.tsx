'use client';

import { useState } from 'react';
import { Database, PlusCircle, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useTiposServicioBriefing, useUpsertTipoServicioBriefing, useDeleteTipoServicioBriefing } from '@/hooks/use-data-queries';

type TipoServicio = {
  id: string;
  nombre: string;
  descripcion?: string;
  created_at?: string;
};

export default function TipoServicioPage() {
  const { data: items = [], isLoading } = useTiposServicioBriefing();
  const upsertMutation = useUpsertTipoServicioBriefing();
  const deleteMutation = useDeleteTipoServicioBriefing();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TipoServicio | null>(null);
  const [formData, setFormData] = useState({ nombre: '' });

  function handleOpenDialog(item?: TipoServicio) {
    if (item) {
      setEditingItem(item);
      setFormData({ nombre: item.nombre });
    } else {
      setEditingItem(null);
      setFormData({ nombre: '' });
    }
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.nombre.trim()) return;

    try {
      await upsertMutation.mutateAsync({
        id: editingItem?.id,
        nombre: formData.nombre.trim(),
      });
      setIsDialogOpen(false);
      setFormData({ nombre: '' });
      setEditingItem(null);
    } catch (error) {
      // Error handled by mutation
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete);
      setItemToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Tipos de Servicio..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
              <Database className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Tipos de Servicio</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de categorías de servicio para el briefing</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Nuevo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tighter">{editingItem ? 'Editar' : 'Nuevo'} Tipo de Servicio</DialogTitle>
                  <DialogDescription className="font-medium">
                    {editingItem ? 'Modifica' : 'Crea'} un tipo de servicio para el briefing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label htmlFor="nombre" className="font-bold ml-1">Nombre *</label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Desayuno, Comida, Cena..."
                      className="rounded-xl h-12 bg-background/40 border-border/40"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold">
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={upsertMutation.isPending} className="rounded-xl h-12 font-black bg-primary hover:bg-primary/90 text-white px-8">
                    {upsertMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-16">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">Nombre</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="group transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]"
                >
                  <TableCell className="pl-8">
                    <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{item.nombre}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => handleOpenDialog(item)}
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
                <TableCell colSpan={2} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Database className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron tipos de servicio</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente el tipo de servicio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Eliminar Tipo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
