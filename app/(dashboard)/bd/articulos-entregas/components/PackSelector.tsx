'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useArticulosERPPaginated } from '@/hooks/use-data-queries';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { ArticuloERP } from '@/types';
import { X } from 'lucide-react';

export interface PackItem {
    erpId: string;
    nombreProductoERP: string;
    nombreProveedor: string;
    precioCompra: number;
    unidadConversion: number;
    descuento: number;
    unidad: string;
    cantidad: number;
}

export function PackSelector({
    open,
    onOpenChange,
    onApply,
    initialPacks = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (packs: PackItem[]) => void;
    initialPacks?: PackItem[];
}) {
    const [selectedPacks, setSelectedPacks] = useState<PackItem[]>(initialPacks);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        if (open) {
            setSelectedPacks(initialPacks);
        }
    }, [open, initialPacks]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: erpData, isLoading } = useArticulosERPPaginated({
        page: 1,
        limit: 50,
        searchTerm: debouncedSearch
    });

    const filteredErpProducts = erpData?.items || [];

    const calculatePrice = useCallback((p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    }, []);

    const handleSelectToggle = useCallback((product: ArticuloERP) => {
        setSelectedPacks(prev => {
            const existing = prev.find(p => p.erpId === product.id);
            if (existing) {
                return prev.filter(p => p.erpId !== product.id);
            } else {
                return [
                    ...prev,
                    {
                        erpId: product.id,
                        nombreProductoERP: product.nombreProductoERP || '',
                        nombreProveedor: product.nombreProveedor || '',
                        precioCompra: product.precioCompra || 0,
                        unidadConversion: product.unidadConversion || 1,
                        descuento: product.descuento || 0,
                        unidad: product.unidad || 'UD',
                        cantidad: 1,
                    },
                ];
            }
        });
    }, []);

    const handleQuantityChange = useCallback((erpId: string, cantidad: number) => {
        setSelectedPacks(prev =>
            prev.map(p =>
                p.erpId === erpId ? { ...p, cantidad: Math.max(1, cantidad) } : p
            )
        );
    }, []);

    const handleRemovePack = useCallback((erpId: string) => {
        setSelectedPacks(prev => prev.filter(p => p.erpId !== erpId));
    }, []);

    const totalCost = useMemo(() => {
        return selectedPacks.reduce((sum, pack) => {
            const unitPrice = pack.precioCompra / pack.unidadConversion;
            const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
            return sum + priceWithDiscount * pack.cantidad;
        }, 0);
    }, [selectedPacks]);

    const handleApply = useCallback(() => {
        onApply(selectedPacks);
        onOpenChange(false);
    }, [selectedPacks, onApply, onOpenChange]);

    const handleCancel = useCallback(() => {
        setSelectedPacks(initialPacks);
        onOpenChange(false);
    }, [initialPacks, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Seleccionar Artículos ERP para Pack</DialogTitle>
                    <DialogDescription>
                        Selecciona uno o más artículos ERP para crear o editar el pack
                    </DialogDescription>
                </DialogHeader>

                {selectedPacks.length > 0 && (
                    <div className="bg-muted p-4 rounded-lg mb-4">
                        <h3 className="font-semibold mb-3">Artículos Seleccionados</h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {selectedPacks.map(pack => {
                                const unitPrice = pack.precioCompra / pack.unidadConversion;
                                const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
                                return (
                                    <div key={pack.erpId} className="flex items-center justify-between bg-background p-3 rounded border">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{pack.nombreProductoERP}</p>
                                            <p className="text-xs text-muted-foreground">{pack.nombreProveedor}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Precio unitario: {priceWithDiscount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs">Cant:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={pack.cantidad}
                                                    onChange={e => handleQuantityChange(pack.erpId, parseInt(e.target.value) || 1)}
                                                    className="w-12 px-2 py-1 text-xs border rounded"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemovePack(pack.erpId)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                            <p className="font-semibold">
                                Coste Total del Pack: {totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <Input
                        placeholder="Buscar artículos ERP..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="mb-4"
                    />
                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Precio Unitario</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredErpProducts.map(p => {
                                    const isSelected = selectedPacks.some(sp => sp.erpId === p.id);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleSelectToggle(p)}
                                                />
                                            </TableCell>
                                            <TableCell>{p.nombreProductoERP}</TableCell>
                                            <TableCell>{p.nombreProveedor}</TableCell>
                                            <TableCell>
                                                {calculatePrice(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/{p.unidad}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button onClick={handleApply} disabled={selectedPacks.length === 0}>
                        Aplicar Pack {selectedPacks.length > 0 && `(${selectedPacks.length} items)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
