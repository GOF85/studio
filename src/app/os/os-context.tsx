
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, MaterialOrder, PickingSheet, ReturnSheet, OrderItem, ComercialBriefing, Entrega } from '@/types';
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
    isLoading: boolean;
    serviceOrder: ServiceOrder | Entrega | null;
    briefing: ComercialBriefing | null;
    spaceAddress: string;
    allContextData: {
        materialOrders: MaterialOrder[];
        pickingSheets: PickingSheet[];
        returnSheets: ReturnSheet[];
    } | null;
    getProcessedDataForType: (type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') => ProcessedData;
}

export const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const { isLoaded, data } = useDataStore();

    const { serviceOrder, briefing, spaceAddress, allContextData } = useMemo(() => {
        if (!isLoaded || !osId) return { serviceOrder: null, briefing: null, spaceAddress: '', allContextData: null };

        const currentOS = data.serviceOrders.find(os => os.id === osId);
        let address = '';
        if (currentOS?.space) {
            const currentSpace = data.espacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
            address = currentSpace?.identificacion.calle || '';
        }
        
        const currentBriefing = data.comercialBriefings.find(b => b.osId === osId);

        const contextData = {
            materialOrders: data.materialOrders.filter(o => o.osId === osId),
            pickingSheets: Object.values(data.pickingSheets).filter(s => s.osId === osId),
            returnSheets: Object.values(data.returnSheets).filter(s => s.osId === osId),
        };

        return { 
            serviceOrder: currentOS || null, 
            briefing: currentBriefing || null, 
            spaceAddress: address, 
            allContextData: contextData 
        };
    }, [isLoaded, osId, data]);
    
    const getProcessedDataForType = useCallback((type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler'): ProcessedData => {
        const emptyResult: ProcessedData = { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
        
        if (!allContextData) return emptyResult;
        
        const { materialOrders, pickingSheets, returnSheets } = allContextData;
        const relatedOrders = materialOrders.filter(o => o.type === type);
        
        const mermas: Record<string, number> = {};
        returnSheets.forEach(sheet => {
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

        pickingSheets.forEach(sheet => {
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

        return { 
            allItems: all, 
            blockedOrders: blocked,
            pendingItems: pending,
            itemsByStatus: statusItems,
            totalValoracionPendiente
        };
    }, [allContextData]);

    const value = { osId, isLoading: !isLoaded, allContextData, getProcessedDataForType, serviceOrder, briefing, spaceAddress };

    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}
