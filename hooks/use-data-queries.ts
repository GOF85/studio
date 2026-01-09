import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase, resolveOsId, buildOsOr, buildFieldOr } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { normalizeCategoria } from '@/lib/utils';
import {
    getEspacios,
    getEspacioById,
    createEspacio,
    updateEspacio,
    deleteEspacio
} from '@/services/espacios-service';
import { mapArticuloFromDB, getArticulosPaginated } from '@/services/articulos-service';
import { mapArticuloERPFromDB, getArticulosERPPaginated } from '@/services/erp-service';
import { mapPersonalFromDB, getPersonalPaginated, upsertPersonal, uploadPersonalPhoto } from '@/services/personal-service';
import { mapProveedorFromDB, getProveedoresPaginated } from '@/services/proveedores-service';
import { getPersonalExternoPaginated, upsertPersonalExterno, deletePersonalExterno } from '@/services/personal-externo-service';
import type { EspacioV2 } from '@/types/espacios';
import type {
    ServiceOrder,
    ComercialBriefing,
    CategoriaPersonal,
    PersonalExternoTurno,
    SolicitudPersonalCPR,
    ArticuloCatering,
    Proveedor,
    ObjetivoMensualCPR,
    IngredienteInterno,
    ArticuloERP,
    MaterialOrder,
    TransporteOrder,
    AtipicoOrder,
    PersonalMiceOrder,
    PersonalExternoAjuste,
    PickingSheet,
    ReturnSheet,
    PedidoPlantilla,
    FamiliaERP,
    Personal,
    PersonalExterno,
    Receta,
    Elaboracion,
    GastronomyOrder,
    Entrega,
    PedidoEntrega,
} from '@/types';

// ============================================
// HELPERS
// ============================================

// ============================================
// DATABASE / MASTER DATA
// ============================================

export function useDatabaseCounts() {
    return useQuery({
        queryKey: ['databaseCounts'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_database_counts');
            if (error) throw error;
            return data as Record<string, number>;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// COMERCIAL AJUSTES
// ============================================
export function useComercialAjustes(osId?: string) {
    return useQuery({
        queryKey: ['comercialAjustes', osId],
        queryFn: async () => {
            if (!osId) return [];
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            const { data, error } = await supabase
                .from('comercial_ajustes')
                .select('*')
                .or(orExpr);
            if (error) throw error;
            return (data || []).map(a => ({
                id: a.id,
                concepto: a.concepto,
                importe: a.importe
            }));
        },
        enabled: !!osId,
    });
}

export function useUpdateComercialAjustes() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ osId, ajustes }: { osId: string, ajustes: any[] }) => {
            const targetId = await resolveOsId(osId);
            // First delete existing
            const orExpr = buildOsOr(osId, targetId);
            await supabase.from('comercial_ajustes').delete().or(orExpr);
            // Then insert new
            if (ajustes.length > 0) {
                const { error } = await supabase
                    .from('comercial_ajustes')
                    .insert(ajustes.map(a => ({
                        os_id: targetId,
                        concepto: a.concepto,
                        importe: a.importe
                    })));
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comercialAjustes', variables.osId] });
        },
    });
}

// ============================================
// OBJETIVOS GASTO PLANTILLAS (MÍNIMO)
// ============================================
export function useObjetivosGastoPlantillas() {
    return { data: [], isLoading: false };
}

// ============================================
// TIPOS AUXILIARES
// ============================================
type UnifiedTurno = (PersonalExternoTurno & { type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });
type AssignableWorker = { label: string; value: string; id: string; };

// ============================================
// ACTIVITY LOGS
// ============================================

export function useActivityLogs() {
    return useQuery({
        queryKey: ['activityLogs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            return (data || []).map(log => {
                let name = 'Usuario';
                let message = '';
                try {
                    const parsed = typeof log.detalles === 'string' ? JSON.parse(log.detalles) : log.detalles;
                    if (parsed?.userName) name = parsed.userName;
                    message = parsed?.originalDetails || (typeof log.detalles === 'string' ? log.detalles : '');
                } catch (e) {
                    message = typeof log.detalles === 'string' ? log.detalles : '';
                }

                return {
                    id: log.id,
                    timestamp: log.created_at,
                    userId: log.user_id,
                    userName: name,
                    userRole: 'USER',
                    action: log.accion,
                    details: message,
                    entityId: log.entidad_id || ''
                };
            });
        },
    });
}

export function useCategoriasPersonal() {
    return useQuery({
        queryKey: ['categoriasPersonal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorias_personal')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return data || [];
        },
    });
}

// ============================================
// EVENTOS (Service Orders)
// ============================================

function mapEvento(data: any): ServiceOrder {
    let responsables: any = {};
    try {
        responsables = typeof data.responsables === 'string'
            ? JSON.parse(data.responsables)
            : (data.responsables || {});
    } catch (err) {
        console.error('Error parsing responsables:', err);
    }

    return {
        id: data.id,
        numero_expediente: data.numero_expediente || '',
        serviceNumber: data.numero_expediente || '',
        isVip: data.is_vip || false,
        client: data.client || '',
        tipoCliente: data.tipo_cliente || 'Empresa',
        finalClient: data.final_client || '',
        startDate: data.start_date,
        endDate: data.end_date,
        status: (data.status || 'Borrador') as any,
        asistentes: data.asistentes || 0,
        vertical: data.vertical || 'Catering',
        cateringVertical: data.catering_vertical,
        comercial: data.comercial || '',
        comercialPhone: data.comercial_phone || '',
        comercialMail: data.comercial_mail || '',
        comercialAsiste: data.comercial_asiste || false,
        space: data.space || '',
        spaceAddress: data.space_address || '',
        spaceContact: data.space_contact || '',
        spacePhone: data.space_phone || '',
        spaceMail: data.space_mail || '',
        contact: data.contact || '',
        phone: data.phone || '',
        email: data.email || '',
        direccionPrincipal: data.direccion_principal,
        respMetre: responsables.metre || '',
        respMetrePhone: responsables.metre_phone || '',
        respMetreMail: responsables.metre_mail || '',
        respCocinaCPR: responsables.cocina_cpr || '',
        respCocinaCPRPhone: responsables.cocina_cpr_phone || '',
        respCocinaCPRMail: responsables.cocina_cpr_mail || '',
        respPase: responsables.pase || '',
        respPasePhone: responsables.pase_phone || '',
        respPaseMail: responsables.pase_mail || '',
        respCocinaPase: responsables.cocina_pase || '',
        respCocinaPasePhone: responsables.cocina_pase_phone || '',
        respCocinaPaseMail: responsables.cocina_pase_mail || '',
        rrhhAsiste: data.rrhh_asiste || false,
        respRRHH: responsables.rrhh || '',
        respRRHHPhone: responsables.rrhh_phone || '',
        respRRHHMail: responsables.rrhh_mail || '',
        respProjectManager: responsables.project_manager || '',
        respProjectManagerPhone: responsables.project_manager_phone || '',
        respProjectManagerMail: responsables.project_manager_mail || '',
        agencyPercentage: parseFloat(data.agency_percentage ?? '0'),
        agencyCommissionValue: data.agency_commission_value ? Number(data.agency_commission_value) : undefined,
        spacePercentage: parseFloat(data.space_percentage ?? '0'),
        spaceCommissionValue: data.space_commission_value ? Number(data.space_commission_value) : undefined,
        comisionesAgencia: parseFloat(data.comisiones_agencia ?? '0'),
        comisionesCanon: parseFloat(data.comisiones_canon ?? '0'),
        facturacion: parseFloat(data.facturacion ?? '0'),
        plane: data.plane || '',
        comments: data.comments || '',
        deliveryTime: data.delivery_time || undefined,
        deliveryLocations: data.delivery_locations ? (typeof data.delivery_locations === 'string' ? JSON.parse(data.delivery_locations) : data.delivery_locations) : [],
        objetivoGastoId: data.objetivo_gasto_id || undefined,
        anulacionMotivo: data.anulacion_motivo || undefined,
    } as ServiceOrder;
}

export function useEventos() {
    return useQuery({
        queryKey: ['eventos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .order('start_date', { ascending: false });
            if (error) throw error;
            return (data || []).map(mapEvento);
        },
    });
}

export function useEventosPaginated(page: number, pageSize: number, searchTerm: string) {
    return useQuery({
        queryKey: ['eventos-paginated', page, pageSize, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('eventos')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`numero_expediente.ilike.%${searchTerm}%,cliente.ilike.%${searchTerm}%,cliente_final.ilike.%${searchTerm}%`);
            }

            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('start_date', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                eventos: (data || []).map(mapEvento),
                totalCount: count || 0
            };
        },
    });
}

export function useCalendarEvents(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['calendarEvents', startDate, endDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_calendar_events', {
                p_start_date: startDate,
                p_end_date: endDate
            });
            if (error) throw error;
            
            const events = (data as any[] || []).map(mapEvento);
            const briefings = (data as any[] || []).map(b => {
                let items = [];
                try {
                    items = typeof b.briefing_items === 'string' ? JSON.parse(b.briefing_items) : (b.briefing_items || []);
                } catch (err) {
                    console.error('Error parsing briefing items in calendar:', err);
                }
                return {
                    os_id: b.id,
                    items
                };
            });

            return { events, briefings };
        },
        enabled: !!startDate && !!endDate,
    });
}

export function useEventList(filters: { search?: string, status?: string, timeFilter?: string, showPast?: boolean, limit?: number, offset?: number }) {
    return useQuery({
        queryKey: ['eventList', filters],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_event_list', {
                p_search: filters.search || null,
                p_status: filters.status || 'all',
                p_time_filter: filters.timeFilter || 'all',
                p_show_past: !!filters.showPast,
                p_limit: filters.limit || 50,
                p_offset: filters.offset || 0
            });

            if (error) throw error;
            
            const rows = data as any[] || [];
            const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

            return {
                events: rows.map(e => {
                    let briefingItems = [];
                    if (e.briefing?.items) {
                        try {
                            briefingItems = typeof e.briefing.items === 'string' 
                                ? JSON.parse(e.briefing.items) 
                                : e.briefing.items;
                        } catch (err) {
                            console.error('Error parsing briefing items:', err);
                        }
                    }
                    
                    return {
                        ...mapEvento(e),
                        briefing: e.briefing ? {
                            ...e.briefing,
                            osId: e.briefing.os_id,
                            items: briefingItems
                        } : null
                    };
                }),
                totalCount
            };
        },
    });
}


