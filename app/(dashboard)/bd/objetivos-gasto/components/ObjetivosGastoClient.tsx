'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useObjetivosGastoPlantillas, useSaveObjetivoGastoPlantilla, useDeleteObjetivosGastoPlantillasBulk } from '@/hooks/use-objetivos-gasto';
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
import { PlusCircle, Pencil, Trash2, Search, Target, Menu, FileUp, FileDown, Check, X, Settings2 } from 'lucide-react';
import type { ObjetivosGasto } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { GASTO_LABELS } from '@/lib/constants';

interface ObjetivosGastoClientProps {
  initialData: ObjetivosGasto[];
}

export function ObjetivosGastoClient({ initialData }: ObjetivosGastoClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ObjetivosGasto> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ObjetivosGasto | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const { toast } = useToast();

  const totalPercentage = useMemo(() => {
    if (!editingItem) return 0;
    return (Object.keys(GASTO_LABELS) as (keyof typeof GASTO_LABELS)[]).reduce((sum, key) => {
      const val = editingItem[key as keyof ObjetivosGasto];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  }, [editingItem]);

  const queryClient = useQueryClient();

  const { data: items = initialData } = useObjetivosGastoPlantillas();
  const saveMutation = useSaveObjetivoGastoPlantilla();
  const bulkDeleteMutation = useDeleteObjetivosGastoPlantillasBulk();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('objetivos_gasto')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-gasto-plantillas'] });
      setItemToDelete(null);
      toast({ title: 'Objetivo eliminado' });
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

  const handleSave = async () => {
    if (!editingItem?.nombre) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre es obligatorio' });
      return;
    }

    try {
      const dataToSave = { ...editingItem };
      if (!dataToSave.id) delete dataToSave.id;
      
      // Sincronizar nombre con name para la DB (name es obligatorio y único)
      (dataToSave as any).name = dataToSave.nombre;
      
      // Asegurar que todos los campos numéricos tengan un valor (evitar NULL en campos NOT NULL)
      const numericFields = [
        'gastronomia', 'bodega', 'consumibles', 'almacen', 
        'alquiler', 'transporte', 'decoracion', 'atipicos', 
        'personal_mice', 'personal_externo', 'coste_prueba_menu',
        'personal_solicitado_cpr'
      ];
      
      numericFields.forEach(field => {
        if ((dataToSave as any)[field] === undefined || (dataToSave as any)[field] === null) {
          (dataToSave as any)[field] = 0;
        }
      });

      // Sincronizar campos duplicados detectados en el esquema de la DB
      (dataToSave as any).personalmice = (dataToSave as any).personal_mice;
      (dataToSave as any).personalexterno = (dataToSave as any).personal_externo;
      (dataToSave as any).costepruebamenu = (dataToSave as any).coste_prueba_menu;
      
      await saveMutation.mutateAsync(dataToSave as ObjetivosGasto);
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem.id ? 'Objetivo actualizado' : 'Objetivo creado' });
    } catch (error: any) {
      console.error('Error saving objetivo:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'No se pudo guardar el objetivo' 
      });
    }
  };

  const mobileColumns: MobileTableColumn<ObjetivosGasto>[] = [
    {
      key: 'nombre',
      label: 'Nombre',
      isTitle: true,
      format: (val) => <span className="font-black uppercase tracking-tight text-primary">{val}</span>
    },
    {
      key: 'objetivos',
      label: 'Objetivos Principales',
      format: (_, item) => (
        <div className="flex flex-wrap gap-2 mt-1">
          <div className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
            Gastro: {item.gastronomia}%
          </div>
          <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
            Bodega: {item.bodega}%
          </div>
          <div className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
            Consumibles: {item.consumibles}%
          </div>
          <div className="px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground text-[10px] font-bold border border-border/40">
            Pers. Ext: {item.personal_externo}%
          </div>
          <div className="px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground text-[10px] font-bold border border-border/40">
            Prueba Menú: {item.coste_prueba_menu}%
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      {/* Standard Header Pattern */}
      <div className="sticky top-[calc(3rem+57px)] z-20 -mx-6 px-6 mb-6 bg-background/60 backdrop-blur-md border-b border-border/40 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="hidden md:flex p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
              <Target className="h-5 w-5" />
            </div>
            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar plantillas..."
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
                setEditingItem({
                  nombre: '',
                  gastronomia: 0,
                  bodega: 0,
                  consumibles: 0,
                  almacen: 0,
                  alquiler: 0,
                  transporte: 0,
                  decoracion: 0,
                  atipicos: 0,
                  personal_mice: 0,
                  personal_externo: 0,
                  coste_prueba_menu: 0,
                });
                setIsDialogOpen(true);
              }}
              className="rounded-xl font-bold h-10 px-4 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
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
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Gastro (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Bodega (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Consum. (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Almacén (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Alquiler (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Transp. (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Deco (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Atípicos (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Pers. MICE (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Pers. Ext (%)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Prueba Menú (%)</TableHead>
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
                    <TableCell className="text-right font-mono font-bold text-orange-600">{item.gastronomia}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-blue-600">{item.bodega}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">{item.consumibles}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.almacen}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.alquiler}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.transporte}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.decoracion}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.atipicos}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.personal_mice}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.personal_externo}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-muted-foreground">{item.coste_prueba_menu}%</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setItemToDelete(item)}
                          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
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
              onEdit={(item) => {
                setEditingItem(item);
                setIsDialogOpen(true);
              }}
              onDelete={(item) => setItemToDelete(item)}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-primary" />
              {editingItem?.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Define los porcentajes objetivo para cada categoría de gasto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Nombre de la Plantilla</Label>
              <Input
                id="nombre"
                value={editingItem?.nombre || ''}
                onChange={(e) => setEditingItem({ ...editingItem, nombre: e.target.value })}
                className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary font-bold uppercase"
                placeholder="EJ: EVENTO ESTÁNDAR"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(Object.keys(GASTO_LABELS) as (keyof typeof GASTO_LABELS)[]).map((key) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={key} className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1 truncate">
                    {GASTO_LABELS[key]} (%)
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    value={editingItem?.[key as keyof ObjetivosGasto] ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, [key]: parseFloat(e.target.value) || 0 })}
                    className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary font-mono font-bold"
                  />
                </div>
              ))}
            </div>

            <div className={cn(
              "p-4 rounded-2xl flex items-center justify-between border transition-all",
              totalPercentage === 100 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-amber-500/10 border-amber-500/20 text-amber-600"
            )}>
              <div className="flex items-center gap-2">
                {totalPercentage === 100 ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                <span className="font-black uppercase tracking-tighter">Total Porcentajes</span>
              </div>
              <span className="text-2xl font-black">{totalPercentage}%</span>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="rounded-xl font-black h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción eliminará permanentemente la plantilla <span className="font-black text-foreground">"{itemToDelete?.nombre}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
            >
              Eliminar Plantilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Eliminar seleccionados?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Estás a punto de eliminar <span className="font-black text-foreground">{selectedIds.length} plantillas</span>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await bulkDeleteMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteAlertOpen(false);
                toast({ title: 'Plantillas eliminadas' });
              }}
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
            >
              Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
