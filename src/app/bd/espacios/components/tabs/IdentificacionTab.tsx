'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TIPO_ESPACIO, ESTILOS_ESPACIO, TAGS_ESPACIO, IDEAL_PARA } from '@/types';
import type { EspacioFormValues } from '@/lib/validations/espacios';

export function IdentificacionTab() {
    const form = useFormContext<EspacioFormValues>();

    const tipoOptions = TIPO_ESPACIO.map(t => ({ label: t, value: t }));
    const estilosOptions = ESTILOS_ESPACIO.map(t => ({ label: t, value: t }));
    const tagsOptions = TAGS_ESPACIO.map(t => ({ label: t, value: t }));
    const idealParaOptions = IDEAL_PARA.map(t => ({ label: t, value: t }));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Datos Básicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="nombre"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Espacio *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Palacio de Congresos" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tiposEspacio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Espacio *</FormLabel>
                                    <MultiSelect
                                        options={tipoOptions}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Seleccionar tipos..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="descripcionCorta"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descripción Corta</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Breve descripción para listados (máx 200 caracteres)"
                                        className="resize-none"
                                        maxLength={200}
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {field.value?.length || 0}/200 caracteres. Crítico para sugerencias de IA.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="descripcionLarga"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descripción Detallada</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Descripción completa del espacio, historia, ambiente..."
                                        className="min-h-[150px]"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ubicación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="calle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Calle y Número</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="zona"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zona / Barrio</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="codigoPostal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>C.P.</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ciudad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ciudad *</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="provincia"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Provincia *</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categorización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="estilos"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estilos</FormLabel>
                                <MultiSelect
                                    options={estilosOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar estilos..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Características (Tags)</FormLabel>
                                <MultiSelect
                                    options={tagsOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar características..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="idealPara"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ideal Para</FormLabel>
                                <MultiSelect
                                    options={idealParaOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar tipos de evento..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