export function useEvento(idOrNumber?: string) {
    return useQuery({
        queryKey: ['eventos', idOrNumber],
        queryFn: async () => {
            if (!idOrNumber) return null;

            // Try by ID first (if it's a UUID)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);

            let query = supabase.from('eventos').select('*');

            if (isUuid) {
                query = query.eq('id', idOrNumber);
            } else {
                query = query.eq('numero_expediente', idOrNumber);
            }

            const { data, error } = await query.maybeSingle();

            // Debugging: log queries and responses to help trace missing OS
            // debug logs removed for production

            if (error) {
                throw error;
            }

            if (!data) {
                // If not found by ID, try by numero_expediente as fallback
                if (isUuid) {
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('eventos')
                        .select('*')
                        .eq('numero_expediente', idOrNumber)
                        .maybeSingle();

                    if (fallbackError) throw fallbackError;
                    return fallbackData ? mapEvento(fallbackData) : null;
                }
                return null;
            }

            return mapEvento(data);
        },
        enabled: !!idOrNumber,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useCreateEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (evento: Partial<ServiceOrder>) => {
            const { data, error } = await supabase
                .from('eventos')
                .insert({
                    numero_expediente: evento.serviceNumber,
                    client: evento.client,
                    final_client: evento.finalClient,
                    tipo_cliente: evento.tipoCliente || 'Empresa',
                    start_date: evento.startDate,
                    end_date: evento.endDate,
                    status: evento.status || 'Borrador',
                    asistentes: evento.asistentes || 0,
                    vertical: evento.vertical,
                    catering_vertical: evento.cateringVertical,
                    space: evento.space,
                    space_address: evento.spaceAddress,
                    space_contact: evento.spaceContact,
                    space_phone: evento.spacePhone,
                    space_mail: evento.spaceMail,
                    contact: evento.contact,
                    phone: evento.phone,
                    email: evento.email,
                    comercial: evento.comercial,
                    comercial_phone: evento.comercialPhone,
                    comercial_mail: evento.comercialMail,
                    comercial_asiste: evento.comercialAsiste,
                    rrhh_asiste: evento.rrhhAsiste,
                    plane: evento.plane,
                    comments: evento.comments,
                    is_vip: evento.isVip,
                    direccion_principal: evento.direccionPrincipal,
                    objetivo_gasto_id: evento.objetivoGastoId,
                    agency_percentage: evento.agencyPercentage,
                    agency_commission_value: evento.agencyCommissionValue,
                    space_percentage: evento.spacePercentage,
                    space_commission_value: evento.spaceCommissionValue,
                    comisiones_agencia: evento.comisionesAgencia,
                    comisiones_canon: evento.comisionesCanon,
                    facturacion: evento.facturacion,
                    delivery_time: evento.deliveryTime,
                    delivery_locations: evento.deliveryLocations ? JSON.stringify(evento.deliveryLocations) : null,
                    responsables: JSON.stringify({
                        ...(((evento as any).responsables) || {}),
                        rrhh: evento.respRRHH,
                        rrhh_phone: evento.respRRHHPhone,
                        rrhh_mail: evento.respRRHHMail,
                        project_manager: evento.respProjectManager,
                        project_manager_phone: evento.respProjectManagerPhone,
                        project_manager_mail: evento.respProjectManagerMail,
                        metre: evento.respMetre,
                        metre_phone: evento.respMetrePhone,
                        metre_mail: evento.respMetreMail,
                        cocina_cpr: evento.respCocinaCPR,
                        cocina_cpr_phone: evento.respCocinaCPRPhone,
                        cocina_cpr_mail: evento.respCocinaCPRMail,
                        pase: evento.respPase,
                        pase_phone: evento.respPasePhone,
                        pase_mail: evento.respPaseMail,
                        cocina_pase: evento.respCocinaPase,
                        cocina_pase_phone: evento.respCocinaPasePhone,
                        cocina_pase_mail: evento.respCocinaPaseMail,
                    }),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos', data.id] });
            queryClient.invalidateQueries({ queryKey: ['eventos', data.numero_expediente] });
        },
    });
}

export function useUpdateEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ServiceOrder> & { id: string }) => {
            const { data, error } = await supabase
                .from('eventos')
                .update({
                    client: updates.client,
                    final_client: updates.finalClient,
                    tipo_cliente: updates.tipoCliente,
                    start_date: updates.startDate,
                    end_date: updates.endDate,
                    status: updates.status,
                    asistentes: updates.asistentes,
                    vertical: updates.vertical,
                    catering_vertical: updates.cateringVertical,
                    space: updates.space,
                    space_address: updates.spaceAddress,
                    space_contact: updates.spaceContact,
                    space_phone: updates.spacePhone,
                    space_mail: updates.spaceMail,
                    contact: updates.contact,
                    phone: updates.phone,
                    email: updates.email,
                    comercial: updates.comercial,
                    comercial_phone: updates.comercialPhone,
                    comercial_mail: updates.comercialMail,
                    comercial_asiste: updates.comercialAsiste,
                    rrhh_asiste: updates.rrhhAsiste,
                    plane: updates.plane,
                    comments: updates.comments,
                    is_vip: updates.isVip,
                    direccion_principal: updates.direccionPrincipal,
                    objetivo_gasto_id: updates.objetivoGastoId,
                    agency_percentage: updates.agencyPercentage,
                    agency_commission_value: updates.agencyCommissionValue,
                    space_percentage: updates.spacePercentage,
                    space_commission_value: updates.spaceCommissionValue,
                    comisiones_agencia: updates.comisionesAgencia,
                    comisiones_canon: updates.comisionesCanon,
                    facturacion: updates.facturacion,
                    delivery_time: updates.deliveryTime,
                    delivery_locations: updates.deliveryLocations ? JSON.stringify(updates.deliveryLocations) : null,
                    responsables: JSON.stringify({
                        ...(((updates as any).responsables) || {}),
                        rrhh: updates.respRRHH,
                        rrhh_phone: updates.respRRHHPhone,
                        rrhh_mail: updates.respRRHHMail,
                        project_manager: updates.respProjectManager,
                        project_manager_phone: updates.respProjectManagerPhone,
                        project_manager_mail: updates.respProjectManagerMail,
                        metre: updates.respMetre,
                        metre_phone: updates.respMetrePhone,
                        metre_mail: updates.respMetreMail,
                        cocina_cpr: updates.respCocinaCPR,
                        cocina_cpr_phone: updates.respCocinaCPRPhone,
                        cocina_cpr_mail: updates.respCocinaCPRMail,
                        pase: updates.respPase,
                        pase_phone: updates.respPasePhone,
                        pase_mail: updates.respPaseMail,
                        cocina_pase: updates.respCocinaPase,
                        cocina_pase_phone: updates.respCocinaPasePhone,
                        cocina_pase_mail: updates.respCocinaPaseMail,
                    }),
                })
                .eq('id', id);

            if (error) throw error;
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
        },
    });
}

export function useDeleteEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('eventos').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
        },
    });
}

// ============================================
// ENTREGAS
// ============================================

export function useEntregas() {
    return useQuery<Entrega[]>({
        queryKey: ['entregas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('entregas')
                .select('*')
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;
            
            return (data || []).map(item => {
                const extraData = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
                return {
                    ...item,
                    ...extraData,
                    // Asegurar que los campos de la tabla tengan prioridad sobre los de 'data'
                    id: item.id,
                    numero_expediente: item.numero_expediente,
                    estado: item.estado,
                    fecha_inicio: item.fecha_inicio,
                    fecha_fin: item.fecha_fin
                };
            }) as Entrega[];
        },
    });
}

export function useEntrega(id: string) {
    return useQuery({
        queryKey: ['entrega', id],
        queryFn: async () => {
            if (!id) return null;
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            
            // 1. Try to find in 'entregas' table first
            let query = supabase.from('entregas').select('*');
            if (isUuid) {
                query = query.eq('id', id);
            } else {
                query = query.eq('numero_expediente', id);
            }

            const { data: entregaData, error: entregaError } = await query.maybeSingle();
            if (entregaError) throw entregaError;

            if (entregaData) {
                const extraData = typeof entregaData.data === 'string' ? JSON.parse(entregaData.data) : (entregaData.data || {});
                return {
                    ...entregaData,
                    ...extraData,
                    id: entregaData.id,
                    numero_expediente: entregaData.numero_expediente,
                    estado: entregaData.estado,
                    fecha_inicio: entregaData.fecha_inicio,
                    fecha_fin: entregaData.fecha_fin
                };
            }

            // 2. Fallback to 'eventos' table if not found in 'entregas'
            let osQuery = supabase.from('eventos').select('*');
            if (isUuid) {
                osQuery = osQuery.eq('id', id);
            } else {
                osQuery = osQuery.eq('numero_expediente', id);
            }

            const { data: osData, error: osError } = await osQuery.maybeSingle();
            if (osError) throw osError;

            if (!osData) return null;

            // Map 'eventos' data to 'Entrega' shape
            return {
                ...osData,
                serviceNumber: osData.numero_expediente,
                client: osData.nombre_evento,
                startDate: osData.fecha_inicio,
                endDate: osData.fecha_fin,
                status: osData.estado === 'CONFIRMADO' ? 'Confirmado' :
                        osData.estado === 'CANCELADO' ? 'Anulado' :
                        osData.estado === 'EJECUTADO' ? 'Entregado' : 'Borrador',
                tarifa: osData.tarifa === 'IFEMA' ? 'IFEMA' : 'Empresa',
                data: osData.data || {}
            };
        },
        enabled: !!id,
    });
}

export function useUpdateEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            const { data, error } = await supabase
                .from('entregas')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
            queryClient.invalidateQueries({ queryKey: ['entrega', data.id] });
        },
    });
}

export function useCreateEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entrega: any) => {
            const { data, error } = await supabase
                .from('entregas')
                .insert(entrega)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
        },
    });
}

export function usePruebaMenu(osId: string) {
    return useQuery({
        queryKey: ['prueba-menu', osId],
        queryFn: async () => {
            if (!osId) return null;
            let query = supabase.from('pruebas_menu').select('*');

            // Normalize: pruebas_menu stores the `numero_expediente` in `os_id`.
            if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const { data: os } = await supabase.from('eventos').select('numero_expediente').eq('id', osId).single();
                if (os) {
                    query = query.eq('numero_expediente', os.numero_expediente);
                } else {
                    return null;
                }
            } else {
                query = query.eq('numero_expediente', osId);
            }

            const { data, error } = await query.maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!osId,
    });
}

export function useUpdatePruebaMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ osId, data }: { osId: string; data: any }) => {
            let targetOsId = osId;
            if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const { data: os } = await supabase.from('eventos').select('numero_expediente').eq('id', osId).single();
                if (os) targetOsId = os.numero_expediente;
            }

            const { error } = await supabase
                .from('pruebas_menu')
                .upsert({
                    os_id: targetOsId,
                    items: data.items,
                    observaciones_generales: data.observacionesGenerales,
                    coste_prueba_menu: data.costePruebaMenu,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'os_id' });

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['prueba-menu', variables.osId] });
            queryClient.invalidateQueries({ queryKey: ['pruebasMenu', variables.osId] });
        },
    });
}

// ============================================
// RECETAS
// ============================================

export function useRecetas() {
    return useQuery<Receta[], Error>({
        queryKey: ['recetas'],
        queryFn: async () => {
            const { data: recetas, error: recetasError } = await supabase
                .from('recetas')
                .select('*')
                .order('nombre', { ascending: true });

            if (recetasError) throw recetasError;

            const { data: elaboraciones, error: elabError } = await supabase
                .from('elaboraciones')
                .select('id, nombre, alergenos');

            if (elabError) {
                console.warn('Error fetching elaboraciones:', elabError);
            }

            const elabMap = new Map((elaboraciones || []).map((e: any) => [e.id, e]));

            return (recetas || []).map((r: any) => {
                const mappedElaboraciones = (r.elaboraciones || [])
                    .map((d: any) => {
                        const elab = elabMap.get(d.elaboracionId);
                        return {
                            id: d.id,
                            elaboracionId: d.elaboracionId,
                            nombre: elab ? elab.nombre : d.nombre,
                            cantidad: d.cantidad,
                            coste: d.coste || 0,
                            gramaje: d.gramaje || 0,
                            unidad: d.unidad || 'UD',
                            merma: d.merma || 0,
                            alergenos: elab ? elab.alergenos : (d.alergenos || []),
                        };
                    });

                const allAlergenos = Array.from(new Set([
                    ...(r.alergenos || []),
                    ...mappedElaboraciones.flatMap((e: any) => e.alergenos || [])
                ]));

                return {
                    id: r.id,
                    nombre: r.nombre,
                    descripcionComercial: r.descripcion_comercial,
                    precioVenta: r.precio_venta,
                    costeMateriaPrima: r.coste_teorico,
                    costeTeorico: r.coste_teorico,
                    estado: r.estado,
                    isArchived: r.is_archived ?? false,
                    visibleParaComerciales: true,
                    responsableEscandallo: '',
                    categoria: r.categoria || '',
                    estacionalidad: 'MIXTO' as const,
                    tipoDieta: 'NINGUNO' as const,
                    requiereRevision: r.requiere_revision,
                    comentarioRevision: r.comentario_revision,
                    fechaRevision: r.fecha_revision,
                    elaboraciones: mappedElaboraciones,
                    menajeAsociado: r.menaje_asociado || [],
                    instruccionesMiseEnPlace: '',
                    instruccionesRegeneracion: '',
                    instruccionesEmplatado: '',
                    fotosMiseEnPlace: [],
                    fotosRegeneracion: [],
                    fotosEmplatado: [],
                    fotosComerciales: [],
                    porcentajeCosteProduccion: 0,
                    alergenos: allAlergenos,
                };
            });
        },
    });
}

export function useCreateReceta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (receta: any) => {
            const { data, error } = await supabase
                .from('recetas')
                .insert({
                    nombre: receta.nombre,
                    descripcion_comercial: receta.descripcionComercial,
                    precio_venta: receta.precioVenta,
                    coste_teorico: receta.costeTeorico,
                    estado: receta.estado || 'BORRADOR',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recetas'] });
        },
    });
}

// ============================================
// ELABORACIONES
// ============================================

export function useElaboraciones() {
    return useQuery<Elaboracion[], Error>({
        queryKey: ['elaboraciones'],
        queryFn: async () => {
            const { data: elaboraciones, error: elabError } = await supabase
                .from('elaboraciones')
                .select('*')
                .order('nombre', { ascending: true });

            if (elabError) throw elabError;

            const { data: componentes, error: compError } = await supabase
                .from('elaboracion_componentes')
                .select('*');

            if (compError) throw compError;

            return (elaboraciones || []).map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                partidaProduccion: e.partida,
                unidadProduccion: e.unidad_produccion,
                instruccionesPreparacion: e.instrucciones,
                caducidadDias: e.caducidad_dias,
                costePorUnidad: e.coste_unitario,
                costeUnitario: e.coste_unitario,
                produccionTotal: e.produccion_total || 0,
                requiereRevision: e.requiere_revision,
                comentarioRevision: e.comentario_revision,
                fechaRevision: e.fecha_revision,
                responsableRevision: e.responsable_revision,
                fotos: e.fotos || [],
                videoProduccionURL: e.video_produccion_url || '',
                formatoExpedicion: e.formato_expedicion || '',
                ratioExpedicion: e.ratio_expedicion || 1,
                tipoExpedicion: (e.tipo_expedicion || 'REFRIGERADO') as 'REFRIGERADO' | 'CONGELADO' | 'SECO' | 'AMBIENTE' | 'CALIENTE',
                componentes: (componentes || [])
                    .filter((c: any) => c.elaboracion_padre_id === e.id)
                    .map((c: any) => ({
                        id: c.id,
                        tipo: (c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion') as 'ingrediente' | 'elaboracion',
                        componenteId: c.componente_id,
                        nombre: 'Componente ' + c.componente_id, // Se resolverá en el frontend o con un join si es necesario
                        cantidad: c.cantidad_neta,
                        costePorUnidad: 0,
                        merma: c.merma_aplicada,
                    })),
            }));
        },
    });
}

