'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Search, X } from 'lucide-react';
import { PedidoItem } from '@/types';
import { Proveedor } from '@/types';

interface AgregarReferenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: PedidoItem[]) => void;
  isLoading?: boolean;
  proveedores: Proveedor[];
  articulosDelProveedor: PedidoItem[];
  selectedProveedor?: string;
  onProveedorChange: (proveedorId: string) => void;
}

export function AgregarReferenciasModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
  proveedores = [],
  articulosDelProveedor = [],
  selectedProveedor,
  onProveedorChange,
}: AgregarReferenciasModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);

  // Filtrar artículos por búsqueda y agrupar por categoría
  const articulosAgrupados = useMemo(() => {
    let filtered = articulosDelProveedor;

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.subcategoria?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Agrupar por categoría (subcategoria)
    const grouped: Record<string, PedidoItem[]> = {};
    filtered.forEach((item) => {
      const categoria = item.subcategoria || 'Sin categoría';
      if (!grouped[categoria]) {
        grouped[categoria] = [];
      }
      grouped[categoria].push(item);
    });

    return grouped;
  }, [articulosDelProveedor, searchTerm]);

  const handleToggleItem = (itemCode: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemCode)) {
      newSelected.delete(itemCode);
      const newCantidades = { ...cantidades };
      delete newCantidades[itemCode];
      setCantidades(newCantidades);
    } else {
      newSelected.add(itemCode);
      setCantidades((prev) => ({ ...prev, [itemCode]: 1 }));
    }
    setSelectedItems(newSelected);
  };

  const handleCantidadChange = (itemCode: string, cantidad: number) => {
    if (cantidad >= 1) {
      setCantidades((prev) => ({ ...prev, [itemCode]: cantidad }));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size > 0 && selectedItems.size === Object.values(articulosAgrupados).flat().length) {
      setSelectedItems(new Set());
      setCantidades({});
    } else {
      const allItems = new Set<string>();
      const allCantidades: Record<string, number> = {};
      Object.values(articulosAgrupados)
        .flat()
        .forEach((item) => {
          allItems.add(item.itemCode);
          allCantidades[item.itemCode] = 1;
        });
      setSelectedItems(allItems);
      setCantidades(allCantidades);
    }
  };

  const handleSubmit = () => {
    const itemsToAdd: PedidoItem[] = [];

    selectedItems.forEach((itemCode) => {
      const articuloBase = articulosDelProveedor.find((a) => a.itemCode === itemCode);
      if (articuloBase) {
        itemsToAdd.push({
          ...articuloBase,
          cantidad: cantidades[itemCode] || 1,
        });
      }
    });

    if (itemsToAdd.length > 0) {
      onAdd(itemsToAdd);
      // Reset
      setSearchTerm('');
      setSelectedItems(new Set());
      setCantidades({});
      onClose();
    }
  };

  const proveedorSeleccionado = proveedores.find((p) => p.id === selectedProveedor);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Agregar referencias de alquiler</DialogTitle>
            <DialogDescription>
              Selecciona los artículos que deseas agregar al pedido.
              Los artículos duplicados se sumarán automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Búsqueda de artículos */}
            <div>
              <Label htmlFor="search" className="text-[12px] font-bold uppercase">Buscar artículos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-[13px]"
                />
              </div>
            </div>

            {/* Tabla de artículos agrupados por categoría CON THUMBNAILS */}
            <div className="border rounded-lg overflow-hidden">
              {Object.entries(articulosAgrupados).length > 0 ? (
                <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/30 z-10">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="h-8 px-2 w-8">
                          <Checkbox
                            checked={
                              selectedItems.size > 0 &&
                              selectedItems.size === Object.values(articulosAgrupados).flat().length
                            }
                            onChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-wider w-16">Imagen</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-wider flex-1">Artículo</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-wider w-32">Categoría</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-wider text-right w-24">Precio</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-wider text-center w-32">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(articulosAgrupados).map(([categoria, items]) => (
                        <Fragment key={`cat-${categoria}`}>
                          <TableRow className="bg-blue-500/5 hover:bg-transparent border-b border-blue-500/20">
                            <TableCell colSpan={6} className="px-4 py-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                                {categoria}
                              </span>
                            </TableCell>
                          </TableRow>
                          {items.map((item) => (
                            <TableRow key={item.itemCode} className="border-b hover:bg-muted/20">
                              <TableCell className="px-2 py-2">
                                <Checkbox
                                  checked={selectedItems.has(item.itemCode)}
                                  onChange={() => handleToggleItem(item.itemCode)}
                                />
                              </TableCell>
                              <TableCell className="px-2 py-2">
                                {item.imageUrl ? (
                                  <button
                                    onClick={() => setImageViewerUrl(item.imageUrl!)}
                                    className="block w-14 h-14 rounded border border-gray-300 bg-muted hover:border-blue-500 transition-colors overflow-hidden cursor-pointer"
                                  >
                                    <img
                                      src={item.imageUrl}
                                      alt={item.description}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-14 h-14 rounded border border-dashed border-gray-300 bg-muted flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <span className="text-[10px] font-bold line-clamp-2">
                                  {item.description}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <Badge variant="outline" className="text-[8px]">
                                  {item.subcategoria || '—'}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-right">
                                <span className="text-[10px] font-mono font-black">
                                  {item.price?.toFixed(2) || '—'}€
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                {selectedItems.has(item.itemCode) ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={cantidades[item.itemCode] || 1}
                                    onChange={(e) =>
                                      handleCantidadChange(
                                        item.itemCode,
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-full h-8 px-2 text-center text-[10px] font-mono border rounded"
                                  />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground text-center">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-20" />
                    <p className="text-[11px] font-medium">
                      {searchTerm.trim()
                        ? 'No se encontraron artículos'
                        : 'No hay artículos disponibles'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Resumen de selección */}
            {selectedItems.size > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {selectedItems.size} artículos seleccionados
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Total unidades:{' '}
                  {Object.entries(cantidades).reduce((sum, [_, cant]) => sum + cant, 0)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="h-9 text-[12px]">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedItems.size === 0 || isLoading}
              className="bg-blue-600 hover:bg-blue-700 h-9 text-[12px]"
            >
              {isLoading ? 'Agregando...' : `Agregar ${selectedItems.size} artículos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!imageViewerUrl} onOpenChange={() => setImageViewerUrl(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] bg-black/95 border-0 p-4">
          <div className="relative w-full h-[70vh] flex items-center justify-center">
            {imageViewerUrl && (
              <>
                <img
                  src={imageViewerUrl}
                  alt="Artículo"
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  onClick={() => setImageViewerUrl(null)}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
