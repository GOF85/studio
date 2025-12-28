'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Calendar as CalendarIcon, Save, Loader2, Trash2, X, UserPlus, Clock, MapPin } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useEntregas, usePersonal } from '@/hooks/use-data-queries';
import { useUpdateEntrega } from '@/hooks/mutations/use-entregas-mutations';

const personalAsignadoSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    rol: z.string().optional(),
});

const entregaPersonalSchema = z.object({
    id: z.string(),
    serviceNumber: z.string(),
    client: z.string(),
    fecha: z.date(),
    lugarEntrega: z.string(),
    personalAsignado: z.array(personalAsignadoSchema).default([]),
    status: z.string(),
});

const formSchema = z.object({
    entregas: z.array(entregaPersonalSchema)
});

type FormValues = z.infer<typeof formSchema>;

export default function GestionPersonalPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    // Supabase Hooks
    const { data: entregasData, isLoading: loadingEntregas } = useEntregas();
    const { data: personalData, isLoading: loadingPersonal } = usePersonal();
    const updateEntrega = useUpdateEntrega();

    const personal = useMemo(() => (personalData || []) as any[], [personalData]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { entregas: [] }
    });

    const { control, reset } = form;

    const { fields } = useFieldArray({
        control,
        name: "entregas"
    });

    useEffect(() => {
        if (loadingEntregas || !entregasData) return;
        
        reset({ 
            entregas: entregasData.map(e => ({
                ...e, 
                fecha: new Date(e.fecha),
                personalAsignado: Array.isArray(e.personalAsignado) ? e.personalAsignado : []
            })) 
        });
        setIsMounted(true);
    }, [entregasData, loadingEntregas, reset]);

    const filteredEntregas = useMemo(() => {
        return fields.map((field, index) => ({ field, index })).filter(({ field }) => {
            const searchMatch =
                searchTerm === '' ||
                field.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                field.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                field.lugarEntrega.toLowerCase().includes(searchTerm.toLowerCase());

            let dateMatch = true;
            if (dateRange?.from) {
                const entregaDate = field.fecha;
                if (dateRange.to) {
                    dateMatch = isWithinInterval(entregaDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                } else {
                    dateMatch = isWithinInterval(entregaDate, { start: startOfDay(entregaDate), end: endOfDay(entregaDate) });
                }
            }

            return searchMatch && dateMatch;
        });
    }, [fields, searchTerm, dateRange]);

    const handleAddPersonal = (entregaIndex: number, personalId: string) => {
        if (!personalId) return;
        const person = personal.find(p => p.id === personalId);
        if (person) {
            const currentPersonal = form.getValues(`entregas.${entregaIndex}.personalAsignado`) || [];
            if (!currentPersonal.some(p => p.id === person.id)) {
                form.setValue(`entregas.${entregaIndex}.personalAsignado`, [
                    ...currentPersonal,
                    { id: person.id, nombre: person.nombre, rol: person.rol }
                ], { shouldDirty: true });
            }
        }
    };

    const handleRemovePersonal = (entregaIndex: number, personId: string) => {
        const currentPersonal = form.getValues(`entregas.${entregaIndex}.personalAsignado`) || [];
        form.setValue(`entregas.${entregaIndex}.personalAsignado`, 
            currentPersonal.filter(p => p.id !== personId),
            { shouldDirty: true }
        );
    };

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        try {
            await Promise.all(data.entregas.map(entrega => 
                updateEntrega.mutateAsync({
                    id: entrega.id,
                    updates: {
                        personalAsignado: entrega.personalAsignado
                    }
                })
            ));
            
            form.reset(data);
            toast({ title: "Guardado", description: "Asignaciones de personal actualizadas correctamente."});
        } catch (error) {
            console.error('Error saving personal assignments:', error);
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Personal..." />;
    }

    return (
        <main className="min-h-screen bg-background/30 pb-20">
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Users className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>

                    <div className="flex-1 hidden md:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Buscar OS, cliente o dirección..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-blue-500/20 w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50", dateRange?.from && "border-blue-500/50 bg-blue-500/5 text-blue-700")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM", { locale: es })}</>
                                        ) : format(dateRange.from, "dd MMM", { locale: es })
                                    ) : "Filtrar Fecha"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl border-border/40 shadow-2xl" align="end">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>

                        {(searchTerm || dateRange) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSearchTerm(''); setDateRange(undefined); }}
                                className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-blue-600"
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Limpiar
                            </Button>
                        )}

                        <div className="h-4 w-[1px] bg-border/40 mx-1" />

                        <Button 
                            size="sm" 
                            onClick={form.handleSubmit(onSubmit)} 
                            disabled={isLoading || !form.formState.isDirty}
                            className="h-8 rounded-lg font-black px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4">
                <Form {...form}>
                    <div className="bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/40">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">OS / Cliente</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Fecha / Lugar</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Personal Asignado</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 w-[250px]">Añadir Personal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEntregas.length > 0 ? (
                                    filteredEntregas.map(({ field, index }) => (
                                        <TableRow key={field.id} className="hover:bg-blue-500/[0.02] border-border/40 transition-colors group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Badge variant="outline" className="w-fit font-black text-[9px] border-blue-500/20 bg-blue-500/5 text-blue-700 mb-1">
                                                        {field.serviceNumber}
                                                    </Badge>
                                                    <span className="text-[11px] font-bold truncate max-w-[150px]">
                                                        {field.client}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[11px] font-medium">
                                                        <CalendarIcon className="h-3 w-3 text-blue-500" />
                                                        {format(field.fecha, 'dd/MM/yy')}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {field.lugarEntrega}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {field.personalAsignado.length > 0 ? (
                                                        field.personalAsignado.map((p) => (
                                                            <Badge 
                                                                key={p.id} 
                                                                variant="secondary" 
                                                                className="text-[9px] font-bold bg-muted/50 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer group/badge"
                                                                onClick={() => handleRemovePersonal(index, p.id)}
                                                            >
                                                                {p.nombre}
                                                                <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">Sin personal asignado</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select onValueChange={(value) => handleAddPersonal(index, value)}>
                                                    <SelectTrigger className="h-8 text-[11px] bg-background/50 border-border/40 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                                                            <span>Asignar...</span>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/80">
                                                        {personal.map(p => (
                                                            <SelectItem key={p.id} value={p.id} className="text-[11px]">
                                                                {p.nombre} {p.rol ? `(${p.rol})` : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Users className="h-8 w-8 opacity-20" />
                                                <p className="text-[11px] font-medium uppercase tracking-widest">No hay entregas que coincidan con los filtros</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Form>
            </div>
        </main>
    );
}
