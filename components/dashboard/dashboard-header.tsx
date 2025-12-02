'use client';

import { useMemo } from 'react';

export function DashboardHeader() {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 20) return 'Buenas tardes';
        return 'Buenas noches';
    }, []);

    const currentDate = useMemo(() => {
        return new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date());
    }, []);

    return (
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-1">
                {greeting}
            </h1>
            <p className="text-muted-foreground capitalize">
                {currentDate}
            </p>
        </div>
    );
}