export function useElaboracion(id?: string) {
    return useQuery({
        queryKey: ['elaboracion', id],
        queryFn: async () => {
            if (!id) return null;
            const { data: e, error: elabError } = await supabase
                .from('elaboraciones')
                .select('*')
                .eq('id', id)
                .single();

            if (elabError) throw elabError;

            const { data: componentes, error: compError } = await supabase
                .from('elaboracion_componentes')
                .select('*')
                .eq('elaboracion_padre_id', id);

            if (compError) throw compError;

            return {
                id: e.id,
                nombre: e.nombre,
                partidaProduccion: e.partida,
                unidadProduccion: e.unidad_produccion,
                instruccionesPreparacion: e.instrucciones,
                caducidadDias: e.caducidad_dias,
                costePorUnidad: e.coste_unitario,
                costeUnitario: e.coste_unitario,
                produccionTotal: e.produccion_total || 0,
                requiereRevision: e.requiere_revision,
                comentarioRevision: e.comentario_revision,
                fechaRevision: e.fecha_revision,
                responsableRevision: e.responsable_revision,
                fotos: e.fotos || [],
                videoProduccionURL: e.video_produccion_url || '',
                formatoExpedicion: e.formato_expedicion || '',
                ratioExpedicion: e.ratio_expedicion || 1,
                tipoExpedicion: (e.tipo_expedicion || 'REFRIGERADO') as 'REFRIGERADO' | 'CONGELADO' | 'SECO' | 'AMBIENTE' | 'CALIENTE',
                componentes: (componentes || []).map((c: any) => ({
                    id: c.id,
                    tipo: (c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion') as 'ingrediente' | 'elaboracion',
                    componenteId: c.componente_id,
                    nombre: 'Cargando...', // Se resolverá en el form
                    cantidad: c.cantidad_neta,
                    costePorUnidad: 0,
                    merma: c.merma_aplicada,
                })),
            };
        },
        enabled: !!id,
    });
}

export function useUpsertElaboracion() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: any) => {
            const { componentes, ...elabData } = data;

            // 1. Upsert elaboración
            const { error: elabError } = await supabase
                .from('elaboraciones')
                .upsert({
                    id: elabData.id,
                    nombre: elabData.nombre,
                    partida: elabData.partidaProduccion,
                    unidad_produccion: elabData.unidadProduccion,
                    instrucciones: elabData.instruccionesPreparacion,
                    produccion_total: elabData.produccionTotal,
                    coste_unitario: elabData.costeUnitario,
                    caducidad_dias: elabData.caducidadDias,
                    fotos: elabData.fotos,
                    video_produccion_url: elabData.videoProduccionURL,
                    formato_expedicion: elabData.formatoExpedicion,
                    ratio_expedicion: elabData.ratioExpedicion,
                    tipo_expedicion: elabData.tipoExpedicion,
                    requiere_revision: elabData.requiereRevision,
                    comentario_revision: elabData.comentarioRevision,
                    fecha_revision: elabData.fechaRevision,
                    responsable_revision: elabData.responsableRevision
                });

            if (elabError) throw elabError;

            // 2. Delete existing components
            const { error: deleteError } = await supabase
                .from('elaboracion_componentes')
                .delete()
                .eq('elaboracion_padre_id', elabData.id);

            if (deleteError) throw deleteError;

            // 3. Insert new components
            if (componentes && componentes.length > 0) {
                const { error: insertError } = await supabase
                    .from('elaboracion_componentes')
                    .insert(componentes.map((c: any) => ({
                        elaboracion_padre_id: elabData.id,
                        tipo_componente: c.tipo === 'ingrediente' ? 'ARTICULO' : 'ELABORACION',
                        componente_id: c.componenteId,
                        cantidad_neta: c.cantidad,
                        merma_aplicada: c.merma
                    })));

                if (insertError) throw insertError;
            }

            return elabData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elaboraciones'] });
            queryClient.invalidateQueries({ queryKey: ['elaboracion'] });
            toast({ title: 'Éxito', description: 'Elaboración guardada correctamente' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
}

export function useDeleteElaboracion() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('elaboraciones')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elaboraciones'] });
            toast({ title: 'Éxito', description: 'Elaboración eliminada correctamente' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
}

// ============================================
// RECETAS
// ============================================

export function useReceta(id?: string) {
    return useQuery({
        queryKey: ['receta', id],
        queryFn: async () => {
            if (!id || id === 'nueva') return null;
            const { data: r, error } = await supabase
                .from('recetas')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const { data: elaboraciones, error: elabError } = await supabase
                .from('elaboraciones')
                .select('id, nombre, alergenos');

            if (elabError) {
                console.warn('Error fetching elaboraciones:', elabError);
            }

            const elabMap = new Map((elaboraciones || []).map((e: any) => [e.id, e]));

            const mappedElaboraciones = (r.elaboraciones || [])
                .map((d: any) => {
                    const elab = elabMap.get(d.elaboracionId);
                    return {
                        id: d.id,
                        elaboracionId: d.elaboracionId,
                        nombre: elab ? elab.nombre : d.nombre,
                        cantidad: d.cantidad,
                        coste: d.coste || 0,
                        gramaje: d.gramaje || 0,
                        unidad: d.unidad || 'UD',
                        merma: d.merma || 0,
                        alergenos: elab ? elab.alergenos : (d.alergenos || []),
                    };
                });

            const allAlergenos = Array.from(new Set([
                ...(r.alergenos || []),
                ...mappedElaboraciones.flatMap((e: any) => e.alergenos || [])
            ]));

            return {
                id: r.id,
                nombre: r.nombre,
                descripcionComercial: r.descripcion_comercial,
                precioVenta: r.precio_venta,
                costeTeorico: r.coste_teorico,
                estado: r.estado,
                isArchived: r.is_archived ?? false,
                visibleParaComerciales: true,
                responsableEscandallo: '',
                categoria: r.categoria || '',
                estacionalidad: 'MIXTO' as const,
                tipoDieta: 'NINGUNO' as const,
                requiereRevision: r.requiere_revision,
                comentarioRevision: r.comentario_revision,
                fechaRevision: r.fecha_revision,
                elaboraciones: mappedElaboraciones,
                menajeAsociado: r.menaje_asociado || [],
                instruccionesMiseEnPlace: '',
                instruccionesRegeneracion: '',
                instruccionesEmplatado: '',
                alergenos: allAlergenos,
            };
        },
        enabled: !!id && id !== 'nueva',
    });
}

export function useUpsertReceta() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, isEditing, ...data }: any) => {
            if (isEditing) {
                const { data: updated, error } = await supabase
                    .from('recetas')
                    .update(data)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return updated;
            } else {
                const { data: inserted, error } = await supabase
                    .from('recetas')
                    .insert([data])
                    .select()
                    .single();
                if (error) throw error;
                return inserted;
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['recetas'] });
            queryClient.invalidateQueries({ queryKey: ['receta', data.id] });
            toast({ title: 'Éxito', description: 'Receta guardada correctamente' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
}

export function useDeleteReceta() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('recetas')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recetas'] });
            toast({ title: 'Éxito', description: 'Receta eliminada correctamente' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
}

// ============================================
// INGREDIENTES INTERNOS
// ============================================

export function useIngredientesInternos() {
    return useQuery({
        queryKey: ['ingredientesInternos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredientes_internos')
                .select('*')
                .order('nombre_ingrediente');
            if (error) throw error;
            return (data || []).map(d => ({
                id: d.id,
                nombreIngrediente: d.nombre_ingrediente,
                productoERPlinkId: d.producto_erp_link_id,
                alergenosPresentes: d.alergenos_presentes || [],
                alergenosTrazas: d.alergenos_trazas || [],
                historialRevisiones: d.historial_revisiones || []
            })) as IngredienteInterno[];
        }
    });
}

export function useUpsertIngredienteInterno() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ingrediente: Partial<IngredienteInterno>) => {
            const dbData = {
                id: ingrediente.id,
                nombre_ingrediente: ingrediente.nombreIngrediente,
                producto_erp_link_id: ingrediente.productoERPlinkId,
                alergenos_presentes: ingrediente.alergenosPresentes,
                alergenos_trazas: ingrediente.alergenosTrazas,
                historial_revisiones: ingrediente.historialRevisiones
            };

            const { data, error } = await supabase
                .from('ingredientes_internos')
                .upsert(dbData)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredientesInternos'] });
            toast({ title: 'Ingrediente guardado' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
        },
    });
}

export function useDeleteIngredienteInterno() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('ingredientes_internos')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredientesInternos'] });
            toast({ title: 'Ingrediente eliminado' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        },
    });
}

// ============================================
// ARTICULOS ERP
// ============================================

export function useArticulosERP() {
    return useQuery({
        queryKey: ['articulosERP'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('*')
                .limit(10000);
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                idreferenciaerp: row.erp_id || '',
                idProveedor: row.proveedor_id || '',
                nombreProveedor: row.nombre_proveedor || 'Sin proveedor',
                nombreProductoERP: row.nombre || '',
                referenciaProveedor: row.referencia_proveedor || '',
                familiaCategoria: row.familia_categoria || '',
                precioCompra: row.precio_compra || 0,
                descuento: row.descuento || 0,
                unidadConversion: row.unidad_conversion || 1,
                precio: row.precio || 0,
                precioAlquiler: row.precio_alquiler || 0,
                unidad: row.unidad_medida || 'UD',
                tipo: row.tipo || '',
                categoriaMice: row.categoria_mice || '',
                alquiler: row.alquiler || false,
                observaciones: row.observaciones || '',
            })) as ArticuloERP[];
        }
    });
}

export function useArticuloERP(erpId: string | undefined) {
    return useQuery({
        queryKey: ['articuloERP', erpId],
        queryFn: async () => {
            if (!erpId) return null;
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('*')
                .eq('erp_id', erpId)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.id,
                idreferenciaerp: data.erp_id || '',
                idProveedor: data.proveedor_id || '',
                nombreProveedor: data.nombre_proveedor || 'Sin proveedor',
                nombreProductoERP: data.nombre || '',
                referenciaProveedor: data.referencia_proveedor || '',
                familiaCategoria: data.familia_categoria || '',
                precioCompra: data.precio_compra || 0,
                descuento: data.descuento || 0,
                unidadConversion: data.unidad_conversion || 1,
                precio: data.precio || 0,
                precioAlquiler: data.precio_alquiler || 0,
                unidad: data.unidad_medida || 'UD',
                tipo: data.tipo || '',
                categoriaMice: data.categoria_mice || '',
                categoria: data.categoria || '',
                alquiler: data.alquiler || false,
                observaciones: data.observaciones || '',
            } as ArticuloERP;
        },
        enabled: !!erpId
    });
}

export function useArticulosERPByIds(ids: string[]) {
    return useQuery({
        queryKey: ['articulosERP', ids],
        queryFn: async () => {
            if (!ids || ids.length === 0) return [];
            const { data, error } = await supabase
                .from('articulos_erp')
                .select('*')
                .in('id', ids);
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                idreferenciaerp: row.erp_id || '',
                idProveedor: row.proveedor_id || '',
                nombreProveedor: row.nombre_proveedor || 'Sin proveedor',
                nombreProductoERP: row.nombre || '',
                referenciaProveedor: row.referencia_proveedor || '',
                familiaCategoria: row.familia_categoria || '',
                precioCompra: row.precio_compra || 0,
                descuento: row.descuento || 0,
                unidadConversion: row.unidad_conversion || 1,
                precio: row.precio || 0,
                precioAlquiler: row.precio_alquiler || 0,
                unidad: row.unidad_medida || 'UD',
                tipo: row.tipo || '',
                categoriaMice: row.categoria_mice || '',
                alquiler: row.alquiler || false,
                observaciones: row.observaciones || '',
            })) as ArticuloERP[];
        },
        enabled: ids.length > 0
    });
}

export function useArticulosERPMetadata() {
    return useQuery({
        queryKey: ['articulosERP-metadata'],
        queryFn: async () => {
            const { data, error } = await supabase.from('articulos_erp').select('tipo, nombre_proveedor');
            if (error) throw error;

            const types = Array.from(new Set(data.map(d => d.tipo).filter(Boolean))) as string[];
            const providers = Array.from(new Set(data.map(d => d.nombre_proveedor).filter(Boolean))) as string[];

            return { types, providers };
        }
    });
}

