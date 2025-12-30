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
        page: 0,
        pageSize: 50,
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
                    <div className="bg-orange-500/5 p-4 rounded-2xl mb-4 border border-orange-500/10">
                        <h3 className="font-black text-xs uppercase tracking-widest text-orange-600 mb-3">Artículos Seleccionados</h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {selectedPacks.map(pack => {
                                const unitPrice = pack.precioCompra / pack.unidadConversion;
                                const priceWithDiscount = unitPrice * (1 - pack.descuento / 100);
                                return (
                                    <div key={pack.erpId} className="flex items-center justify-between bg-background/60 backdrop-blur-sm p-3 rounded-xl border border-border/40 hover:border-orange-500/30 transition-all">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{pack.nombreProductoERP}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{pack.nombreProveedor}</p>
                                            <p className="text-[10px] font-black text-orange-600 mt-1">
                                                Precio unitario: {priceWithDiscount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Cant:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={pack.cantidad}
                                                    onChange={e => handleQuantityChange(pack.erpId, parseInt(e.target.value) || 1)}
                                                    className="w-14 px-2 py-1 text-xs font-black border rounded-lg bg-background focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemovePack(pack.erpId)}
                                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-500/10">
                            <p className="font-black text-sm text-orange-600 text-right uppercase tracking-widest">
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
                        className="mb-4 h-12 rounded-xl border-border/40 bg-background/40 focus:ring-orange-500/20 focus:border-orange-500/50"
                    />
                    <div className="max-h-[50vh] overflow-y-auto border rounded-2xl border-border/40 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent border-border/40">
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/50">Producto</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/50">Proveedor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/50">Precio Unitario</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredErpProducts.map((p: ArticuloERP) => {
                                    const isSelected = selectedPacks.some(sp => sp.erpId === p.id);
                                    return (
                                        <TableRow key={p.id} className="border-border/40 hover:bg-orange-500/[0.02] transition-colors">
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleSelectToggle(p)}
                                                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                />
                                            </TableCell>
                                            <TableCell className="font-bold text-sm">{p.nombreProductoERP}</TableCell>
                                            <TableCell className="text-xs font-medium text-muted-foreground">{p.nombreProveedor}</TableCell>
                                            <TableCell className="font-black text-sm text-orange-600">
                                                {calculatePrice(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/{p.unidad}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="gap-2 mt-6">
                    <Button variant="outline" onClick={handleCancel} className="rounded-xl font-bold">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleApply} 
                        disabled={selectedPacks.length === 0}
                        className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20"
                    >
                        Aplicar Pack {selectedPacks.length > 0 && `(${selectedPacks.length} items)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
