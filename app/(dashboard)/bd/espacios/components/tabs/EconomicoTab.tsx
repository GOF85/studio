import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PrecioHistoryTable } from '../PrecioHistoryTable';
import type { EspacioFormValues } from '@/lib/validations/espacios';

export function EconomicoTab() {
    const form = useFormContext<EspacioFormValues>();
    const espacioId = (form.watch('id') as unknown) as string | undefined;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información Económica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="precioOrientativoAlquiler"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Precio Orientativo de Alquiler</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                            className="pr-8"
                                        />
                                    </FormControl>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        €
                                    </span>
                                </div>
                                <FormDescription>
                                    Precio orientativo del alquiler del espacio completo (sin servicios).
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="canonEspacioPorcentaje"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Canon sobre Gastronomía (%)</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0.00"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                className="pr-8"
                                            />
                                        </FormControl>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            %
                                        </span>
                                    </div>
                                    <FormDescription>
                                        Porcentaje que cobra el espacio sobre la facturación de gastronomía.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="canonEspacioFijo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Canon Fijo por Evento</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                className="pr-8"
                                            />
                                        </FormControl>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            €
                                        </span>
                                    </div>
                                    <FormDescription>
                                        Cantidad fija que cobra el espacio por cada evento.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg mt-6">
                        <p className="text-sm text-muted-foreground">
                            <strong>Nota:</strong> Estos datos son orientativos y pueden variar según el tipo de evento,
                            temporada, día de la semana y servicios contratados. Utilízalos como referencia para
                            presupuestos preliminares.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {espacioId && typeof espacioId === 'string' && <PrecioHistoryTable espacioId={espacioId} />}
        </div>
    );
}
