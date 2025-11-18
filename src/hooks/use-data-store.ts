
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
    isLoaded: Record<string, boolean>;
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
        personalEntrega: PersonalEntrega[];
        partnerPedidosStatus: Record<string, any>;
        activityLogs: ActivityLog[];
        ctaRealCosts: Record<string, any>;
        ctaComentarios: Record<string, any>;
        objetivosGastoPlantillas: ObjetivosGasto[];
        defaultObjetivoGastoId: string | null;
        articulosERP: IngredienteERP[];
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
        tiposTransporte: TipoTransporte[];
        decoracionDB: DecoracionDBItem[];
        atipicosDB: AtipicoDBItem[];
        pedidoPlantillas: PedidoPlantilla[];
        formatosExpedicionDB: FormatoExpedicion[];
        solicitudesPersonalCPR: SolicitudPersonalCPR[];
        incidenciasRetorno: any[];
    };
    loadKeys: (keys: DataKeys[]) => void;
    loadAllData: () => void;
};

const ALL_DATA_KEYS: DataKeys[] = [
    'serviceOrders', 'entregas', 'comercialBriefings', 'pedidosEntrega', 'gastronomyOrders', 
    'materialOrders', 'transporteOrders', 'hieloOrders', 'decoracionOrders', 'atipicoOrders', 
    'personalMiceOrders', 'personalExterno', 'pruebasMenu', 'pickingSheets', 'returnSheets', 
    'ordenesFabricacion', 'pickingStates', 'excedentesProduccion', 'personalEntrega', 
    'partnerPedidosStatus', 'activityLogs', 'ctaRealCosts', 'ctaComentarios', 
    'objetivosGastoPlantillas', 'defaultObjetivoGastoId', 'articulosERP', 'familiasERP', 
    'ingredientesInternos', 'elaboraciones', 'recetas', 'categoriasRecetas', 'portalUsers', 
    'comercialAjustes', 'productosVenta', 'pickingEntregasState', 'stockElaboraciones', 
    'personalExternoAjustes', 'personalExternoDB', 'historicoPreciosERP', 'costesFijosCPR', 
    'objetivosCPR', 'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal', 
    'proveedores', 'tiposTransporte', 'decoracionDB', 'atipicosDB', 'pedidoPlantillas', 
    'formatosExpedicionDB', 'solicitudesPersonalCPR', 'incidenciasRetorno'
];

const defaultValuesMap: { [key: string]: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {},
};

const createInitialData = (): DataStore['data'] => {
    return ALL_DATA_KEYS.reduce((acc, key) => {
        acc[key as keyof DataStore['data']] = defaultValuesMap[key] ?? [];
        return acc;
    }, {} as any);
};

const loadFromLocalStorage = (key: string) => {
    if (typeof window === 'undefined') {
        return defaultValuesMap[key] ?? [];
    }
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : (defaultValuesMap[key] ?? []);
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValuesMap[key] ?? [];
    }
};

export const useDataStore = create<DataStore>((set, get) => ({
    isLoaded: {},
    data: createInitialData(),

    loadKeys: (keys: DataKeys[]) => {
        const currentState = get();
        const dataToLoad = keys.filter(key => !currentState.isLoaded[key]);

        if (dataToLoad.length === 0) {
            return;
        }

        const loadedData: Partial<DataStore['data']> = {};
        const newIsLoadedState: Record<string, boolean> = { ...currentState.isLoaded };

        dataToLoad.forEach(key => {
            loadedData[key as keyof DataStore['data']] = loadFromLocalStorage(key);
            newIsLoadedState[key] = true;
        });

        set(state => ({
            data: { ...state.data, ...loadedData },
            isLoaded: newIsLoadedState,
        }));
    },
    
    loadAllData: () => {
       get().loadKeys(ALL_DATA_KEYS);
    },
}));


    