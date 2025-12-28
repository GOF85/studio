'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import type { ArticuloERP } from '@/types';
import { Check, Loader2 } from 'lucide-react';
import { useArticulosERP } from '@/hooks/use-data-queries';

export function ErpArticleSelector({
    isOpen,
    onClose,
    onSelect,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (erpArticle: ArticuloERP) => void;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: articulosERP = [], isLoading } = useArticulosERP();

    const filteredErpProducts = useMemo(() => {
        if (!articulosERP) return [];
        return articulosERP.filter(p =>
            p && (
                (p.nombreProductoERP || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.nombreProveedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.referenciaProveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [articulosERP, searchTerm]);

    const calculatePrice = (p: ArticuloERP) => {
        if (!p || typeof p.precioCompra !== 'number' || typeof p.unidadConversion !== 'number') return 0;
        const basePrice = p.precioCompra / (p.unidadConversion || 1);
        const discount = p.descuento || 0;
        return basePrice * (1 - discount / 100);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
                <Input 
                    placeholder="Buscar por nombre, proveedor o referencia..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="mb-4"
                />

                <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredErpProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No se encontraron productos
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredErpProducts.map(p => (
                                        <TableRow key={p.idreferenciaerp || p.id}>
                                            <TableCell>
                                                <div className="font-medium">{p.nombreProductoERP}</div>
                                                <div className="text-xs text-muted-foreground">{p.referenciaProveedor}</div>
                                            </TableCell>
                                            <TableCell>{p.nombreProveedor}</TableCell>
                                            <TableCell>{calculatePrice(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/{p.unidad}</TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => {
                                                    onSelect(p);
                                                    onClose();
                                                }}>
                                                    <Check className="mr-2 h-4 w-4" />Seleccionar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
