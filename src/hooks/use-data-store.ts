
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
    refreshData: () => void;
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
    },
    loadAllData: () => {
        if (get().isLoaded) return;
        const allData = {
            serviceOrders: loadFromLocalStorage<ServiceOrder[]>('serviceOrders', []),
            entregas: loadFromLocalStorage<Entrega[]>('entregas', []),
            comercialBriefings: loadFromLocalStorage<ComercialBriefing[]>('comercialBriefings', []),
            pedidosEntrega: loadFromLocalStorage<PedidoEntrega[]>('pedidosEntrega', []),
            gastronomyOrders: loadFromLocalStorage<GastronomyOrder[]>('gastronomyOrders', []),
            materialOrders: loadFromLocalStorage<MaterialOrder[]>('materialOrders', []),
            transporteOrders: loadFromLocalStorage<TransporteOrder[]>('transporteOrders', []),
            hieloOrders: loadFromLocalStorage<HieloOrder[]>('hieloOrders', []),
            decoracionOrders: loadFromLocalStorage<DecoracionOrder[]>('decoracionOrders', []),
            atipicoOrders: loadFromLocalStorage<AtipicoOrder[]>('atipicoOrders', []),
            personalMiceOrders: loadFromLocalStorage<PersonalMiceOrder[]>('personalMiceOrders', []),
            personalExterno: loadFromLocalStorage<PersonalExterno[]>('personalExterno', []),
            pruebasMenu: loadFromLocalStorage<PruebaMenuData[]>('pruebasMenu', []),
            pickingSheets: loadFromLocalStorage<Record<string, PickingSheet>>('pickingSheets', {}),
            returnSheets: loadFromLocalStorage<Record<string, ReturnSheet>>('returnSheets', {}),
            ordenesFabricacion: loadFromLocalStorage<OrdenFabricacion[]>('ordenesFabricacion', []),
            pickingStates: loadFromLocalStorage<Record<string, PickingState>>('pickingStates', {}),
            excedentesProduccion: loadFromLocalStorage<ExcedenteProduccion[]>('excedentesProduccion', []),
            personalEntrega: loadFromLocalStorage<PersonalEntrega[]>('personalEntrega', []),
            partnerPedidosStatus: loadFromLocalStorage<Record<string, any>>('partnerPedidosStatus', {}),
            activityLogs: loadFromLocalStorage<ActivityLog[]>('activityLogs', []),
            ctaRealCosts: loadFromLocalStorage<Record<string, any>>('ctaRealCosts', {}),
            ctaComentarios: loadFromLocalStorage<Record<string, any>>('ctaComentarios', {}),
            objetivosGastoPlantillas: loadFromLocalStorage<ObjetivosGasto[]>('objetivosGastoPlantillas', []),
            defaultObjetivoGastoId: loadFromLocalStorage<string | null>('defaultObjetivoGastoId', null),
            ingredientesERP: loadFromLocalStorage<IngredienteERP[]>('articulosERP', []), // Key is articulosERP
            familiasERP: loadFromLocalStorage<FamiliaERP[]>('familiasERP', []),
            ingredientesInternos: loadFromLocalStorage<IngredienteInterno[]>('ingredientesInternos', []),
            elaboraciones: loadFromLocalStorage<Elaboracion[]>('elaboraciones', []),
            recetas: loadFromLocalStorage<Receta[]>('recetas', []),
            categoriasRecetas: loadFromLocalStorage<CategoriaReceta[]>('categoriasRecetas', []),
            portalUsers: loadFromLocalStorage<PortalUser[]>('portalUsers', []),
            comercialAjustes: loadFromLocalStorage<Record<string, ComercialAjuste[]>>('comercialAjustes', {}),
            productosVenta: loadFromLocalStorage<ProductoVenta[]>('productosVenta', []),
            pickingEntregasState: loadFromLocalStorage<Record<string, PickingEntregaState>>('pickingEntregasState', {}),
            stockElaboraciones: loadFromLocalStorage<Record<string, StockElaboracion>>('stockElaboraciones', {}),
            personalExternoAjustes: loadFromLocalStorage<Record<string, PersonalExternoAjuste[]>>('personalExternoAjustes', {}),
            personalExternoDB: loadFromLocalStorage<PersonalExternoDB[]>('personalExternoDB', []),
            historicoPreciosERP: loadFromLocalStorage<HistoricoPreciosERP[]>('historicoPreciosERP', []),
            costesFijosCPR: loadFromLocalStorage<CosteFijoCPR[]>('costesFijosCPR', []),
            objetivosCPR: loadFromLocalStorage<ObjetivoMensualCPR[]>('objetivosCPR', []),
            personal: loadFromLocalStorage<Personal[]>('personal', []),
            espacios: loadFromLocalStorage<Espacio[]>('espacios', []),
            articulos: loadFromLocalStorage<ArticuloCatering[]>('articulos', []),
            tipoServicio: loadFromLocalStorage<TipoServicio[]>('tipoServicio', []),
            tiposPersonal: loadFromLocalStorage<CategoriaPersonal[]>('tiposPersonal', []),
            proveedores: loadFromLocalStorage<Proveedor[]>('proveedores', []),
            tiposTransporte: loadFromLocalStorage<TipoTransporte[]>('tiposTransporte', []),
            decoracionDB: loadFromLocalStorage<DecoracionDBItem[]>('decoracionDB', []),
            atipicosDB: loadFromLocalStorage<AtipicoDBItem[]>('atipicosDB', []),
            pedidoPlantillas: loadFromLocalStorage<PedidoPlantilla[]>('pedidoPlantillas', []),
            formatosExpedicionDB: loadFromLocalStorage<FormatoExpedicion[]>('formatosExpedicionDB', []),
            solicitudesPersonalCPR: loadFromLocalStorage<SolicitudPersonalCPR[]>('solicitudesPersonalCPR', []),
            incidenciasRetorno: loadFromLocalStorage<any[]>('incidenciasRetorno', []),
        };
        set({ data: allData, isLoaded: true });
    },
    refreshData: () => {
        set({ isLoaded: false });
        get().loadAllData();
    }
}));
