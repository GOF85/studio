
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, MaterialOrder, PickingSheet, ReturnSheet, OrderItem } from '@/types';

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
    allContextData: {
        materialOrders: MaterialOrder[];
        pickingSheets: PickingSheet[];
        returnSheets: ReturnSheet[];
    } | null;
}

export const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [allContextData, setAllContextData] = useState<OsDataContextType['allContextData']>(null);

    const loadData = useCallback(() => {
        setIsLoading(true);
        try {
            const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
            const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
            const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>);
            
            setAllContextData({
                materialOrders: allMaterialOrders.filter(o => o.osId === osId),
                pickingSheets: allPickingSheets.filter(s => s.osId === osId),
                returnSheets: allReturnSheets.filter(s => s.osId === osId),
            });
        } catch (error) {
            console.error("Failed to load OS context data", error);
            setAllContextData(null);
        } finally {
            setIsLoading(false);
        }
    }, [osId]);

    useEffect(() => {
        loadData();
        const handleStorageChange = (e: StorageEvent) => {
             if (e.key === 'materialOrders' || e.key === 'pickingSheets' || e.key === 'returnSheets') {
                loadData();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadData]);
    
    const value = { osId, isLoading, allContextData };

    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}
