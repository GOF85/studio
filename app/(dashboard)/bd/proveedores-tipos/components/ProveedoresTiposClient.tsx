'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Database, Save, Loader2, Search, Filter } from 'lucide-react';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select';
import { useProveedores, useProveedoresTiposServicio, useUpsertProveedoresTiposServicio } from '@/hooks/use-data-queries';
import { ProveedorTipo } from '@/services/proveedores-tipos-service';
import InfiniteScroll from 'react-infinite-scroll-component';

interface ProveedoresTiposClientProps {
  initialData: ProveedorTipo[];
}

export function ProveedoresTiposClient({ initialData }: ProveedoresTiposClientProps) {
  const { data: proveedores = [] } = useProveedores();
  const { data: tiposServicio = [] } = useProveedoresTiposServicio();
  const upsertMutation = useUpsertProveedoresTiposServicio();

  const [items, setItems] = useState<ProveedorTipo[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showOnlyWithoutTypes, setShowOnlyWithoutTypes] = useState(false);
  
  // Pagination for infinite scroll
  const [displayLimit, setDisplayLimit] = useState(20);

  const tiposOptions = TIPO_PROVEEDOR_OPCIONES.map(t => ({ label: t, value: t }));

  // Memoize the combined data from queries to keep it in sync with server data if it changes
  const combinedData = useMemo(() => {
    if (proveedores.length === 0) return initialData;
    const tiposMap = new Map(tiposServicio?.map(t => [t.proveedor_id, t.tipos]) || []);
    
    return proveedores.map(p => ({
      proveedor_id: p.id,
      id_erp: p.IdERP || '',
      nombre_comercial: p.nombreComercial,
      tipos: tiposMap.get(p.id) || []
    }));
  }, [proveedores, tiposServicio, initialData]);

  // Sync items state with combinedData only when combinedData actually changes
  useEffect(() => {
    if (combinedData.length > 0) {
      setItems(combinedData);
    }
  }, [combinedData]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.nombre_comercial.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
                           item.id_erp.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      
      const matchesFilter = !showOnlyWithoutTypes || item.tipos.length === 0;
      
      return matchesSearch && matchesFilter;
    });
  }, [items, deferredSearchTerm, showOnlyWithoutTypes]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayLimit);
  }, [filteredItems, displayLimit]);

  const loadMore = () => {
    setDisplayLimit(prev => prev + 20);
  };

  async function handleTiposChange(proveedorId: string, newTipos: string[]) {
    setItems(prev => prev.map(item =>
      item.proveedor_id === proveedorId ? { ...item, tipos: newTipos } : item
    ));
  }

  async function handleSaveAll() {
    const records = items.map(item => ({
      proveedor_id: item.proveedor_id,
      tipos: item.tipos
    }));
    
    await upsertMutation.mutateAsync(records);
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
              <p className="text-sm font-medium text-muted-foreground/70">Asignación de categorías de servicio por proveedor</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-xl border border-border/40">
              <Checkbox 
                id="without-types" 
                checked={showOnlyWithoutTypes}
                onCheckedChange={(checked) => setShowOnlyWithoutTypes(!!checked)}
              />
              <Label htmlFor="without-types" className="text-sm font-bold cursor-pointer flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Sin tipos asignados
              </Label>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar proveedor..."
                className="pl-9 h-12 w-64 bg-background/50 border-border/40 rounded-2xl focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSaveAll} 
              disabled={upsertMutation.isPending}
              className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              {upsertMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {upsertMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium con Infinite Scroll */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <InfiniteScroll
          dataLength={displayedItems.length}
          next={loadMore}
          hasMore={displayedItems.length < filteredItems.length}
          loader={
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
          scrollThreshold={0.8}
        >
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="hover:bg-transparent border-border/40 h-16">
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">ID ERP</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Nombre Comercial</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pr-8">Tipos de Servicio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.length > 0 ? (
                displayedItems.map((item) => (
                  <TableRow
                    key={item.proveedor_id}
                    className="group transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]"
                  >
                    <TableCell className="pl-8">
                      <span className="font-mono text-xs font-bold bg-primary/5 text-primary px-3 py-1.5 rounded-lg border border-primary/10">
                        {item.id_erp}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{item.nombre_comercial}</span>
                    </TableCell>
                    <TableCell className="pr-8">
                      <MultiSelect
                        options={tiposOptions}
                        selected={item.tipos}
                        onChange={(newTipos) => handleTiposChange(item.proveedor_id, newTipos)}
                        placeholder="Seleccionar tipos..."
                        className="rounded-xl border-border/40 bg-background/40"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                      <Database className="h-16 w-16 mb-4 opacity-10" />
                      <p className="text-lg font-black uppercase tracking-widest">No se encontraron proveedores</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </InfiniteScroll>
      </div>
    </div>
  );
}
