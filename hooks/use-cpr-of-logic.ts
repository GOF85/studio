import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, isWithinInterval, startOfDay, endOfDay, addDays, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { 
    OrdenFabricacion, 
    PartidaProduccion, 
    PickingState, 
    Proveedor, 
    ArticuloERP, 
    IngredienteInterno,
    Elaboracion,
    Receta,
    ComercialBriefing,
    GastronomyOrder,
    ServiceOrder
} from '@/types';
import { useCprOrdenesFabricacion, useCreateCprOrdenFabricacion, useUpdateCprOrdenFabricacion, useDeleteCprOrdenFabricacion, useCprElaboraciones, useCprStockElaboraciones, useCprPickingStates } from '@/hooks/use-cpr-data';
import { useEventos, useGastronomyOrders, useComercialBriefings, useRecetas, usePersonal, useIngredientesInternos, useArticulosERP, useProveedores } from '@/hooks/use-data-queries';
import { useToast } from '@/hooks/use-toast';
import { formatUnit, formatNumber } from '@/lib/utils';

export const PARTIDAS: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];
export const STATUS_OPTIONS: OrdenFabricacion['estado'][] = ['Pendiente', 'Asignada', 'En Proceso', 'Finalizado', 'Incidencia', 'Validado'];

export type NecesidadDesgloseItem = {
    osId: string;
    osNumber: string;
    osSpace: string;
    hitoId: string;
    hitoDescripcion: string;
    fechaHito: string;
    recetaId: string;
    recetaNombre: string;
    cantidadReceta: number;
    cantidadNecesaria: number;
};

export type NecesidadItem = {
    id: string; // elaboracionId
    nombre: string;
    cantidadNecesariaTotal: number;
    unidad: string;
    osIDs: Set<string>;
    partida: PartidaProduccion;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    stockDisponible: number;
    cantidadPlanificada: number;
    desgloseDiario: { fecha: string, cantidad: number }[];
    cantidadNeta: number;
    recetas: string[];
    desgloseCompleto: NecesidadDesgloseItem[];
};

export type IngredienteDeCompra = {
    erpId: string;
    nombreProducto: string;
    refProveedor: string;
    formatoCompra: string;
    necesidadNeta: number;
    unidadNeta: string;
    unidadConversion: number;
    precioCompra: number;
    descuento: number;
    desgloseUso: { receta: string, elaboracion: string, cantidad: number }[];
};

export type ProveedorConLista = Proveedor & {
    listaCompra: IngredienteDeCompra[];
};

export type ReporteProduccionItem = {
    id: string;
    nombre: string;
    partida: string;
    udTotales: number;
    unidad: string;
    necesidadesPorDia: Record<string, number>;
    componentes?: { nombre: string; cantidad: number; unidad: string, cantidadTotal: number }[];
    usadoEn?: { nombre: string; cantidad: number; unidad: string }[];
};

export type ReporteResumenPartida = {
    referencias: number;
    unidades: number;
    elaboraciones: number;
}

export type ReporteData = {
    fechas: Date[];
    resumen: {
        contratos: number;
        contratosDetalle: string[];
        servicios: number;
        serviciosDetalle: string[];
        comensales: number;
        referencias: number;
        unidades: number;
        elaboraciones: number;
        resumenPorPartida: Record<string, ReporteResumenPartida>;
    };
    referencias: ReporteProduccionItem[];
    elaboraciones: ReporteProduccionItem[];
};

