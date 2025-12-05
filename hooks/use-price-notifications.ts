import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { differenceInDays } from 'date-fns';

export type PriceAlert = {
    type: 'ingrediente' | 'elaboracion' | 'receta';
    itemId: string;
    itemName: string;
    oldPrice: number;
    newPrice: number;
    percentageChange: number;
    fecha: string;
};

/**
 * Hook to fetch price alerts for items with >5% price increases in the last 7 days
 */
export function usePriceAlerts() {
    return useQuery({
        queryKey: ['priceAlerts'],
        queryFn: async () => {
            const alerts: PriceAlert[] = [];

            // Get recent price changes (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentChanges } = await supabase
                .from('historico_precios_erp')
                .select('*')
                .gte('fecha', sevenDaysAgo.toISOString())
                .order('fecha', { ascending: false });

            if (!recentChanges) return alerts;

            // Group by article
            const articleGroups = new Map<string, typeof recentChanges>();
            recentChanges.forEach(change => {
                const group = articleGroups.get(change.articulo_erp_id) || [];
                group.push(change);
                articleGroups.set(change.articulo_erp_id, group);
            });

            // Calculate percentage changes
            for (const [articuloId, changes] of Array.from(articleGroups.entries())) {
                if (changes.length < 2) continue;

                const newest = changes[0];
                const previous = changes[1];
                const percentChange =
                    ((newest.precio_calculado - previous.precio_calculado) /
                        previous.precio_calculado) * 100;

                // Alert only on >5% increases
                if (percentChange > 5) {
                    // Get article info
                    const { data: articulo } = await supabase
                        .from('articulos_erp')
                        .select('nombre')
                        .eq('erp_id', articuloId)
                        .single();

                    alerts.push({
                        type: 'ingrediente',
                        itemId: articuloId,
                        itemName: articulo?.nombre || articuloId,
                        oldPrice: previous.precio_calculado,
                        newPrice: newest.precio_calculado,
                        percentageChange: percentChange,
                        fecha: newest.fecha,
                    });
                }
            }

            return alerts;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
