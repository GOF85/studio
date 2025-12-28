import { useQuery } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { MaterialOrder, PickingSheet, ComercialBriefing } from '@/types';

export function useMaterialModuleData(osId: string, type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') {
    return useQuery({
        queryKey: ['materialModuleData', osId, type],
        queryFn: async () => {
            const targetId = await resolveOsId(osId);
            const osFilter = targetId !== osId ? `os_id.eq.${targetId},os_id.eq.${osId}` : `os_id.eq.${targetId}`;
            const eventoFilter = targetId !== osId ? `evento_id.eq.${targetId},evento_id.eq.${osId}` : `evento_id.eq.${targetId}`;

            const [
                { data: orders },
                { data: pickingSheets },
                { data: returnSheets },
                { data: briefing },
                { data: mermas },
                { data: devoluciones }
            ] = await Promise.all([
                supabase.from('material_orders').select('*').or(osFilter).eq('type', type),
                supabase.from('hojas_picking').select('*').or(eventoFilter),
                supabase.from('hojas_retorno').select('*').or(eventoFilter),
                supabase.from('comercial_briefings').select('*').or(osFilter).maybeSingle(),
                supabase.from('os_mermas').select('*').or(osFilter),
                supabase.from('os_devoluciones').select('*').or(osFilter)
            ]);

            return {
                orders: (orders || []).map(o => ({
                    id: o.id,
                    osId: o.os_id,
                    type: o.type,
                    status: o.status,
                    items: o.items || [],
                    days: o.days,
                    total: o.total,
                    contractNumber: o.contract_number,
                    deliveryDate: o.delivery_date,
                    deliverySpace: o.delivery_space,
                    deliveryLocation: o.delivery_location,
                    solicita: o.solicita
                })) as MaterialOrder[],
                pickingSheets: (pickingSheets || []).map(p => ({
                    id: p.id,
                    osId: p.evento_id,
                    status: p.estado,
                    items: p.items || [],
                    fechaNecesidad: p.data?.fecha || p.data?.fechaNecesidad || '',
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                })) as PickingSheet[],
                returnSheets: (returnSheets || []).map(p => ({
                    id: p.id,
                    osId: p.evento_id,
                    items: p.items || [],
                    itemStates: p.data?.itemStates || {},
                    status: p.estado
                })) as any[],
                briefing: briefing ? {
                    osId: briefing.os_id,
                    items: briefing.items || []
                } : { osId, items: [] } as ComercialBriefing,
                mermas: mermas || [],
                devoluciones: devoluciones || []
            };
        },
        enabled: !!osId
    });
}
