'use client';

import { useState, useMemo } from 'react';
import { FileText, Search, Trash2, Package, PlusCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { usePlantillasPedidos, useUpsertPlantillaPedido, useDeletePlantillaPedido, useArticulosERP } from '@/hooks/use-data-queries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PedidoPlantilla, PedidoPlantillaItem, MaterialOrderType } from '@/types';

interface PlantillasPedidosClientProps {
  initialData: PedidoPlantilla[];
}

export function PlantillasPedidosClient({ initialData }: PlantillasPedidosClientProps) {
  const { data: plantillas } = usePlantillasPedidos();
  const { data: articulosERP } = useArticulosERP();
  const upsertMutation = useUpsertPlantillaPedido();
  const deleteMutation = useDeletePlantillaPedido();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<Partial<PedidoPlantilla> | null>(null);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<MaterialOrderType>('Almacen');
  const [items, setItems] = useState<PedidoPlantillaItem[]>([]);
  
  // Item selection state
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [quantity, setQuantity] = useState(1);

  const currentPlantillas = plantillas || initialData;

  const filteredPlantillas = useMemo(() => {
    return currentPlantillas.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentPlantillas, searchTerm]);

  const filteredERP = useMemo(() => {
    if (!articulosERP || !itemSearch) return [];
    return articulosERP.filter(a => 
      a.nombreProductoERP.toLowerCase().includes(itemSearch.toLowerCase()) ||
      a.idreferenciaerp?.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 10);
  }, [articulosERP, itemSearch]);

  const handleOpenDialog = (plantilla?: PedidoPlantilla) => {
    if (plantilla) {
      setEditingPlantilla(plantilla);
      setNombre(plantilla.nombre);
      setTipo(plantilla.tipo);
      setItems(plantilla.items || []);
    } else {
      setEditingPlantilla(null);
      setNombre('');
      setTipo('Almacen');
      setItems([]);
    }
    setIsDialogOpen(true);
  };

  const addItem = () => {
    const articulo = articulosERP?.find(a => (a.idreferenciaerp || a.id) === selectedItemCode);
    if (!articulo) return;

    const existingIndex = items.findIndex(i => i.itemCode === selectedItemCode);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      setItems(newItems);
    } else {
      setItems([...items, {
        itemCode: articulo.idreferenciaerp || articulo.id,
        description: articulo.nombreProductoERP,
        quantity: quantity
      }]);
    }
    setSelectedItemCode('');
    setItemSearch('');
    setQuantity(1);
  };

  const removeItem = (code: string) => {
    setItems(items.filter(i => i.itemCode !== code));
  };

  const handleSave = async () => {
    if (!nombre) return;
    
    await upsertMutation.mutateAsync({
      id: editingPlantilla?.id,
      nombre,
      tipo,
      items
    });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Plantillas de Pedidos</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de listas predefinidas para pedidos de material</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar plantillas..."
                className="pl-11 pr-4 h-12 w-64 rounded-2xl bg-background/40 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button 
              onClick={() => handleOpenDialog()}
              className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nueva Plantilla
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
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Tipo</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Artículos</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlantillas.length > 0 ? (
              filteredPlantillas.map((plantilla) => (
                <TableRow
                  key={plantilla.id}
                  className="group transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]"
                >
                  <TableCell className="pl-8">
                    <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{plantilla.nombre}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-primary bg-primary/10 w-fit px-3 py-1 rounded-full">
                      <span className="text-[10px] font-black uppercase tracking-wider">{plantilla.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-xs text-muted-foreground/60">{plantilla.items?.length || 0} artículos</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => handleOpenDialog(plantilla)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => deleteMutation.mutate(plantilla.id)}
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
                    <FileText className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron plantillas</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogo de Edición/Creación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] border-border/40 shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">{editingPlantilla?.id ? 'Editar' : 'Nueva'} Plantilla</DialogTitle>
            <DialogDescription className="font-medium">Configura los artículos que componen esta plantilla.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold ml-1">Nombre de la Plantilla</label>
                <Input 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Kit Básico Almacén"
                  className="rounded-xl h-12 bg-background/40 border-border/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold ml-1">Tipo de Pedido</label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                  <SelectTrigger className="rounded-xl h-12 bg-background/40 border-border/40">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                    <SelectItem value="Almacen" className="rounded-lg">Almacén</SelectItem>
                    <SelectItem value="Bodega" className="rounded-lg">Bodega</SelectItem>
                    <SelectItem value="Bio" className="rounded-lg">Bio</SelectItem>
                    <SelectItem value="Alquiler" className="rounded-lg">Alquiler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 border border-border/40 rounded-[1.5rem] p-6 bg-muted/20">
              <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Añadir Artículos
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en ERP..."
                    className="pl-10 rounded-xl h-12 bg-background/60 border-border/40"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                  {filteredERP.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-card border border-border/40 rounded-xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden">
                      {filteredERP.map(a => (
                        <div
                          key={a.id}
                          className="p-3 hover:bg-primary/10 cursor-pointer transition-colors flex justify-between items-center border-b border-border/10 last:border-0"
                          onClick={() => {
                            setSelectedItemCode(a.idreferenciaerp || a.id);
                            setItemSearch(a.nombreProductoERP);
                          }}
                        >
                          <span className="font-bold text-sm truncate mr-2">{a.nombreProductoERP}</span>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider shrink-0">{a.idreferenciaerp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  className="w-24 rounded-xl h-12 bg-background/60 border-border/40 text-center font-bold"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
                <Button 
                  onClick={addItem} 
                  disabled={!selectedItemCode}
                  className="rounded-xl h-12 bg-primary hover:bg-primary/90 text-white px-6 font-bold"
                >
                  Añadir
                </Button>
              </div>

              <div className="border border-border/40 rounded-xl overflow-hidden bg-background/40">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Artículo</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Cant.</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map((item) => (
                        <TableRow key={item.itemCode} className="border-border/40">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{item.description}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{item.itemCode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-black">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeItem(item.itemCode)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          No hay artículos en la plantilla
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!nombre || items.length === 0 || upsertMutation.isPending}
              className="rounded-xl font-black h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
