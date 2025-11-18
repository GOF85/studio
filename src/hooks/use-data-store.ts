
'use client';

import { create } from 'zustand';
import type { 
    ServiceOrder, Entrega, ComercialBriefing, PedidoEntrega, GastronomyOrder, MaterialOrder, 
    TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, 
    PruebaMenuData, PickingSheet, ReturnSheet, OrdenFabricacion, PickingState, ExcedenteProduccion, 
    PersonalEntrega, PartnerPedidoStatus, ActivityLog, CtaRealCost, CtaComentario, 
    ObjetivosGasto, IngredienteERP, FamiliaERP, IngredienteInterno, Elaboracion, Receta, 
    CategoriaReceta, PortalUser, ComercialAjuste, ProductoVenta, PickingEntregaState, 
    StockElaboracion, PersonalExternoAjuste, PersonalExternoDB, HistoricoPreciosERP, 
    CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, Personal, Espacio, ArticuloCatering, 
    TipoServicio, CategoriaPersonal, Proveedor, TipoTransporte, DecoracionDBItem, 
    AtipicoDBItem, PedidoPlantilla, FormatoExpedicion 
} from '@/types';

type DataKeys = keyof DataStore['data'];

type DataStore = {
    data: {
        serviceOrders?: ServiceOrder[];
        entregas?: Entrega[];
        comercialBriefings?: ComercialBriefing[];
        pedidosEntrega?: PedidoEntrega[];
        gastronomyOrders?: GastronomyOrder[];
        materialOrders?: MaterialOrder[];
        transporteOrders?: TransporteOrder[];
        hieloOrders?: HieloOrder[];
        decoracionOrders?: DecoracionOrder[];
        atipicoOrders?: AtipicoOrder[];
        personalMiceOrders?: PersonalMiceOrder[];
        personalExterno?: PersonalExterno[];
        pruebasMenu?: PruebaMenuData[];
        pickingSheets?: Record<string, PickingSheet>;
        returnSheets?: Record<string, ReturnSheet>;
        ordenesFabricacion?: OrdenFabricacion[];
        pickingStates?: Record<string, PickingState>;
        excedentesProduccion?: ExcedenteProduccion[];
        personalEntrega?: PersonalEntrega[];
        partnerPedidosStatus?: Record<string, any>;
        activityLogs?: ActivityLog[];
        ctaRealCosts?: Record<string, any>;
        ctaComentarios?: Record<string, any>;
        objetivosGastoPlantillas?: ObjetivosGasto[];
        defaultObjetivoGastoId?: string | null;
        articulosERP?: IngredienteERP[];
        familiasERP?: FamiliaERP[];
        ingredientesInternos?: IngredienteInterno[];
        elaboraciones?: Elaboracion[];
        recetas?: Receta[];
        categoriasRecetas?: CategoriaReceta[];
        portalUsers?: PortalUser[];
        comercialAjustes?: Record<string, ComercialAjuste[]>;
        productosVenta?: ProductoVenta[];
        pickingEntregasState?: Record<string, PickingEntregaState>;
        stockElaboraciones?: Record<string, StockElaboracion>;
        personalExternoAjustes?: Record<string, PersonalExternoAjuste[]>;
        personalExternoDB?: PersonalExternoDB[];
        historicoPreciosERP?: HistoricoPreciosERP[];
        costesFijosCPR?: CosteFijoCPR[];
        objetivosCPR?: ObjetivoMensualCPR[];
        personal?: Personal[];
        espacios?: Espacio[];
        articulos?: ArticuloCatering[];
        tipoServicio?: TipoServicio[];
        tiposPersonal?: CategoriaPersonal[];
        proveedores?: Proveedor[];
        tiposTransporte?: TipoTransporte[];
        decoracionDB?: DecoracionDBItem[];
        atipicosDB?: AtipicoDBItem[];
        pedidoPlantillas?: PedidoPlantilla[];
        formatosExpedicionDB?: FormatoExpedicion[];
        solicitudesPersonalCPR?: SolicitudPersonalCPR[];
        incidenciasRetorno?: any[];
    };
    loadKeys: (keys: DataKeys[]) => void;
};

const defaultValuesMap: { [key in DataKeys]?: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {},
};

export const useDataStore = create<DataStore>((set, get) => ({
    data: {}, // Start with a truly empty data object

    loadKeys: (keys: DataKeys[]) => {
        const t0 = performance.now();
        console.log(`[PERF] loadKeys triggered for: ${keys.join(', ')}`);
        
        const currentState = get().data;
        const dataToLoad = keys.filter(key => !(key in currentState));

        if (dataToLoad.length === 0) {
            console.log("[PERF] All requested keys already in memory. Aborting load.");
            return;
        }
        
        console.log(`[PERF] Keys to load from localStorage: ${dataToLoad.join(', ')}`);

        const loadedData: Partial<DataStore['data']> = {};
        const timings: Record<string, number> = {};

        dataToLoad.forEach(key => {
            const tKeyStart = performance.now();
            const storedValue = localStorage.getItem(key);
            const parsedValue = storedValue ? JSON.parse(storedValue) : (defaultValuesMap[key] ?? []);
            loadedData[key as keyof DataStore['data']] = parsedValue;
            const tKeyEnd = performance.now();
            timings[key] = tKeyEnd - tKeyStart;
        });

        set(state => ({
            data: { ...state.data, ...loadedData },
        }));
        
        const t1 = performance.now();
        console.log(`[PERF] Finished data load. Total Time: ${(t1 - t0).toFixed(2)}ms`);
        console.table(timings);
    },
}));

    