
'use client';
import { supabase } from '@/lib/supabase';
import type { PortalUser } from '@/types';

export async function logActivity(
    userOrData: PortalUser | { userId: string; userName: string; action: string; details: string; severity?: string; entity?: string; entityId?: string },
    actionParam?: string,
    detailsParam?: string,
    entityIdParam?: string
) {
    let userId: string;
    let userName: string;
    let userRole: string = 'USER';
    let action: string;
    let details: string;
    let entityId: string | undefined;
    let entity: string | undefined;

    if (typeof userOrData === 'object' && 'userId' in userOrData) {
        // New object-based signature
        userId = userOrData.userId;
        userName = userOrData.userName;
        action = userOrData.action;
        details = userOrData.details;
        entityId = userOrData.entityId;
        entity = userOrData.entity;
    } else {
        // Old positional signature
        const user = userOrData as PortalUser;
        userId = user.id;
        userName = user.nombre;
        userRole = user.roles?.[0] || 'USER';
        action = actionParam || '';
        details = detailsParam || '';
        entityId = entityIdParam;
    }

    try {
        // Incluimos el nombre y rol en detalles porque esas columnas pueden no existir en la BD
        let finalDetails = details;
        try {
            const detailsObj = details ? JSON.parse(details) : {};
            finalDetails = JSON.stringify({
                ...detailsObj,
                userName,
                userRole
            });
        } catch (e) {
            finalDetails = JSON.stringify({
                originalDetails: details,
                userName,
                userRole
            });
        }

        const { error } = await supabase
            .from('activity_logs')
            .insert({
                user_id: userId || null,
                accion: action,
                detalles: finalDetails,
                entidad_id: entityId && entityId.length > 0 ? entityId : null,
                entidad: entity
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}
