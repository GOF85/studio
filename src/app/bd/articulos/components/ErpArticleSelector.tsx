'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
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
import { Check } from 'lucide-react';

export function ErpArticleSelector({
    open,
    onOpenChange,
    onSelect,
    articulosERP,
    searchTerm,
    setSearchTerm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (erpId: string) => void;
    articulosERP: ArticuloERP[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}) {
    const filteredErpProducts = useMemo(() => {
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
                <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="max-h-[60vh] overflow-y-auto border rounded-md">
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
                            {filteredErpProducts.map(p => (
                                <TableRow key={p.idreferenciaerp || p.id}>
                                    <TableCell>{p.nombreProductoERP}</TableCell>
                                    <TableCell>{p.nombreProveedor}</TableCell>
                                    <TableCell>{calculatePrice(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/{p.unidad}</TableCell>
                                    <TableCell>
                                        <DialogClose asChild>
                                            <Button size="sm" onClick={() => onSelect(p.idreferenciaerp || '')}><Check className="mr-2" />Seleccionar</Button>
                                        </DialogClose>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
