import { useCallback } from 'react';
import { supabase, resolveOsId, buildOsOr } from '@/lib/supabase';
import type { MaterialOrder } from '@/types';

export const useOSMaterialOrders = () => {
    const loadOrders = useCallback(async (osId: string, type?: string) => {
        try {
            const targetId = await resolveOsId(osId);
            let query = supabase.from('os_material_orders').select('*');
            
            if (targetId && targetId !== osId) {
                const orExpr = buildOsOr(osId, targetId);
                query = query.or(orExpr);
            } else {
                // If we couldn't resolve to a UUID, filter by numero_expediente
                // to avoid passing a non-UUID value to a UUID-typed os_id column.
                query = query.eq('numero_expediente', osId);
            }

            if (type) {
                query = query.eq('type', type);
            }
            const { data, error } = await query;
            if (error) throw error;
            
            return (data || []).map(o => ({
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
            })) as MaterialOrder[];
        } catch (error) {
            console.error('Error loading material orders:', error);
            return [];
        }
    }, []);

    const saveOrder = useCallback(async (order: Partial<MaterialOrder> & { osId: string, type: string }) => {
        try {
            const targetId = await resolveOsId(order.osId);
            // Si el ID no es un UUID válido (ej: es un timestamp de localStorage), lo ignoramos para que Supabase genere uno nuevo
            const isUuid = order.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
            
            const payload = {
                os_id: targetId,
                type: order.type,
                status: order.status || 'Asignado',
                items: order.items || [],
                days: order.days || 1,
                total: order.total || 0,
                contract_number: order.contractNumber,
                delivery_date: order.deliveryDate,
                delivery_space: order.deliverySpace,
                delivery_location: order.deliveryLocation,
                solicita: order.solicita
            };

            let result;
            if (isUuid) {
                result = await supabase.from('os_material_orders').upsert({
                    id: order.id,
                    ...payload
                }).select().single();
            } else {
                result = await supabase.from('os_material_orders').insert(payload).select().single();
            }

            if (result.error) throw result.error;
            return result.data;
        } catch (error) {
            console.error('Error saving material order:', error);
            throw error;
        }
    }, []);

    const deleteOrder = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('os_material_orders').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting material order:', error);
            throw error;
        }
    }, []);

    return { loadOrders, saveOrder, deleteOrder };
};
