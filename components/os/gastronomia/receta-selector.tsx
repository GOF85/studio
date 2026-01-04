

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Receta, CategoriaReceta } from '@/types';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface RecetaSelectorProps {
    onSelect: (receta: Receta) => void;
}

export function RecetaSelector({ onSelect }: RecetaSelectorProps) {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadRecetas = async () => {
            try {
                setIsLoading(true);
                
                // Load recetas from Supabase
                const { data: recetasData, error: recetasError } = await supabase
                    .from('recetas')
                    .select('*')
                    .eq('visible_para_comerciales', true)
                    .eq('is_archived', false)
                    .order('nombre', { ascending: true });

                if (recetasError) throw recetasError;

                // Transform Supabase data to Receta type
                const transformedRecetas: Receta[] = (recetasData || []).map(row => ({
                    id: row.id,
                    numeroReceta: row.numero_receta,
                    nombre: row.nombre,
                    nombreEn: row.nombre_en,
                    visibleParaComerciales: row.visible_para_comerciales,
                    isArchived: row.is_archived,
                    descripcionComercial: row.descripcion_comercial,
                    descripcionComercialEn: row.descripcion_comercial_en,
                    responsableEscandallo: row.responsable_escandallo,
                    categoria: row.categoria,
                    partidaProduccion: row.partida_produccion,
                    gramajeTotal: row.gramaje_total,
                    estacionalidad: row.estacionalidad,
                    tipoDieta: row.tipo_dieta,
                    porcentajeCosteProduccion: row.porcentaje_coste_produccion,
                    elaboraciones: row.elaboraciones || [],
                    menajeAsociado: row.menaje_asociado || [],
                    instruccionesMiseEnPlace: row.instrucciones_mise_en_place,
                    instruccionesRegeneracion: row.instrucciones_regeneracion,
                    instruccionesEmplatado: row.instrucciones_emplatado,
                    fotosMiseEnPlace: row.fotos_mise_en_place || [],
                    fotosRegeneracion: row.fotos_regeneracion || [],
                    fotosEmplatado: row.fotos_emplatado || [],
                    fotosComerciales: row.fotos_comerciales || [],
                    perfilSaborPrincipal: row.perfil_sabor_principal,
                    perfilSaborSecundario: row.perfil_sabor_secundario,
                    perfilTextura: row.perfil_textura,
                    tipoCocina: row.tipo_cocina,
                    recetaOrigen: row.receta_origen,
                    temperaturaServicio: row.temperatura_servicio,
                    tecnicaCoccionPrincipal: row.tecnica_coccion_principal,
                    potencialMiseEnPlace: row.potencial_mise_en_place,
                    formatoServicioIdeal: row.formato_servicio_ideal,
                    equipamientoCritico: row.equipamiento_critico,
                    dificultadProduccion: row.dificultad_produccion,
                    estabilidadBuffet: row.estabilidad_buffet,
                    escalabilidad: row.escalabilidad,
                    etiquetasTendencia: row.etiquetas_tendencia,
                    costeMateriaPrima: row.coste_materia_prima,
                    precioVenta: row.precio_venta,
                    alergenos: row.alergenos,
                    requiereRevision: row.requiere_revision,
                    comentarioRevision: row.comentario_revision,
                    fechaRevision: row.fecha_revision,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    costeMateriaPrimaActual: row.coste_materia_prima_actual,
                    costeMateriaPrimaFechaActualizacion: row.coste_materia_prima_fecha_actualizacion,
                    margenBrutoActual: row.margen_bruto_actual,
                }));

                setRecetas(transformedRecetas);

                // Extract unique categories from recipes
                const uniqueCategories = Array.from(new Set(transformedRecetas.map(r => r.categoria)));
                const categoriasList: CategoriaReceta[] = uniqueCategories.map((cat, idx) => ({
                    id: `cat-${idx}`,
                    nombre: cat,
                }));
                setCategorias(categoriasList);
            } catch (error) {
                console.error('Error loading recetas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadRecetas();
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
                <DialogDescription>
                    Busca y selecciona una receta del catálogo para añadirla a la orden de servicio.
                </DialogDescription>
            </DialogHeader>
            
            {isLoading ? (
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
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
                        {filteredRecetas.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                                No se encontraron recetas
                            </div>
                        ) : (
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
                        )}
                    </ScrollArea>
                </>
            )}
        </DialogContent>
    );
}