// ============================================
// PEDIDOS DE MATERIAL
// ============================================

export function useMaterialOrders(eventoId?: string, categoria?: string) {
    return useQuery({
        queryKey: ['materialOrders', eventoId, categoria],
        queryFn: async () => {
            let query = supabase.from('os_material_orders').select('*');
            
            if (eventoId) {
                // eventoId is already the numero_expediente string (e.g., '2025-12345')
                // Database stores os_id as numero_expediente, NOT as UUID
                console.log('[useMaterialOrders] filtering by os_id (numero_expediente):', eventoId);
                query = query.eq('os_id', eventoId);
            }

            if (categoria) {
                console.log('[useMaterialOrders] filtering by categoria:', categoria);
                query = query.eq('type', categoria);
            }
            
            // Don't filter by status - fetch ALL orders
            // The status enum values are database-dependent
            console.log('[useMaterialOrders] executing query WITHOUT status filter...');
            const { data, error } = await query;
            console.log('[useMaterialOrders] response - error:', error, 'data count:', data?.length);
            if (error) {
                console.error('[useMaterialOrders] Error:', error);
                throw error;
            }

            console.log('[useMaterialOrders] raw data:', data);
            const result = (data || []).map(o => {
                // Parse items if it's a JSON string
                let items = [];
                if (o.items) {
                    if (typeof o.items === 'string') {
                        try {
                            items = JSON.parse(o.items);
                        } catch (e) {
                            console.warn('[useMaterialOrders] Failed to parse items:', e);
                            items = [];
                        }
                    } else {
                        items = Array.isArray(o.items) ? o.items : [];
                    }
                }
                return {
                    id: o.id,
                    osId: o.os_id,
                    type: o.type,
                    status: o.status,
                    items,
                    days: o.days,
                    total: o.total,
                    contractNumber: o.contract_number,
                    deliveryDate: o.delivery_date,
                    deliverySpace: o.delivery_space,
                    deliveryLocation: o.delivery_location,
                    solicita: o.solicita
                };
            }) as MaterialOrder[];
            console.log('[useMaterialOrders] mapped result:', result);
            return result;
        },
        enabled: !!eventoId,
    });
}

// ============================================
// PEDIDOS DE TRANSPORTE
// ============================================

export function useTransporteOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['transporteOrders', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const targetId = await resolveOsId(eventoId);
            
            // Si no pudimos resolver a un UUID y no es un UUID, devolvemos vacío
            // para evitar error 400 en Supabase
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
            if (!isUuid) return [];

            let query = supabase.from('pedidos_transporte').select('*');
            query = query.eq('evento_id', targetId);
            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map((item): TransporteOrder => ({
                id: item.id,
                osId: item.evento_id,
                proveedorId: item.proveedor_id,
                proveedorNombre: item.proveedor_nombre || item.data?.nombreProveedor || '',
                tipoTransporte: item.tipo_transporte,
                fecha: item.fecha,
                hora: item.hora_entrega || item.hora || '',
                precio: item.precio,
                status: item.estado as any,
                observaciones: item.observaciones,
                lugarRecogida: item.lugar_recogida || '',
                horaRecogida: item.hora_recogida || '',
                lugarEntrega: item.lugar_entrega || '',
                horaEntrega: item.hora_entrega || '',
            }));
        },
        enabled: !!eventoId,
    });
}

// ============================================
// PEDIDOS DE HIELO
// ============================================

export function useHieloOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['hieloOrders', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const targetId = await resolveOsId(eventoId);
            let query = supabase.from('pedidos_hielo').select('*, proveedores(nombre_comercial)');
            query = query.eq('evento_id', targetId);
            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                osId: item.evento_id,
                fecha: item.created_at,
                producto: item.tipo_hielo,
                cantidad: item.cantidad_kg,
                precio: item.precio_kg,
                total: item.total,
                status: item.status || 'Pendiente',
                proveedorId: item.proveedor_id,
                proveedorNombre: (item.proveedores as any)?.nombre_comercial || 'Proveedor Hielo',
                items: [{
                    id: item.id,
                    producto: item.tipo_hielo,
                    cantidad: item.cantidad_kg,
                    precio: item.precio_kg
                }]
            }));
        },
        enabled: !!eventoId,
    });
}

// ============================================
// PEDIDOS DE DECORACIÓN
// ============================================

export function useDecoracionOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['decoracionOrders', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const targetId = await resolveOsId(eventoId);
            let query = supabase.from('pedidos_decoracion').select('*');
            query = query.eq('evento_id', targetId);
            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map(item => ({
                id: item.id,
                osId: item.evento_id,
                fecha: item.fecha || item.created_at,
                concepto: item.concepto,
                precio: item.precio,
                observaciones: item.observaciones || '',
            }));
        },
        enabled: !!eventoId,
    });
}

export function useDeleteDecoracionOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_decoracion')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
            toast({ title: 'Gasto de decoración eliminado' });
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar gasto',
                description: error.message,
            });
        },
    });
}

export function useCreateDecoracionOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newOrder: any) => {
            const targetId = await resolveOsId(newOrder.osId);
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .insert([{
                    evento_id: targetId,
                    concepto: newOrder.concepto,
                    precio: newOrder.precio,
                    fecha: newOrder.fecha,
                    observaciones: newOrder.observaciones,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
            toast({ title: 'Gasto de decoración registrado' });
        },
    });
}

export function useUpdateDecoracionOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (order: any) => {
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .update({
                    concepto: order.concepto,
                    precio: order.precio,
                    fecha: order.fecha,
                    observaciones: order.observaciones,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', order.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
            toast({ title: 'Gasto de decoración actualizado' });
        },
    });
}

// ============================================
// PEDIDOS ATÍPICOS
// ============================================

export function useAtipicoOrders(osId?: string) {
    return useQuery({
        queryKey: ['atipicoOrders', osId],
        queryFn: async () => {
            if (!osId) return [];
            const targetId = await resolveOsId(osId);
            let query = supabase.from('atipico_orders').select('*');
            query = query.eq('os_id', targetId);
            const { data, error } = await query.order('fecha', { ascending: false });
            if (error) throw error;
            return (data || []).map(o => ({
                id: o.id,
                osId: o.os_id,
                fecha: o.fecha,
                concepto: o.concepto,
                observaciones: o.observaciones,
                precio: o.precio,
                status: o.status
            })) as AtipicoOrder[];
        },
        enabled: !!osId,
    });
}

// ============================================
// PERSONAL MICE
// ============================================

export function usePersonalMiceOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['personalMiceOrders', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const targetId = await resolveOsId(eventoId);
            let query = supabase.from('personal_mice_asignaciones').select('*');
            query = query.eq('evento_id', targetId);
            const { data, error } = query ? await query : { data: [], error: null };
            if (error) throw error;

            return (data || []).map((item): PersonalMiceOrder => ({
                id: item.id,
                osId: item.evento_id,
                personalId: item.personal_id,
                centroCoste: item.centro_coste || item.data?.centroCoste || 'SALA',
                nombre: item.nombre || item.data?.nombre || '',
                dni: item.dni || item.data?.dni || '',
                tipoServicio: item.categoria as any,
                fecha: item.fecha || item.data?.fecha || '',
                horaEntrada: item.hora_entrada,
                horaSalida: item.hora_salida,
                precioHora: item.precio_hora,
                horaEntradaReal: item.hora_entrada_real,
                horaSalidaReal: item.hora_salida_real,
                comentario: item.comentario || item.data?.comentario || '',
            }));
        },
        enabled: !!eventoId,
    });
}

export function useAllPersonalMiceAssignments() {
    return useQuery({
        queryKey: ['allPersonalMiceAssignments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('personal_mice_asignaciones').select('*');
            if (error) throw error;

            return (data || []).map((item) => ({
                osId: item.evento_id,
                personalId: item.personal_id,
                fecha: item.fecha || item.data?.fecha,
                horaEntrada: item.hora_entrada,
                horaSalida: item.hora_salida,
            }));
        },
    });
}

export function useAllPersonalExternoAssignments() {
    return useQuery({
        queryKey: ['allPersonalExternoAssignments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('personal_externo_eventos')
                .select('evento_id, turnos')
                .returns<any[]>();
            if (error) throw error;

            // Fetch event names separately to avoid join ambiguity or missing relationship issues
            const eventIds = Array.from(new Set((data || []).map(row => row.evento_id))).filter(Boolean) as string[];
            let eventsMap: Record<string, string> = {};
            
            if (eventIds.length > 0) {
                const { data: eventData } = await supabase
                    .from('eventos')
                    .select('id, nombre_evento')
                    .filter('id', 'in', `(${eventIds.join(',')})`);
                
                eventsMap = (eventData || []).reduce((acc, curr) => {
                    acc[curr.id] = curr.nombre_evento;
                    return acc;
                }, {} as Record<string, string>);
            }

            return (data || []).flatMap((row) => 
                (row.turnos || []).flatMap((t: any) => 
                    (t.asignaciones || []).map((a: any) => ({
                        osId: row.evento_id,
                        eventoNombre: eventsMap[row.evento_id] || 'Evento Desconocido',
                        fecha: t.fecha,
                        horaEntrada: t.horaEntrada,
                        horaSalida: t.horaSalida,
                        workerName: a.nombre,
                        workerDni: a.dni,
                        rating: a.rating,
                        comentariosMice: a.comentariosMice,
                    }))
                )
            );
        },
    });
}

export function useExternalWorkerStats() {
    const { data: assignments = [] } = useAllPersonalExternoAssignments();
    
    return useMemo(() => {
        const statsMap: Record<string, { 
            dni: string;
            nombre: string;
            averageRating: number;
            totalServices: number;
            history: Array<{ 
                osId: string;
                eventoNombre: string;
                fecha: string;
                rating: number;
                comentario: string;
            }>;
        }> = {};

        assignments.forEach((asig: any) => {
            if (!asig.workerDni) return;
            
            const dni = asig.workerDni.toUpperCase().trim();
            
            if (!statsMap[dni]) {
                statsMap[dni] = {
                    dni: dni,
                    nombre: asig.workerName,
                    averageRating: 0,
                    totalServices: 0,
                    history: []
                };
            }

            const stats = statsMap[dni];
            stats.totalServices += 1;
            
            if (asig.rating || asig.comentariosMice) {
                stats.history.push({
                    osId: asig.osId,
                    eventoNombre: asig.eventoNombre,
                    fecha: asig.fecha,
                    rating: asig.rating || 0,
                    comentario: asig.comentariosMice || ''
                });
            }
        });

        // Calculate averages and sort history
        Object.values(statsMap).forEach(stats => {
            const ratingsWithData = stats.history.filter(h => h.rating > 0);
            if (ratingsWithData.length > 0) {
                stats.averageRating = ratingsWithData.reduce((acc, h) => acc + h.rating, 0) / ratingsWithData.length;
            }
            // Latest events first
            stats.history.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        });

        return statsMap;
    }, [assignments]);
}

// ============================================
// PERSONAL EXTERNO
// ============================================

export function usePersonalExterno(eventoId?: string) {
    return useQuery({
        queryKey: ['personalExterno', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const targetId = await resolveOsId(eventoId);
            let query = supabase.from('personal_externo_eventos').select('*');
            query = query.eq('evento_id', targetId);
            const { data, error } = await query;
            if (error) throw error;

            const mapped = (data || []).map((item): PersonalExterno => ({
                osId: item.evento_id,
                turnos: item.turnos || [],
                status: item.data?.status || 'Pendiente',
                observacionesGenerales: item.data?.observacionesGenerales,
                hojaFirmadaUrl: item.data?.hojaFirmadaUrl,
            }));

            return eventoId ? (mapped[0] || null) : mapped;
        },
        enabled: !!eventoId,
    });
}

// ============================================
// AJUSTES PERSONAL EXTERNO
// ============================================

export function useUpdatePersonalExterno() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (personal: PersonalExterno) => {
            const { error } = await supabase
                .from('personal_externo_eventos')
                .upsert({
                    evento_id: personal.osId,
                    turnos: personal.turnos,
                    data: {
                        status: personal.status,
                        observacionesGenerales: personal.observacionesGenerales,
                        hojaFirmadaUrl: personal.hojaFirmadaUrl,
                    },
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'evento_id' });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalExterno', variables.osId] });
        },
    });
}

export function useUpdatePersonalExternoAjustes() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ osId, ajustes }: { osId: string, ajustes: PersonalExternoAjuste[] }) => {
            // Delete existing
            await supabase.from('personal_externo_ajustes').delete().eq('evento_id', osId);
            // Insert new
            if (ajustes.length > 0) {
                const { error } = await supabase
                    .from('personal_externo_ajustes')
                    .insert(ajustes.map(a => ({
                        evento_id: osId,
                        concepto: a.concepto,
                        importe: a.importe,
                        data: { proveedorId: a.proveedorId }
                    })));
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalExternoAjustes', variables.osId] });
        },
    });
}

