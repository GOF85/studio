

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Calendar as CalendarIcon, Search, Trash2, Users, Soup, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ServiceOrder, PickingSheet } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { usePickingSheets, useDeletePickingSheet, useUpdatePickingSheet } from '@/hooks/use-data-queries';

export default function GestionPickingPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const { data: pickingSheets = [], isLoading } = usePickingSheets();
    const deleteMutation = useDeletePickingSheet();
    const updateMutation = useUpdatePickingSheet();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDeleteSheet = async () => {
        if (!sheetToDelete) return;
        try {
            await deleteMutation.mutateAsync(sheetToDelete);
            toast({ title: "Hoja de Picking eliminada" });
            setSheetToDelete(null);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la hoja de picking" });
        }
    }

    const handleStartPicking = async (sheetId: string) => {
        const sheet = pickingSheets.find(s => s.id === sheetId);
        if (sheet && sheet.status === 'Pendiente') {
            try {
                await updateMutation.mutateAsync({ id: sheetId, status: 'En Proceso' });
            } catch (error) {
                console.error("Error updating status:", error);
            }
        }
        router.push(`/almacen/picking/${sheetId}`);
    }

    const filteredSheets = useMemo(() => {
        return pickingSheets.filter(sheet => {
            if (!sheet.os) return false;
            const sheetDate = new Date(sheet.fechaNecesidad);
            const isInDateRange = dateRange?.from && isWithinInterval(sheetDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) });
            const matchesSearch = sheet.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sheet.os.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sheet.id.toLowerCase().includes(searchTerm.toLowerCase());

            return isInDateRange && matchesSearch;
        }).sort((a, b) => new Date(a.fechaNecesidad).getTime() - new Date(b.fechaNecesidad).getTime());
    }, [pickingSheets, dateRange, searchTerm]);

    if (!isMounted || isLoading) {
        return <LoadingSkeleton title="Cargando Gestión de Picking..." />;
    }

    const getStatusVariant = (status: PickingSheet['status']): 'default' | 'secondary' | 'outline' => {
        if (status === 'Listo') return 'default';
        if (status === 'En Proceso') return 'outline';
        return 'secondary'
    }

    const getPickingProgress = (sheet: PickingSheet): number => {
        if (!sheet.itemStates || !sheet.items || sheet.items.length === 0) return 0;
        const total = sheet.items.length;
        const checked = Object.values(sheet.itemStates).filter(s => s.checked).length;
        return (checked / total) * 100;
    }

    return (
        <>
            <main className="min-h-screen bg-background/30 pb-20">
                {/* Header Premium Sticky */}
                <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                        <div className="flex items-center">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <ListChecks className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>

                        <div className="flex-1 hidden md:block">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                                <Input
                                    placeholder="Buscar por Expedición, OS o Cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-9 text-[11px] bg-background/50 border-border/40 rounded-lg focus-visible:ring-amber-500/20 w-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">

                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd LLL", { locale: es })} -{" "}
                                                {format(dateRange.to, "dd LLL", { locale: es })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd LLL", { locale: es })
                                        )
                                    ) : (
                                        <span>Seleccionar fechas</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl border-border/40 shadow-2xl" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) { setIsDatePickerOpen(false); } }}
                                    numberOfMonths={2}
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="h-4 w-[1px] bg-border/40 mx-1" />

                        <Button size="sm" asChild className="h-8 rounded-lg font-black px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                            <Link href="/almacen/picking/nuevo">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Nueva Hoja
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
                    <Card className="bg-background/40 backdrop-blur-sm border-border/40">
                        <CardHeader>
                            <CardTitle>Hojas de Picking</CardTitle>
                            <CardDescription>Listado de eventos que requieren preparación de material.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Expedición</TableHead><TableHead>Nº Servicio</TableHead><TableHead>Cliente</TableHead><TableHead>Solicita</TableHead><TableHead>Fecha Necesidad</TableHead><TableHead>Estado</TableHead><TableHead>Progreso</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredSheets.length > 0 ? (
                                            filteredSheets.map(sheet => {
                                                const progress = getPickingProgress(sheet);
                                                return (
                                                    <TableRow key={sheet.id} onClick={() => handleStartPicking(sheet.id)} className="cursor-pointer">
                                                        <TableCell className="font-mono"><Badge>{sheet.id}</Badge></TableCell>
                                                        <TableCell>{sheet.os?.serviceNumber}</TableCell>
                                                        <TableCell>{sheet.os?.client}</TableCell>
                                                        <TableCell>
                                                            {sheet.solicita && (
                                                                <Badge variant={sheet.solicita === 'Sala' ? 'default' : 'outline'} className={sheet.solicita === 'Sala' ? 'bg-blue-600' : 'bg-orange-500'}>
                                                                    {sheet.solicita === 'Sala' ? <Users size={12} className="mr-1.5" /> : <Soup size={12} className="mr-1.5" />}
                                                                    {sheet.solicita}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{format(new Date(sheet.fechaNecesidad), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusVariant(sheet.status)}>{sheet.status}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Progress value={progress} className="w-24 h-2" />
                                                                <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStartPicking(sheet.id); }}>
                                                                    {sheet.status === 'Pendiente' ? 'Iniciar Picking' : 'Ver / Continuar'}
                                                                </Button>
                                                                <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheet.id); }}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    No hay hojas de picking en las fechas seleccionadas.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <AlertDialog open={!!sheetToDelete} onOpenChange={(open) => !open && setSheetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la hoja de picking.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDeleteSheet}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}



