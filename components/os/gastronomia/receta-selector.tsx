

'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Receta, CategoriaReceta, Alergeno } from '@/types';
import { ALERGENOS } from '@/types';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface RecetaSelectorProps {
    onSelect: (receta: Receta) => void;
}

export function RecetaSelector({ onSelect }: RecetaSelectorProps) {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [categorias, setCategorias] = useState<CategoriaReceta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualForm, setManualForm] = useState({
        nombre: '',
        precio: '',
        categoria: '',
        alergenosPresentes: [] as Alergeno[],
        alergenosTrazas: [] as Alergeno[],
    });
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
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

                // Load categorías_recetas from Supabase
                const { data: categoriasData, error: categoriasError } = await supabase
                    .from('categorias_recetas')
                    .select('*')
                    .order('nombre', { ascending: true });

                if (categoriasError) throw categoriasError;

                setCategorias((categoriasData || []) as CategoriaReceta[]);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const filteredRecetas = useMemo(() => {
        return recetas
            .filter((receta) => {
                const matchesSearch = receta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = categoryFilter === 'all' || receta.categoria === categoryFilter;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [recetas, searchTerm, categoryFilter]);

    const handleToggleAlergeno = (alergeno: Alergeno, tipo: 'presente' | 'trazas') => {
        setManualForm((prev) => {
            const presentes = [...prev.alergenosPresentes];
            const trazas = [...prev.alergenosTrazas];

            if (tipo === 'presente') {
                const idx = presentes.indexOf(alergeno);
                if (idx >= 0) {
                    presentes.splice(idx, 1);
                } else {
                    presentes.push(alergeno);
                    // Auto-remover del otro array si existe
                    const traazasIdx = trazas.indexOf(alergeno);
                    if (traazasIdx >= 0) {
                        trazas.splice(traazasIdx, 1);
                    }
                }
            } else {
                const idx = trazas.indexOf(alergeno);
                if (idx >= 0) {
                    trazas.splice(idx, 1);
                } else {
                    trazas.push(alergeno);
                    // Auto-remover del otro array si existe
                    const presentesIdx = presentes.indexOf(alergeno);
                    if (presentesIdx >= 0) {
                        presentes.splice(presentesIdx, 1);
                    }
                }
            }

            return { ...prev, alergenosPresentes: presentes, alergenosTrazas: trazas };
        });
    };

    const handleCreateManual = () => {
        if (!manualForm.nombre.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre es requerido' });
            return;
        }

        const precio = parseFloat(manualForm.precio);
        if (!manualForm.precio || isNaN(precio) || precio <= 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'El precio debe ser un número válido mayor a 0',
            });
            return;
        }

        if (!manualForm.categoria.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'La categoría es requerida' });
            return;
        }

        // Crear plato manual como si fuera una receta
        const platoManual: Receta = {
            id: `manual-${Date.now()}`,
            numeroReceta: 'MANUAL',
            nombre: manualForm.nombre.trim(),
            nombre_en: manualForm.nombre.trim(),
            visibleParaComerciales: true,
            isArchived: false,
            descripcionComercial: 'Plato creado manualmente (sin escandallo)',
            descripcionComercial_en: 'Manually created dish (no cost breakdown)',
            responsableEscandallo: '',
            categoria: manualForm.categoria,
            partidaProduccion: undefined,
            gramajeTotal: undefined,
            estacionalidad: 'MIXTO',
            tipoDieta: 'NINGUNO',
            porcentajeCosteProduccion: 0,
            elaboraciones: [],
            menajeAsociado: [],
            instruccionesMiseEnPlace: '',
            instruccionesRegeneracion: '',
            instruccionesEmplatado: '',
            fotosMiseEnPlace: [],
            fotosRegeneracion: [],
            fotosEmplatado: [],
            fotosComerciales: [],
            perfilSaborPrincipal: undefined,
            perfilSaborSecundario: undefined,
            perfilTextura: undefined,
            tipoCocina: undefined,
            recetaOrigen: undefined,
            temperaturaServicio: undefined,
            tecnicaCoccionPrincipal: undefined,
            potencialMiseEnPlace: undefined,
            formatoServicioIdeal: undefined,
            equipamientoCritico: undefined,
            dificultadProduccion: undefined,
            estabilidadBuffet: undefined,
            escalabilidad: undefined,
            etiquetasTendencia: undefined,
            costeMateriaPrima: precio,
            precioVenta: precio,
            alergenos: [...manualForm.alergenosPresentes, ...manualForm.alergenosTrazas],
            alergenosMetadata: {
                presentes: manualForm.alergenosPresentes,
                trazas: manualForm.alergenosTrazas,
            },
            requiereRevision: false,
            comentarioRevision: undefined,
            fechaRevision: undefined,
        };

        onSelect(platoManual);
        toast({ title: '✓ Plato creado', description: `"${manualForm.nombre}" añadido al menú` });
        setShowManualForm(false);
        setManualForm({
            nombre: '',
            precio: '',
            categoria: '',
            alergenosPresentes: [],
            alergenosTrazas: [],
        });
    };

    // Render formulario manual
    if (showManualForm) {
        return (
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Plato Manual</DialogTitle>
                    <DialogDescription>
                        Crea un plato que no existe en el catálogo del Book
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="nombre" className="text-sm font-semibold">
                            Nombre del Plato <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="nombre"
                            placeholder="Ej: Brownie artesanal, Café especial..."
                            value={manualForm.nombre}
                            onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })}
                            className="text-base"
                        />
                    </div>

                    {/* Precio */}
                    <div className="space-y-2">
                        <Label htmlFor="precio" className="text-sm font-semibold">
                            Precio Unitario / Coste Total <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="precio"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ej: 8.50"
                                value={manualForm.precio}
                                onChange={(e) => setManualForm({ ...manualForm, precio: e.target.value })}
                                className="text-base"
                            />
                            <span className="text-lg font-semibold text-muted-foreground">€</span>
                        </div>
                    </div>

                    {/* Categoría */}
                    <div className="space-y-2">
                        <Label htmlFor="categoria" className="text-sm font-semibold">
                            Categoría <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={manualForm.categoria}
                            onValueChange={(val) => setManualForm({ ...manualForm, categoria: val })}
                        >
                            <SelectTrigger id="categoria">
                                <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categorias.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.nombre}>
                                        {cat.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Alérgenos - Dos columnas */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Alérgenos (opcional)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Presentes */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Presentes</h4>
                                <ScrollArea className="border rounded-md p-3 h-64">
                                    <div className="space-y-2">
                                        {ALERGENOS.map((alergeno) => (
                                            <div key={`presente-${alergeno}`} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`presente-${alergeno}`}
                                                    checked={manualForm.alergenosPresentes.includes(alergeno)}
                                                    onCheckedChange={() =>
                                                        handleToggleAlergeno(alergeno, 'presente')
                                                    }
                                                />
                                                <label
                                                    htmlFor={`presente-${alergeno}`}
                                                    className="text-sm cursor-pointer flex-1"
                                                >
                                                    {alergeno}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Trazas */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400">Trazas</h4>
                                <ScrollArea className="border rounded-md p-3 h-64">
                                    <div className="space-y-2">
                                        {ALERGENOS.map((alergeno) => (
                                            <div key={`trazas-${alergeno}`} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`trazas-${alergeno}`}
                                                    checked={manualForm.alergenosTrazas.includes(alergeno)}
                                                    onCheckedChange={() =>
                                                        handleToggleAlergeno(alergeno, 'trazas')
                                                    }
                                                />
                                                <label
                                                    htmlFor={`trazas-${alergeno}`}
                                                    className="text-sm cursor-pointer flex-1"
                                                >
                                                    {alergeno}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Un alérgeno no puede estar en ambas columnas simultáneamente
                        </p>
                    </div>
                </div>

                <div className="flex justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowManualForm(false);
                            setManualForm({
                                nombre: '',
                                precio: '',
                                categoria: '',
                                alergenosPresentes: [],
                                alergenosTrazas: [],
                            });
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateManual}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Plato
                    </Button>
                </div>
            </DialogContent>
        );
    }

    // Render vista principal (búsqueda)
    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Seleccionar Plato</DialogTitle>
                <DialogDescription>
                    Busca una receta del catálogo o crea una manual
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
                                {categorias.map((c) => (
                                    <SelectItem key={c.id} value={c.nombre}>
                                        {c.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => setShowManualForm(true)}
                            className="border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Crear</span>
                        </Button>
                    </div>
                    <ScrollArea className="h-96 border rounded-md">
                        {filteredRecetas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 gap-4">
                                <div className="text-center">
                                    <p className="font-medium">No se encontraron recetas</p>
                                    <p className="text-sm text-muted-foreground/70">Intenta con otros términos de búsqueda</p>
                                </div>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowManualForm(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Plato Manual
                                </Button>
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
                                    {filteredRecetas.map((receta) => (
                                        <TableRow key={receta.id}>
                                            <TableCell className="font-medium">{receta.nombre}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{receta.categoria}</Badge>
                                            </TableCell>
                                            <TableCell>{formatCurrency(receta.precioVenta || 0)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => onSelect(receta)}>
                                                    Añadir
                                                </Button>
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
