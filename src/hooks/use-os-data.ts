'use client';

import { useEffect, useMemo } from 'react';
import { useDataStore } from './use-data-store';

export function useOsData(osId: string) {
    const { isLoaded, data } = useDataStore();
    
    return useMemo(() => {
        if (!isLoaded || !osId) {
            return { serviceOrder: null, briefing: null, isLoading: true, spaceAddress: '' };
        }

        const currentOS = data.serviceOrders.find(os => os.id === osId);
        
        let address = '';
        if (currentOS?.space) {
            const currentSpace = data.espacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
            address = currentSpace?.identificacion.calle || '';
        }
        
        const currentBriefing = data.comercialBriefings.find(b => b.osId === osId);

        return { 
            serviceOrder: currentOS || null, 
            briefing: currentBriefing || null, 
            isLoading: false, 
            spaceAddress: address
        };
    }, [isLoaded, osId, data]);
}