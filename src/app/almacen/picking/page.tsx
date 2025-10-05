'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListChecks, Calendar as CalendarIcon, Loader2, Warehouse, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ServiceOrder } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type EventoParaPicking = {
    os: ServiceOrder;
    totalItems: number; // Placeholder for now
    estadoPicking: 'Pendiente' | 'En Proceso' | 'Listo'; // Placeholder
}

export default function GestionPickingPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [eventos, setEventos] = useState<EventoParaPicking[]>([]);

    useEffect(() => {
        setIsMounted(true);
        // Cargar eventos iniciales
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const initialEvents = allServiceOrders
            .filter(os => os.status === 'Confirmado')
            .map(os => ({
                os,
                totalItems: 0, // Calculate this properly later
                estadoPicking: 'Pendiente'
            }));
        setEventos(initialEvents);
    }, []);

    const filteredEvents = useMemo(() => {
        return eventos.filter(evento => {
            const osDate = new Date(evento.os.startDate);
            const isInDateRange = dateRange?.from && isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) });
            const matchesSearch = evento.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 evento.os.client.toLowerCase().includes(searchTerm.toLowerCase());
            
            return isInDateRange && matchesSearch;
        });
    }, [eventos, dateRange, searchTerm]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Picking..." />;
    }

    return (
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
                        placeholder="Buscar por Nº de Servicio o Cliente..."
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
                            <TableHeader><TableRow><TableHead>Nº Servicio</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredEvents.length > 0 ? (
                                    filteredEvents.map(evento => (
                                        <TableRow key={evento.os.id}>
                                            <TableCell>{evento.os.serviceNumber}</TableCell>
                                            <TableCell>{evento.os.client}</TableCell>
                                            <TableCell>{format(new Date(evento.os.startDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{evento.estadoPicking}</TableCell>
                                            <TableCell>
                                                <Button size="sm">Iniciar Picking</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No hay eventos para preparar en las fechas seleccionadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
