
'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
    ServiceOrder, Entrega, ComercialBriefing, PedidoEntrega, GastronomyOrder, MaterialOrder,
    TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno,
    PruebaMenuData, PickingSheet, ReturnSheet, OrdenFabricacion, PickingState, ExcedenteProduccion,
    ActivityLog,
    ObjetivosGasto, FamiliaERP, IngredienteInterno, Elaboracion, Receta,
    CategoriaReceta, PortalUser, ComercialAjuste, ProductoVenta, PickingEntregaState,
    StockElaboracion, PersonalExternoAjuste, PersonalExternoDB, HistoricoPreciosERP,
    CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, Personal, Espacio, ArticuloCatering,
    TipoServicio, CategoriaPersonal, Proveedor, DecoracionDBItem,
    AtipicoDBItem, PedidoPlantilla, FormatoExpedicion, Precio
} from '@/types';
import type { EspacioV2 } from '@/types/espacios';

type DataStore = {
    isLoaded: boolean;
    data: {
        serviceOrders: ServiceOrder[];
        entregas: Entrega[];
        comercialBriefings: ComercialBriefing[];
        pedidosEntrega: PedidoEntrega[];
        gastronomyOrders: GastronomyOrder[];
        materialOrders: MaterialOrder[];
        transporteOrders: TransporteOrder[];
        hieloOrders: HieloOrder[];
        decoracionOrders: DecoracionOrder[];
        atipicoOrders: AtipicoOrder[];
        personalMiceOrders: PersonalMiceOrder[];
        personalExterno: PersonalExterno[];
        pruebasMenu: PruebaMenuData[];
        pickingSheets: Record<string, PickingSheet>;
        returnSheets: Record<string, ReturnSheet>;
        ordenesFabricacion: OrdenFabricacion[];
        pickingStates: Record<string, PickingState>;
        excedentesProduccion: ExcedenteProduccion[];
        personalEntrega: any[];
        partnerPedidosStatus: Record<string, any>;
        activityLogs: ActivityLog[];
        ctaRealCosts: Record<string, any>;
        ctaComentarios: Record<string, any>;
        objetivosGastoPlantillas: ObjetivosGasto[];
        defaultObjetivoGastoId: string | null;
        ingredientesERP: any[];
        familiasERP: FamiliaERP[];
        ingredientesInternos: IngredienteInterno[];
        elaboraciones: Elaboracion[];
        recetas: Receta[];
        categoriasRecetas: CategoriaReceta[];
        portalUsers: PortalUser[];
        comercialAjustes: Record<string, ComercialAjuste[]>;
        productosVenta: ProductoVenta[];
        pickingEntregasState: Record<string, PickingEntregaState>;
        stockElaboraciones: Record<string, StockElaboracion>;
        personalExternoAjustes: Record<string, PersonalExternoAjuste[]>;
        personalExternoDB: PersonalExternoDB[];
        historicoPreciosERP: HistoricoPreciosERP[];
        costesFijosCPR: CosteFijoCPR[];
        objetivosCPR: ObjetivoMensualCPR[];
        personal: Personal[];
        espacios: Espacio[];
        articulos: ArticuloCatering[];
        tipoServicio: TipoServicio[];
        tiposPersonal: CategoriaPersonal[];
        proveedores: Proveedor[];
        tiposTransporte: any[];
        decoracionDB: DecoracionDBItem[];
        atipicosDB: AtipicoDBItem[];
        pedidoPlantillas: PedidoPlantilla[];
        formatosExpedicionDB: FormatoExpedicion[];
        solicitudesPersonalCPR: SolicitudPersonalCPR[];
        incidenciasRetorno: any[];
        precios: Precio[];
    };
    loadAllData: () => void;
    refreshData: () => void;
    updatePickingEntregaState: (hitoId: string, newState: Partial<PickingEntregaState>) => void;
};

const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    const storedValue = localStorage.getItem(key);
    try {
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return defaultValue;
    }
};

