
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek } from 'date-fns';

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

export function useDashboardMetrics(initialData?: DashboardMetrics) {
    return useQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: async (): Promise<DashboardMetrics> => {
            const now = new Date();
            const sWeek = startOfWeek(now, { weekStartsOn: 1 });
            const eWeek = endOfWeek(now, { weekStartsOn: 1 });

            const { data, error } = await supabase.rpc('get_dashboard_metrics', {
                p_start_date: sWeek.toISOString(),
                p_end_date: eWeek.toISOString()
            });

            if (error) throw error;
            return data as DashboardMetrics;
        },
        initialData,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
