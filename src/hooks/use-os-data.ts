
'use client';

import { useEffect, useMemo, useState, useCallback, useContext, createContext } from 'react';
import type { ServiceOrder, ComercialBriefing, Espacio, MaterialOrder, PickingSheet, ReturnSheet, OrderItem } from '@/types';

type OsDataContextType = {
    osId: string;
    serviceOrder: ServiceOrder | null;
    briefing: ComercialBriefing | null;
    spaceAddress: string;
    isLoading: boolean;
    updateKey: number;
    getProcessedDataForType: (type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') => ProcessedData;
};

const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
}

interface ProcessedData {
    allItems: ItemWithOrderInfo[];
    blockedOrders: BlockedOrderInfo[];
    pendingItems: ItemWithOrderInfo[];
    itemsByStatus: Record<StatusColumn, ItemWithOrderInfo[]>;
    totalValoracionPendiente: number;
}


export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
    const [spaceAddress, setSpaceAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [allMaterialOrders, setAllMaterialOrders] = useState<MaterialOrder[]>([]);
    const [allPickingSheets, setAllPickingSheets] = useState<PickingSheet[]>([]);
    const [allReturnSheets, setAllReturnSheets] = useState<ReturnSheet[]>([]);
    const [updateKey, setUpdateKey] = useState(Date.now());

    const loadData = useCallback(() => {
        setIsLoading(true);
        if (osId && typeof window !== 'undefined') {
            const storedServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = storedServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            if (currentOS?.space) {
                const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
                const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
                setSpaceAddress(currentSpace?.identificacion.calle || '');
            } else {
                setSpaceAddress('');
            }

            const storedBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
            setBriefing(storedBriefings.find(b => b.osId === osId) || null);
            
            setAllMaterialOrders(JSON.parse(localStorage.getItem('materialOrders') || '[]'));
            setAllPickingSheets(Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')));
            setAllReturnSheets(Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}')));

        }
        setIsLoading(false);
    }, [osId]);

    useEffect(() => {
        loadData();
        const handleStorageChange = () => setUpdateKey(Date.now());
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, loadData]);
    
    useEffect(() => {
        loadData();
    }, [updateKey, loadData])

    const getProcessedDataForType = useCallback((type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler'): ProcessedData => {
        const relatedOrders = allMaterialOrders.filter(order => order.osId === osId && order.type === type);
        const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);
        const relatedReturnSheets = allReturnSheets.filter(s => s.osId === osId);
        
        const mermas: Record<string, number> = {};
        relatedReturnSheets.forEach(sheet => {
          Object.entries(sheet.itemStates).forEach(([key, state]) => {
            const itemInfo = sheet.items.find(i => `${i.orderId}_${i.itemCode}` === key);
            if (itemInfo && itemInfo.type === type && itemInfo.sentQuantity > state.returnedQuantity) {
                const perdida = itemInfo.sentQuantity - state.returnedQuantity;
                mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida;
            }
          });
        });
        
        const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
        const processedItemKeys = new Set<string>();
        const blocked: BlockedOrderInfo[] = [];

        relatedPickingSheets.forEach(sheet => {
            const targetStatus = statusMap[sheet.status];
            const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

            sheet.items.forEach(itemInSheet => {
                if (itemInSheet.type !== type) return;
                
                const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
                const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
                const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);

                if (!originalItem) return;
                
                const itemWithInfo: ItemWithOrderInfo = {
                    ...originalItem,
                    orderId: sheet.id, 
                    orderContract: orderRef?.contractNumber || 'N/A', 
                    orderStatus: sheet.status, 
                    solicita: orderRef?.solicita,
                };

                statusItems[targetStatus].push(itemWithInfo);
                sheetInfo.items.push(itemWithInfo);
                processedItemKeys.add(uniqueKey);
            });

            if (sheetInfo.items.length > 0) {
                blocked.push(sheetInfo);
            }
        });

        const all = relatedOrders.flatMap(order => 
            order.items.map(item => ({
                ...item, 
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo))
        );
        
        const pending = all.filter(item => {
          const uniqueKey = `${item.orderId}-${item.itemCode}`;
          return !processedItemKeys.has(uniqueKey) && item.quantity > 0;
        });
        
        statusItems['Asignado'] = pending;

        const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        return { allItems: all, blockedOrders: blocked, pendingItems: pending, itemsByStatus: statusItems, totalValoracionPendiente };

    }, [allMaterialOrders, allPickingSheets, allReturnSheets, osId]);


    const value = { osId, serviceOrder, briefing, spaceAddress, isLoading, updateKey, getProcessedDataForType };
    
    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}
