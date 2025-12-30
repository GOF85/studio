'use client';

import { useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RatingStars } from '@/components/ui/rating-stars';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { EspacioFormValues } from '@/lib/validations/espacios';
import { supabase } from '@/lib/supabase';

interface Proveedor {
    id: string;
    nombre: string;
}

export function EvaluacionTab() {
    const form = useFormContext<EspacioFormValues>();
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [newPuntoFuerte, setNewPuntoFuerte] = useState('');
    const [newPuntoDebil, setNewPuntoDebil] = useState('');

    useEffect(() => {
        loadProveedores();
    }, []);

    async function loadProveedores() {
        const { data } = await supabase
            .from('proveedores')
            .select('id, nombre_comercial')
            .order('nombre_comercial');
        if (data) {
            setProveedores(data.map(p => ({
                id: p.id,
                nombreComercial: p.nombre_comercial
            })) as any);
        }
    }

    const addPuntoFuerte = () => {
        if (newPuntoFuerte.trim()) {
            const current = form.getValues('puntosFuertes') || [];
            form.setValue('puntosFuertes', [...current, newPuntoFuerte.trim()]);
            setNewPuntoFuerte('');
        }
    };

    const removePuntoFuerte = (index: number) => {
        const current = form.getValues('puntosFuertes') || [];
        form.setValue('puntosFuertes', current.filter((_, i) => i !== index));
    };

    const addPuntoDebil = () => {
        if (newPuntoDebil.trim()) {
            const current = form.getValues('puntosDebiles') || [];
            form.setValue('puntosDebiles', [...current, newPuntoDebil.trim()]);
            setNewPuntoDebil('');
        }
    };

    const removePuntoDebil = (index: number) => {
        const current = form.getValues('puntosDebiles') || [];
        form.setValue('puntosDebiles', current.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Relación Comercial</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="proveedorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(value === '_none_' ? '' : value)}
                                        value={field.value || '_none_'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar proveedor..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="_none_">Sin proveedor</SelectItem>
                                            {proveedores.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="relacionComercial"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Relación</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Exclusividad">Exclusividad</SelectItem>
                                            <SelectItem value="Homologado Preferente">Homologado Preferente</SelectItem>
                                            <SelectItem value="Homologado">Homologado</SelectItem>
                                            <SelectItem value="Puntual">Puntual</SelectItem>
                                            <SelectItem value="Sin Relación">Sin Relación</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Valoraciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="valoracionComercial"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valoración Comercial</FormLabel>
                                <FormControl>
                                    <RatingStars
                                        value={field.value}
                                        onChange={field.onChange}
                                        max={5}
                                        size="lg"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Atractivo para clientes, facilidad de venta, potencial de facturación.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="valoracionOperaciones"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valoración Operaciones</FormLabel>
                                <FormControl>
                                    <RatingStars
                                        value={field.value}
                                        onChange={field.onChange}
                                        max={5}
                                        size="lg"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Facilidad de montaje, logística, relación con el espacio, rentabilidad operativa.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Perfil de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="perfilClienteIdeal"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente Ideal</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ej: Eventos corporativos de alto standing, bodas premium, presentaciones de producto..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Describe el tipo de cliente y evento ideal para este espacio.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Análisis DAFO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <FormLabel>Puntos Fuertes</FormLabel>
                        <div className="flex gap-2 mt-2">
                            <Input
                                placeholder="Añadir punto fuerte..."
                                value={newPuntoFuerte}
                                onChange={(e) => setNewPuntoFuerte(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addPuntoFuerte();
                                    }
                                }}
                            />
                            <Button type="button" onClick={addPuntoFuerte}>
                                Añadir
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {(form.watch('puntosFuertes') || []).map((punto, index) => (
                                <Badge key={index} variant="default" className="px-3 py-1">
                                    {punto}
                                    <button
                                        type="button"
                                        onClick={() => removePuntoFuerte(index)}
                                        className="ml-2 hover:text-destructive"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div>
                        <FormLabel>Puntos Débiles</FormLabel>
                        <div className="flex gap-2 mt-2">
                            <Input
                                placeholder="Añadir punto débil..."
                                value={newPuntoDebil}
                                onChange={(e) => setNewPuntoDebil(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addPuntoDebil();
                                    }
                                }}
                            />
                            <Button type="button" onClick={addPuntoDebil}>
                                Añadir
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {(form.watch('puntosDebiles') || []).map((punto, index) => (
                                <Badge key={index} variant="destructive" className="px-3 py-1">
                                    {punto}
                                    <button
                                        type="button"
                                        onClick={() => removePuntoDebil(index)}
                                        className="ml-2 hover:text-white"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
