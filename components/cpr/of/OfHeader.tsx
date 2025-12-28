'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface OfHeaderProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    partidaFilter: string;
    setPartidaFilter: (partida: string) => void;
    handleClearFilters: () => void;
    partidas: string[];
}

export function OfHeader({ 
    dateRange, 
    setDateRange, 
    partidaFilter, 
    setPartidaFilter, 
    handleClearFilters,
    partidas 
}: OfHeaderProps) {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 p-4 border rounded-lg bg-card">
            <div className="flex-grow">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full md:w-[450px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Elige un rango</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start">
                        <div className="p-2 border-r">
                            <div className="flex flex-col gap-1">
                                <Button variant="outline" size="sm" onClick={() => { setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }); setIsDatePickerOpen(false); }}>Esta semana</Button>
                                <Button variant="outline" size="sm" onClick={() => { const nextWeekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }); setDateRange({ from: nextWeekStart, to: endOfWeek(nextWeekStart, { weekStartsOn: 1 }) }); setIsDatePickerOpen(false); }}>Próxima semana</Button>
                                <Button variant="outline" size="sm" onClick={() => { setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); setIsDatePickerOpen(false); }}>Este mes</Button>
                            </div>
                        </div>
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
            </div>
            <div className="flex justify-end items-center gap-2">
                <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Filtrar por partida" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Partidas</SelectItem>
                        {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="secondary" onClick={handleClearFilters}>Limpiar Filtros</Button>
            </div>
        </div>
    );
}