const mapEspacioV2ToLegacy = (v2: EspacioV2): Espacio => ({
    id: v2.id,
    identificacion: {
        nombreEspacio: v2.nombre,
        tipoDeEspacio: (v2.tiposEspacio || []) as any[],
        descripcionCorta: v2.descripcionCorta,
        descripcionLarga: v2.descripcionLarga,
        ciudad: v2.ciudad,
        provincia: v2.provincia,
        calle: v2.calle || '',
        codigoPostal: v2.codigoPostal || '',
        zona: v2.zona,
        estilos: (v2.estilos || []) as any[],
        tags: (v2.tags || []) as any[],
        idealPara: (v2.idealPara || []) as any[],
    },
    capacidades: {
        aforoMaximoCocktail: v2.aforoMaxCocktail || 0,
        aforoMaximoBanquete: v2.aforoMaxBanquete || 0,
        salas: (v2.salas || []).map(s => ({
            id: s.id,
            nombreSala: s.nombreSala,
            m2: s.m2,
            dimensiones: s.dimensiones,
            alturaMax: s.alturaMax,
            alturaMin: s.alturaMin,
            aforoTeatro: s.aforoTeatro,
            aforoEscuela: s.aforoEscuela,
            aforoCabaret: s.aforoCabaret,
            aforoCocktailSala: s.aforoCocktailSala,
            esDiafana: s.esDiafana,
            tieneLuzNatural: s.tieneLuzNatural,
        })),
    },
    logistica: {
        accesoVehiculos: v2.accesoVehiculos,
        horarioMontajeDesmontaje: v2.horarioMontajeDesmontaje,
        montacargas: false,
        accesoServicioIndependiente: false,
        potenciaTotal: v2.potenciaTotal,
        cuadrosElectricos: (v2.cuadrosElectricos || []).map(c => ({
            id: c.id,
            ubicacion: c.ubicacion || '',
            potencia: (c.voltaje || '') + (c.amperaje ? ' ' + c.amperaje : '')
        })),
        tipoCocina: v2.tipoCocina || 'Sin cocina',
        tomasAguaCocina: false,
        desaguesCocina: false,
        extraccionHumos: false,
        limitadorSonido: v2.limitadorSonido,
        permiteMusicaExterior: false,
        puntosAnclaje: false,
        metricasOperativas: {
            dificultadMontaje: v2.dificultadMontaje || 1,
            penalizacionPersonalMontaje: v2.penalizacionPersonalMontaje || 0,
        }
    },
    evaluacionMICE: {
        proveedorId: v2.proveedorId,
        relacionComercial: v2.relacionComercial,
        valoracionComercial: v2.valoracionComercial || 0,
        puntosFuertes: v2.puntosFuertes || [],
        puntosDebiles: v2.puntosDebiles || [],
        perfilClienteIdeal: v2.perfilClienteIdeal,
        exclusividadMusica: false,
        exclusividadAudiovisuales: false,
        valoracionOperaciones: v2.valoracionOperaciones || 0,
        factoresCriticosExito: [],
        riesgosPotenciales: [],
    },
    experienciaInvitado: {
        flow: {
            accesoPrincipal: '',
            recorridoInvitado: '',
            aparcamiento: v2.aparcamiento || '',
            transportePublico: v2.transportePublico || '',
            accesibilidadAsistentes: v2.accesibilidadAsistentes || '',
            guardarropa: false,
            seguridadPropia: false,
        },
        conexionWifi: v2.conexionWifi,
    },
    contactos: (v2.contactos || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        cargo: c.cargo || '',
        telefono: c.telefono || '',
        email: c.email || ''
    })),
    multimedia: {
        imagenes: (v2.imagenes || []).map(i => ({
            id: i.id,
            url: i.url,
            isPrincipal: i.esPrincipal
        })),
        carpetaDRIVE: v2.carpetaDrive,
        visitaVirtual: v2.visitaVirtualUrl,
    },
    espacio: v2.nombre,
    precioOrientativoAlquiler: v2.precioOrientativoAlquiler?.toString(),
    canonEspacioPorcentaje: v2.canonEspacioPorcentaje,
    canonEspacioFijo: v2.canonEspacioFijo,
});

