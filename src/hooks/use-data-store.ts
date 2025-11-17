
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

type DataStore = {
    isLoaded: boolean;
    loadingMessage: string;
    loadingProgress: number;
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
        ingredientesERP: IngredienteERP[];
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
    loadAllData: () => Promise<void>;
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

const dataKeys = [
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
    'formatosExpedicionDB', 'solicitudesPersonalCPR', 'incidenciasRetorno',
];

const defaultValuesMap: { [key: string]: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {},
};

export const useDataStore = create<DataStore>((set, get) => ({
    isLoaded: false,
    loadingMessage: 'Inicializando...',
    loadingProgress: 0,
    data: dataKeys.reduce((acc, key) => ({ ...acc, [key]: defaultValuesMap[key] ?? [] }), {} as DataStore['data']),

    loadAllData: async () => {
        if (get().isLoaded || typeof window === 'undefined') return;

        set({ loadingMessage: 'Iniciando carga de datos...', loadingProgress: 1 });
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

        const totalKeys = dataKeys.length;
        const allData: Partial<DataStore['data']> = {};

        for (let i = 0; i < totalKeys; i++) {
            const key = dataKeys[i];
            const defaultValue = defaultValuesMap[key] ?? [];
            
            // This async break allows the UI to update.
            await new Promise(resolve => setTimeout(resolve, 10)); 
            
            set({
                loadingMessage: `Cargando ${key}...`,
                loadingProgress: ((i + 1) / totalKeys) * 100,
            });

            (allData as any)[key] = loadFromLocalStorage(key, defaultValue);
        }

        set({ data: allData as DataStore['data'], isLoaded: true, loadingMessage: '¡Listo!', loadingProgress: 100 });
    },
}));
