
'use client';

import { useDataStore } from '@/hooks/use-data-store';
import { useEffect } from 'react';
import { LoadingScreen } from './loading-screen';

export function AppInitializer({ children }: { children: React.ReactNode }) {
    const { isLoaded, loadAllData } = useDataStore();

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    if (!isLoaded) {
        return <LoadingScreen />;
    }

    