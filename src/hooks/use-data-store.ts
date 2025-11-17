
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
    loadingProgress: number;
    loadingMessage: string;
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
    loadAllData: () => void;
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
    'objetivosGastoPlantillas', 'defaultObjetivoGastoId', 'ingredientesERP', 'familiasERP',
    'ingredientesInternos', 'elaboraciones', 'recetas', 'categoriasRecetas', 'portalUsers',
    'comercialAjustes', 'productosVenta', 'pickingEntregasState', 'stockElaboraciones',
    'personalExternoAjustes', 'personalExternoDB', 'historicoPreciosERP', 'costesFijosCPR',
    'objetivosCPR', 'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal',
    'proveedores', 'tiposTransporte', 'decoracionDB', 'atipicosDB', 'pedidoPlantillas',
    'formatosExpedicionDB', 'solicitudesPersonalCPR', 'incidenciasRetorno',
];

const dataKeysSet = new Set(dataKeys);

const defaultValuesMap: { [key: string]: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {},
};

export const useDataStore = create<DataStore>((set, get) => ({
    isLoaded: false,
    loadingProgress: 0,
    loadingMessage: 'Inicializando...',
    data: dataKeys.reduce((acc, key) => ({ ...acc, [key]: defaultValuesMap[key] ?? [] }), {} as DataStore['data']),

    loadAllData: () => {
        if (typeof window === 'undefined' || get().isLoaded) return;
        
        set({ isLoaded: false, loadingProgress: 0, loadingMessage: 'Empezando carga de datos...' });
        
        const existingKeys = Object.keys(localStorage).filter(key => dataKeysSet.has(key));
        const totalKeys = existingKeys.length;
        
        if (totalKeys === 0) {
            setTimeout(() => {
                set({ data: get().data, isLoaded: true, loadingProgress: 100, loadingMessage: '¡Listo!' });
            }, 500); // Small delay to show the loading screen briefly
            return;
        }

        let processedKeys = 0;
        const allData: Partial<DataStore['data']> = {};

        function processKey(index: number) {
            if (index >= totalKeys) {
                set({ data: allData as DataStore['data'], isLoaded: true, loadingProgress: 100, loadingMessage: '¡Listo!' });
                return;
            }

            setTimeout(() => {
                const key = existingKeys[index];
                const defaultValue = defaultValuesMap[key] ?? [];
                (allData as any)[key] = loadFromLocalStorage(key, defaultValue);

                processedKeys++;
                const progress = (processedKeys / totalKeys) * 100;
                
                set({ loadingProgress: progress, loadingMessage: `Cargando ${key}...` });
                
                processKey(index + 1);
            }, 10);
        }

        processKey(0);
    },
}));
