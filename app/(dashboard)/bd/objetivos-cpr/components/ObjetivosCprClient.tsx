'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Target, Save, Loader2, Percent, Menu, FileUp, FileDown, Calendar } from 'lucide-react';
import Papa from 'papaparse';
import { downloadCSVTemplate } from '@/lib/utils';
import type { ObjetivoMensualCPR } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useObjetivosCPR, useUpsertObjetivoCPR } from '@/hooks/use-data-queries';

const formSchema = z.object({
    presupuestoVentas: z.coerce.number().default(0),
    presupuestoCesionPersonal: z.coerce.number().default(0),
    presupuestoGastosMP: z.coerce.number().default(0),
    presupuestoGastosPersonalMice: z.coerce.number().default(0),
    presupuestoGastosPersonalExterno: z.coerce.number().default(0),
    presupuestoOtrosGastos: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

const CSV_HEADERS = ["mes", "presupuestoVentas", "presupuestoCesionPersonal", "presupuestoGastosMP", "presupuestoGastosPersonalMice", "presupuestoGastosPersonalExterno", "presupuestoOtrosGastos"];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

interface ObjetivosCprClientProps {
  initialData: ObjetivoMensualCPR[];
}

export function ObjetivosCprClient({ initialData }: ObjetivosCprClientProps) {
    const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: allObjectives = initialData } = useObjetivosCPR();
    const upsertObjetivo = useUpsertObjetivoCPR();

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

    const loadDataForMonth = useCallback((objectives: ObjetivoMensualCPR[]) => {
        const monthKey = format(selectedDate, 'yyyy-MM');
        const monthData = objectives.find(o => o.mes === monthKey);
        form.reset(monthData || {
            presupuestoVentas: 0,
            presupuestoCesionPersonal: 0,
            presupuestoGastosMP: 0,
            presupuestoGastosPersonalMice: 0,
            presupuestoGastosPersonalExterno: 0,
            presupuestoOtrosGastos: 0,
        });
    }, [selectedDate, form]);

    useEffect(() => {
        loadDataForMonth(allObjectives);
    }, [selectedDate, allObjectives, loadDataForMonth]);

    const onSubmit = async (data: FormValues) => {
        const monthKey = format(selectedDate, 'yyyy-MM');

        try {
            await upsertObjetivo.mutateAsync({
                mes: monthKey,
                ...data,
            });
            toast({ title: 'Objetivos guardados', description: `Se han actualizado los objetivos para ${format(selectedDate, 'MMMM yyyy', { locale: es })}.` });
            form.reset(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudieron guardar los objetivos.' });
        }
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

    const handleExportCSV = () => {
        const csv = Papa.unparse({
            fields: CSV_HEADERS,
            data: allObjectives.map(o => [
                o.mes,
                o.presupuestoVentas,
                o.presupuestoCesionPersonal,
                o.presupuestoGastosMP,
                o.presupuestoGastosPersonalMice,
                o.presupuestoGastosPersonalExterno,
                o.presupuestoOtrosGastos
            ])
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `objetivos_cpr_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const { data, errors } = results;
                if (errors.length > 0) {
                    toast({ variant: 'destructive', title: 'Error al parsear CSV', description: errors[0].message });
                    return;
                }

                try {
                    for (const row of data as any[]) {
                        await upsertObjetivo.mutateAsync({
                            mes: row.mes,
                            presupuestoVentas: parseFloat(row.presupuestoVentas) || 0,
                            presupuestoCesionPersonal: parseFloat(row.presupuestoCesionPersonal) || 0,
                            presupuestoGastosMP: parseFloat(row.presupuestoGastosMP) || 0,
                            presupuestoGastosPersonalMice: parseFloat(row.presupuestoGastosPersonalMice) || 0,
                            presupuestoGastosPersonalExterno: parseFloat(row.presupuestoGastosPersonalExterno) || 0,
                            presupuestoOtrosGastos: parseFloat(row.presupuestoOtrosGastos) || 0,
                        });
                    }
                    toast({ title: 'Importación completada', description: `Se han importado ${data.length} registros.` });
                    setIsImportAlertOpen(false);
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Error al importar', description: error.message });
                }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header Premium Sticky */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Objetivos CPR</h1>
                                <p className="text-sm text-muted-foreground">
                                    Presupuestos mensuales para el cálculo del CPR
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/5">
                                        <Menu className="h-4 w-4 mr-2" />
                                        Acciones
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-border/40 shadow-xl">
                                    <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-lg">
                                        <FileUp className="h-4 w-4 mr-2" />
                                        Importar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCSV} className="rounded-lg">
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Exportar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_objetivos_cpr.csv')} className="rounded-lg">
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Descargar Plantilla
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-full border border-border/40">
                            <Calendar className="h-4 w-4 ml-3 text-muted-foreground" />
                            <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {MONTHS.map(m => (
                                        <SelectItem key={m} value={m.toString()} className="rounded-lg">
                                            {format(new Date(2000, m, 1), 'MMMM', { locale: es })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="w-px h-4 bg-border/40" />
                            <Select value={selectedDate.getFullYear().toString()} onValueChange={handleYearChange}>
                                <SelectTrigger className="w-[100px] border-none bg-transparent focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {YEARS.map(y => (
                                        <SelectItem key={y} value={y.toString()} className="rounded-lg">
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="ml-auto">
                            <Button 
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={upsertObjetivo.isPending || !form.formState.isDirty}
                                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                            >
                                {upsertObjetivo.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar Objetivos
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Ventas y Cesión */}
                                <Card className="rounded-[2rem] border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                                    <CardHeader className="bg-primary/5 border-b border-border/40">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Percent className="h-5 w-5 text-primary" />
                                            Ingresos y Cesión
                                        </CardTitle>
                                        <CardDescription>Presupuesto de ventas y cesión de personal</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="presupuestoVentas"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Ventas (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="presupuestoCesionPersonal"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Cesión Personal (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Gastos Directos */}
                                <Card className="rounded-[2rem] border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                                    <CardHeader className="bg-primary/5 border-b border-border/40">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Target className="h-5 w-5 text-primary" />
                                            Gastos Directos
                                        </CardTitle>
                                        <CardDescription>Presupuesto de gastos directos de producción</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="presupuestoGastosMP"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Materia Prima (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="presupuestoGastosPersonalMice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Personal MICE (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="presupuestoGastosPersonalExterno"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Personal Externo (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="presupuestoOtrosGastos"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Presupuesto Otros Gastos (€)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} className="rounded-xl bg-muted/30 border-none focus-visible:ring-primary" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter">Importar Objetivos</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">
                            Selecciona un archivo CSV con los objetivos mensuales. El formato debe coincidir con la plantilla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportCSV}
                            accept=".csv"
                            className="hidden"
                        />
                        <Button 
                            variant="outline" 
                            className="w-full h-24 border-dashed border-2 rounded-2xl flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/40 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileUp className="h-8 w-8 text-muted-foreground" />
                            <span className="font-bold text-muted-foreground">Haga clic para seleccionar archivo</span>
                        </Button>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
