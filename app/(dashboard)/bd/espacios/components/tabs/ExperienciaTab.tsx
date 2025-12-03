'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { EspacioFormValues } from '@/lib/validations/espacios';

export function ExperienciaTab() {
    const form = useFormContext<EspacioFormValues>();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Acceso y Movilidad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="aparcamiento"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Aparcamiento</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ej: Parking subterráneo de 200 plazas, 15€/día. Parking público cercano en calle Mayor."
                                        className="min-h-[100px]"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Describe las opciones de aparcamiento disponibles, capacidad y precios.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="transportePublico"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Transporte Público</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ej: Metro L3 y L5 (parada Plaza España, 5 min andando). Autobuses 21, 27, 39."
                                        className="min-h-[100px]"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Información sobre acceso en transporte público, líneas, paradas cercanas.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Accesibilidad y Comodidades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="accesibilidadAsistentes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Accesibilidad PMR</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Ej: Acceso adaptado sin barreras arquitectónicas. Ascensores amplios. 2 baños adaptados. Plazas de parking reservadas."
                                        className="min-h-[100px]"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Detalla la accesibilidad para personas con movilidad reducida.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="conexionWifi"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>WiFi</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ej: WiFi 500 Mbps en todas las salas, red de invitados personalizable"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Especifica la disponibilidad y características de la conexión WiFi.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
