
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Receta, CategoriaReceta } from '@/types';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecetaSelectorProps {
    onSelect: (receta: Receta) => void;
}

export function RecetaSelector({ onSelect }: RecetaSelectorProps) {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        const allRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[])
            .filter(r => r.visibleParaComerciales);
        setRecetas(allRecetas);
        
        const allCategorias = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
        setCategorias(allCategorias);
    }, []);

    const filteredRecetas = useMemo(() => {
        return recetas.filter(receta => {
            const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || receta.categoria === categoryFilter;
            return matchesSearch && matchesCategory;
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));
    }, [recetas, searchTerm, categoryFilter]);

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Seleccionar Plato del Book</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4 py-4">
                <Input
                    placeholder="Buscar receta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        {categorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <ScrollArea className="h-96 border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                        <TableRow>
                            <TableHead>Receta</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>PVP</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecetas.map(receta => (
                            <TableRow key={receta.id}>
                                <TableCell className="font-medium">{receta.nombre}</TableCell>
                                <TableCell><Badge variant="outline">{receta.categoria}</Badge></TableCell>
                                <TableCell>{formatCurrency(receta.precioVenta || 0)}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => onSelect(receta)}>Añadir</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
}
