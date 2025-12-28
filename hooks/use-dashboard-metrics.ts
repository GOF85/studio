
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

export interface DashboardMetrics {
    eventosHoy: number;
    serviciosHoy: number;
    paxHoy: number;
    eventosSemana: number;
    serviciosSemana: number;
    paxSemana: number;
    eventosHoyList: any[];
    serviciosHoyList: any[];
    eventosSemanaList: any[];
    serviciosSemanaList: any[];
}

export function useDashboardMetrics() {
    return useQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: async (): Promise<DashboardMetrics> => {
            const now = new Date();
            const sWeek = startOfWeek(now, { weekStartsOn: 1 });
            const eWeek = endOfWeek(now, { weekStartsOn: 1 });
            const sDay = startOfDay(now);
            const eDay = endOfDay(now);

            // 1. Fetch events for the week
            const { data: events, error: eventsError } = await supabase
                .from('eventos')
                .select('id, start_date, asistentes, numero_expediente, space, client')
                .gte('start_date', sWeek.toISOString())
                .lte('start_date', eWeek.toISOString());

            if (eventsError) throw eventsError;

            const weekEvents = events || [];
            const todayEvents = weekEvents.filter(e => {
                const d = parseISO(e.start_date);
                return isWithinInterval(d, { start: sDay, end: eDay });
            });

            // 2. Fetch briefings for these events to count "hitos" (services)
            const eventIds = weekEvents.map(e => e.id);
            let weekServices: any[] = [];
            let weekPax = 0;
            let todayServices: any[] = [];
            let todayPax = 0;

            if (eventIds.length > 0) {
                const { data: briefings, error: briefingsError } = await supabase
                    .from('comercial_briefings')
                    .select('os_id, items')
                    .in('os_id', eventIds);

                if (briefingsError) throw briefingsError;

                (briefings || []).forEach(b => {
                    const items = (b.items || []) as any[];
                    // Check if this briefing belongs to a "today" event
                    const event = weekEvents.find(e => e.id === b.os_id);
                    const isToday = todayEvents.some(te => te.id === b.os_id);

                    items.forEach(item => {
                        // Solo contamos servicios que tengan gastronomía aplicada
                        if (item.conGastronomia) {
                            const serviceData = {
                                ...item,
                                os_id: b.os_id,
                                numero_expediente: event?.numero_expediente,
                                nombreEspacio: event?.space
                            };
                            weekServices.push(serviceData);
                            weekPax += Number(item.asistentes) || 0;

                            if (isToday) {
                                todayServices.push(serviceData);
                                todayPax += Number(item.asistentes) || 0;
                            }
                        }
                    });
                });
            }

            return {
                eventosHoy: todayEvents.length,
                serviciosHoy: todayServices.length,
                paxHoy: todayPax,
                eventosSemana: weekEvents.length,
                serviciosSemana: weekServices.length,
                paxSemana: weekPax,
                eventosHoyList: todayEvents,
                serviciosHoyList: todayServices,
                eventosSemanaList: weekEvents,
                serviciosSemanaList: weekServices,
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