export function useCprOfLogic() {
    const { toast } = useToast();
    
    // --- DATA FETCHING ---
    const { data: ordenes = [], isLoading: isLoadingOFs } = useCprOrdenesFabricacion();
    const { data: elaboraciones = [] } = useCprElaboraciones();
    const { data: personal = [] } = usePersonal();
    const { data: serviceOrders = [] } = useEventos();
    const { data: gastronomyOrders = [] } = useGastronomyOrders();
    const { data: comercialBriefings = [] } = useComercialBriefings();
    const { data: recetas = [] } = useRecetas();
    const { data: stockElaboraciones = {} } = useCprStockElaboraciones();
    const { data: pickingStatesArray = [] } = useCprPickingStates();
    const { data: ingredientesInternos = [] } = useIngredientesInternos();
    const { data: ingredientesERP = [] } = useArticulosERP();
    const { data: proveedores = [] } = useProveedores();

    const deleteOF = useDeleteCprOrdenFabricacion();
    const createOF = useCreateCprOrdenFabricacion();
    const updateOF = useUpdateCprOrdenFabricacion();

    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [partidaFilter, setPartidaFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
    }));
    const [selectedNecesidades, setSelectedNecesidades] = useState<Set<string>>(new Set());

    // --- DIALOG STATES ---
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [pedidoParaImprimir, setPedidoParaImprimir] = useState<ProveedorConLista | null>(null);
    const [redondearCompra, setRedondearCompra] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    // --- DERIVED DATA ---
    const pickingStatesData = useMemo(() => {
        const map: Record<string, PickingState> = {};
        pickingStatesArray.forEach(ps => { map[ps.osId] = ps; });
        return map;
    }, [pickingStatesArray]);

    const rangeStart = useMemo(() => startOfDay(dateRange?.from || new Date()), [dateRange]);
    const rangeEnd = useMemo(() => endOfDay(dateRange?.to || dateRange?.from || new Date()), [dateRange]);

    const gastroOrdersInRange = useMemo(() => {
        return gastronomyOrders.filter(order => {
            try {
                const os = serviceOrders.find(o => o.id === order.osId);
                if (!os || !os.startDate) return false;
                const hitoDate = startOfDay(new Date(os.startDate));
                return isWithinInterval(hitoDate, { start: rangeStart, end: rangeEnd });
            } catch (e) { return false; }
        });
    }, [gastronomyOrders, rangeStart, rangeEnd, serviceOrders]);

    const necesidadesAgregadas = useMemo(() => {
        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const osMap = new Map(serviceOrders.map(os => [os.id, os]));
        const necesidadesMap: Map<string, NecesidadItem> = new Map();

        gastroOrdersInRange.forEach(gastroOrder => {
            try {
                const os = osMap.get(gastroOrder.osId);
                if (!os || !os.startDate) return;
                const fechaKey = format(new Date(os.startDate), 'yyyy-MM-dd');
                const briefing = comercialBriefings.find(b => b.osId === gastroOrder.osId);
                if (!briefing) return;

                (gastroOrder.items || []).forEach(item => {
                    if (item.type !== 'item') return;
                    const receta = recetas.find(r => r.id === item.id);
                    if (!receta || !receta.elaboraciones) return;

                    receta.elaboraciones.forEach((elabEnReceta: any) => {
                        const elab = elabMap.get(elabEnReceta.elaboracionId);
                        if (!elab) return;

                        const id = elab.id;
                        let necesidad = necesidadesMap.get(id);

                        if (!necesidad) {
                            necesidad = {
                                id, nombre: elab.nombre, cantidadNecesariaTotal: 0, unidad: elab.unidadProduccion,
                                osIDs: new Set(), partida: elab.partidaProduccion, tipoExpedicion: (['REFRIGERADO','CONGELADO','SECO'] as const).includes(elab.tipoExpedicion as any) ? (elab.tipoExpedicion as any) : undefined,
                                stockDisponible: 0, cantidadPlanificada: 0, desgloseDiario: [], cantidadNeta: 0,
                                recetas: [], desgloseCompleto: [],
                            };
                            necesidadesMap.set(id, necesidad);
                        }

                        const cantidadNecesaria = (item.quantity || 1) * elabEnReceta.cantidad;
                        (necesidad as any).cantidadNecesariaTotal += cantidadNecesaria;
                        (necesidad as any).osIDs.add(gastroOrder.osId);

                        if (!(necesidad as any).recetas.includes(receta.nombre)) (necesidad as any).recetas.push(receta.nombre);

                        const desglose = (necesidad as any).desgloseDiario.find((d: any) => d.fecha === fechaKey);
                        if (desglose) desglose.cantidad += cantidadNecesaria;
                        else (necesidad as any).desgloseDiario.push({ fecha: fechaKey, cantidad: cantidadNecesaria });

                        const hito = briefing.items.find(h => h.id === gastroOrder.id);
                        (necesidad as any).desgloseCompleto.push({
                            osId: os.id, osNumber: os.serviceNumber, osSpace: os.space, hitoId: hito?.id || '',
                            hitoDescripcion: hito?.descripcion || '', fechaHito: hito?.fecha || '', recetaId: receta.id,
                            recetaNombre: receta.nombre, cantidadReceta: item.quantity || 1, cantidadNecesaria: cantidadNecesaria
                        });
                    });
                });
            } catch (e) { }
        });
        return necesidadesMap;
    }, [gastroOrdersInRange, elaboraciones, serviceOrders, comercialBriefings, recetas]);

    const stockAsignadoGlobal = useMemo(() => {
        const stock: Record<string, number> = {};
        Object.values(pickingStatesData).forEach((state: any) => {
            (state.itemStates || []).forEach((assigned: any) => {
                const of = ordenes.find(o => o.id === assigned.ofId);
                if (of) stock[of.elaboracionId] = (stock[of.elaboracionId] || 0) + assigned.quantity;
            });
        });
        return stock;
    }, [pickingStatesData, ordenes]);

    const processedData = useMemo(() => {
        const allPersonal = personal.filter(p => p.departamento === 'CPR');
        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const osMap = new Map(serviceOrders.map(os => [os.id, os]));

        const necesidadesNetas: NecesidadItem[] = [];
        const necesidadesCubiertasList: NecesidadItem[] = [];

        Array.from(necesidadesAgregadas.values()).forEach(necesidad => {
            const ofsExistentes = ordenes.filter((of: OrdenFabricacion) => {
                if (of.elaboracionId !== necesidad.id) return false;
                try {
                    const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                    return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
                } catch (e) { return false; }
            });

            const cantidadPlanificada = ofsExistentes.reduce((sum, of) => {
                const isFinalizado = of.estado === 'Finalizado' || of.estado === 'Validado';
                return sum + (isFinalizado && of.cantidadReal ? of.cantidadReal : of.cantidadTotal);
            }, 0);

            const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
            const stockAsignado = stockAsignadoGlobal[necesidad.id] || 0;
            const stockDisponible = Math.max(0, stockTotalBruto - stockAsignado);

            const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
            const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

            const itemCompleto = {
                ...necesidad, stockDisponible: stockAUtilizar, cantidadPlanificada, cantidadNeta,
                desgloseDiario: necesidad.desgloseDiario.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            };

            if (cantidadNeta > 0.001) necesidadesNetas.push(itemCompleto);
            else necesidadesCubiertasList.push(itemCompleto);
        });

        return { 
            personalCPR: allPersonal, 
            elaboracionesMap: elabMap, 
            serviceOrdersMap: osMap, 
            necesidades: necesidadesNetas, 
            necesidadesCubiertas: necesidadesCubiertasList 
        };
    }, [ordenes, personal, elaboraciones, serviceOrders, necesidadesAgregadas, stockElaboraciones, stockAsignadoGlobal, rangeStart, rangeEnd]);

    const filteredAndSortedOFs = useMemo(() => {
        return ordenes
            .filter(item => {
                const searchMatch = searchTerm === '' ||
                    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (item.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
                const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;

                let dateMatch = true;
                if (dateRange?.from) {
                    try {
                        const itemDate = (item.estado === 'Pendiente' || item.estado === 'Asignada')
                            ? parseISO(item.fechaProduccionPrevista)
                            : item.fechaFinalizacion ? parseISO(item.fechaFinalizacion) : parseISO(item.fechaProduccionPrevista);

                        if (dateRange.to) {
                            dateMatch = isWithinInterval(itemDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                        } else {
                            dateMatch = isSameDay(itemDate, dateRange.from);
                        }
                    } catch (e) {
                        dateMatch = false;
                    }
                }

                return searchMatch && statusMatch && partidaMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    }, [ordenes, searchTerm, statusFilter, partidaFilter, dateRange]);

    const listaDeLaCompra = useMemo(() => {
        if (!processedData.necesidades || processedData.necesidades.length === 0) return [];

        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const ingMap = new Map(ingredientesInternos.map(i => [i.id, i]));
        const erpMap = new Map(ingredientesERP.map(a => [a.idreferenciaerp, a]));
        const proveedoresMap = new Map(proveedores.map(p => [p.IdERP, p]));

        const ingredientesNecesarios = new Map<string, { cantidad: number, desgloseUso: { receta: string, elaboracion: string, cantidad: number }[] }>();

        function getIngredientesRecursivo(elabId: string, cantidadRequerida: number, recetaNombre: string) {
            const elaboracion = elabMap.get(elabId);
            if (!elaboracion) return;

            const ratio = cantidadRequerida / elaboracion.produccionTotal;

            (elaboracion.componentes || []).forEach((comp: any) => {
                const cantidadComponente = comp.cantidad * ratio;
                if (comp.tipo === 'ingrediente') {
                    let ingData = ingredientesNecesarios.get(comp.componenteId);
                    if (!ingData) {
                        ingData = { cantidad: 0, desgloseUso: [] };
                        ingredientesNecesarios.set(comp.componenteId, ingData);
                    }
                    ingData.cantidad += cantidadComponente;
                    ingData.desgloseUso.push({ receta: recetaNombre, elaboracion: elaboracion.nombre, cantidad: cantidadComponente });
                } else if (comp.tipo === 'elaboracion') {
                    getIngredientesRecursivo(comp.componenteId, cantidadComponente, recetaNombre);
                }
            });
        }

        processedData.necesidades.forEach(necesidad => {
            necesidad.desgloseCompleto.forEach(desglose => {
                getIngredientesRecursivo(necesidad.id, desglose.cantidadNecesaria, desglose.recetaNombre);
            })
        });

        const compraPorProveedor = new Map<string, ProveedorConLista>();

        ingredientesNecesarios.forEach((data, ingId) => {
            const ingredienteInterno = ingMap.get(ingId);
            if (!ingredienteInterno) return;

            const articuloERP = erpMap.get(ingredienteInterno.productoERPlinkId);
            if (!articuloERP) return;

            const proveedor = proveedoresMap.get(articuloERP.idProveedor);
            if (!proveedor) return;

            let proveedorData = compraPorProveedor.get(proveedor.id);
            if (!proveedorData) {
                const newProveedorData: ProveedorConLista = { ...proveedor, listaCompra: [] };
                compraPorProveedor.set(proveedor.id, newProveedorData);
                proveedorData = newProveedorData;
            }

            const ingCompra: IngredienteDeCompra = {
                erpId: articuloERP.idreferenciaerp || articuloERP.id,
                nombreProducto: articuloERP.nombreProductoERP,
                refProveedor: articuloERP.referenciaProveedor || '',
                formatoCompra: `${articuloERP.unidadConversion} ${formatUnit(articuloERP.unidad)}`,
                necesidadNeta: data.cantidad,
                unidadNeta: articuloERP.unidad,
                unidadConversion: articuloERP.unidadConversion,
                precioCompra: articuloERP.precioCompra,
                descuento: articuloERP.descuento || 0,
                desgloseUso: data.desgloseUso.sort((a, b) => b.cantidad - a.cantidad),
            };

            const existingItemIndex = proveedorData.listaCompra.findIndex((item: any) => item.erpId === articuloERP.idreferenciaerp);
            if (existingItemIndex > -1) {
                proveedorData.listaCompra[existingItemIndex].necesidadNeta += data.cantidad;
                proveedorData.listaCompra[existingItemIndex].desgloseUso.push(...data.desgloseUso);
            } else {
                proveedorData.listaCompra.push(ingCompra);
            }
        });

        return Array.from(compraPorProveedor.values()).sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));

    }, [processedData.necesidades, elaboraciones, ingredientesInternos, ingredientesERP, proveedores]);

    const flatCompraList = useMemo(() => {
        return listaDeLaCompra.flatMap(proveedor =>
            proveedor.listaCompra.map(item => ({
                ...item,
                proveedorNombre: proveedor.nombreComercial,
            }))
        ).sort((a, b) => a.proveedorNombre.localeCompare(b.proveedorNombre) || a.nombreProducto.localeCompare(b.nombreProducto));
    }, [listaDeLaCompra]);

    const reporteData = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return null;
        
        const fechas = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        
        const referenciasReporte: ReporteProduccionItem[] = [];
        const elaboracionesReporte: ReporteProduccionItem[] = [];
        
        const resumenPorPartida: Record<string, ReporteResumenPartida> = {};

        gastroOrdersInRange.forEach(gastroOrder => {
            const os = serviceOrders.find(o => o.id === gastroOrder.osId);
            if (!os || !os.startDate) return;
            const fechaKey = format(new Date(os.startDate), 'yyyy-MM-dd');

            (gastroOrder.items || []).forEach(item => {
                if (item.type !== 'item') return;
                const receta = recetas.find(r => r.id === item.id);
                if (!receta) return;

                let refItem = referenciasReporte.find(r => r.id === receta.id);
                if (!refItem) {
                    refItem = {
                        id: receta.id,
                        nombre: receta.nombre,
                        partida: 'EXPEDICION',
                        udTotales: 0,
                        unidad: 'ud',
                        necesidadesPorDia: {},
                        componentes: (receta.elaboraciones || []).map((e: any) => {
                            const el = elabMap.get(e.elaboracionId);
                            return { nombre: el?.nombre || '?', cantidad: e.cantidad, unidad: el?.unidadProduccion || '?', cantidadTotal: 0 };
                        })
                    };
                    referenciasReporte.push(refItem);
                }
                const qty = item.quantity || 1;
                refItem.udTotales += qty;
                refItem.necesidadesPorDia[fechaKey] = (refItem.necesidadesPorDia[fechaKey] || 0) + qty;
                (refItem.componentes || []).forEach(c => c.cantidadTotal += c.cantidad * qty);

                (receta.elaboraciones || []).forEach((elabEnReceta: any) => {
                    const elab = elabMap.get(elabEnReceta.elaboracionId);
                    if (!elab) return;

                    let elabItem = elaboracionesReporte.find(e => e.id === elab.id);
                    if (!elabItem) {
                        elabItem = {
                            id: elab.id,
                            nombre: elab.nombre,
                            partida: elab.partidaProduccion,
                            udTotales: 0,
                            unidad: elab.unidadProduccion,
                            necesidadesPorDia: {},
                            usadoEn: []
                        };
                        elaboracionesReporte.push(elabItem);
                    }
                    const elabQty = qty * elabEnReceta.cantidad;
                    elabItem.udTotales += elabQty;
                    elabItem.necesidadesPorDia[fechaKey] = (elabItem.necesidadesPorDia[fechaKey] || 0) + elabQty;
                    
                    let usado = elabItem.usadoEn?.find(u => u.nombre === receta.nombre);
                    if (!usado) {
                        usado = { nombre: receta.nombre, cantidad: 0, unidad: 'ud' };
                        elabItem.usadoEn?.push(usado);
                    }
                    usado.cantidad += qty;
                });
            });
        });

        return {
            fechas,
            resumen: {
                contratos: new Set(gastroOrdersInRange.map(o => o.osId)).size,
                contratosDetalle: [],
                servicios: gastroOrdersInRange.length,
                serviciosDetalle: [],
                comensales: 0,
                referencias: referenciasReporte.length,
                unidades: referenciasReporte.reduce((s, r) => s + r.udTotales, 0),
                elaboraciones: elaboracionesReporte.length,
                resumenPorPartida
            },
            referencias: referenciasReporte,
            elaboraciones: elaboracionesReporte
        };
    }, [dateRange, rangeStart, rangeEnd, gastroOrdersInRange, serviceOrders, recetas, elaboraciones]);

    // --- HANDLERS ---
    const handleClearFilters = useCallback(() => {
        setSearchTerm('');
        setStatusFilter('all');
        setPartidaFilter('all');
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    }, []);

    const handleDeleteOrder = useCallback((id: string) => {
        return deleteOF.mutateAsync(id);
    }, [deleteOF]);

    const handleGenerateOFs = useCallback(() => {
        if (!dateRange?.from || selectedNecesidades.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay necesidades seleccionadas para generar OFs.' });
            return;
        }

        const fechaProduccion = format(dateRange.from, 'yyyy-MM-dd');
        let count = 0;

        selectedNecesidades.forEach(elabId => {
            const necesidad = processedData.necesidades.find(n => n.id === elabId);
            if (!necesidad || necesidad.cantidadNeta <= 0) return;

            createOF.mutate({
                fechaProduccionPrevista: fechaProduccion,
                elaboracionId: necesidad.id,
                elaboracionNombre: necesidad.nombre,
                cantidadTotal: necesidad.cantidadNeta,
                unidad: necesidad.unidad as any,
                partidaAsignada: necesidad.partida,
                tipoExpedicion: necesidad.tipoExpedicion,
                estado: 'Pendiente',
                osIDs: Array.from(necesidad.osIDs),
                incidencia: false,
                okCalidad: false,
            });
            count++;
        });

        toast({ title: 'Órdenes de Fabricación Creadas', description: `${count} OFs se han enviado a producción.` });
        setSelectedNecesidades(new Set());
    }, [dateRange, selectedNecesidades, processedData.necesidades, createOF, toast]);

    const handleAssignResponsable = useCallback((ofId: string, responsable: string) => {
        updateOF.mutate({
            id: ofId,
            responsable,
            estado: 'Asignada',
            fechaAsignacion: new Date().toISOString()
        }, {
            onSuccess: () => {
                toast({ title: 'Responsable Asignado', description: `Se ha asignado a ${responsable}.` });
            }
        });
    }, [updateOF, toast]);

    const handleSelectNecesidad = useCallback((elabId: string, checked: boolean) => {
        setSelectedNecesidades(prev => {
            const newSelection = new Set(prev);
            if (checked) newSelection.add(elabId);
            else newSelection.delete(elabId);
            return newSelection;
        });
    }, []);

    const getPickingInfo = useCallback((ofId: string): { osId: string; containerId: string } | null => {
        for (const osId in pickingStatesData) {
            const state = pickingStatesData[osId];
            const found = state.itemStates.find((item: any) => item.ofId === ofId);
            if (found) {
                return { osId, containerId: found.containerId };
            }
        }
        return null;
    }, [pickingStatesData]);

    const handlePrintReport = useCallback((redondearCompra: boolean) => {
        const doc = new jsPDF();
        const tableColumn = ["Proveedor", "Producto (Ref.)", "Cant. a Comprar", "Formato", "Necesidad Neta"];
        const tableRows: (string | number)[][] = [];

        flatCompraList.forEach(item => {
            const cantidadAComprar = redondearCompra
                ? Math.ceil(item.necesidadNeta / item.unidadConversion)
                : (item.necesidadNeta / item.unidadConversion);

            const row = [
                item.proveedorNombre,
                `${item.nombreProducto} (${item.refProveedor})`,
                redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2),
                item.formatoCompra,
                `${formatNumber(item.necesidadNeta, 3)} ${formatUnit(item.unidadNeta)}`
            ];
            tableRows.push(row);
        });

        const dateTitle = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '';
        const dateTitleEnd = dateRange?.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy')}` : '';

        doc.setFontSize(18);
        doc.text(`Informe de Compra Consolidado`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Periodo: ${dateTitle}${dateTitleEnd}`, 14, 30);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [0, 112, 60] }
        });

        doc.save(`Informe_Compra_${dateTitle}.pdf`);
    }, [flatCompraList, dateRange]);

    return {
        // Data
        ordenes,
        isLoading: isLoadingOFs,
        personalCPR: processedData.personalCPR,
        elaboracionesMap: processedData.elaboracionesMap,
        serviceOrdersMap: processedData.serviceOrdersMap,
        necesidades: processedData.necesidades,
        necesidadesCubiertas: processedData.necesidadesCubiertas,
        filteredAndSortedOFs,
        listaDeLaCompra,
        flatCompraList,
        reporteData,
        
        // State
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        partidaFilter,
        setPartidaFilter,
        dateRange,
        setDateRange,
        selectedNecesidades,
        setSelectedNecesidades,
        orderToDelete,
        setOrderToDelete,
        pedidoParaImprimir,
        setPedidoParaImprimir,
        redondearCompra,
        setRedondearCompra,
        isReportDialogOpen,
        setIsReportDialogOpen,
        
        // Constants
        partidas: PARTIDAS,
        statusOptions: STATUS_OPTIONS,
        
        // Handlers
        handleClearFilters,
        handleDeleteOrder,
        handleGenerateOFs,
        handleAssignResponsable,
        handleSelectNecesidad,
        getPickingInfo,
        handlePrintReport
    };
}

