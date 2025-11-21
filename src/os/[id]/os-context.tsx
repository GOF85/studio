'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, ComercialBriefing, Espacio, MaterialOrder, PickingSheet, ReturnSheet, OrderItem } from '@/types';
import { useDataStore } from '@/hooks/use-data-store';

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

interface OsDataContextType {
    osId: string;
    serviceOrder: ServiceOrder | null;
    briefing: ComercialBriefing | null;
    spaceAddress: string;
    isLoading: boolean;
    updateKey: number;
    getProcessedDataForType: (type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') => ProcessedData;
}

const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}

export function OsContextProvider({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const osId = params.id as string;
    const { data, isLoaded: isDataStoreLoaded } = useDataStore();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
    const [spaceAddress, setSpaceAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [updateKey, setUpdateKey] = useState(Date.now());
    
    useEffect(() => {
        if (isDataStoreLoaded && osId) {
            setIsLoading(true);
            const currentOS = data.serviceOrders?.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            if (currentOS?.space) {
                const currentSpace = data.espacios?.find(e => e.identificacion.nombreEspacio === currentOS.space);
                setSpaceAddress(currentSpace?.identificacion.calle || '');
            } else {
                setSpaceAddress('');
            }
            setBriefing(data.comercialBriefings?.find(b => b.osId === osId) || null);
            setIsLoading(false);
        }
    }, [osId, isDataStoreLoaded, data, updateKey]);
    
    const getProcessedDataForType = useCallback((type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler'): ProcessedData => {
        if (!data) return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
        
        const { materialOrders = [], pickingSheets = {}, returnSheets = {} } = data;
        const relatedOrders = materialOrders.filter(order => order.osId === osId && order.type === type);
        const relatedPickingSheets = Object.values(pickingSheets).filter(sheet => sheet.osId === osId);
        
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

    }, [data, osId]);

    const value = { osId, serviceOrder, briefing, spaceAddress, isLoading, updateKey, getProcessedDataForType };
    
    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}
