'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SalasManager } from '../SalasManager';
import type { EspacioFormValues } from '@/lib/validations/espacios';

export function CapacidadesTab() {
    const form = useFormContext<EspacioFormValues>();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Aforos Generales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="aforoMaxCocktail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Aforo Máximo Cocktail (Global)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormDescription>Capacidad máxima total del espacio en formato cocktail.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="aforoMaxBanquete"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Aforo Máximo Banquete (Global)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormDescription>Capacidad máxima total del espacio en formato banquete.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Desglose de Salas</CardTitle>
                </CardHeader>
                <CardContent>
                    <SalasManager />
                </CardContent>
            </Card>
        </div>
    );
}
