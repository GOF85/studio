

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Target, Save, Loader2, Percent } from 'lucide-react';
import type { ObjetivoMensualCPR } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { GASTO_LABELS } from '@/lib/constants';

const formSchema = z.object({
    presupuestoVentas: z.coerce.number().default(0),
    presupuestoCesionPersonal: z.coerce.number().default(0),
    presupuestoGastosMP: z.coerce.number().default(0),
    presupuestoGastosPersonalMice: z.coerce.number().default(0),
    presupuestoGastosPersonalExterno: z.coerce.number().default(0),
    presupuestoOtrosGastos: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export default function ObjetivosCprPage() {
    const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            presupuestoVentas: 0,
            presupuestoCesionPersonal: 0,
            presupuestoGastosMP: 0,
            presupuestoGastosPersonalMice: 0,
            presupuestoGastosPersonalExterno: 0,
            presupuestoOtrosGastos: 0,
        },
    });

    const loadDataForMonth = useCallback(() => {
        const monthKey = format(selectedDate, 'yyyy-MM');
        const allObjectives = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        const monthData = allObjectives.find(o => o.mes === monthKey);
        form.reset(monthData || form.getValues());
    }, [selectedDate, form]);

    useEffect(() => {
        loadDataForMonth();
    }, [loadDataForMonth]);

    const onSubmit = (data: FormValues) => {
        setIsLoading(true);
        const monthKey = format(selectedDate, 'yyyy-MM');
        let allObjectives = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        
        const newObjective: ObjetivoMensualCPR = {
            mes: monthKey,
            ...data,
        };
        
        const index = allObjectives.findIndex(o => o.mes === monthKey);
        if (index > -1) {
            allObjectives[index] = newObjective;
        } else {
            allObjectives.push(newObjective);
        }

        localStorage.setItem('objetivosCPR', JSON.stringify(allObjectives));
        
        setTimeout(() => {
            toast({ title: 'Objetivos guardados', description: `Se han actualizado los objetivos para ${format(selectedDate, 'MMMM yyyy', { locale: es })}.`});
            setIsLoading(false);
        }, 500);
    };

    const handleMonthChange = (month: string) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(parseInt(month));
        setSelectedDate(newDate);
    };

    const handleYearChange = (year: string) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(parseInt(year));
        setSelectedDate(newDate);
    };
    
    const renderField = (name: keyof FormValues, label: string) => (
         <FormField control={form.control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <div className="flex items-center">
                    <FormControl><Input type="number" step="0.1" {...field} className="rounded-r-none" /></FormControl>
                    <span className="p-2 border border-l-0 rounded-r-md bg-muted text-muted-foreground"><Percent size={16}/></span>
                </div>
            </FormItem>
        )}/>
    )

    return (
        <main>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Target className="h-8 w-8 text-primary" />
                            <div>
                                <h1 className="text-3xl font-headline font-bold">Gestión de Objetivos Mensuales del CPR</h1>
                                <p className="text-muted-foreground">Define los presupuestos como porcentajes sobre la facturación.</p>
                            </div>
                        </div>
                         <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">Guardar Objetivos</span>
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Selección del Periodo</CardTitle>
                            <CardDescription>Elige el mes y año para definir los objetivos porcentuales.</CardDescription>
                            <div className="flex gap-4 pt-2">
                                <Select value={String(selectedDate.getFullYear())} onValueChange={handleYearChange}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                                 <Select value={String(selectedDate.getMonth())} onValueChange={handleMonthChange}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={String(m)}>{format(new Date(2000, m), 'MMMM', { locale: es })}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg text-green-700">Ingresos (%)</h3>
                                    {renderField("presupuestoVentas", "Venta Gastronomía a Eventos")}
                                    {renderField("presupuestoCesionPersonal", "Cesión de Personal a otros Dptos.")}
                                </div>
                                 <div className="space-y-4">
                                    <h3 className="font-semibold text-lg text-red-700">Gastos (%)</h3>
                                    {renderField("presupuestoGastosMP", GASTO_LABELS.gastronomia)}
                                    {renderField("presupuestoGastosPersonalMice", GASTO_LABELS.personalMice)}
                                    {renderField("presupuestoGastosPersonalExterno", GASTO_LABELS.personalExterno)}
                                    {renderField("presupuestoOtrosGastos", "Otros Gastos (Fijos)")}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </main>
    )
}
