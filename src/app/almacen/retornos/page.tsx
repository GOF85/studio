
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ServiceOrder } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Placeholder for return status, we will develop this logic
type ReturnStatus = 'Pendiente' | 'Procesando' | 'Completado';

export default function GestionRetornosPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        // We only care about confirmed orders that might have material to return.
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[])
            .filter(os => os.status === 'Confirmado');
        setServiceOrders(allServiceOrders);
    }, []);

    const filteredOrders = useMemo(() => {
        return serviceOrders.filter(os => {
            const osDate = new Date(os.endDate); // We filter by end date for returns
            
            let isInDateRange = true;
            if (dateRange?.from) {
                 isInDateRange = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) });
            }

            const matchesSearch = os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 os.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (os.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase());

            const isPastEvent = isPast(osDate);
            const pastEventMatch = showPastEvents || !isPastEvent;
            
            return isInDateRange && matchesSearch && pastEventMatch;
        }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }, [serviceOrders, dateRange, searchTerm, showPastEvents]);
    
    const getReturnStatus = (osId: string): ReturnStatus => {
        // Placeholder logic
        return 'Pendiente';
    }
    
    const getStatusVariant = (status: ReturnStatus): 'default' | 'secondary' | 'outline' => {
        if(status === 'Completado') return 'default';
        if(status === 'Procesando') return 'outline';
        return 'secondary'
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Retornos..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <History /> Gestión de Retornos
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
                            {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha fin...</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                    </PopoverContent>
                </Popover>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                    <Label htmlFor="show-past" className="text-sm font-medium">Mostrar eventos pasados</Label>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Retornos Pendientes</CardTitle>
                    <CardDescription>Eventos que han finalizado y requieren el procesamiento del material retornado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader><TableRow><TableHead>Nº Servicio</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha Fin Evento</TableHead><TableHead>Estado del Retorno</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map(os => {
                                        const status = getReturnStatus(os.id);
                                        return (
                                        <TableRow key={os.id} onClick={() => router.push(`/almacen/retornos/${os.id}`)} className="cursor-pointer">
                                            <TableCell>{os.serviceNumber}</TableCell>
                                            <TableCell>{os.client}{os.finalClient && ` - ${os.finalClient}`}</TableCell>
                                            <TableCell>{format(new Date(os.endDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(status)}>{status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm">Procesar Retorno</Button>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No hay retornos pendientes en las fechas seleccionadas.
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

