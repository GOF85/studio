'use client';

import { useState, useMemo, useEffect } from 'react';
import { Truck, Plus, Search, Trash2, Edit2, ArrowLeft, Loader2, PlusCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useTiposTransporte, useUpsertTipoTransporte, useDeleteTipoTransporte } from '@/hooks/use-data-queries';
import { formatCurrency } from '@/lib/utils';

export default function TiposTransportePage() {
  const { data: tipos, isLoading } = useTiposTransporte();
  const upsertMutation = useUpsertTipoTransporte();
  const deleteMutation = useDeleteTipoTransporte();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [precioBase, setPrecioBase] = useState(0);
  const [capacidad, setCapacidad] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredTipos = useMemo(() => {
    if (!tipos) return [];
    return tipos.filter(t => 
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.capacidad && t.capacidad.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tipos, searchTerm]);

  const handleOpenDialog = (tipo?: any) => {
    if (tipo) {
      setEditingTipo(tipo);
      setNombre(tipo.nombre);
      setPrecioBase(tipo.precio_base || 0);
      setCapacidad(tipo.capacidad || '');
    } else {
      setEditingTipo(null);
      setNombre('');
      setPrecioBase(0);
      setCapacidad('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nombre) return;
    
    await upsertMutation.mutateAsync({
      id: editingTipo?.id,
      nombre,
      precio_base: precioBase,
      capacidad
    });
    setIsDialogOpen(false);
  };

  if (!isMounted) return null;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-orange-500/10 text-orange-600 shadow-inner">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Catálogo de Transporte</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de los tipos de vehículos y sus precios base</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
              <Input
                placeholder="Buscar tipo de transporte..."
                className="pl-11 pr-4 h-12 w-64 rounded-2xl bg-background/40 border-border/40 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button 
              onClick={() => handleOpenDialog()}
              className="rounded-2xl font-black px-6 h-12 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nuevo Tipo
            </Button>
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-16">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">Nombre</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Capacidad</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Precio Base</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTipos.length > 0 ? (
              filteredTipos.map((tipo) => (
                <TableRow
                  key={tipo.id}
                  className="group transition-all duration-300 border-border/40 h-20 hover:bg-orange-500/[0.03]"
                >
                  <TableCell className="pl-8">
                    <span className="font-black text-sm tracking-tight group-hover:text-orange-600 transition-colors">{tipo.nombre}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-muted-foreground/60">{tipo.capacidad || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-black text-sm text-foreground">{formatCurrency(tipo.precio_base)}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-orange-500/10 hover:text-orange-600 transition-all"
                        onClick={() => handleOpenDialog(tipo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => deleteMutation.mutate(tipo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Truck className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron tipos</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">{editingTipo ? 'Editar' : 'Nuevo'} Tipo de Transporte</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground/70">Introduce los detalles del vehículo.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Nombre del Vehículo</label>
              <Input 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Furgoneta 3500kg"
                className="rounded-xl h-12 bg-background/40 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Capacidad / Descripción</label>
              <Input 
                value={capacidad} 
                onChange={(e) => setCapacidad(e.target.value)}
                placeholder="Ej: 12m3, 3 palets"
                className="rounded-xl h-12 bg-background/40 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Precio Base (€)</label>
              <Input 
                type="number" 
                step="0.01"
                value={precioBase} 
                onChange={(e) => setPrecioBase(parseFloat(e.target.value) || 0)}
                className="rounded-xl h-12 bg-background/40 border-border/40 font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              disabled={!nombre || upsertMutation.isPending}
              className="rounded-xl h-12 font-black bg-orange-600 hover:bg-orange-700 text-white px-8"
            >
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
