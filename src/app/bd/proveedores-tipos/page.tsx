'use client';

import { useState, useEffect } from 'react';
import { Database, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type ProveedorTipo = {
    id: string;
    proveedor_id: string;
    id_erp: string;
    nombre_comercial: string;
    tipos: string[];
};

export default function ProveedoresTiposPage() {
    const [items, setItems] = useState<ProveedorTipo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const tiposOptions = TIPO_PROVEEDOR_OPCIONES.map(t => ({ label: t, value: t }));

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Get all providers
            const { data: proveedores, error: provError } = await supabase
                .from('proveedores')
                .select('id, id_erp, nombre_comercial')
                .order('nombre_comercial');

            if (provError) throw provError;

            // Get all service types
            const { data: tipos, error: tiposError } = await supabase
                .from('proveedores_tipos_servicio')
                .select('*');

            if (tiposError) throw tiposError;

            // Create a map for quick lookup
            const tiposMap = new Map(tipos?.map(t => [t.proveedor_id, t.tipos]) || []);

            // Combine data
            const combined = (proveedores || []).map(p => ({
                id: '',
                proveedor_id: p.id,
                id_erp: p.id_erp || '',
                nombre_comercial: p.nombre_comercial,
                tipos: tiposMap.get(p.id) || []
            }));

            setItems(combined);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar los datos.' });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleTiposChange(proveedorId: string, newTipos: string[]) {
        // Update local state immediately
        setItems(items.map(item =>
            item.proveedor_id === proveedorId ? { ...item, tipos: newTipos } : item
        ));
    }

    async function handleSaveAll() {
        setIsSaving(true);
        try {
            // Upsert all records
            const records = items.map(item => ({
                proveedor_id: item.proveedor_id,
                tipos: item.tipos
            }));

            const { error } = await supabase
                .from('proveedores_tipos_servicio')
                .upsert(records, { onConflict: 'proveedor_id' });

            if (error) throw error;

            toast({ title: 'Guardado', description: 'Tipos de servicio actualizados correctamente.' });
        } catch (error) {
            console.error('Error saving:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al guardar los cambios.' });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Tipos de Servicio..." />;
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Database className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">Tipos de Servicio por Proveedor</h1>
                </div>
                <Button onClick={handleSaveAll} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : <><Save className="mr-2" /> Guardar Todos</>}
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="p-2">ID ERP</TableHead>
                            <TableHead className="p-2">Nombre Comercial</TableHead>
                            <TableHead className="p-2">Tipos de Servicio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map(item => (
                                <TableRow key={item.proveedor_id}>
                                    <TableCell className="p-2 font-mono text-xs">{item.id_erp}</TableCell>
                                    <TableCell className="p-2 font-medium">{item.nombre_comercial}</TableCell>
                                    <TableCell className="p-2">
                                        <MultiSelect
                                            options={tiposOptions}
                                            selected={item.tipos}
                                            onChange={(newTipos) => handleTiposChange(item.proveedor_id, newTipos)}
                                            placeholder="Seleccionar tipos..."
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No hay proveedores.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
