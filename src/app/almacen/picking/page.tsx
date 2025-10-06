

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Calendar as CalendarIcon, Search, Trash2, Users, Soup } from 'lucide-react';
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

export default function GestionPickingPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [pickingSheets, setPickingSheets] = useState<PickingSheet[]>([]);
    const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setIsMounted(true);
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const serviceOrdersMap = new Map(allServiceOrders.map(os => [os.id, os]));
        
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const sheetsArray: PickingSheet[] = Object.values(allSheets).map(sheet => ({
            ...sheet,
            os: serviceOrdersMap.get(sheet.osId)
        })).filter(sheet => sheet.os); // Filter out sheets without a valid OS

        setPickingSheets(sheetsArray);
    }, []);
    
    const handleDeleteSheet = () => {
        if (!sheetToDelete) return;
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        delete allSheets[sheetToDelete];
        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        
        setPickingSheets(prev => prev.filter(s => s.id !== sheetToDelete));
        toast({ title: "Hoja de Picking eliminada" });
        setSheetToDelete(null);
    }
    
    const handleStartPicking = (sheetId: string) => {
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        if (allSheets[sheetId] && allSheets[sheetId].status === 'Pendiente') {
            allSheets[sheetId].status = 'En Proceso';
            localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
            setPickingSheets(prev => prev.map(s => s.id === sheetId ? {...s, status: 'En Proceso'} : s));
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

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Picking..." />;
    }
    
    const getStatusVariant = (status: PickingSheet['status']): 'default' | 'secondary' | 'outline' => {
        if(status === 'Listo') return 'default';
        if(status === 'En Proceso') return 'outline';
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
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <ListChecks /> Gestión de Picking
                </h1>
            </div>

             <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por Expedición, OS o Cliente..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal md:w-[300px]", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                    </PopoverContent>
                </Popover>
            </div>


            <Card>
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
                                                {sheet.solicitante && (
                                                    <Badge variant={sheet.solicitante === 'Sala' ? 'default' : 'outline'} className={sheet.solicitante === 'Sala' ? 'bg-blue-600' : 'bg-orange-500'}>
                                                        {sheet.solicitante === 'Sala' ? <Users size={12} className="mr-1.5"/> : <Soup size={12} className="mr-1.5"/>}
                                                        {sheet.solicitante}
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
                                                    <Button size="sm">
                                                      {sheet.status === 'Pendiente' ? 'Iniciar Picking' : 'Ver / Continuar'}
                                                    </Button>
                                                    <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheet.id); }}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})
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


    