export const useDataStore = create<DataStore>((set, get) => ({
    isLoaded: false,
    data: {
        serviceOrders: [], entregas: [], comercialBriefings: [], pedidosEntrega: [],
        gastronomyOrders: [], materialOrders: [], transporteOrders: [], hieloOrders: [],
        decoracionOrders: [], atipicoOrders: [], personalMiceOrders: [], personalExterno: [],
        pruebasMenu: [], pickingSheets: {}, returnSheets: {}, ordenesFabricacion: [],
        pickingStates: {}, excedentesProduccion: [], personalEntrega: [], partnerPedidosStatus: {},
        activityLogs: [], ctaRealCosts: {}, ctaComentarios: {}, objetivosGastoPlantillas: [],
        defaultObjetivoGastoId: null, ingredientesERP: [], familiasERP: [], ingredientesInternos: [],
        elaboraciones: [], recetas: [], categoriasRecetas: [], portalUsers: [],
        comercialAjustes: {}, productosVenta: [], pickingEntregasState: {},
        stockElaboraciones: {}, personalExternoAjustes: {}, personalExternoDB: [],
        historicoPreciosERP: [], costesFijosCPR: [], objetivosCPR: [], personal: [],
        espacios: [], articulos: [], tipoServicio: [], tiposPersonal: [], proveedores: [],
        tiposTransporte: [], decoracionDB: [], atipicosDB: [], pedidoPlantillas: [],
        formatosExpedicionDB: [], solicitudesPersonalCPR: [], incidenciasRetorno: [],
        precios: [],
    },
    loadAllData: async () => {
        if (get().isLoaded) return;

        try {
            const [
                { data: eventos },
                { data: familias },
                { data: proveedores },
                { data: articulosERP },
                { data: elaboraciones },
                { data: recetas },
                { data: eventoLineas },
                { data: elaboracionComponentes },
                { data: recetaDetalles },
                { data: articulosData },
                { data: espaciosV2 },
                { data: entregasDB },
                { data: pedidosEntregaDB },
                { data: pedidosTransporteDB },
                { data: pedidosDecoracionDB },
                { data: pedidosAtipicosDB },
                { data: pedidosMaterialDB },
                { data: pedidosHieloDB },
                { data: personalMiceDB },
                { data: personalExternoDB_Table }, // Renamed to avoid conflict with existing 'personalExternoDB' (catalog)
                { data: personalExternoAjustesDB },
                { data: personalEntregaDB },
                { data: ordenesFabricacionDB },
                { data: pickingSheetsDB },
                { data: returnSheetsDB }
            ] = await Promise.all([
                supabase.from('eventos').select('*'),
                supabase.from('familias').select('*'),
                supabase.from('proveedores').select('*').limit(10000),
                supabase.from('articulos_erp').select('*').limit(10000),
                supabase.from('elaboraciones').select('*'),
                supabase.from('recetas').select('*'),
                supabase.from('evento_lineas').select('*'),
                supabase.from('elaboracion_componentes').select('*'),
                supabase.from('receta_detalles').select('*'),
                supabase.from('articulos').select('*'),
                supabase.from('espacios_v2').select('*, salas:espacios_salas(*), contactos:espacios_contactos(*), cuadrosElectricos:espacios_cuadros_electricos(*), imagenes:espacios_imagenes(*)'),
                supabase.from('entregas').select('*'),
                supabase.from('pedidos_entrega').select('*'),
                supabase.from('pedidos_transporte').select('*'),
                supabase.from('pedidos_decoracion').select('*'),
                supabase.from('pedidos_atipicos').select('*'),
                supabase.from('pedidos_material').select('*'),
                supabase.from('pedidos_hielo').select('*'),
                supabase.from('personal_mice_asignaciones').select('*'),
                supabase.from('personal_externo_eventos').select('*'),
                supabase.from('personal_externo_ajustes').select('*'),
                supabase.from('personal_entrega').select('*'),
                supabase.from('ordenes_fabricacion').select('*'),
                supabase.from('hojas_picking').select('*'),
                supabase.from('hojas_retorno').select('*')
            ]);

            // Map Supabase 'eventos' to 'ServiceOrder'
            const serviceOrders: ServiceOrder[] = (eventos || []).map(e => ({
                id: e.id,
                serviceNumber: e.numero_expediente,
                eventName: e.nombre_evento || 'Evento Sin Nombre', // Ensure string
                client: 'Cliente ID ' + e.cliente_id,
                startDate: e.fecha_inicio,
                endDate: e.fecha_fin,
                status: (e.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador') as any,
                pax: e.comensales,
                // Defaults for required fields
                vertical: 'Catering',
                comercial: 'Comercial ID ' + e.comercial_id,
                space: 'Espacio ID ' + e.espacio_id,
                facturacion: 0,
                comisionesAgencia: 0,
                comisionesCanon: 0,
                respMetre: '',
                tipoCliente: 'Empresa',
                finalClient: '',
                contact: '',
                phone: '',
                asistentes: e.comensales || 0,
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

            // Map 'evento_lineas' to 'GastronomyOrder'
            // We wrap each line in a GastronomyOrder to satisfy the type structure
            const gastronomyOrders: GastronomyOrder[] = (eventoLineas || [])
                .filter(l => l.tipo === 'GASTRONOMIA')
                .map(l => ({
                    id: l.id,
                    osId: l.evento_id,
                    status: 'Pendiente',
                    total: (l.cantidad || 0) * (l.precio_unitario || 0),
                    items: [{
                        id: l.articulo_id || l.id,
                        type: 'item',
                        nombre: l.nombre_articulo,
                        quantity: l.cantidad,
                        precioVenta: l.precio_unitario,
                        costeMateriaPrima: l.coste_unitario
                    }]
                }));

            // Map other tables...
            // For now, we keep localStorage for non-migrated tables to avoid breaking everything immediately
            // or we return empty arrays if we want to force migration.
            // Let's mix: Supabase for migrated, LocalStorage for others (legacy mode)

            const mappedEspacios = (espaciosV2 || []).map((e: any) => mapEspacioV2ToLegacy(e as EspacioV2));

            // Map 'entregas' from Supabase
            const mappedEntregas: Entrega[] = (entregasDB || []).map((e: any) => ({
                id: e.id,
                serviceNumber: e.numero_expediente,
                eventName: e.nombre_evento,
                client: e.cliente_id ? 'Cliente ID ' + e.cliente_id : 'Cliente Desconocido', // Placeholder until clients are fully migrated
                startDate: e.fecha_inicio,
                endDate: e.fecha_fin,
                status: (e.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador') as any,
                vertical: 'Entregas',
                tarifa: e.tarifa === 'IFEMA' ? 'IFEMA' : 'Empresa',
                pax: 0, // Entregas usually don't have pax in the same way
                comercial: e.comercial_id ? 'Comercial ID ' + e.comercial_id : '',
                space: '',
                facturacion: e.facturacion || 0,
                comisionesAgencia: e.comisiones_agencia || 0,
                comisionesCanon: e.comisiones_canon || 0,
                respMetre: '',
                tipoCliente: 'Empresa',
                finalClient: '',
                contact: '',
                phone: '',
                asistentes: 0,
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

            // Map 'pedidos_entrega' from Supabase
            const mappedPedidosEntrega: PedidoEntrega[] = (pedidosEntregaDB || []).map((p: any) => ({
                osId: p.entrega_id,
                hitos: p.hitos || []
            }));

            // Map Logistics Orders
            const mappedTransporte: TransporteOrder[] = (pedidosTransporteDB || []).map((p: any) => {
                const prov = (proveedores || []).find((pr: any) => pr.id === p.proveedor_id);
                const data = p.data || {};
                return {
                    id: p.id,
                    osId: p.evento_id,
                    fecha: p.fecha_servicio,
                    proveedorId: p.proveedor_id,
                    proveedorNombre: prov ? prov.nombre_comercial : '',
                    tipoTransporte: p.tipo_transporte,
                    precio: p.precio,
                    lugarRecogida: data.lugarRecogida || '',
                    horaRecogida: data.horaRecogida || '',
                    lugarEntrega: data.lugarEntrega || '',
                    horaEntrega: data.horaEntrega || '',
                    observaciones: p.observaciones,
                    status: data.status || 'Confirmado',
                    firmaUrl: data.firmaUrl,
                    firmadoPor: data.firmadoPor,
                    dniReceptor: data.dniReceptor,
                    fechaFirma: data.fechaFirma,
                    hitosIds: data.hitosIds
                };
            });

            const mappedDecoracion: DecoracionOrder[] = (pedidosDecoracionDB || []).map((p: any) => {
                const data = p.data || {};
                return {
                    id: p.id,
                    osId: p.evento_id,
                    concepto: p.concepto,
                    precio: p.precio,
                    observaciones: p.descripcion,
                    fecha: data.fecha || ''
                };
            });

            const mappedAtipicos: AtipicoOrder[] = (pedidosAtipicosDB || []).map((p: any) => {
                const data = p.data || {};
                return {
                    id: p.id,
                    osId: p.evento_id,
                    concepto: p.concepto,
                    precio: p.precio,
                    observaciones: p.descripcion,
                    fecha: data.fecha || '',
                    status: data.status || 'Pendiente'
                };
            });

            // Map Material Orders (Aggregate items by Event + Category)
            const materialOrdersMap = new Map<string, MaterialOrder>();
            (pedidosMaterialDB || []).forEach((item: any) => {
                const key = `${item.evento_id}-${item.categoria}`;
                if (!materialOrdersMap.has(key)) {
                    materialOrdersMap.set(key, {
                        id: `order-${key}`, // Synthetic ID
                        osId: item.evento_id,
                        type: item.categoria as any,
                        status: item.estado as any || 'Asignado',
                        items: [],
                        days: 1,
                        total: 0,
                        contractNumber: '',
                        solicita: 'Sala' // Default
                    });
                }
                const order = materialOrdersMap.get(key)!;
                order.items.push({
                    itemCode: item.articulo_id || item.id,
                    description: item.nombre_articulo,
                    price: item.precio_unitario || 0,
                    quantity: item.cantidad,
                    stock: 0,
                    imageUrl: '',
                    imageHint: '',
                    category: item.categoria,
                    tipo: 'material'
                });
                order.total += (item.total || 0);
            });
            const mappedMaterialOrders = Array.from(materialOrdersMap.values());

            // Map Hielo Orders (Aggregate items by Event)
            const hieloOrdersMap = new Map<string, HieloOrder>();
            (pedidosHieloDB || []).forEach((item: any) => {
                const key = item.evento_id;
                if (!hieloOrdersMap.has(key)) {
                    hieloOrdersMap.set(key, {
                        id: `hielo-${key}`, // Synthetic ID
                        osId: item.evento_id,
                        fecha: item.created_at, // Use creation date as default
                        proveedorId: '',
                        proveedorNombre: '',
                        items: [],
                        total: 0,
                        observaciones: '',
                        status: 'Pendiente'
                    });
                }
                const order = hieloOrdersMap.get(key)!;
                order.items.push({
                    id: item.id,
                    producto: item.tipo_hielo,
                    precio: item.precio_kg || 0,
                    cantidad: item.cantidad_kg
                });
                order.total += (item.total || 0);
            });
            const mappedHieloOrders = Array.from(hieloOrdersMap.values());

            // Map Personal MICE (Flat list)
            const mappedPersonalMice: PersonalMiceOrder[] = (personalMiceDB || []).map((item: any) => {
                const data = item.data || {};
                return {
                    id: item.personal_id,
                    osId: item.evento_id,
                    centroCoste: 'SALA', // Default
                    nombre: 'Personal ' + item.personal_id, // Placeholder until join
                    dni: '',
                    tipoServicio: item.categoria as any,
                    horaEntrada: item.hora_entrada,
                    horaSalida: item.hora_salida,
                    precioHora: item.precio_hora,
                    horaEntradaReal: item.hora_entrada_real,
                    horaSalidaReal: item.hora_salida_real
                };
            });

            // Map Personal Externo (Aggregate by Event)
            const personalExternoMap = new Map<string, PersonalExterno>();
            (personalExternoDB_Table || []).forEach((item: any) => {
                const key = item.evento_id;
                const data = item.data || {};
                if (!personalExternoMap.has(key)) {
                    personalExternoMap.set(key, {
                        osId: item.evento_id,
                        turnos: [],
                        status: data.status || 'Pendiente',
                        observacionesGenerales: data.observacionesGenerales,
                        hojaFirmadaUrl: data.hojaFirmadaUrl
                    });
                }
                const order = personalExternoMap.get(key)!;
                if (item.turnos && Array.isArray(item.turnos)) {
                    order.turnos.push(...item.turnos);
                }
            });
            const mappedPersonalExterno = Array.from(personalExternoMap.values());

            // Map Personal Externo Ajustes
            const mappedPersonalExternoAjustes: Record<string, PersonalExternoAjuste[]> = {};
            (personalExternoAjustesDB || []).forEach((item: any) => {
                const key = item.evento_id;
                if (!mappedPersonalExternoAjustes[key]) {
                    mappedPersonalExternoAjustes[key] = [];
                }
                const data = item.data || {};
                mappedPersonalExternoAjustes[key].push({
                    id: item.id,
                    proveedorId: data.proveedorId,
                    concepto: item.concepto,
                    importe: item.importe
                });
            });

            // Map Personal Entrega
            const personalEntregaMap = new Map<string, any>(); // Using any as PersonalEntrega type might need check
            (personalEntregaDB || []).forEach((item: any) => {
                const key = item.entrega_id; // Assuming entrega_id maps to osId in PersonalEntrega
                const data = item.data || {};
                // If multiple rows per delivery, we merge turnos. Usually 1:1.
                if (!personalEntregaMap.has(key)) {
                    personalEntregaMap.set(key, {
                        osId: item.entrega_id,
                        turnos: item.turnos || [],
                        status: data.status || 'Pendiente',
                        observacionesGenerales: data.observacionesGenerales
                    });
                } else {
                    const existing = personalEntregaMap.get(key);
                    if (item.turnos) existing.turnos.push(...item.turnos);
                }
            });
            const mappedPersonalEntrega = Array.from(personalEntregaMap.values());

            // Map Ordenes Fabricacion
            const mappedOrdenesFabricacion: OrdenFabricacion[] = (ordenesFabricacionDB || []).map((p: any) => {
                const data = p.data || {};
                // Use data as the source of truth if available (full object stored)
                if (data.id) return data as OrdenFabricacion;

                // Fallback for partial data
                return {
                    id: p.id,
                    fechaCreacion: p.created_at,
                    fechaProduccionPrevista: '',
                    elaboracionId: '',
                    elaboracionNombre: '',
                    cantidadTotal: 0,
                    unidad: 'UD',
                    partidaAsignada: 'FRIO',
                    estado: p.estado as any,
                    osIDs: [p.evento_id],
                    incidencia: false,
                    okCalidad: false,
                    tipoExpedicion: 'REFRIGERADO'
                };
            });

            // Map Picking Sheets
            const mappedPickingSheets: Record<string, PickingSheet> = {};
            (pickingSheetsDB || []).forEach((p: any) => {
                const data = p.data || {};
                mappedPickingSheets[p.evento_id] = {
                    id: p.id,
                    osId: p.evento_id,
                    items: p.items || [],
                    status: p.estado,
                    fechaNecesidad: data.fecha || data.fechaNecesidad || '',
                    itemStates: data.itemStates,
                    checkedItems: data.checkedItems
                };
            });

            // Map Return Sheets
            const mappedReturnSheets: Record<string, ReturnSheet> = {};
            (returnSheetsDB || []).forEach((p: any) => {
                const data = p.data || {};
                mappedReturnSheets[p.evento_id] = {
                    id: p.id,
                    osId: p.evento_id,
                    items: data.items || [],
                    status: data.status || 'Pendiente',
                    itemStates: data.itemStates || {}
                };
            });


            const allData = {
                serviceOrders,
                entregas: mappedEntregas,
                comercialBriefings: loadFromLocalStorage<ComercialBriefing[]>('comercialBriefings', []),
                pedidosEntrega: mappedPedidosEntrega,
                gastronomyOrders,
                materialOrders: mappedMaterialOrders,
                transporteOrders: mappedTransporte,
                hieloOrders: mappedHieloOrders,
                decoracionOrders: mappedDecoracion,
                atipicoOrders: mappedAtipicos,
                personalMiceOrders: mappedPersonalMice,
                personalExterno: mappedPersonalExterno,
                pruebasMenu: loadFromLocalStorage<PruebaMenuData[]>('pruebasMenu', []),
                pickingSheets: mappedPickingSheets,
                returnSheets: mappedReturnSheets,
                ordenesFabricacion: mappedOrdenesFabricacion,
                pickingStates: loadFromLocalStorage<Record<string, PickingState>>('pickingStates', {}),
                excedentesProduccion: loadFromLocalStorage<ExcedenteProduccion[]>('excedentesProduccion', []),
                personalEntrega: mappedPersonalEntrega,
                partnerPedidosStatus: loadFromLocalStorage<Record<string, any>>('partnerPedidosStatus', {}),
                activityLogs: loadFromLocalStorage<ActivityLog[]>('activityLogs', []),
                ctaRealCosts: loadFromLocalStorage<Record<string, any>>('ctaRealCosts', {}),
                ctaComentarios: loadFromLocalStorage<Record<string, any>>('ctaComentarios', {}),
                objetivosGastoPlantillas: loadFromLocalStorage<ObjetivosGasto[]>('objetivosGastoPlantillas', []),
                defaultObjetivoGastoId: loadFromLocalStorage<string | null>('defaultObjetivoGastoId', null),

                // Mapped catalogs
                ingredientesERP: (articulosERP || []).map((a: any) => ({
                    id: a.id,
                    nombre: a.nombre,
                    referenciaProveedor: a.referencia_proveedor,
                    proveedorId: a.proveedor_id,
                    familiaId: a.familia_id,
                    precioCompra: a.precio_compra,
                    unidadMedida: a.unidad_medida,
                    mermaDefecto: a.merma_defecto,
                    alergenos: a.alergenos
                })),
                familiasERP: (familias || []).map((f: any) => ({
                    id: f.id,
                    familiaCategoria: f.codigo || '',
                    Familia: f.nombre,
                    Categoria: f.categoria_padre || ''
                })),
                ingredientesInternos: loadFromLocalStorage<IngredienteInterno[]>('ingredientesInternos', []),
                elaboraciones: (elaboraciones || []).map((e: any) => ({
                    id: e.id,
                    nombre: e.nombre,
                    partidaProduccion: e.partida,
                    unidadProduccion: e.unidad_produccion,
                    instruccionesPreparacion: e.instrucciones,
                    caducidadDias: e.caducidad_dias,
                    costeUnitario: e.coste_unitario,
                    produccionTotal: 0, // Default
                    componentes: (elaboracionComponentes || [])
                        .filter((c: any) => c.elaboracion_padre_id === e.id)
                        .map((c: any) => ({
                            id: c.id,
                            tipo: (c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion') as 'ingrediente' | 'elaboracion',
                            componenteId: c.componente_id,
                            nombre: 'Componente ' + c.componente_id, // We need to join to get name, but for now placeholder
                            cantidad: c.cantidad_neta,
                            costePorUnidad: 0,
                            merma: c.merma_aplicada
                        })),
                    formatoExpedicion: '',
                    ratioExpedicion: 1,
                    tipoExpedicion: 'REFRIGERADO' as 'REFRIGERADO' | 'CONGELADO' | 'SECO'
                })),
                recetas: (recetas || []).map((r: any) => ({
                    id: r.id,
                    nombre: r.nombre,
                    descripcionComercial: r.descripcion_comercial,
                    precioVenta: r.precio_venta,
                    costeTeorico: r.coste_teorico,
                    estado: r.estado,
                    visibleParaComerciales: true,
                    responsableEscandallo: '',
                    categoria: '',
                    estacionalidad: 'MIXTO' as 'MIXTO' | 'INVIERNO' | 'VERANO',
                    tipoDieta: 'NINGUNO' as 'NINGUNO' | 'VEGETARIANO' | 'VEGANO' | 'AMBOS',
                    porcentajeCosteProduccion: 0,
                    elaboraciones: (recetaDetalles || [])
                        .filter((d: any) => d.receta_id === r.id)
                        .map((d: any) => ({
                            id: d.id,
                            elaboracionId: d.item_id,
                            nombre: 'Item ' + d.item_id,
                            cantidad: d.cantidad,
                            coste: 0,
                            gramaje: 0,
                            unidad: 'UD' as 'UD' | 'KG' | 'L',
                            merma: 0
                        })),
                    menajeAsociado: [],
                    instruccionesMiseEnPlace: '',
                    instruccionesRegeneracion: '',
                    instruccionesEmplatado: ''
                })),

                categoriasRecetas: loadFromLocalStorage<CategoriaReceta[]>('categoriasRecetas', []),
                portalUsers: loadFromLocalStorage<PortalUser[]>('portalUsers', []),
                comercialAjustes: loadFromLocalStorage<Record<string, ComercialAjuste[]>>('comercialAjustes', {}),
                productosVenta: loadFromLocalStorage<ProductoVenta[]>('productosVenta', []),
                pickingEntregasState: loadFromLocalStorage<Record<string, PickingEntregaState>>('pickingEntregasState', {}),
                stockElaboraciones: loadFromLocalStorage<Record<string, StockElaboracion>>('stockElaboraciones', {}),
                personalExternoAjustes: mappedPersonalExternoAjustes,
                personalExternoDB: loadFromLocalStorage<PersonalExternoDB[]>('personalExternoDB', []),
                historicoPreciosERP: loadFromLocalStorage<HistoricoPreciosERP[]>('historicoPreciosERP', []),
                costesFijosCPR: loadFromLocalStorage<CosteFijoCPR[]>('costesFijosCPR', []),
                objetivosCPR: loadFromLocalStorage<ObjetivoMensualCPR[]>('objetivosCPR', []),
                personal: loadFromLocalStorage<Personal[]>('personal', []),
                espacios: mappedEspacios,
                articulos: (articulosData || []).map((a: any) => ({
                    id: a.id,
                    erpId: a.erp_id,
                    nombre: a.nombre,
                    categoria: a.categoria,
                    esHabitual: a.es_habitual,
                    precioVenta: a.precio_venta,
                    precioAlquiler: a.precio_alquiler,
                    precioReposicion: a.precio_reposicion,
                    unidadVenta: a.unidad_venta,
                    stockSeguridad: a.stock_seguridad,
                    tipo: a.tipo,
                    loc: a.loc,
                    imagen: a.imagen,
                    producidoPorPartner: a.producido_por_partner,
                    partnerId: a.partner_id,
                    recetaId: a.receta_id,
                    subcategoria: a.subcategoria
                })),
                tipoServicio: loadFromLocalStorage<TipoServicio[]>('tipoServicio', []),
                tiposPersonal: loadFromLocalStorage<CategoriaPersonal[]>('tiposPersonal', []),
                proveedores: (proveedores || []).map((p: any) => ({
                    id: p.id,
                    nombreComercial: p.nombre_comercial,
                    nombreFiscal: p.nombre_fiscal,
                    cif: p.cif || '',
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
                })),
                tiposTransporte: loadFromLocalStorage<any[]>('tiposTransporte', []),
                decoracionDB: loadFromLocalStorage<DecoracionDBItem[]>('decoracionDB', []),
                atipicosDB: loadFromLocalStorage<AtipicoDBItem[]>('atipicosDB', []),
                pedidoPlantillas: loadFromLocalStorage<PedidoPlantilla[]>('pedidoPlantillas', []),
                formatosExpedicionDB: loadFromLocalStorage<FormatoExpedicion[]>('formatosExpedicionDB', []),
                solicitudesPersonalCPR: loadFromLocalStorage<SolicitudPersonalCPR[]>('solicitudesPersonalCPR', []),
                incidenciasRetorno: loadFromLocalStorage<any[]>('incidenciasRetorno', []),
                precios: loadFromLocalStorage<Precio[]>('precios', []),
            };
            set({ data: allData, isLoaded: true });
        } catch (error) {
            console.error('Error loading data from Supabase:', error);
            // Fallback? Or just log.
        }
    },
    updatePickingEntregaState: (hitoId: string, newState: Partial<PickingEntregaState>) => {
        set((state) => {
            const currentStates = state.data.pickingEntregasState;
            const currentState = currentStates[hitoId] || { hitoId, checkedItems: [], incidencias: [], fotoUrl: null, status: 'Pendiente' };
            const updatedState = { ...currentState, ...newState };
            const newStates = { ...currentStates, [hitoId]: updatedState };

            if (typeof window !== 'undefined') {
                localStorage.setItem('pickingEntregasState', JSON.stringify(newStates));
            }

            return {
                data: {
                    ...state.data,
                    pickingEntregasState: newStates
                }
            };
        });
    },
    refreshData: () => {
        set({ isLoaded: false });
        get().loadAllData();
    }
}));
