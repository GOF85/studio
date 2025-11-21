
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
    loadAllData: () => Promise<void>;
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

export const useDataStore = create<DataStore>((set, get) => ({
    data: {},
    isLoaded: false,
    loadAllData: async () => {
        if (get().isLoaded || typeof window === 'undefined') return;

        await Promise.resolve(); 

        const loadedData: { [key: string]: any } = {};
        
        for (const key of ALL_DATA_KEYS) {
            try {
                const storedValue = localStorage.getItem(key);
                if (storedValue) {
                    loadedData[key] = JSON.parse(storedValue);
                } else {
                    loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
                }
            } catch(e) {
                console.warn(`Could not parse key: ${key}. Setting to default.`, e);
                loadedData[key] = defaultValuesMap[key as keyof typeof defaultValuesMap] ?? [];
            }
        }
        
        set({ data: loadedData as Partial<DataStoreData>, isLoaded: true });
    },
}));