// Query hook for personal externo ajustes
export function usePersonalExternoAjustes(osId?: string) {
    return useQuery({
        queryKey: ['personalExternoAjustes', osId],
        queryFn: async () => {
            if (!osId) return [];
            let query = supabase.from('personal_externo_ajustes').select('*');
            query = query.eq('evento_id', osId);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!osId,
    });
}

// ============================================
// PEDIDOS DE ENTREGA
// ============================================

export function usePedidosEntrega(eventoId?: string) {
    return useQuery<PedidoEntrega[]>({
        queryKey: ['pedidosEntrega', eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            
            let query = supabase.from('entregas').select('*');
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventoId);
            
            if (isUuid) {
                // Si es UUID, intentamos ver si es un evento para sacar su numero_expediente
                const { data: eventData } = await supabase.from('eventos').select('numero_expediente').eq('id', eventoId).maybeSingle();
                if (eventData?.numero_expediente) {
                    query = query.eq('numero_expediente', eventData.numero_expediente);
                } else {
                    // Si no es un evento, buscamos por ID de entrega
                    query = query.eq('id', eventoId);
                }
            } else {
                // Si no es UUID, es directamente el numero_expediente
                query = query.eq('numero_expediente', eventoId);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return (data || []).map((p: any) => {
                const extraData = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data || {});
                return {
                    ...p,
                    ...extraData,
                    id: p.id,
                    osId: p.id,
                    entrega_id: p.id,
                    hitos: extraData.hitos || p.hitos || [],
                    status: p.estado,
                    updatedAt: p.updated_at
                };
            }) as any[];
        },
        enabled: !!eventoId,
    });
}

// ============================================
// PERSONAL ENTREGA
// ============================================

