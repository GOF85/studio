import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, CesionStorage, OrdenFabricacion, PickingState, Elaboracion } from '@/types';

// ============================================
// COSTES FIJOS CPR
// ============================================

export function useCprCostesFijos() {
    return useQuery({
        queryKey: ['cprCostesFijos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_costes_fijos')
                .select('*')
                .order('concepto');
            if (error) throw error;
            return (data || []).map(d => ({
                id: d.id,
                concepto: d.concepto,
                importeMensual: d.importe_mensual
            })) as CosteFijoCPR[];
        }
    });
}

// ============================================
// OBJETIVOS CPR
// ============================================

export function useCprObjetivos() {
    return useQuery({
        queryKey: ['cprObjetivos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_objetivos')
                .select('*')
                .order('mes', { ascending: false });
            if (error) throw error;
            return (data || []).map(d => ({
                mes: d.mes,
                presupuestoVentas: d.presupuesto_ventas,
                presupuestoCesionPersonal: d.presupuesto_cesion_personal,
                presupuestoGastosMP: d.presupuesto_gastos_mp,
                presupuestoGastosPersonalMice: d.presupuesto_gastos_personal_mice,
                presupuestoGastosPersonalExterno: d.presupuesto_gastos_personal_externo,
                presupuestoOtrosGastos: d.presupuesto_otros_gastos,
                presupuestoPersonalSolicitadoCpr: d.presupuesto_personal_solicitado_cpr
            })) as ObjetivoMensualCPR[];
        }
    });
}

// ============================================
// SOLICITUDES PERSONAL CPR
// ============================================

export function useCprSolicitudesPersonal(from?: string, to?: string) {
    return useQuery({
        queryKey: ['cprSolicitudesPersonal', from, to],
        queryFn: async () => {
            let query = supabase.from('cpr_solicitudes_personal').select('*');
            
            if (from && to) {
                query = query.gte('fecha_servicio', from).lte('fecha_servicio', to);
            }
            
            const { data, error } = await query.order('fecha_servicio');
            if (error) throw error;
            
            return (data || []).map(d => ({
                id: d.id,
                fechaSolicitud: d.fecha_solicitud,
                solicitadoPor: d.solicitado_por,
                fechaServicio: d.fecha_servicio,
                horaInicio: d.hora_inicio,
                horaFin: d.hora_fin,
                partida: d.partida,
                categoria: d.categoria,
                cantidad: d.cantidad,
                motivo: d.motivo,
                estado: d.estado,
                proveedorId: d.proveedor_id,
                costeImputado: d.coste_imputado,
                observacionesRRHH: d.observaciones_rrhh,
                personalAsignado: d.personal_asignado
            })) as SolicitudPersonalCPR[];
        }
    });
}

// ============================================
// CESIONES PERSONAL
// ============================================

export function useCprCesionesPersonal(from?: string, to?: string) {
    return useQuery({
        queryKey: ['cprCesionesPersonal', from, to],
        queryFn: async () => {
            let query = supabase.from('cpr_cesiones_personal').select('*');
            
            if (from && to) {
                query = query.gte('fecha', from).lte('fecha', to);
            }
            
            const { data, error } = await query.order('fecha');
            if (error) throw error;
            
            return (data || []).map(d => ({
                id: d.id,
                fecha: d.fecha,
                centroCoste: d.centro_coste,
                nombre: d.nombre,
                dni: d.dni,
                tipoServicio: d.tipo_servicio,
                horaEntrada: d.hora_entrada,
                horaSalida: d.hora_salida,
                precioHora: d.precio_hora,
                horaEntradaReal: d.hora_entrada_real,
                horaSalidaReal: d.hora_salida_real,
                comentarios: d.comentarios,
                estado: d.estado
            })) as CesionStorage[];
        }
    });
}

// ============================================
// CPR OS DATA (Comentarios y Costes Reales)
// ============================================

