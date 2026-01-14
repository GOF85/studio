'use client';

import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Search, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { PedidoItem } from '@/types';
import { Proveedor } from '@/types';

const ITEMS_PER_PAGE = 20;

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

export const AgregarReferenciasModal = memo(function AgregarReferenciasModalInner({
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
  const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);
  const [hoveredImageAlt, setHoveredImageAlt] = useState<string>('');
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<{ url: string; alt: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Paginación: Aplanar los artículos agrupados y aplicar paginación
  const { articulosAplaned, totalArticulos, totalPages, articulosPaginados } = useMemo(() => {
    const aplaned = Object.entries(articulosAgrupados).flatMap(([categoria, items]) =>
      items.map(item => ({ ...item, categoria }))
    );
    
    const total = aplaned.length;
    const pages = Math.ceil(total / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const paginated = aplaned.slice(startIdx, endIdx);
    
    return {
      articulosAplaned: aplaned,
      totalArticulos: total,
      totalPages: pages,
      articulosPaginados: paginated,
    };
  }, [articulosAgrupados, currentPage]);

  // Reagrupar artículos paginados por categoría para mostrar
  const articulosPaginadosAgrupados = useMemo(() => {
    const grouped: Record<string, (PedidoItem & { categoria: string })[]> = {};
    articulosPaginados.forEach((item) => {
      if (!grouped[item.categoria]) {
        grouped[item.categoria] = [];
      }
      grouped[item.categoria].push(item);
    });
    return grouped;
  }, [articulosPaginados]);

  // Reset página cuando cambia la búsqueda o el proveedor
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProveedor]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-50 bg-white dark:bg-slate-950 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <DialogTitle>Agregar referencias de alquiler</DialogTitle>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {selectedItems.size > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-bold text-foreground">{selectedItems.size}</span> art. • 
                  <span className="font-bold text-foreground ml-1">{Object.entries(cantidades).reduce((sum, [_, cant]) => sum + cant, 0)}</span> un.
                </div>
              )}
              <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-[9px]">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedProveedor || selectedItems.size === 0 || isLoading}
                className="bg-blue-600 hover:bg-blue-700 h-8 text-[9px]"
              >
                {isLoading ? 'Agregando...' : `Agregar ${selectedItems.size}`}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen compacto de selección - En una línea */}
          {selectedItems.size > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded px-3 py-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Seleccionados: {selectedItems.size} artículos • Total: {Object.entries(cantidades).reduce((sum, [_, cant]) => sum + cant, 0)} unidades
              </p>
            </div>
          )}

          {/* Búsqueda de artículos */}
          {selectedProveedor && (
            <>
              <div>
                <Label htmlFor="search">Buscar artículos</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {Object.entries(articulosPaginadosAgrupados).length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto relative">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="h-8 px-2 w-8">
                            <Checkbox
                              checked={
                                selectedItems.size > 0 &&
                                selectedItems.size === totalArticulos
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allItems = new Set<string>();
                                  const allCantidades: Record<string, number> = {};
                                  articulosAplaned.forEach((item) => {
                                    allItems.add(item.itemCode);
                                    allCantidades[item.itemCode] = 1;
                                  });
                                  setSelectedItems(allItems);
                                  setCantidades(allCantidades);
                                } else {
                                  setSelectedItems(new Set());
                                  setCantidades({});
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="h-8 px-2 w-12 text-[9px] font-black uppercase tracking-wider">
                            Foto
                          </TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-wider">
                            Artículo
                          </TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-wider w-32">
                            Categoría
                          </TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-wider text-right w-24">
                            Precio
                          </TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-wider text-center w-32">
                            Cantidad
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(articulosPaginadosAgrupados).map(([categoria, items], idx) => (
                          <React.Fragment key={`cat-${idx}-${categoria}`}>
                            {/* Fila de categoría */}
                            <TableRow className="bg-blue-500/5 hover:bg-transparent border-b border-blue-500/20">
                              <TableCell colSpan={6} className="px-4 py-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                                  {categoria}
                                </span>
                              </TableCell>
                            </TableRow>
                            {/* Items */}
                            {items.map((item) => (
                              <TableRow 
                                key={item.itemCode} 
                                className="border-b hover:bg-muted/20"
                              >
                                <TableCell className="px-2 py-2">
                                  <Checkbox
                                    checked={selectedItems.has(item.itemCode)}
                                    onCheckedChange={() => handleToggleItem(item.itemCode)}
                                  />
                                </TableCell>
                                <TableCell className="px-2 py-2">
                                  {item.imageUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedImageForPreview({ url: item.imageUrl!, alt: item.description })}
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setImagePosition({ x: rect.right + 10, y: rect.top });
                                        setHoveredImageUrl(item.imageUrl);
                                        setHoveredImageAlt(item.description);
                                      }}
                                      onMouseLeave={() => {
                                        setHoveredImageUrl(null);
                                        setHoveredImageAlt('');
                                      }}
                                      className="w-10 h-10 rounded overflow-hidden border border-border hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                                    >
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.description}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const img = e.currentTarget;
                                          img.style.display = 'none';
                                          const parent = img.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="w-10 h-10 rounded bg-muted flex items-center justify-center"><svg class="w-4 h-4 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
                                          }
                                        }}
                                      />
                                    </button>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                      <Camera className="w-4 h-4 text-muted-foreground/30" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-2">
                                  <span className="text-[10px] font-bold line-clamp-2">
                                    {item.description}
                                  </span>
                                </TableCell>
                                <TableCell className="px-4 py-2">
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.subcategoria || '—'}
                                  </span>
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
                          </React.Fragment>
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
                          : 'Selecciona un proveedor para ver sus artículos'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Controles de paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-[10px]"
                    >
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <span className="text-[9px] text-muted-foreground/70">
                        {totalArticulos} artículos en total
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 text-[10px]"
                    >
                      Siguiente
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {/* Hover image preview - Portal para estar fuera del overflow del modal */}
      {typeof window !== 'undefined' && hoveredImageUrl && createPortal(
        <div 
          className="fixed z-[99999] bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg overflow-hidden shadow-2xl pointer-events-none"
          style={{
            left: `${imagePosition.x}px`,
            top: `${imagePosition.y}px`,
            width: '200px',
          }}
        >
          <img 
            src={hoveredImageUrl} 
            alt={hoveredImageAlt}
            loading="lazy"
            className="w-full h-48 object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-48 bg-muted flex items-center justify-center"><svg class="w-12 h-12 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
              }
            }}
          />
          <div className="p-2 bg-blue-500/10 border-t border-blue-500/20">
            <p className="text-[9px] font-bold text-foreground line-clamp-2 text-center">{hoveredImageAlt}</p>
          </div>
        </div>,
        document.body
      )}

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImageForPreview} onOpenChange={() => setSelectedImageForPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa de imagen</DialogTitle>
          </DialogHeader>
          {selectedImageForPreview && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={selectedImageForPreview.url}
                alt={selectedImageForPreview.alt}
                loading="lazy"
                className="w-full h-auto max-h-[400px] object-contain rounded-lg border border-border"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-64 bg-muted rounded-lg flex items-center justify-center"><svg class="w-16 h-16 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
                  }
                }}
              />
              <p className="text-sm text-muted-foreground text-center">
                {selectedImageForPreview.alt}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
});