export function usePersonalEntrega(entregaId?: string) {
    return useQuery({
        queryKey: ['personalEntrega', entregaId],
        queryFn: async () => {
            let query = supabase.from('personal_entrega').select('*');
            if (entregaId) {
                query = query.eq('entrega_id', entregaId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!entregaId || entregaId === undefined,
    });
}

// ============================================
// PRUEBAS DE MENÚ
// ============================================

export function usePruebasMenu(osId?: string) {
    return useQuery({
        queryKey: ['pruebasMenu', osId],
        queryFn: async () => {
            if (!osId) return [];
            let query = supabase.from('pruebas_menu').select('*');

            // Si es un UUID, tendríamos un problema si la tabla usa numero_expediente
            // Pero vamos a intentar ser consistentes con useEvento
            if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                // Si recibimos un UUID, primero buscamos el numero_expediente
                const { data: os } = await supabase.from('eventos').select('numero_expediente').eq('id', osId).single();
                if (os) {
                    query = query.eq('numero_expediente', os.numero_expediente);
                } else {
                    return [];
                }
            } else {
                query = query.eq('numero_expediente', osId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!osId,
    });
}

// ============================================
// GASTRONOMY ORDERS (from evento_lineas)
// ============================================

export function useGastronomyOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['gastronomyOrders', eventoId],
        queryFn: async () => {
            let query = supabase
                .from('evento_lineas')
                .select('*')
                .eq('tipo', 'GASTRONOMIA');

            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Map to GastronomyOrder type
            return (data || []).map(l => ({
                id: l.id,
                osId: l.evento_id,
                status: 'Pendiente' as const,
                total: (l.cantidad || 0) * (l.precio_unitario || 0),
                items: [{
                    id: l.articulo_id || l.id,
                    type: 'item' as const,
                    nombre: l.nombre_articulo,
                    quantity: l.cantidad,
                    precioVenta: l.precio_unitario,
                    costeMateriaPrima: l.coste_unitario
                }]
            }));
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// --- PERSONAL ---

export function usePersonal() {
    return useQuery({
        queryKey: ['personal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('personal')
                .select('*')
                .eq('activo', true) // Default behavior: only active in selectors
                .order('nombre', { ascending: true });

            if (error) throw error;
            return (data || []).map(mapPersonalFromDB);
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function usePersonalPaginated(
    page: number, 
    pageSize: number, 
    searchTerm: string, 
    departmentFilter: string, 
    options: { initialData?: { items: Personal[], totalCount: number, totalPages: number }, isActive?: boolean, categoryFilter?: string } = {}
) {
    const { initialData, isActive = true, categoryFilter = 'all' } = options;
    return useQuery({
        queryKey: ['personal-paginated', page, pageSize, searchTerm, departmentFilter, categoryFilter, isActive],
        queryFn: () => getPersonalPaginated(supabase, {
            page,
            pageSize,
            searchTerm,
            departmentFilter,
            categoryFilter,
            isActive
        }),
        initialData
    });
}

// ============================================
// ESPACIOS
// ============================================

// ============================================
// ESPACIOS
// ============================================

export function useEspacios() {
    return useQuery({
        queryKey: ['espacios'],
        queryFn: () => getEspacios(supabase),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useEspaciosPaginated(page: number, pageSize: number, searchTerm: string) {
    return useQuery({
        queryKey: ['espacios-paginated', page, pageSize, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('espacios_v2')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`nombre.ilike.%${searchTerm}%,ciudad.ilike.%${searchTerm}%,calle.ilike.%${searchTerm}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('nombre', { ascending: true })
                .range(from, to);

            if (error) throw error;

            return {
                items: data || [],
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            };
        }
    });
}

export function useEspacioItem(id: string | null) {
    return useQuery({
        queryKey: ['espacio', id],
        queryFn: () => id ? getEspacioById(supabase, id) : null,
        enabled: !!id,
    });
}

export function useUpsertEspacio() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (espacio: Partial<EspacioV2>) => {
            if (espacio.id) {
                return updateEspacio(espacio.id, espacio);
            } else {
                return createEspacio(espacio);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['espacios'] });
            if (data?.id) {
                queryClient.invalidateQueries({ queryKey: ['espacio', data.id] });
            }
            toast({ title: 'Espacio guardado correctamente' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar espacio',
                description: error.message,
            });
        },
    });
}

export function useDeleteEspacio() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: deleteEspacio,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['espacios'] });
            toast({ title: 'Espacio eliminado correctamente' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar espacio',
                description: error.message,
            });
        },
    });
}

// ============================================
// TIPOS DE SERVICIO
// ============================================

export function useTiposServicio() {
    return useQuery({
        queryKey: ['tiposServicio'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tipos_servicio_briefing')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return data || [];
        },
    });
}

export function useUpsertTipoServicio() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (item: any) => {
            if (item.id) {
                const { data, error } = await supabase
                    .from('tipos_servicio_briefing')
                    .update({
                        nombre: item.nombre,
                        descripcion: item.descripcion,
                    })
                    .eq('id', item.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from('tipos_servicio_briefing')
                    .insert([{
                        nombre: item.nombre,
                        descripcion: item.descripcion,
                    }])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposServicio'] });
            toast({ title: 'Tipo de servicio guardado' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message,
            });
        },
    });
}

export function useDeleteTipoServicio() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tipos_servicio_briefing')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposServicio'] });
            toast({ title: 'Tipo de servicio eliminado' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        },
    });
}

export function usePerfiles() {
    return useQuery({
        queryKey: ['perfiles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .order('nombre_completo', { ascending: true });

            if (error) throw error;
            return data || [];
        },
    });
}

export function useDeletePerfil() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('perfiles')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['perfiles'] });
            toast({ title: 'Perfil eliminado' });
        },
    });
}

export function useCreatePerfil() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newPerfil: any) => {
            const { data, error } = await supabase
                .from('perfiles')
                .insert([{
                    nombre_completo: newPerfil.nombre,
                    email: newPerfil.email,
                    rol: newPerfil.roles[0], // Assuming singular role in DB
                    proveedor_id: newPerfil.proveedorId,
                    estado: 'ACTIVO',
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['perfiles'] });
            toast({ title: 'Perfil creado correctamente' });
        },
    });
}

export function useUpdatePerfil() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (perfil: any) => {
            const { data, error } = await supabase
                .from('perfiles')
                .update({
                    nombre_completo: perfil.nombre,
                    email: perfil.email,
                    rol: perfil.roles[0],
                    proveedor_id: perfil.proveedorId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', perfil.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['perfiles'] });
            toast({ title: 'Perfil actualizado correctamente' });
        },
    });
}

// ============================================
// COMERCIAL BRIEFINGS
// ============================================

export function useComercialBriefings(osId?: string) {
    return useQuery({
        queryKey: ['comercialBriefings', osId],
        queryFn: async () => {
            try {
                const targetId = osId ? await resolveOsId(osId) : null;
                let query = supabase.from('comercial_briefings').select('*');
                if (targetId) {
                    const orExpr = buildOsOr(osId || '', targetId);
                    if (orExpr) query = query.or(orExpr);
                }
                const { data, error } = await query;

                if (error) throw error;
                return (data || []) as ComercialBriefing[];
            } catch (e) {
                console.warn('Error fetching comercial briefings (table might be missing):', e);
                return [];
            }
        },
        enabled: !!osId || osId === undefined,
    });
}

export function useUpdateComercialBriefing() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (briefing: ComercialBriefing) => {
            const targetId = await resolveOsId(briefing.osId);
            const { error } = await supabase
                .from('comercial_briefings')
                .upsert({
                    os_id: targetId,
                    items: briefing.items,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'os_id' });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comercialBriefings', variables.osId] });
        },
    });
}

export function useUpdateEventoFinancials() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const { error } = await supabase
                .from('eventos')
                .update({
                    facturacion: data.facturacion,
                    agency_percentage: data.agencyPercentage,
                    space_percentage: data.spacePercentage,
                    agency_commission_value: data.agencyCommissionValue,
                    space_commission_value: data.spaceCommissionValue,
                    comisiones_agencia: data.comisionesAgencia,
                    comisiones_canon: data.comisionesCanon,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['eventos', variables.id] });
        },
    });
}

// ============================================
// ARTÍCULOS
// ============================================

// mapArticuloFromDB is now imported from @/services/articulos-service

const mapArticuloToDB = (item: Partial<ArticuloCatering>) => ({
    id: item.id,
    erp_id: item.erpId || null,
    nombre: item.nombre,
    categoria: item.categoria,
    es_habitual: item.esHabitual,
    precio_venta: item.precioVenta,
    precio_alquiler: item.precioAlquiler,
    precio_reposicion: item.precioReposicion,
    unidad_venta: item.unidadVenta,
    stock_seguridad: item.stockSeguridad,
    tipo: item.tipo,
    loc: item.loc,
    imagen: item.imagen,
    producido_por_partner: item.producidoPorPartner,
    partner_id: item.partnerId || null,
    receta_id: item.recetaId || null,
    subcategoria: item.subcategoria,
    tipo_articulo: item.tipoArticulo,
    referencia_articulo_entregas: item.referenciaArticuloEntregas || null,
    dpt_entregas: item.dptEntregas,
    precio_coste: item.precioCoste,
    precio_coste_alquiler: item.precioCosteAlquiler,
    precio_venta_entregas: item.precioVentaEntregas,
    precio_venta_entregas_ifema: item.precioVentaEntregasIfema,
    precio_alquiler_ifema: item.precioAlquilerIfema,
    precio_venta_ifema: item.precioVentaIfema,
    precio_alquiler_entregas: item.precioAlquilerEntregas,
    iva: item.iva,
    doc_drive_url: item.docDriveUrl || null,
    alergenos: item.alergenos,
    imagenes: item.imagenes,
    pack: item.packs || item.pack,
    audit: item.audit,
});

export function useArticulos() {
    return useQuery({
        queryKey: ['articulos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(mapArticuloFromDB);
        },
    });
}

export function useArticulosEntregas() {
    return useQuery({
        queryKey: ['articulos', 'entregas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .eq('tipo_articulo', 'entregas')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(mapArticuloFromDB);
        },
    });
}

export function useArticulosInfinite(options: {
    searchTerm?: string;
    categoryFilter?: string;
    departmentFilter?: string;
    isPartnerFilter?: boolean;
    tipoArticulo?: 'micecatering' | 'entregas';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
}) {
    const { 
        searchTerm, 
        categoryFilter, 
        departmentFilter,
        isPartnerFilter, 
        tipoArticulo, 
        sortBy = 'nombre',
        sortOrder = 'asc',
        limit = 50 
    } = options;

    return useInfiniteQuery({
        queryKey: ['articulos', 'infinite', searchTerm, categoryFilter, departmentFilter, isPartnerFilter, tipoArticulo, sortBy, sortOrder],
        queryFn: async ({ pageParam = 0 }) => {
            let query = supabase.from('articulos').select('*', { count: 'exact' });

            if (searchTerm) {
                if (tipoArticulo === 'entregas') {
                    query = query.or(`nombre.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,referencia_articulo_entregas.ilike.%${searchTerm}%`);
                } else {
                    query = query.or(`nombre.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
                }
            }
            if (categoryFilter && categoryFilter !== 'all') {
                query = query.eq('categoria', categoryFilter);
            }
            if (departmentFilter && departmentFilter !== 'all') {
                query = query.eq('dpt_entregas', departmentFilter);
            }
            if (isPartnerFilter) {
                query = query.eq('producido_por_partner', true);
            }
            if (tipoArticulo) {
                query = query.eq('tipo_articulo', tipoArticulo);
            }

            const from = (pageParam as number) * limit;
            const to = from + limit - 1;

            const { data, error, count } = await query
                .order(sortBy, { ascending: sortOrder === 'asc' })
                .range(from, to);

            if (error) throw error;

            return {
                items: (data || []).map(mapArticuloFromDB),
                nextPage: (data?.length || 0) < limit ? undefined : (pageParam as number) + 1,
                totalCount: count || 0
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 0,
    });
}

export function useArticulosERPPaginated(options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    typeFilter?: string;
    providerFilter?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}, initialData?: { items: ArticuloERP[], totalCount: number }) {
    const { page, pageSize, searchTerm, typeFilter, providerFilter, sortBy, sortOrder } = options;

    return useQuery({
        queryKey: ['articulos-erp-paginated', page, pageSize, searchTerm, typeFilter, providerFilter, sortBy, sortOrder],
        queryFn: () => getArticulosERPPaginated(supabase, {
            page,
            pageSize,
            searchTerm,
            typeFilter,
            providerFilter,
            sortBy,
            sortOrder
        }),
        initialData: (page === 0 && !searchTerm && (!typeFilter || typeFilter === 'all') && (!providerFilter || providerFilter === 'all')) ? initialData : undefined,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useArticulosPaginated(options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    categoryFilter?: string;
    departmentFilter?: string;
    isPartnerFilter?: boolean;
    tipoArticulo?: 'micecatering' | 'entregas';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}, initialData?: { items: ArticuloCatering[], totalCount: number }) {
    const { 
        page, 
        pageSize, 
        searchTerm, 
        categoryFilter, 
        departmentFilter,
        isPartnerFilter, 
        tipoArticulo, 
        sortBy = 'nombre',
        sortOrder = 'asc'
    } = options;

    return useQuery({
        queryKey: ['articulos', 'paginated', page, pageSize, searchTerm, categoryFilter, departmentFilter, isPartnerFilter, tipoArticulo, sortBy, sortOrder],
        queryFn: async () => {
            return getArticulosPaginated(supabase, {
                page,
                pageSize,
                searchTerm,
                categoryFilter,
                departmentFilter,
                isPartnerFilter,
                tipoArticulo,
                sortBy,
                sortOrder
            });
        },
        initialData
    });
}

export function useTablePaginated<T>(options: {
    tableName: string;
    page: number;
    pageSize: number;
    searchTerm?: string;
    searchColumns?: string[];
    orderBy?: string;
    orderAscending?: boolean;
}) {
    const { tableName, page, pageSize, searchTerm, searchColumns, orderBy = 'nombre', orderAscending = true } = options;

    return useQuery({
        queryKey: [tableName, 'paginated', page, pageSize, searchTerm, orderBy, orderAscending],
        queryFn: async () => {
            let query = supabase
                .from(tableName)
                .select('*', { count: 'exact' });

            if (searchTerm && searchColumns && searchColumns.length > 0) {
                const orConditions = searchColumns.map(col => `${col}.ilike.%${searchTerm}%`).join(',');
                query = query.or(orConditions);
            }

            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order(orderBy, { ascending: orderAscending })
                .range(from, to);

            if (error) throw error;

            return {
                items: (data || []) as T[],
                totalCount: count || 0
            };
        },
    });
}

// mapArticuloERPFromDB is now imported from @/services/erp-service

export function useArticulo(id: string | undefined) {
    return useQuery({
        queryKey: ['articulo', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return mapArticuloFromDB(data);
        },
        enabled: !!id
    });
}

export function useArticuloPacks(articuloId: string | undefined) {
    return useQuery({
        queryKey: ['articuloPacks', articuloId],
        queryFn: async () => {
            if (!articuloId) return [];
            const { data, error } = await supabase
                .from('articulo_packs')
                .select('*')
                .eq('articulo_id', articuloId);
            if (error) throw error;
            return data.map(p => ({
                erpId: p.erp_id,
                cantidad: p.cantidad
            }));
        },
        enabled: !!articuloId
    });
}

export function useUpsertArticulo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (articulo: Partial<ArticuloCatering> & { packs?: { erpId: string; cantidad: number }[] }) => {
            const id = articulo.id && articulo.id !== '' ? articulo.id : crypto.randomUUID();
            const dbData = mapArticuloToDB({ ...articulo, id });
            
            const { data, error } = await supabase
                .from('articulos')
                .upsert(dbData)
                .select()
                .single();
            
            if (error) {
                console.error('Supabase upsert error in useUpsertArticulo:', error);
                throw error;
            }

            // Handle packs if provided
            if (articulo.packs) {
                // First delete existing packs for this article
                const { error: deleteError } = await supabase.from('articulo_packs').delete().eq('articulo_id', data.id);
                if (deleteError) {
                    console.error('Error deleting existing packs:', deleteError);
                    throw deleteError;
                }

                if (articulo.packs.length > 0) {
                    const packsToInsert = articulo.packs.map(p => ({
                        articulo_id: data.id,
                        erp_id: p.erpId,
                        cantidad: p.cantidad,
                    }));

                    const { error: packsError } = await supabase.from('articulo_packs').insert(packsToInsert);
                    if (packsError) {
                        console.error('Error inserting new packs:', packsError);
                        throw packsError;
                    }
                }
            }

            return mapArticuloFromDB(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articulos'] });
        },
    });
}

export function useDeleteArticulo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articulos'] });
        },
    });
}
// ============================================
// HOJAS DE PICKING
// ============================================

export function usePickingSheets(osId?: string) {
    return useQuery({
        queryKey: ['pickingSheets', osId],
        queryFn: async () => {
            let query = supabase
                .from('hojas_picking')
                .select('*');

            if (osId) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
                const targetId = await resolveOsId(osId);
                const orExpr = buildFieldOr('os_id', osId, targetId);
                if (isUuid) {
                    // Caller provided a UUID — query by os_id directly
                    query = query.eq('os_id', osId);
                } else if (targetId && targetId !== osId) {
                    // We resolved a UUID for this numero_expediente — query by os_id OR numero_expediente
                    query = query.or(orExpr);
                } else {
                    // Can't safely query os_id with a non-UUID
                    return [];
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) return [];

            // Fetch events to map OS data
            const osIds = data.map((p: any) => p.os_id).filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
            const osNumbers = data.map((p: any) => p.os_id).filter(id => id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

            let eventsQuery = supabase.from('eventos').select('*');
            if (osIds.length > 0 && osNumbers.length > 0) {
                eventsQuery = eventsQuery.or(`id.in.(${osIds.join(',')}),numero_expediente.in.(${osNumbers.join(',')})`);
            } else if (osIds.length > 0) {
                eventsQuery = eventsQuery.in('id', osIds);
            } else if (osNumbers.length > 0) {
                eventsQuery = eventsQuery.in('numero_expediente', osNumbers);
            } else {
                eventsQuery = null as any;
            }

            const { data: events } = eventsQuery ? await eventsQuery : { data: [] };
            const eventMap = new Map();
            events?.forEach(e => {
                eventMap.set(e.id, e);
                eventMap.set(e.numero_expediente, e);
            });

            return (data || []).map((p: any): PickingSheet => {
                const extraData = p.data || {};
                const event = eventMap.get(p.os_id);
                return {
                    id: p.id,
                    osId: p.os_id,
                    items: p.items || [],
                    status: p.estado,
                    fechaNecesidad: extraData.fecha || extraData.fechaNecesidad || '',
                    itemStates: extraData.itemStates,
                    checkedItems: extraData.checkedItems,
                    solicita: extraData.solicita,
                    os: event ? {
                        id: event.id,
                        serviceNumber: event.numero_expediente,
                        client: event.client,
                        startDate: event.start_date,
                        endDate: event.end_date,
                        status: event.estado,
                    } as any : undefined
                };
            });
        },
    });
}

export function usePickingSheet(id: string) {
    return useQuery({
        queryKey: ['pickingSheet', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('hojas_picking')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (!data) return null;

            // Fetch event data manually
            const { data: event } = await supabase
                .from('eventos')
                .select('*')
                .or(`id.eq.${data.os_id},numero_expediente.eq.${data.os_id}`)
                .maybeSingle();

            const extraData = data.data || {};
            return {
                id: data.id,
                osId: data.os_id,
                items: data.items || [],
                status: data.estado,
                fechaNecesidad: extraData.fecha || extraData.fechaNecesidad || '',
                itemStates: extraData.itemStates,
                checkedItems: data.checkedItems,
                solicita: extraData.solicita,
                os: event ? {
                    id: event.id,
                    serviceNumber: event.numero_expediente,
                    client: event.client,
                    startDate: event.start_date,
                    endDate: event.end_date,
                    status: event.estado,
                } as any : undefined
            } as PickingSheet;
        },
        enabled: !!id,
    });
}

export function useUpdatePickingSheet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sheet: Partial<PickingSheet> & { id: string }) => {
            const { id, os, ...rest } = sheet;

            // Prepare data for Supabase
            const updateData: any = {};
            if (rest.status) updateData.estado = rest.status;
            if (rest.items) updateData.items = rest.items;

            // The rest goes into the 'data' jsonb column
            const jsonbData: any = {};
            if (rest.fechaNecesidad) jsonbData.fechaNecesidad = rest.fechaNecesidad;
            if (rest.itemStates) jsonbData.itemStates = rest.itemStates;
            if (rest.checkedItems) jsonbData.checkedItems = rest.checkedItems;
            if (rest.solicita) jsonbData.solicita = rest.solicita;

            if (Object.keys(jsonbData).length > 0) {
                updateData.data = jsonbData;
            }

            const { data, error } = await supabase
                .from('hojas_picking')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pickingSheets'] });
            queryClient.invalidateQueries({ queryKey: ['pickingSheet'] });
        },
    });
}

export function useDeletePickingSheet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('hojas_picking')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pickingSheets'] });
        },
    });
}

// ============================================
// HOJAS DE RETORNO
// ============================================

export function useReturnSheets(osId?: string) {
    return useQuery({
        queryKey: ['returnSheets', osId],
        queryFn: async () => {
            if (!osId) return [];
            let query = supabase
                .from('hojas_retorno')
                .select('*');

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildFieldOr('os_id', osId, targetId);
            if (isUuid) {
                query = query.eq('os_id', osId);
            } else if (targetId && targetId !== osId) {
                query = query.or(orExpr);
            } else {
                return [];
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) return [];

            // Fetch events to map OS data
            const osIds = data.map((p: any) => p.os_id).filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
            const osNumbers = data.map((p: any) => p.os_id).filter(id => id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

            let eventsQuery = supabase.from('eventos').select('*');
            if (osIds.length > 0 && osNumbers.length > 0) {
                eventsQuery = eventsQuery.or(`id.in.(${osIds.join(',')}),numero_expediente.in.(${osNumbers.join(',')})`);
            } else if (osIds.length > 0) {
                eventsQuery = eventsQuery.in('id', osIds);
            } else if (osNumbers.length > 0) {
                eventsQuery = eventsQuery.in('numero_expediente', osNumbers);
            } else {
                eventsQuery = null as any;
            }

            const { data: events } = eventsQuery ? await eventsQuery : { data: [] };
            const eventMap = new Map();
            events?.forEach(e => {
                eventMap.set(e.id, e);
                eventMap.set(e.numero_expediente, e);
            });

            return (data || []).map((p: any): ReturnSheet => {
                const extraData = p.data || {};
                const event = eventMap.get(p.os_id);
                return {
                    id: p.id,
                    osId: p.os_id,
                    items: extraData.items || [],
                    status: extraData.status || 'Pendiente',
                    itemStates: extraData.itemStates || {},
                    os: event ? {
                        id: event.id,
                        serviceNumber: event.numero_expediente,
                        client: event.client,
                        startDate: event.start_date,
                        endDate: event.end_date,
                        status: event.estado,
                    } as any : undefined
                };
            });
        },
        enabled: !!osId,
    });
}

export function useReturnSheet(osId: string) {
    return useQuery({
        queryKey: ['returnSheet', osId],
        queryFn: async () => {
            if (!osId) return null;
            const { data, error } = await supabase
                .from('hojas_retorno')
                .select('*')
                .eq('os_id', osId)
                .maybeSingle();

            if (error) throw error;
            if (!data) return null;

            // Fetch event data manually
            const { data: event } = await supabase
                .from('eventos')
                .select('*')
                .or(`id.eq.${data.os_id},numero_expediente.eq.${data.os_id}`)
                .maybeSingle();

            const extraData = data.data || {};
            return {
                id: data.id,
                osId: data.os_id,
                items: extraData.items || [],
                status: extraData.status || 'Pendiente',
                itemStates: extraData.itemStates || {},
                os: event ? {
                    id: event.id,
                    serviceNumber: event.numero_expediente,
                    client: event.client,
                    startDate: event.start_date,
                    endDate: event.end_date,
                    status: event.estado,
                } as any : undefined
            } as ReturnSheet;
        },
        enabled: !!osId,
    });
}

export function useUpdateReturnSheet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sheet: Partial<ReturnSheet> & { osId: string }) => {
            const { osId, os, ...rest } = sheet;

            const { data: existing } = await supabase
                .from('hojas_retorno')
                .select('data')
                .eq('os_id', osId)
                .maybeSingle();

            const newData = {
                ...(existing?.data || {}),
                ...rest
            };

            const { data, error } = await supabase
                .from('hojas_retorno')
                .upsert({
                    os_id: osId,
                    data: newData,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['returnSheets'] });
        },
    });
}
// ============================================
// TIPOS DE TRANSPORTE
// ============================================