export function useCprOsData(osId?: string) {
    return useQuery({
        queryKey: ['cprOsData', osId],
        queryFn: async () => {
            if (!osId) return null;
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            let query;
            if (isUuid) {
                query = supabase.from('cpr_os_data').select('*').eq('os_id', osId).single();
            } else if (targetId && targetId !== osId) {
                query = supabase.from('cpr_os_data').select('*').eq('os_id', targetId).single();
            } else {
                query = supabase.from('cpr_os_data').select('*').eq('numero_expediente', osId).single();
            }
            const { data, error } = await query;
            
            if (error && error.code !== 'PGRST116') throw error;
            
            return data ? {
                osId: data.os_id,
                comentarios: data.comentarios || {},
                costesReales: data.costes_reales || {}
            } : { osId: targetId, comentarios: {}, costesReales: {} };
        },
        enabled: !!osId
    });
}

export function useUpdateCprOsData() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ osId, comentarios, costesReales }: { osId: string, comentarios?: any, costesReales?: any }) => {
            const targetId = await resolveOsId(osId);
            const updateData: any = { updated_at: new Date().toISOString() };
            if (comentarios !== undefined) updateData.comentarios = comentarios;
            if (costesReales !== undefined) updateData.costes_reales = costesReales;
            
            const { data, error } = await supabase
                .from('cpr_os_data')
                .upsert({
                    os_id: targetId,
                    ...updateData
                }, { onConflict: 'os_id' })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cprOsData', variables.osId] });
        }
    });
}

// ============================================
// ELABORACIONES
// ============================================

export function useCprElaboraciones() {
    return useQuery({
        queryKey: ['cprElaboraciones'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_elaboraciones')
                .select('*')
                .order('nombre');
            if (error) throw error;
            return (data || []).map(d => ({
                id: d.id,
                nombre: d.nombre,
                produccionTotal: d.produccion_total,
                unidadProduccion: d.unidad_produccion,
                partidaProduccion: d.partida_produccion,
                componentes: d.componentes,
                instruccionesPreparacion: d.instrucciones_preparacion,
                fotosProduccionURLs: d.fotos_produccion_urls,
                videoProduccionURL: d.video_produccion_url,
                formatoExpedicion: d.formato_expedicion,
                ratioExpedicion: d.ratio_expedicion,
                tipoExpedicion: d.tipo_expedicion,
                costePorUnidad: d.coste_por_unidad,
                alergenos: d.alergenos,
                requiereRevision: d.requiere_revision,
                comentarioRevision: d.comentario_revision,
                fechaRevision: d.fecha_revision
            })) as Elaboracion[];
        }
    });
}

// ============================================
// ÓRDENES DE FABRICACIÓN (OFs)
// ============================================

export function useCprOrdenesFabricacion(from?: string, to?: string) {
    return useQuery({
        queryKey: ['cprOrdenesFabricacion', from, to],
        queryFn: async () => {
            let query = supabase.from('cpr_ordenes_fabricacion').select('*');
            
            if (from && to) {
                query = query.gte('fecha_produccion_prevista', from).lte('fecha_produccion_prevista', to);
            }
            
            const { data, error } = await query.order('fecha_produccion_prevista');
            if (error) throw error;
            
            return (data || []).map(d => ({
                id: d.id,
                fechaCreacion: d.fecha_creacion,
                fechaProduccionPrevista: d.fecha_produccion_prevista,
                fechaAsignacion: d.fecha_asignacion,
                fechaInicioProduccion: d.fecha_inicio_produccion,
                fechaFinalizacion: d.fecha_finalizacion,
                elaboracionId: d.elaboracion_id,
                elaboracionNombre: d.elaboracion_nombre,
                cantidadTotal: d.cantidad_total,
                cantidadReal: d.cantidad_real,
                necesidadTotal: d.necesidad_total,
                unidad: d.unidad,
                partidaAsignada: d.partida_asignada,
                responsable: d.responsable,
                estado: d.estado,
                osIDs: d.os_ids,
                incidencia: d.incidencia,
                incidenciaObservaciones: d.incidencia_observaciones,
                okCalidad: d.ok_calidad,
                responsableCalidad: d.responsable_calidad,
                fechaValidacionCalidad: d.fecha_validacion_calidad,
                tipoExpedicion: d.tipo_expedicion,
                consumosReales: d.consumos_reales
            })) as OrdenFabricacion[];
        }
    });
}

