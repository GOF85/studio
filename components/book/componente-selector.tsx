

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { IngredienteInterno, ArticuloERP, Elaboracion } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatUnit } from '@/lib/utils';


type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export function ComponenteSelector({ onSelectIngrediente, onSelectElaboracion, allElaboraciones }: { onSelectIngrediente: (ing: IngredienteConERP) => void, onSelectElaboracion: (elab: Elaboracion) => void, allElaboraciones: Elaboracion[] }) {
    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [elabSearchTerm, setElabSearchTerm] = useState('');
    const ingredienteInputRef = useRef<HTMLInputElement>(null);
    const elaboracionInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            const { supabase } = await import('@/lib/supabase');

            const [ingredientesResult, erpResult] = await Promise.all([
                supabase.from('ingredientes_internos').select('*'),
                supabase.from('articulos_erp').select('*')
            ]);

            const storedInternos = (ingredientesResult.data || []).map((row: any) => ({
                id: row.id,
                nombreIngrediente: row.nombre_ingrediente,
                productoERPlinkId: row.producto_erp_link_id,
                alergenosPresentes: row.alergenos_presentes || [],
                alergenosTrazas: row.alergenos_trazas || [],
                historialRevisiones: row.historial_revisiones || [],
            })) as IngredienteInterno[];

            const storedErp = (erpResult.data || []).map((row: any) => ({
                idreferenciaerp: row.erp_id,
                nombreProductoERP: row.nombre,
                precioCompra: parseFloat(row.precio_compra || '0'),
                unidad: row.unidad_medida,
                unidadConversion: parseFloat(row.unidad_conversion || '1'),
                descuento: parseFloat(row.descuento || '0'),
                nombreProveedor: row.nombre_proveedor,
                referenciaProveedor: row.referencia_proveedor,
                categoriaMice: row.categoria_mice,
                tipo: row.tipo,
            })) as ArticuloERP[];

            const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));

            const combined = storedInternos.map(ing => ({
                ...ing,
                erp: erpMap.get(ing.productoERPlinkId),
            }));
            setIngredientes(combined);
        };

        loadData();
    }, []);

    useEffect(() => {
        // Focus the input when the component mounts or the tab changes
        setTimeout(() => ingredienteInputRef.current?.focus(), 0);
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
        const unidadConversion = (erpItem.unidadConversion && erpItem.unidadConversion > 0) ? erpItem.unidadConversion : 1;
        const descuento = erpItem.descuento || 0;
        const costePorUnidadBase = unidadConversion > 0 ? precioCompra / unidadConversion : 0;
        return costePorUnidadBase * (1 - descuento / 100);
    };

    const handleAddIngrediente = (ing: IngredienteConERP) => {
        onSelectIngrediente(ing);
        setSearchTerm('');
        ingredienteInputRef.current?.focus();
    }

    const handleAddElaboracion = (elab: Elaboracion) => {
        onSelectElaboracion(elab);
        setElabSearchTerm('');
        elaboracionInputRef.current?.focus();
    }

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Seleccionar Componente</DialogTitle>
                <DialogDescription>
                    Busca y selecciona ingredientes o elaboraciones para añadir a la receta.
                </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="ingredientes">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
                    <TabsTrigger value="elaboraciones">Elaboraciones (Sub-recetas)</TabsTrigger>
                </TabsList>
                <TabsContent value="ingredientes">
                    <Input ref={ingredienteInputRef} placeholder="Buscar ingrediente o Id. ERP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="my-2" />
                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredIngredientes.map(ing => (
                                    <TableRow key={ing.id}>
                                        <TableCell>{ing.nombreIngrediente}</TableCell>
                                        <TableCell>{formatCurrency(calculateCosteReal(ing.erp))} / {ing.erp?.unidadConversion && ing.erp.unidadConversion > 1 ? 'Ud' : (ing.erp ? formatUnit(ing.erp.unidad) : 'Ud')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" type="button" onClick={() => handleAddIngrediente(ing)}>Añadir</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
                <TabsContent value="elaboraciones">
                    <Input ref={elaboracionInputRef} placeholder="Buscar elaboración..." value={elabSearchTerm} onChange={e => setElabSearchTerm(e.target.value)} className="my-2" />
                    <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead>Elaboración</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredElaboraciones.map(elab => (
                                    <TableRow key={elab.id}>
                                        <TableCell>{elab.nombre}</TableCell>
                                        <TableCell>{formatCurrency(elab.costePorUnidad)} / {formatUnit(elab.unidadProduccion)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" type="button" onClick={() => handleAddElaboracion(elab)}>Añadir</Button>
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
