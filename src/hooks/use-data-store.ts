
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

type DataStoreData = {
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
    cesionesPersonal: any[];
    centros: any[];
    ubicaciones: any[];
    stockArticuloUbicacion: any;
    stockMovimientos: any[];
    incidenciasInventario: any[];
    cierresInventario: any[];
};


type DataKeys = keyof DataStoreData;

type DataStore = {
    data: Partial<DataStoreData>;
    isLoaded: boolean;
    setData: (data: Partial<DataStoreData>) => void;
    loadAllData: () => void;
};

export const ALL_DATA_KEYS: DataKeys[] = [
    'serviceOrders', 'entregas', 'comercialBriefings', 'pedidosEntrega', 'gastronomyOrders', 'materialOrders',
    'transporteOrders', 'hieloOrders', 'decoracionOrders', 'atipicoOrders', 'personalMiceOrders', 'personalExterno',
    'pruebasMenu', 'pickingSheets', 'returnSheets', 'ordenesFabricacion', 'pickingStates', 'excedentesProduccion',
    'personalEntrega', 'partnerPedidosStatus', 'activityLogs', 'ctaRealCosts', 'ctaComentarios', 'objetivosGastoPlantillas',
    'defaultObjetivoGastoId', 'articulosERP', 'familiasERP', 'ingredientesInternos', 'elaboraciones', 'recetas',
    'categoriasRecetas', 'portalUsers', 'comercialAjustes', 'productosVenta', 'pickingEntregasState',
    'stockElaboraciones', 'personalExternoAjustes', 'personalExternoDB', 'historicoPreciosERP', 'costesFijosCPR',
    'objetivosCPR', 'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal', 'proveedores', 'tiposTransporte',
    'decoracionDB', 'atipicosDB', 'pedidoPlantillas', 'formatosExpedicionDB', 'solicitudesPersonalCPR', 'incidenciasRetorno',
    'cesionesPersonal', 'centros', 'ubicaciones', 'stockArticuloUbicacion', 'stockMovimientos', 'incidenciasInventario', 'cierresInventario'
];

export const defaultValuesMap: { [key in DataKeys]?: any } = {
    defaultObjetivoGastoId: null,
    pickingSheets: {}, returnSheets: {}, pickingStates: {}, partnerPedidosStatus: {},
    ctaRealCosts: {}, ctaComentarios: {}, comercialAjustes: {}, pickingEntregasState: {},
    stockElaboraciones: {}, personalExternoAjustes: {}, stockArticuloUbicacion: {},
};

const performanceLog: { context: string, step: string, time: number }[] = [];
let perfStart: number | null = null;

export const logPerf = (context: string, step: string) => {
    if (typeof window === 'undefined') return;
    if (!perfStart) {
        perfStart = performance.now();
        performanceLog.push({ context, step, time: 0 });
        console.log(`[PERF] [${context}] ${step}...`);
        return;
    }
    const time = performance.now() - perfStart;
    performanceLog.push({ context, step, time });
    console.log(`[PERF] [${context}] ${step} finished in ${time.toFixed(2)}ms`);
    perfStart = performance.now(); // Reset for next measurement
};

export const useDataStore = create<DataStore>((set, get) => ({
    data: {},
    isLoaded: false,
    setData: (data) => set({ data, isLoaded: true }),
    loadAllData: () => {
        if (get().isLoaded || typeof window === 'undefined') {
            return;
        }

        logPerf('loadAllData', 'Start');
        const loadedData: Partial<DataStoreData> = {};

        ALL_DATA_KEYS.forEach(key => {
            try {
                const storedValue = localStorage.getItem(key);
                if (storedValue) {
                    loadedData[key as keyof DataStoreData] = JSON.parse(storedValue);
                } else {
                    loadedData[key as keyof DataStoreData] = defaultValuesMap[key] ?? [];
                }
            } catch(e) {
                console.warn(`Could not parse key: ${key}. Setting to default.`, e);
                loadedData[key as keyof DataStoreData] = defaultValuesMap[key] ?? [];
            }
        });
        
        logPerf('loadAllData', 'Finish');
        set({ data: loadedData, isLoaded: true });
    }
}));
