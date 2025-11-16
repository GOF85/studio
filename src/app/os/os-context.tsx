
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, MaterialOrder, PickingSheet, ReturnSheet } from '@/types';

interface OsDataContextType {
    osId: string;
    isLoading: boolean;
    allItems: {
        materialOrders: MaterialOrder[];
        pickingSheets: PickingSheet[];
        returnSheets: ReturnSheet[];
    } | null;
}

export const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [allItems, setAllItems] = useState<OsDataContextType['allItems']>(null);

    const loadData = useCallback(() => {
        setIsLoading(true);
        try {
            const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
            const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
            const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>);
            
            setAllItems({
                materialOrders: allMaterialOrders.filter(o => o.osId === osId),
                pickingSheets: allPickingSheets.filter(s => s.osId === osId),
                returnSheets: allReturnSheets.filter(s => s.osId === osId),
            });
        } catch (error) {
            console.error("Failed to load OS context data", error);
            setAllItems(null);
        } finally {
            setIsLoading(false);
        }
    }, [osId]);

    useEffect(() => {
        loadData();
        const handleStorageChange = () => loadData();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadData]);

    const value = { osId, isLoading, allItems };

    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}
