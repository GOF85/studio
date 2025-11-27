
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Target, Save, Loader2, Percent, Menu, FileUp, FileDown } from 'lucide-react';
import Papa from 'papaparse';
import { downloadCSVTemplate } from '@/lib/utils';
import type { ObjetivoMensualCPR } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GASTO_LABELS } from '@/lib/constants';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


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

export default function ObjetivosCprPage() {
    const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));
    const [isLoading, setIsLoading] = useState(false);
    const [allObjectives, setAllObjectives] = useState<ObjetivoMensualCPR[]>([]);
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const loadAllObjectives = useCallback(() => {
        const storedData = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        setAllObjectives(storedData);
        return storedData;
    }, []);

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
        const objectives = loadAllObjectives();
        loadDataForMonth(objectives);
    }, [selectedDate, loadAllObjectives, loadDataForMonth]);

    const onSubmit = (data: FormValues) => {
        setIsLoading(true);
        const monthKey = format(selectedDate, 'yyyy-MM');
        let currentObjectives = [...allObjectives];

        const newObjective: ObjetivoMensualCPR = {
            mes: monthKey,
            ...data,
        };

        const index = currentObjectives.findIndex(o => o.mes === monthKey);
        if (index > -1) {
            currentObjectives[index] = newObjective;
        } else {
            currentObjectives.push(newObjective);
        }

        localStorage.setItem('objetivosCPR', JSON.stringify(currentObjectives));
        setAllObjectives(currentObjectives);

        setTimeout(() => {
            toast({ title: 'Objetivos guardados', description: `Se han actualizado los objetivos para ${format(selectedDate, 'MMMM yyyy', { locale: es })}.` });
            setIsLoading(false);
            form.reset(data); // Mark form as not dirty
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

    const handleExportCSV = () => {
        if (allObjectives.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay objetivos para exportar.' });
            return;
        }
        const csv = Papa.unparse(allObjectives, { columns: CSV_HEADERS });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'objetivos_cpr.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
        const file = event.target.files?.[0];
        if (!file) {
            setIsImportAlertOpen(false);
            return;
        }

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter,
            complete: (results) => {
                if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
                    toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${CSV_HEADERS.join(', ')}` });
                    setIsImportAlertOpen(false);
                    return;
                }

                const importedData: ObjetivoMensualCPR[] = results.data.map(item => ({
                    mes: item.mes,
                    presupuestoVentas: parseFloat(item.presupuestoVentas) || 0,
                    presupuestoCesionPersonal: parseFloat(item.presupuestoCesionPersonal) || 0,
                    presupuestoGastosMP: parseFloat(item.presupuestoGastosMP) || 0,
                    presupuestoGastosPersonalMice: parseFloat(item.presupuestoGastosPersonalMice) || 0,
                    presupuestoGastosPersonalExterno: parseFloat(item.presupuestoGastosPersonalExterno) || 0,
                    presupuestoOtrosGastos: parseFloat(item.presupuestoOtrosGastos) || 0,
                }));

                localStorage.setItem('objetivosCPR', JSON.stringify(importedData));
                const reloadedObjectives = loadAllObjectives();
                loadDataForMonth(reloadedObjectives);
                toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
                setIsImportAlertOpen(false);
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
                setIsImportAlertOpen(false);
            }
        });
        if (event.target) event.target.value = '';
    };

    const renderField = (name: keyof FormValues, label: string) => (
        <FormField control={form.control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <div className="flex items-center">
                    <FormControl><Input type="number" step="0.1" {...field} className="rounded-r-none" /></FormControl>
                    <span className="p-2 border border-l-0 rounded-r-md bg-muted text-muted-foreground"><Percent size={16} /></span>
                </div>
            </FormItem>
        )} />
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
                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                <span className="ml-2">Guardar Objetivos</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><Menu /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                                        <FileUp size={16} className="mr-2" />Importar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_objetivos_cpr.csv')}>
                                        <FileDown size={16} className="mr-2" />Descargar Plantilla
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCSV}>
                                        <FileDown size={16} className="mr-2" />Exportar CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
            <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                        <AlertDialogDescription>
                            Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="!justify-center gap-4">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}
