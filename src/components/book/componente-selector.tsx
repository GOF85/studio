

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { IngredienteInterno, ArticuloERP, Elaboracion } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatUnit } from '@/lib/utils';


type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export function ComponenteSelector({ onSelectIngrediente, onSelectElaboracion, allElaboraciones }: { onSelectIngrediente: (ing: IngredienteConERP) => void, onSelectElaboracion: (elab: Elaboracion) => void, allElaboraciones: Elaboracion[] }) {
    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [elabSearchTerm, setElabSearchTerm] = useState('');

    useEffect(() => {
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
        
        const combined = storedInternos.map(ing => ({
            ...ing,
            erp: erpMap.get(ing.productoERPlinkId),
        }));
        setIngredientes(combined);
    }, []);

    const filteredIngredientes = useMemo(() => {
        return ingredientes.filter(i => 
            i.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.erp?.idreferenciaerp || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [ingredientes, searchTerm]);

    const filteredElaboraciones = useMemo(() => {
        return allElaboraciones.filter(e => 
            e.nombre.toLowerCase().includes(elabSearchTerm.toLowerCase())
        );
    }, [allElaboraciones, elabSearchTerm]);

    const calculateCosteReal = (erpItem: ArticuloERP | undefined): number => {
        if (!erpItem) return 0;
        const precioCompra = erpItem.precioCompra || 0;
        const unidadConversion = erpItem.unidadConversion || 1;
        const descuento = erpItem.descuento || 0;
        const costePorUnidadBase = unidadConversion > 0 ? precioCompra / unidadConversion : 0;
        return costePorUnidadBase * (1 - descuento / 100);
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Seleccionar Componente</DialogTitle></DialogHeader>
            <Tabs defaultValue="elaboraciones">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
                    <TabsTrigger value="elaboraciones">Elaboraciones (Sub-recetas)</TabsTrigger>
                </TabsList>
                <TabsContent value="ingredientes">
                    <Input placeholder="Buscar ingrediente o Id. ERP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="my-2"/>
                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredIngredientes.map(ing => (
                                    <TableRow key={ing.id}>
                                        <TableCell>{ing.nombreIngrediente}</TableCell>
                                        <TableCell>{formatCurrency(calculateCosteReal(ing.erp))} / {ing.erp ? formatUnit(ing.erp.unidad) : 'Ud'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" type="button" onClick={() => onSelectIngrediente(ing)}>Añadir</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
                <TabsContent value="elaboraciones">
                    <Input placeholder="Buscar elaboración..." value={elabSearchTerm} onChange={e => setElabSearchTerm(e.target.value)} className="my-2"/>
                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                        <Table>
                             <TableHeader><TableRow><TableHead>Elaboración</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredElaboraciones.map(elab => (
                                    <TableRow key={elab.id}>
                                        <TableCell>{elab.nombre}</TableCell>
                                        <TableCell>{formatCurrency(elab.costePorUnidad)} / {formatUnit(elab.unidadProduccion)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" type="button" onClick={() => onSelectElaboracion(elab)}>Añadir</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}