export function useTiposTransporte() {
    return useQuery({
        queryKey: ['tiposTransporte'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tipos_transporte')
                .select('*, proveedor:proveedores(nombre_comercial)')
                .order('nombre');
            if (error) throw error;
            return data || [];
        },
    });
}

export function useProveedoresTransporte() {
    return useQuery({
        queryKey: ['proveedoresTransporte'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proveedores_tipos_servicio')
                .select(`
                    proveedor_id,
                    tipos,
                    proveedor:proveedores (
                        id,
                        nombre_comercial
                    )
                `)
                .contains('tipos', ['Transporte']);
            
            if (error) throw error;
            
            return (data || [])
                .filter((item: any) => item.proveedor)
                .map((item: any) => ({
                    id: item.proveedor.id,
                    nombre: item.proveedor.nombre_comercial,
                    nombreProveedor: item.proveedor.nombre_comercial,
                    tipoTransporte: 'Transporte',
                    precio: 0
                }));
        }
    });
}

export function useUpsertTipoTransporte() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (tipo: any) => {
            const { data, error } = await supabase
                .from('tipos_transporte')
                .upsert(tipo)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposTransporte'] });
            toast({ title: 'Tipo de transporte guardado' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
        },
    });
}

export function useDeleteTipoTransporte() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tipos_transporte')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposTransporte'] });
            toast({ title: 'Tipo de transporte eliminado' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        },
    });
}

export function useDeleteTiposTransporteBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('tipos_transporte')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposTransporte'] });
            toast({ title: 'Tipos de transporte eliminados' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        },
    });
}

// ============================================
// PROVEEDORES
// ============================================

export function useProveedores() {
    return useQuery({
        queryKey: ['proveedores'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .order('nombre_comercial');
            if (error) throw error;
            return (data || []).map(p => ({
                id: p.id,
                nombreComercial: p.nombre_comercial,
                nombreFiscal: p.nombre_fiscal,
                cif: p.cif || '',
                categoria: p.categoria || '',
                IdERP: p.id_erp || '',
                direccionFacturacion: p.direccion_facturacion || '',
                codigoPostal: p.codigo_postal || '',
                ciudad: p.ciudad || '',
                provincia: p.provincia || '',
                pais: p.pais || 'España',
                emailContacto: p.email_contacto || '',
                telefonoContacto: p.telefono_contacto || '',
                contacto: p.contacto || '',
                iban: p.iban || '',
                formaDePagoHabitual: p.forma_de_pago_habitual || '',
            })) as any[];
        },
        staleTime: 1000 * 60 * 10, // 10 minutos para proveedores (cambian poco)
    });
}

export function useProveedoresPaginated(page: number, pageSize: number, searchTerm: string, initialData?: { items: Proveedor[], totalCount: number, totalPages: number }) {
    return useQuery({
        queryKey: ['proveedores-paginated', page, pageSize, searchTerm],
        queryFn: () => getProveedoresPaginated(supabase, {
            page,
            pageSize,
            searchTerm
        }),
        initialData
    });
}


export function useProveedor(id: string) {
    return useQuery({
        queryKey: ['proveedores', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (!data) return null;
            return {
                id: data.id,
                nombreComercial: data.nombre_comercial,
                nombreFiscal: data.nombre_fiscal,
                cif: data.cif || '',
                IdERP: data.id_erp || '',
                direccionFacturacion: data.direccion_facturacion || '',
                codigoPostal: data.codigo_postal || '',
                ciudad: data.ciudad || '',
                provincia: data.provincia || '',
                pais: data.pais || 'España',
                emailContacto: data.email_contacto || '',
                telefonoContacto: data.telefono_contacto || '',
                contacto: data.contacto || '',
                iban: data.iban || '',
                formaDePagoHabitual: data.forma_de_pago_habitual || '',
            } as any;
        },
        enabled: !!id
    });
}

// ============================================
// PROVEEDORES TIPOS SERVICIO
// ============================================

export function useProveedoresTiposServicio() {
    return useQuery({
        queryKey: ['proveedoresTiposServicio'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proveedores_tipos_servicio')
                .select('*');
            if (error) throw error;
            return data || [];
        }
    });
}

export function useUpsertProveedoresTiposServicio() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (records: { proveedor_id: string, tipos: string[] }[]) => {
            const { error } = await supabase
                .from('proveedores_tipos_servicio')
                .upsert(records, { onConflict: 'proveedor_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedoresTiposServicio'] });
            toast({ title: 'Tipos de servicio actualizados' });
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Error al actualizar tipos de servicio',
                description: error.message,
            });
        },
    });
}

// ============================================
// TIPOS SERVICIO BRIEFING
// ============================================

export function useTiposServicioBriefing() {
    return useQuery({
        queryKey: ['tiposServicioBriefing'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tipos_servicio_briefing')
                .select('*')
                .order('servicio');

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                nombre: item.servicio,
                descripcion: '', // DB schema doesn't have description column
                created_at: item.created_at
            }));
        }
    });
}

export function useUpsertTipoServicioBriefing() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (item: { id?: string, nombre: string, descripcion?: string | null }) => {
            const dbItem: any = {
                servicio: item.nombre
            };
            if (item.id) dbItem.id = item.id;

            const { data, error } = await supabase
                .from('tipos_servicio_briefing')
                .upsert(dbItem)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposServicioBriefing'] });
            toast({ title: 'Tipo de servicio guardado' });
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar tipo de servicio',
                description: error.message,
            });
        },
    });
}

export function useDeleteTipoServicioBriefing() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tipos_servicio_briefing')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposServicioBriefing'] });
            toast({ title: 'Tipo de servicio eliminado' });
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar tipo de servicio',
                description: error.message,
            });
        },
    });
}

export function useDeleteTiposServicioBriefingBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('tipos_servicio_briefing')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposServicioBriefing'] });
            toast({ title: 'Tipos de servicio eliminados' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar tipos de servicio',
                description: error.message,
            });
        },
    });
}

// ============================================
// FAMILIAS ERP
// ============================================
export function useFamiliasERP() {
    return useQuery({
        queryKey: ['familiasERP'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('familias')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(f => ({
                id: f.id,
                familiaCategoria: f.codigo || '',
                Familia: f.nombre,
                Categoria: f.categoria_padre || ''
            })) as any[];
        }
    });
}

export function useArticulosCategorias(tipoArticulo?: string) {
    return useQuery({
        queryKey: ['articulosCategorias', tipoArticulo],
        queryFn: async () => {
            let query = supabase
                .from('articulos')
                .select('categoria')
                .not('categoria', 'is', null);
            
            if (tipoArticulo) {
                query = query.eq('tipo_articulo', tipoArticulo);
            }

            const { data, error } = await query;
            if (error) throw error;

            const uniqueCategorias = Array.from(new Set(data.map(item => item.categoria)))
                .filter(Boolean)
                .sort();
            
            return uniqueCategorias as string[];
        }
    });
}

// ============================================
// CATEGORÍAS RECETAS
// ============================================
export function useCategoriasRecetas() {
    return useQuery({
        queryKey: ['categoriasRecetas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorias_recetas')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(c => ({
                id: c.id,
                nombre: c.nombre,
                snack: c.snack
            })) as any[];
        }
    });
}

export function useCategoriaReceta(id: string) {
    return useQuery({
        queryKey: ['categoriaReceta', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('categorias_recetas')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });
}

export function useUpsertCategoriaReceta() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (categoria: any) => {
            const { data, error } = await supabase
                .from('categorias_recetas')
                .upsert(categoria)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoriasRecetas'] });
        }
    });
}

export function useDeleteCategoriaReceta() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('categorias_recetas')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoriasRecetas'] });
        }
    });
}

export function useDeleteCategoriasRecetasBulk() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('categorias_recetas')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoriasRecetas'] });
        }
    });
}

// ============================================
// FORMATOS EXPEDICIÓN
// ============================================
export function useFormatosExpedicion() {
    return useQuery({
        queryKey: ['formatosExpedicion'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('formatos_expedicion')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(f => ({
                id: f.id,
                nombre: f.nombre
            })) as any[];
        }
    });
}

export function useFormatoExpedicion(id: string) {
    return useQuery({
        queryKey: ['formatoExpedicion', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('formatos_expedicion')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });
}

export function useUpsertFormatoExpedicion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formato: any) => {
            const { data, error } = await supabase
                .from('formatos_expedicion')
                .upsert(formato)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formatosExpedicion'] });
        }
    });
}

export function useDeleteFormatoExpedicion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('formatos_expedicion')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formatosExpedicion'] });
        }
    });
}

export function useDeleteFormatosExpedicionBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('formatos_expedicion').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formatosExpedicion'] });
            toast({ title: 'Formatos eliminados' });
        },
    });
}

