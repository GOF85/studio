'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Espacio } from '@/types';
import { TIPO_ESPACIO } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';

const espacioFormSchema = z.object({
    identificacion: z.object({
        nombreEspacio: z.string().min(1, "El nombre es obligatorio"),
        tipoDeEspacio: z.array(z.string()).min(1, "Debe seleccionar al menos un tipo"),
        ciudad: z.string().min(1, "La ciudad es obligatoria"),
        provincia: z.string().min(1, "La provincia es obligatoria"),
        calle: z.string().min(1, "La calle es obligatoria"),
        codigoPostal: z.string().min(1, "El código postal es obligatorio"),
        estilos: z.array(z.string()).optional().default([]),
        tags: z.array(z.string()).optional().default([]),
        idealPara: z.array(z.string()).optional().default([]),
    }),
    capacidades: z.object({
        aforoMaximoCocktail: z.coerce.number().min(0).default(0),
        aforoMaximoBanquete: z.coerce.number().min(0).default(0),
        salas: z.array(z.any()).optional().default([]),
    }),
    evaluacionMICE: z.object({
        relacionComercial: z.enum(['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación']),
        exclusividadMusica: z.boolean().default(false),
        exclusividadAudiovisuales: z.boolean().default(false),
    }),
});

type EspacioFormValues = z.infer<typeof espacioFormSchema>;

export default function NuevoEspacioPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<EspacioFormValues>({
        resolver: zodResolver(espacioFormSchema),
        defaultValues: {
            identificacion: {
                nombreEspacio: '',
                tipoDeEspacio: [],
                ciudad: '',
                provincia: '',
                calle: '',
                codigoPostal: '',
                estilos: [],
                tags: [],
                idealPara: [],
            },
            capacidades: {
                aforoMaximoCocktail: 0,
                aforoMaximoBanquete: 0,
                salas: [],
            },
            evaluacionMICE: {
                relacionComercial: 'Sin Relación',
                exclusividadMusica: false,
                exclusividadAudiovisuales: false,
            },
        },
    });

    async function onSubmit(data: EspacioFormValues) {
        setIsLoading(true);

        try {
            // Create the full Espacio object with all required fields
            const fullEspacio = {
                ...data,
                logistica: {
                    montacargas: false,
                    accesoServicioIndependiente: false,
                    tipoCocina: 'Sin cocina' as const,
                    tomasAguaCocina: false,
                    desaguesCocina: false,
                    extraccionHumos: false,
                    limitadorSonido: false,
                    permiteMusicaExterior: false,
                    puntosAnclaje: false,
                },
                experienciaInvitado: {
                    flow: {
                        accesoPrincipal: '',
                        recorridoInvitado: '',
                        aparcamiento: '',
                        transportePublico: '',
                        accesibilidadAsistentes: '',
                        guardarropa: false,
                        seguridadPropia: false,
                    },
                },
                contactos: [],
                espacio: data.identificacion.nombreEspacio,
                evaluacionMICE: {
                    ...data.evaluacionMICE,
                    valoracionComercial: 0,
                    puntosFuertes: [],
                    puntosDebiles: [],
                    valoracionOperaciones: 0,
                    factoresCriticosExito: [],
                    riesgosPotenciales: [],
                },
            };

            const { error } = await supabase
                .from('espacios')
                .insert({
                    nombre: data.identificacion.nombreEspacio,
                    data: fullEspacio,
                });

            if (error) throw error;

            toast({ description: 'Nuevo espacio añadido correctamente.' });
            router.push('/bd/espacios');
        } catch (error: any) {
            console.error('Error creating space:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Error al guardar el espacio: ' + error.message
            });
        } finally {
            setIsLoading(false);
        }
    }

    const tipoEspacioOptions = TIPO_ESPACIO.map(t => ({ label: t, value: t }));

    return (
        <main>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Building className="h-8 w-8" />
                            <h1 className="text-3xl font-headline font-bold">Nuevo Espacio</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" type="button" onClick={() => router.push('/bd/espacios')}>
                                <X className="mr-2" /> Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar</span>
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle className="text-lg">Identificación y Localización</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="identificacion.nombreEspacio" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Espacio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="identificacion.tipoDeEspacio" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Espacio</FormLabel>
                                        <MultiSelect
                                            options={tipoEspacioOptions}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Seleccionar tipo..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="evaluacionMICE.relacionComercial" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Relación Comercial</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                                )} />
                            </div>
                            <div className="grid md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="identificacion.calle" render={({ field }) => (
                                    <FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="identificacion.ciudad" render={({ field }) => (
                                    <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="identificacion.codigoPostal" render={({ field }) => (
                                    <FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="identificacion.provincia" render={({ field }) => (
                                    <FormItem><FormLabel>Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-lg">Capacidades</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="capacidades.aforoMaximoCocktail" render={({ field }) => (
                                    <FormItem><FormLabel>Aforo Máximo Cocktail</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="capacidades.aforoMaximoBanquete" render={({ field }) => (
                                    <FormItem><FormLabel>Aforo Máximo Banquete</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </main>
    );
}