export function useCprOrdenFabricacion(id: string) {
    return useQuery({
        queryKey: ['cprOrdenFabricacion', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('cpr_ordenes_fabricacion')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return {
                id: data.id,
                fechaCreacion: data.fecha_creacion,
                fechaProduccionPrevista: data.fecha_produccion_prevista,
                fechaAsignacion: data.fecha_asignacion,
                fechaInicioProduccion: data.fecha_inicio_produccion,
                fechaFinalizacion: data.fecha_finalizacion,
                elaboracionId: data.elaboracion_id,
                elaboracionNombre: data.elaboracion_nombre,
                cantidadTotal: data.cantidad_total,
                cantidadReal: data.cantidad_real,
                necesidadTotal: data.necesidad_total,
                unidad: data.unidad,
                partidaAsignada: data.partida_asignada,
                responsable: data.responsable,
                estado: data.estado,
                osIDs: data.os_ids,
                consumosReales: data.consumos_reales,
                incidencia: data.incidencia,
                incidenciaObservaciones: data.incidencia_observaciones,
                okCalidad: data.ok_calidad,
                responsableCalidad: data.responsable_calidad,
                fechaValidacionCalidad: data.fecha_validacion_calidad,
                tipoExpedicion: data.tipo_expedicion
            } as OrdenFabricacion;
        },
        enabled: !!id
    });
}

export function useCreateCprOrdenFabricacion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (of: Partial<OrdenFabricacion>) => {
            const { data, error } = await supabase
                .from('cpr_ordenes_fabricacion')
                .insert([{
                    fecha_produccion_prevista: of.fechaProduccionPrevista,
                    elaboracion_id: of.elaboracionId,
                    elaboracion_nombre: of.elaboracionNombre,
                    cantidad_total: of.cantidadTotal,
                    unidad: of.unidad,
                    partida_asignada: of.partidaAsignada,
                    tipo_expedicion: of.tipoExpedicion,
                    estado: of.estado || 'Pendiente',
                    os_ids: of.osIDs || [],
                    incidencia: of.incidencia || false,
                    ok_calidad: of.okCalidad || false
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprOrdenesFabricacion'] });
        }
    });
}

export function useUpdateCprOrdenFabricacion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<OrdenFabricacion> & { id: string }) => {
            const dbUpdates: any = {};
            if (updates.estado) dbUpdates.estado = updates.estado;
            if (updates.responsable) dbUpdates.responsable = updates.responsable;
            if (updates.fechaAsignacion) dbUpdates.fecha_asignacion = updates.fechaAsignacion;
            if (updates.cantidadReal !== undefined) dbUpdates.cantidad_real = updates.cantidadReal;
            if (updates.fechaFinalizacion) dbUpdates.fecha_finalizacion = updates.fechaFinalizacion;
            if (updates.incidencia !== undefined) dbUpdates.incidencia = updates.incidencia;
            if (updates.incidenciaObservaciones !== undefined) dbUpdates.incidencia_observaciones = updates.incidenciaObservaciones;
            if (updates.okCalidad !== undefined) dbUpdates.ok_calidad = updates.okCalidad;
            
            const { data, error } = await supabase
                .from('cpr_ordenes_fabricacion')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprOrdenesFabricacion'] });
        }
    });
}

export function useDeleteCprOrdenFabricacion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('cpr_ordenes_fabricacion')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprOrdenesFabricacion'] });
        }
    });
}

// ============================================
// MUTACIONES SOLICITUDES PERSONAL CPR
// ============================================

export function useCreateCprSolicitudPersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (solicitud: Partial<SolicitudPersonalCPR>) => {
            const { data, error } = await supabase
                .from('cpr_solicitudes_personal')
                .insert([{
                    solicitado_por: solicitud.solicitadoPor,
                    fecha_servicio: solicitud.fechaServicio,
                    hora_inicio: solicitud.horaInicio,
                    hora_fin: solicitud.horaFin,
                    partida: solicitud.partida,
                    categoria: solicitud.categoria,
                    cantidad: solicitud.cantidad,
                    motivo: solicitud.motivo,
                    estado: solicitud.estado || 'Solicitado',
                    proveedor_id: solicitud.proveedorId
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprSolicitudesPersonal'] });
        }
    });
}

export function useUpdateCprSolicitudPersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<SolicitudPersonalCPR> & { id: string }) => {
            const dbUpdates: any = {};
            if (updates.estado) dbUpdates.estado = updates.estado;
            if (updates.observacionesRRHH) dbUpdates.observaciones_rrhh = updates.observacionesRRHH;
            if (updates.personalAsignado) dbUpdates.personal_asignado = updates.personalAsignado;
            
            const { data, error } = await supabase
                .from('cpr_solicitudes_personal')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprSolicitudesPersonal'] });
        }
    });
}

export function useDeleteCprSolicitudPersonal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('cpr_solicitudes_personal')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprSolicitudesPersonal'] });
        }
    });
}

// ============================================
// PICKING STATES
// ============================================

export function useCprPickingStates() {
    return useQuery({
        queryKey: ['cprPickingStates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_picking_states')
                .select('*');
            if (error) throw error;
            
            return (data || []).map(d => ({
                id: d.id,
                osId: d.os_id,
                status: d.status,
                itemStates: d.item_states,
                checkedItems: d.checked_items,
                assignedContainers: d.assigned_containers || []
            })) as PickingState[];
        }
    });
}

export function useUpdateCprPickingState() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (state: Partial<PickingState> & { osId: string }) => {
            // Primero buscamos si ya existe un estado para esta OS
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.osId);
            const targetId = await resolveOsId(state.osId);
            const existingQuery = isUuid
                ? supabase.from('cpr_picking_states').select('id').eq('os_id', state.osId).maybeSingle()
                : (targetId && targetId !== state.osId
                    ? supabase.from('cpr_picking_states').select('id').eq('os_id', targetId).maybeSingle()
                    : supabase.from('cpr_picking_states').select('id').eq('numero_expediente', state.osId).maybeSingle());

            const { data: existing } = await existingQuery;

            const updateData: any = {
                os_id: state.osId,
                updated_at: new Date().toISOString()
            };

            if (state.status !== undefined) updateData.status = state.status;
            if (state.itemStates !== undefined) updateData.item_states = state.itemStates;
            if (state.assignedContainers !== undefined) updateData.assigned_containers = state.assignedContainers;

            const { data, error } = await supabase
                .from('cpr_picking_states')
                .upsert({
                    id: existing?.id || undefined,
                    ...updateData
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprPickingStates'] });
        }
    });
}

// ============================================
// STOCK ELABORACIONES
// ============================================

export function useCprStockElaboraciones() {
    return useQuery({
        queryKey: ['cprStockElaboraciones'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cpr_stock_elaboraciones')
                .select('*');
            if (error) throw error;
            
            const stock: Record<string, { elaboracionId: string, cantidadTotal: number, unidad?: string, lotes?: any[] }> = {};
            (data || []).forEach(d => {
                stock[d.elaboracion_id] = {
                    elaboracionId: d.elaboracion_id,
                    cantidadTotal: d.cantidad_total,
                    unidad: d.unidad,
                    lotes: d.lotes || []
                };
            });
            return stock;
        }
    });
}

export function useUpdateCprStockElaboracion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ elaboracionId, cantidadTotal, unidad, lotes }: { elaboracionId: string, cantidadTotal: number, unidad?: string, lotes?: any[] }) => {
            const { data, error } = await supabase
                .from('cpr_stock_elaboraciones')
                .upsert({
                    elaboracion_id: elaboracionId,
                    cantidad_total: cantidadTotal,
                    unidad: unidad,
                    lotes: lotes || []
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cprStockElaboraciones'] });
        }
    });
}


