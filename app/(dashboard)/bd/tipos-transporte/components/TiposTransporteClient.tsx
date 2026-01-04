'use client';

import { useState, useMemo } from 'react';
import { Truck, Search, Trash2, PlusCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTiposTransporte, useUpsertTipoTransporte, useDeleteTipoTransporte, useProveedoresTransporte } from '@/hooks/use-data-queries';
import { formatCurrency } from '@/lib/utils';
import { TipoTransporte } from '@/services/tipos-transporte-service';

interface TiposTransporteClientProps {
  initialData: TipoTransporte[];
}

export function TiposTransporteClient({ initialData }: TiposTransporteClientProps) {
  const { data: tipos = initialData } = useTiposTransporte();
  const { data: proveedoresTransporte } = useProveedoresTransporte();
  const upsertMutation = useUpsertTipoTransporte();
  const deleteMutation = useDeleteTipoTransporte();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any | null>(null);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [precioBase, setPrecioBase] = useState(0);
  const [descripcion, setDescripcion] = useState('');
  const [proveedorId, setProveedorId] = useState<string | null>(null);

  const filteredTipos = useMemo(() => {
    return tipos.filter(t => 
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((t.proveedor?.nombreProveedor || t.proveedor?.nombre) && (t.proveedor?.nombreProveedor || t.proveedor?.nombre).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tipos, searchTerm]);

  const handleOpenDialog = (tipo?: any) => {
    if (tipo) {
      setEditingTipo(tipo);
      setNombre(tipo.nombre);
      setPrecioBase(tipo.precio_base || 0);
      setDescripcion(tipo.descripcion || '');
      setProveedorId(tipo.proveedor_id || null);
    } else {
      setEditingTipo(null);
      setNombre('');
      setPrecioBase(0);
      setDescripcion('');
      setProveedorId(null);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nombre) return;
    
    await upsertMutation.mutateAsync({
      id: editingTipo?.id,
      nombre,
      precio_base: precioBase,
      descripcion,
      proveedor_id: proveedorId
    });
    setIsDialogOpen(false);
  };

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
                placeholder="Buscar transporte..."
                className="pl-11 pr-4 h-12 w-64 rounded-2xl bg-background/40 border-border/40 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button 
              onClick={() => handleOpenDialog()}
              className="rounded-2xl font-black px-6 h-12 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-95"
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
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Proveedor</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Precio Base</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Descripción</TableHead>
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
                    <span className="text-xs font-bold text-muted-foreground">{tipo.proveedor?.nombreProveedor || tipo.proveedor?.nombre || 'Sin proveedor'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-sm text-foreground">{formatCurrency(tipo.precio_base)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground line-clamp-1">{tipo.descripcion || '-'}</span>
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
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Truck className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron tipos de transporte</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-border/40 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">
              {editingTipo ? 'Editar Tipo de Transporte' : 'Nuevo Tipo de Transporte'}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Introduce los detalles del vehículo y su precio base.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Nombre del Vehículo</label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Furgoneta 3500kg"
                className="h-12 rounded-2xl bg-muted/30 border-border/40 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Proveedor</label>
              <Select value={proveedorId || 'none'} onValueChange={(val) => setProveedorId(val === 'none' ? null : val)}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-border/40">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedoresTransporte?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombreProveedor || p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Precio Base</label>
              <Input
                type="number"
                value={precioBase}
                onChange={(e) => setPrecioBase(parseFloat(e.target.value))}
                className="h-12 rounded-2xl bg-muted/30 border-border/40 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Descripción</label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles adicionales..."
                className="h-12 rounded-2xl bg-muted/30 border-border/40 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              className="rounded-xl h-12 font-black bg-orange-500 hover:bg-orange-600 text-white px-8 shadow-lg shadow-orange-500/20"
            >
              {editingTipo ? 'Guardar Cambios' : 'Crear Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
