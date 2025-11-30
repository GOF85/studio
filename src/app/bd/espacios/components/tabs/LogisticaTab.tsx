'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { EspacioFormValues } from '@/lib/validations/espacios';
import { AlertTriangle } from 'lucide-react';

export function LogisticaTab() {
    const form = useFormContext<EspacioFormValues>();

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso y Montaje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="accesoVehiculos"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Acceso de Vehículos</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descripción del acceso para carga y descarga (altura máx, muelle, rampa...)"
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="horarioMontajeDesmontaje"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Horario Montaje/Desmontaje</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 24h, o L-V 8:00-20:00" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Infraestructura</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="potenciaTotal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Potencia Eléctrica Total</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 50kW trifásica" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tipoCocina"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Cocina</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cocina completa">Cocina completa</SelectItem>
                                            <SelectItem value="Office de regeneración">Office de regeneración</SelectItem>
                                            <SelectItem value="Sin cocina">Sin cocina</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="logisticaPase"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Logística de Pase</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Ej: Cocina en planta -1, requiere montacargas. Pasillo estrecho (ancho mín 80cm)"
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Describe la logística de pase desde cocina a sala (ascensores, montacargas, escaleras...)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="w-5 h-5" />
                        Restricciones y Métricas Operativas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="limitadorSonido"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-white">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Tiene Limitador de Sonido
                                            </FormLabel>
                                            <FormDescription>
                                                Marcar si el espacio tiene restricciones acústicas estrictas.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="dificultadMontaje"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dificultad de Montaje (1-5)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                <Input
                                                    type="range"
                                                    min={1}
                                                    max={5}
                                                    step={1}
                                                    className="w-full"
                                                    {...field}
                                                    value={field.value || 1}
                                                    onChange={e => field.onChange(Number(e.target.value))}
                                                />
                                                <span className="font-bold text-lg w-8 text-center">{field.value || 1}</span>
                                            </div>
                                        </FormControl>
                                        <FormDescription>1 = Muy Fácil, 5 = Muy Complejo (requiere personal extra)</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="penalizacionPersonalMontaje"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>% Extra Personal Estimado</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="number" {...field} value={field.value ?? ''} className="pr-8" />
                                                <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                                            </div>
                                        </FormControl>
                                        <FormDescription>Incremento de coste de personal por dificultad.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
