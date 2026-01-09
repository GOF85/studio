import { useQuery } from '@tanstack/react-query';
import { supabase, resolveOsId, buildOsOr, buildFieldOr } from '@/lib/supabase';
import type { MaterialOrder, PickingSheet, ComercialBriefing } from '@/types';

export function useMaterialModuleData(osId: string, type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') {
    return useQuery({
        queryKey: ['materialModuleData', osId, type],
        queryFn: async () => {
            const targetId = await resolveOsId(osId);

            const [
                { data: orders },
                { data: pickingSheets },
                { data: returnSheets },
                { data: briefing },
                { data: mermas },
                { data: devoluciones }
            ] = await Promise.all([
                supabase.from('os_material_orders').select('*').eq('os_id', targetId).eq('type', type),
                supabase.from('hojas_picking').select('*').eq('os_id', targetId),
                supabase.from('hojas_retorno').select('*').eq('os_id', targetId),
                supabase.from('comercial_briefings').select('*').eq('os_id', targetId).maybeSingle(),
                supabase.from('os_mermas').select('*').eq('os_id', targetId),
                supabase.from('os_devoluciones').select('*').eq('os_id', targetId)
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
                    osId: p.os_id,
                    status: p.data?.status || 'Pendiente',
                    items: p.data?.items || [],
                    fechaNecesidad: p.data?.fecha || p.data?.fechaNecesidad || '',
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                })) as PickingSheet[],
                returnSheets: (returnSheets || []).map(p => ({
                    id: p.id,
                    osId: p.os_id,
                    items: p.data?.items || [],
                    itemStates: p.data?.itemStates || {},
                    status: p.data?.status || 'Pendiente'
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
