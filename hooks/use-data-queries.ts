"use client";

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { 
    ServiceOrder, 
    ComercialBriefing, 
    CategoriaPersonal, 
    PersonalExternoTurno, 
    SolicitudPersonalCPR 
} from '@/types';

// ============================================
// TIPOS AUXILIARES
// ============================================
type UnifiedTurno = (PersonalExternoTurno & { type: 'EVENTO' }) | (SolicitudPersonalCPR & { type: 'CPR' });
type AssignableWorker = { label: string; value: string; id: string; };

// ============================================
// CATEGORÍAS DE PERSONAL
// ============================================

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

export function useEventos() {
    return useQuery({
        queryKey: ['eventos'],
        queryFn: async () => {
            // Hacemos join con espacios_v2 para obtener el nombre real del espacio
            const { data, error } = await supabase
                .from('eventos')
                .select(`*, espacios_v2(nombre)`) 
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;

            // Map to ServiceOrder type
            return (data || []).map((e): ServiceOrder => ({
                id: e.id,
                serviceNumber: e.numero_expediente,
                client: e.nombre_evento || 'Evento Sin Nombre',
                tipoCliente: 'Empresa',
                finalClient: e.nombre_evento || 'Evento Sin Nombre', 
                startDate: e.fecha_inicio,
                endDate: e.fecha_fin,
                status: e.estado,
                asistentes: e.comensales || 0,
                vertical: 'Catering',
                comercial: 'Comercial ID ' + e.comercial_id,
                space: e.espacios_v2?.nombre || 'Espacio por definir', 
                facturacion: 0,
                comisionesAgencia: 0,
                comisionesCanon: 0,
                respMetre: '',
                contact: '',
                phone: '',
                spaceAddress: '',
                spaceContact: '',
                spacePhone: '',
                spaceMail: '',
                respMetrePhone: '',
                respMetreMail: '',
                respCocinaCPR: '',
                respCocinaCPRPhone: '',
                respCocinaCPRMail: '',
                respPase: '',
                respPasePhone: '',
                respPaseMail: '',
                respCocinaPase: '',
                respCocinaPasePhone: '',
                respCocinaPaseMail: '',
                comercialAsiste: false,
                comercialPhone: '',
                comercialMail: '',
                rrhhAsiste: false,
                respRRHH: '',
                respRRHHPhone: '',
                respRRHHMail: '',
                agencyPercentage: 0,
                spacePercentage: 0,
                plane: '',
                comments: ''
            }));
        },
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
                    nombre_evento: evento.client,
                    fecha_inicio: evento.startDate,
                    fecha_fin: evento.endDate,
                    estado: evento.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
                    comensales: evento.asistentes || 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
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
                    nombre_evento: updates.client,
                    fecha_inicio: updates.startDate,
                    fecha_fin: updates.endDate,
                    estado: updates.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
                    comensales: updates.asistentes,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
    return useQuery({
        queryKey: ['entregas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('entregas')
                .select('*')
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;
            return data || [];
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

// ============================================
// RECETAS
// ============================================

export function useRecetas() {
    return useQuery({
        queryKey: ['recetas'],
        queryFn: async () => {
            const { data: recetas, error: recetasError } = await supabase
                .from('recetas')
                .select('*');

            if (recetasError) throw recetasError;

            const { data: elaboraciones, error: elabError } = await supabase
                .from('elaboraciones')
                .select('id, nombre, alergenos'); 

            if (elabError) {
                console.warn('Error fetching elaboraciones:', elabError);
            }

            const elabMap = new Map((elaboraciones || []).map((e: any) => [e.id, e]));

            return (recetas || []).map((r: any) => ({
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
                elaboraciones: (r.elaboraciones || [])
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
                    }),
                menajeAsociado: r.menaje_asociado || [],
                instruccionesMiseEnPlace: '',
                instruccionesRegeneracion: '',
                instruccionesEmplatado: '',
                alergenos: r.alergenos || [],
            }));
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

export function useCategoriasRecetas() {
    return useQuery({
        queryKey: ['categoriasRecetas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categorias_recetas')
                .select('*')
                .order('nombre');

            if (error) throw error;
            return data || [];
        },
    });
}

// ============================================
// ELABORACIONES
// ============================================

export function useElaboraciones() {
    return useQuery({
        queryKey: ['elaboraciones'],
        queryFn: async () => {
            const { data: elaboraciones, error: elabError } = await supabase
                .from('elaboraciones')
                .select('*');

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
                costeUnitario: e.coste_unitario,
                produccionTotal: 0,
                requiereRevision: e.requiere_revision,
                comentarioRevision: e.comentario_revision,
                fechaRevision: e.fecha_revision,
                componentes: (componentes || [])
                    .filter((c: any) => c.elaboracion_padre_id === e.id)
                    .map((c: any) => ({
                        id: c.id,
                        tipo: (c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion') as 'ingrediente' | 'elaboracion',
                        componenteId: c.componente_id,
                        nombre: 'Componente ' + c.componente_id,
                        cantidad: c.cantidad_neta,
                        costePorUnidad: 0,
                        merma: c.merma_aplicada,
                    })),
                formatoExpedicion: '',
                ratioExpedicion: 1,
                tipoExpedicion: 'REFRIGERADO' as const,
            }));
        },
    });
}

// ============================================
// PEDIDOS DE MATERIAL
// ============================================

export function useMaterialOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['materialOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('pedidos_material').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PEDIDOS DE TRANSPORTE
// ============================================

export function useTransporteOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['transporteOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('pedidos_transporte').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PEDIDOS DE HIELO
// ============================================

export function useHieloOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['hieloOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('pedidos_hielo').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PEDIDOS DE DECORACIÓN
// ============================================

export function useDecoracionOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['decoracionOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('pedidos_decoracion').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PEDIDOS ATÍPICOS
// ============================================

export function useAtipicoOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['atipicoOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('pedidos_atipicos').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PERSONAL MICE
// ============================================

export function usePersonalMiceOrders(eventoId?: string) {
    return useQuery({
        queryKey: ['personalMiceOrders', eventoId],
        queryFn: async () => {
            let query = supabase.from('personal_mice_asignaciones').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PERSONAL EXTERNO
// ============================================

export function usePersonalExterno(eventoId?: string) {
    return useQuery({
        queryKey: ['personalExterno', eventoId],
        queryFn: async () => {
            let query = supabase.from('personal_externo_eventos').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// AJUSTES PERSONAL EXTERNO
// ============================================

export function usePersonalExternoAjustes(eventoId?: string) {
    return useQuery({
        queryKey: ['personalExternoAjustes', eventoId],
        queryFn: async () => {
            let query = supabase.from('personal_externo_ajustes').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;

            // Group by evento_id
            const grouped: Record<string, any[]> = {};
            (data || []).forEach(item => {
                if (!grouped[item.evento_id]) {
                    grouped[item.evento_id] = [];
                }
                grouped[item.evento_id].push(item);
            });

            return eventoId ? (grouped[eventoId] || []) : grouped;
        },
        enabled: !!eventoId || eventoId === undefined,
    });
}

// ============================================
// PEDIDOS DE ENTREGA
// ============================================

export function usePedidosEntrega(entregaId?: string) {
    return useQuery({
        queryKey: ['pedidosEntrega', entregaId],
        queryFn: async () => {
            let query = supabase.from('pedidos_entrega').select('*');
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

export function usePruebasMenu(eventoId?: string) {
    return useQuery({
        queryKey: ['pruebasMenu', eventoId],
        queryFn: async () => {
            let query = supabase.from('pruebas_menu').select('*');
            if (eventoId) {
                query = query.eq('evento_id', eventoId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId || eventoId === undefined,
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

// ============================================
// PERSONAL
// ============================================

export function usePersonal() {
    return useQuery({
        queryKey: ['personal'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('personal')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;
            return data || [];
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
                let query = supabase.from('comercial_briefings').select('*');
                if (osId) {
                    query = query.eq('os_id', osId);
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