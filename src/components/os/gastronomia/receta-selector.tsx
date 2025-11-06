

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Receta, CategoriaReceta, HistoricoPreciosERP, ArticuloERP, Elaboracion, IngredienteInterno } from '@/types';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startOfDay } from 'date-fns';

interface RecetaSelectorProps {
    onSelect: (receta: Receta, coste: number, pvp: number) => void;
    eventDate: Date;
}

export function RecetaSelector({ onSelect, eventDate }: RecetaSelectorProps) {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    
    // States to hold all raw data for calculations
    const [historicoPrecios, setHistoricoPrecios] = useState<HistoricoPreciosERP[]>([]);
    const [ingredientesInternos, setIngredientesInternos] = useState<IngredienteInterno[]>([]);
    const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
    const [elaboraciones, setElaboraciones] = useState<Elaboracion[]>([]);

    useEffect(() => {
        const allRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[])
            .filter(r => r.visibleParaComerciales && !r.isArchived);
        setRecetas(allRecetas);
        
        const allCategorias = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
        setCategorias(allCategorias);

        // Load all data needed for cost calculation
        setHistoricoPrecios(JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]'));
        setIngredientesInternos(JSON.parse(localStorage.getItem('ingredientesInternos') || '[]'));
        setArticulosERP(JSON.parse(localStorage.getItem('articulosERP') || '[]'));
        setElaboraciones(JSON.parse(localStorage.getItem('elaboraciones') || '[]'));
    }, []);
    
    const calculateHistoricalCost = useCallback((receta: Receta, eventDate: Date): { coste: number, pvp: number } => {
        const articulosErpMap = new Map(articulosERP.map(a => [a.idreferenciaerp, a]));
        const ingredientesMap = new Map(ingredientesInternos.map(i => [i.id, i]));
        const elaboracionesMap = new Map(elaboraciones.map(e => [e.id, e]));

        const getHistoricalPrice = (erpId: string): number => {
            const relevantPrices = historicoPrecios
              .filter(h => h.articuloErpId === erpId && new Date(h.fecha) <= startOfDay(eventDate))
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            
            const latestPrice = articulosErpMap.get(erpId)?.precio || 0;
            return relevantPrices.length > 0 ? relevantPrices[0].precioCalculado : latestPrice;
        };
        
        const elabCostCache = new Map<string, number>();

        const calculateElabCost = (elabId: string): number => {
            if (elabCostCache.has(elabId)) return elabCostCache.get(elabId)!;

            const elab = elaboracionesMap.get(elabId);
            if (!elab) return 0;
            
            const elabCost = (elab.componentes || []).reduce((sum, comp) => {
                let componentCost = 0;
                if (comp.tipo === 'ingrediente') {
                    const ingrediente = ingredientesMap.get(comp.componenteId);
                    const erpItem = ingrediente ? articulosErpMap.get(ingrediente.productoERPlinkId) : undefined;
                    if(erpItem) {
                        const price = getHistoricalPrice(erpItem.idreferenciaerp);
                        componentCost = price * comp.cantidad;
                    }
                } else { // It's a sub-elaboration
                    componentCost = calculateElabCost(comp.componenteId) * comp.cantidad;
                }
                return sum + (componentCost * (1 + (comp.merma || 0) / 100));
            }, 0);

            const costePorUnidad = elab.produccionTotal > 0 ? elabCost / elab.produccionTotal : 0;
            elabCostCache.set(elabId, costePorUnidad);
            return costePorUnidad;
        }

        const costeMateriaPrima = (receta.elaboraciones || []).reduce((sum, elabEnReceta) => {
            const elabCost = calculateElabCost(elabEnReceta.elaboracionId);
            return sum + (elabCost * elabEnReceta.cantidad);
        }, 0);
        
        const pvp = costeMateriaPrima * (1 + (receta.porcentajeCosteProduccion / 100));

        return { coste: costeMateriaPrima, pvp };
    }, [historicoPrecios, ingredientesInternos, articulosERP, elaboraciones]);

    const recetasConPrecio = useMemo(() => {
        return recetas.map(receta => {
            const { coste, pvp } = calculateHistoricalCost(receta, eventDate);
            return { ...receta, pvpCalculado: pvp, costeCalculado: coste };
        });
    }, [recetas, eventDate, calculateHistoricalCost]);


    const filteredRecetas = useMemo(() => {
        return recetasConPrecio.filter(receta => {
            const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || receta.categoria === categoryFilter;
            return matchesSearch && matchesCategory;
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));
    }, [recetasConPrecio, searchTerm, categoryFilter]);

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
                            <TableHead>PVP Calculado</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecetas.map(receta => (
                            <TableRow key={receta.id}>
                                <TableCell className="font-medium">{receta.nombre}</TableCell>
                                <TableCell><Badge variant="outline">{receta.categoria}</Badge></TableCell>
                                <TableCell>{formatCurrency(receta.pvpCalculado || 0)}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => onSelect(receta, receta.costeCalculado, receta.pvpCalculado)}>Añadir</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
}