// ============================================
// TIPOS PERSONAL (CATEGORÍAS ETT)
// ============================================
export function useTiposPersonal(initialData?: any) {
    return useQuery({
        queryKey: ['tiposPersonal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorias_personal')
                .select(`
                    *,
                    proveedor:proveedores(id, nombre_comercial)
                `)
                .order('nombre');
            if (error) throw error;
            return (data || []).map(item => ({
                id: item.id,
                proveedorId: item.proveedor_id,
                nombreProveedor: item.proveedor?.nombre_comercial || 'Sin proveedor',
                categoria: item.nombre,
                precioHora: item.precio_hora_base,
            }));
        },
        initialData,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

export function useTipoPersonalItem(id: string) {
    return useQuery({
        queryKey: ['tipoPersonal', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorias_personal')
                .select(`
                    *,
                    proveedor:proveedores(id, nombre_comercial)
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return {
                id: data.id,
                proveedorId: data.proveedor_id,
                nombreProveedor: data.proveedor?.nombre_comercial || 'Sin proveedor',
                categoria: data.nombre,
                precioHora: data.precio_hora_base,
            };
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

export function useUpsertTipoPersonal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (item: any) => {
            const payload = {
                nombre: item.categoria,
                proveedor_id: item.proveedorId,
                precio_hora_base: item.precioHora,
            };

            if (item.id && !item.id.startsWith('TPE-')) {
                const { data, error } = await supabase
                    .from('categorias_personal')
                    .update(payload)
                    .eq('id', item.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from('categorias_personal')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposPersonal'] });
            toast({ title: 'Categoría de personal guardada' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message,
            });
        },
    });
}

export function useDeleteTipoPersonal() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('categorias_personal')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposPersonal'] });
            toast({ title: 'Categoría de personal eliminada' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        },
    });
}

export function useDeleteTiposPersonalBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('categorias_personal')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiposPersonal'] });
            toast({ title: 'Categorías de personal eliminadas' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        },
    });
}

// ============================================
// PERSONAL EXTERNO DB (CATALOGO)
// ============================================
export function usePersonalExternoDB() {
    return useQuery({
        queryKey: ['personalExternoDB'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('personal_externo_catalogo')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map((item: any) => ({
                id: item.id,
                proveedorId: item.proveedor_id,
                nombre: item.nombre,
                apellido1: item.apellido1,
                apellido2: item.apellido2,
                categoria: item.categoria,
                nombreCompleto: item.nombre_completo,
                nombreCompacto: item.nombre_compacto,
                telefono: item.telefono,
                email: item.email,
                activo: item.activo ?? true,
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

export function usePersonalExternoPaginated(options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    providerFilter?: string;
    isActive?: boolean;
    initialData?: any;
}) {
    const { page, pageSize, searchTerm, providerFilter, isActive = true, initialData } = options;

    return useQuery({
        queryKey: ['personalExternoDB', 'paginated', page, pageSize, searchTerm, providerFilter, isActive],
        queryFn: () => getPersonalExternoPaginated(supabase, { page, pageSize, searchTerm, providerFilter, isActive }),
        staleTime: 1000 * 60 * 5, // 5 minutos
        initialData,
    });
}

export function usePersonalExternoDBItem(id: string) {
    return useQuery({
        queryKey: ['personalExternoDB', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('personal_externo_catalogo')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return {
                id: data.id,
                proveedorId: data.proveedor_id,
                nombre: data.nombre,
                apellido1: data.apellido1,
                apellido2: data.apellido2,
                categoria: data.categoria,
                nombreCompleto: data.nombre_completo,
                nombreCompacto: data.nombre_compacto,
                telefono: data.telefono,
                email: data.email,
                activo: data.activo ?? true,
            };
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

export function useUpsertPersonalExternoDB() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (item: any) => upsertPersonalExterno(supabase, item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personalExternoDB'] });
            toast({ title: 'Trabajador guardado' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message,
            });
        },
    });
}

export function useDeletePersonalExternoDB() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => deletePersonalExterno(supabase, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personalExternoDB'] });
            toast({ title: 'Trabajador eliminado' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        },
    });
}

export function useDeletePersonalExternoBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('personal_externo_catalogo')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personalExternoDB'] });
            toast({ title: 'Trabajadores eliminados' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message,
            });
        },
    });
}

// ============================================
// PLANTILLAS PEDIDOS
// ============================================
export function usePlantillasPedidos() {
    return useQuery({
        queryKey: ['plantillasPedidos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pedido_plantillas')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return data || [];
        }
    });
}

export function useUpsertPlantillaPedido() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (plantilla: Partial<PedidoPlantilla>) => {
            const { data, error } = await supabase
                .from('pedido_plantillas')
                .upsert(plantilla)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plantillasPedidos'] });
            toast({ title: 'Plantilla guardada', description: 'La plantilla se ha guardado correctamente.' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message,
            });
        },
    });
}

export function useDeletePlantillaPedido() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedido_plantillas')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plantillasPedidos'] });
            toast({ title: 'Plantilla eliminada', description: 'La plantilla se ha eliminado correctamente.' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar plantilla',
                description: error.message,
            });
        },
    });
}

export function useDeletePlantillasPedidosBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('pedido_plantillas')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plantillasPedidos'] });
            toast({ title: 'Plantillas eliminadas', description: 'Las plantillas se han eliminado correctamente.' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar plantillas',
                description: error.message,
            });
        },
    });
}

// ============================================
// OBJETIVOS CPR
// ============================================
export function useObjetivosCPR() {
    return useQuery({
        queryKey: ['objetivosCPR'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_objetivos')
                .select('*')
                .order('mes', { ascending: false });
            if (error) throw error;
            return (data || []).map(o => ({
                mes: o.mes,
                presupuestoVentas: o.presupuesto_ventas,
                presupuestoCesionPersonal: o.presupuesto_cesion_personal,
                presupuestoGastosMP: o.presupuesto_gastos_mp,
                presupuestoGastosPersonalMice: o.presupuesto_gastos_personal_mice,
                presupuestoGastosPersonalExterno: o.presupuesto_gastos_personal_externo,
                presupuestoOtrosGastos: o.presupuesto_otros_gastos,
                presupuestoPersonalSolicitadoCpr: o.presupuesto_personal_solicitado_cpr,
            })) as ObjetivoMensualCPR[];
        }
    });
}

export function useDecoracionCatalogo() {
    return useQuery({
        queryKey: ['decoracionCatalogo'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('decoracion_catalogo')
                .select('*')
                .order('nombre', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });
}

export function useUpsertObjetivoCPR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (objetivo: Partial<ObjetivoMensualCPR> | Partial<ObjetivoMensualCPR>[]) => {
            const items = Array.isArray(objetivo) ? objetivo : [objetivo];
            const toUpsert = items.map(o => ({
                mes: o.mes,
                presupuesto_ventas: o.presupuestoVentas,
                presupuesto_cesion_personal: o.presupuestoCesionPersonal,
                presupuesto_gastos_mp: o.presupuestoGastosMP,
                presupuesto_gastos_personal_mice: o.presupuestoGastosPersonalMice,
                presupuesto_gastos_personal_externo: o.presupuestoGastosPersonalExterno,
                presupuesto_otros_gastos: o.presupuestoOtrosGastos,
                presupuesto_personal_solicitado_cpr: o.presupuestoPersonalSolicitadoCpr,
            }));
            const { data, error } = await supabase
                .from('cpr_objetivos')
                .upsert(toUpsert)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objetivosCPR'] });
        }
    });
}

export function useDeleteObjetivoCPR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (mes: string) => {
            const { error } = await supabase
                .from('cpr_objetivos')
                .delete()
                .eq('mes', mes);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objetivosCPR'] });
        }
    });
}

// ============================================
// FAMILIAS ERP MUTATIONS
// ============================================
export function useDeleteFamiliaERP() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('familias')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['familiasERP'] });
        }
    });
}

export function useDeleteFamiliasERPBulk() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('familias').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['familiasERP'] });
            toast({ title: 'Familias eliminadas' });
        },
    });
}

export function useUpsertFamiliaERP() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (familia: Partial<FamiliaERP>) => {
            const { data, error } = await supabase
                .from('familias')
                .upsert({
                    id: familia.id,
                    codigo: familia.familiaCategoria,
                    nombre: familia.Familia,
                    categoria_padre: familia.Categoria
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['familiasERP'] });
        }
    });
}

// ============================================
// FAMILIA ERP (SINGLE)
// ============================================
export function useFamiliaERP(id: string) {
    return useQuery({
        queryKey: ['familiaERP', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('familias')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return {
                id: data.id,
                familiaCategoria: data.codigo || '',
                Familia: data.nombre,
                Categoria: data.categoria_padre || ''
            } as FamiliaERP;
        },
        enabled: !!id
    });
}

// ============================================
// ARTICULOS MUTATIONS
// ============================================
export function useBulkDeleteArticulos() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('articulos')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articulos'] });
        }
    });
}

export function useSyncArticulosWithERP() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (onProgress?: (msg: string) => void) => {
            const log = (msg: string) => {
                if (onProgress) onProgress(msg);
            };

            log("Iniciando sincronización con ERP...");

            // 1. Obtener todos los artículos que tienen erp_id
            log("Consultando artículos locales con ERP ID...");
            const { data: articulos, error: artError } = await supabase
                .from('articulos')
                .select('*') // Seleccionamos todo para asegurar que el upsert tenga los campos NOT NULL
                .not('erp_id', 'is', null);
            
            if (artError) throw artError;
            if (!articulos || articulos.length === 0) {
                log("No se encontraron artículos locales vinculados al ERP.");
                return 0;
            }
            log(`Encontrados ${articulos.length} artículos locales para actualizar.`);

            // 2. Obtener todos los artículos del ERP
            log("Cargando datos maestros desde articulos_erp...");
            const { data: erpData, error: erpError } = await supabase
                .from('articulos_erp')
                .select('*');
            
            if (erpError) throw erpError;
            if (!erpData) {
                log("No se obtuvieron datos del ERP.");
                return 0;
            }
            log(`Cargados ${erpData.length} registros del ERP.`);

            // Crear un mapa para búsqueda rápida (en trozos para no bloquear)
            log("Indexando datos del ERP...");
            const erpMap = new Map();
            for (let i = 0; i < erpData.length; i++) {
                const item = erpData[i];
                const id = item.idreferenciaerp || item.erp_id || item.id;
                erpMap.set(id, item);
                if (i % 1000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }

            // 3. Preparar actualizaciones en lotes
            log("Preparando datos para actualización masiva...");
            const updates = [];
            for (let i = 0; i < articulos.length; i++) {
                const art = articulos[i];
                const erpArt = erpMap.get(art.erp_id);
                
                if (erpArt) {
                    const basePrice = (erpArt.precio_compra || 0) / (erpArt.unidad_conversion || 1);
                    const discount = erpArt.descuento || 0;
                    const calculatedPvp = basePrice * (1 - discount / 100);

                    updates.push({
                        ...art, // Mantenemos todos los campos originales (nombre, tipo_articulo, etc.)
                        precio_venta: parseFloat(calculatedPvp.toFixed(4)),
                        precio_reposicion: parseFloat(calculatedPvp.toFixed(4)),
                        // Copiar precio de alquiler desde el ERP si existe
                        precio_alquiler: Number(erpArt.precio_alquiler) || 0,
                        categoria: erpArt.categoria_mice || erpArt.categoria,
                        subcategoria: erpArt.tipo || erpArt.familia_categoria,
                    });
                }
                if (i % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }

            if (updates.length === 0) {
                log("No hay cambios pendientes de actualizar.");
                return 0;
            }

            // 4. Ejecutar actualizaciones en lotes de 50 para no saturar y permitir feedback
            const BATCH_SIZE = 50;
            let updatedCount = 0;
            
            for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                const batch = updates.slice(i, i + BATCH_SIZE);
                const currentProgress = Math.min(i + BATCH_SIZE, updates.length);
                
                log(`Actualizando lote (${currentProgress}/${updates.length})...`);
                
                const { error: updateError } = await supabase
                    .from('articulos')
                    .upsert(batch);
                
                if (updateError) {
                    console.error("Error en lote:", updateError);
                    log(`Error actualizando lote: ${updateError.message}`);
                } else {
                    updatedCount += batch.length;
                }

                // Yield to main thread to keep UI responsive and avoid long task violations
                // Aumentamos un poco el tiempo para dar más margen al navegador
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            log(`Sincronización finalizada. ${updatedCount} artículos actualizados.`);
            return updatedCount;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['articulos'] });
            toast({
                title: "Sincronización completada",
                description: `Se han actualizado ${count} artículos con datos del ERP.`,
            });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error en la sincronización",
                description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
            });
        }
    });
}

export function useUpsertProveedor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (proveedor: Partial<Proveedor>) => {
            const { error } = await supabase
                .from('proveedores')
                .upsert({
                    id: proveedor.id || crypto.randomUUID(),
                    nombre_comercial: proveedor.nombreComercial,
                    nombre_fiscal: proveedor.nombreFiscal,
                    cif: proveedor.cif,
                    id_erp: proveedor.IdERP,
                    direccion_facturacion: proveedor.direccionFacturacion,
                    ciudad: proveedor.ciudad,
                    codigo_postal: proveedor.codigoPostal,
                    provincia: proveedor.provincia,
                    pais: proveedor.pais,
                    telefono_contacto: proveedor.telefonoContacto,
                    email_contacto: proveedor.emailContacto,
                    contacto: proveedor.contacto,
                    iban: proveedor.iban,
                    forma_de_pago_habitual: proveedor.formaDePagoHabitual
                })
                .select()
                .single();
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

export function useDeleteProveedor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('proveedores')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

export function useDeleteProveedoresBulk() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('proveedores')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

// --- PERSONAL ---

export function useUpsertPersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (personal: Partial<Personal>) => upsertPersonal(supabase, personal),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['personal'] });
            queryClient.invalidateQueries({ queryKey: ['personal', data.id] });
            queryClient.invalidateQueries({ queryKey: ['personal-paginated'] });
        },
    });
}

export function useArchivePersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('personal')
                .update({ activo: false })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal'] });
            queryClient.invalidateQueries({ queryKey: ['personal-paginated'] });
        },
    });
}

export function useRestorePersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('personal')
                .update({ activo: true })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal'] });
            queryClient.invalidateQueries({ queryKey: ['personal-paginated'] });
        },
    });
}

export function usePersonalItem(id: string) {
    return useQuery({
        queryKey: ['personal', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('personal')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return mapPersonalFromDB(data);
        },
        enabled: !!id,
    });
}

export function useUploadPersonalPhoto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ personalId, file }: { personalId: string, file: File }) => 
            uploadPersonalPhoto(supabase, personalId, file),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personal', variables.personalId] });
            queryClient.invalidateQueries({ queryKey: ['personal-paginated'] });
        },
    });
}

// ============================================
// COSTES FIJOS CPR
// ============================================
export function useCostesFijosCPR() {
    return useQuery({
        queryKey: ['costesFijosCPR'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_costes_fijos')
                .select('*')
                .order('concepto');
            if (error) throw error;
            return (data || []).map(c => ({
                id: c.id,
                concepto: c.concepto,
                importeMensual: c.importe_mensual
            }));
        },
    });
}

export function useUpsertCosteFijoCPR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (coste: { id?: string; concepto: string; importeMensual: number }) => {
            const { data, error } = await supabase
                .from('cpr_costes_fijos')
                .upsert({
                    id: coste.id,
                    concepto: coste.concepto,
                    importe_mensual: coste.importeMensual
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costesFijosCPR'] });
        },
    });
}

export function useDeleteCosteFijoCPR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('cpr_costes_fijos')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costesFijosCPR'] });
        },
    });
}

export function useDeleteCostesFijosCPRBulk() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('cpr_costes_fijos')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costesFijosCPR'] });
        },
    });
}
