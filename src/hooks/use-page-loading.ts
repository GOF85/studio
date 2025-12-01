'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function usePageLoading() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("Cargando..."); // Add loading message state
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Simulate page loading progress
        if (isLoading) {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    if (prev < 30) setLoadingMessage("Iniciando carga de datos...");
                    else if (prev < 70) setLoadingMessage("Cargando componentes...");
                    else setLoadingMessage("Casi listo...");
                    return prev + 10;
                });
            }, 200);

            return () => clearInterval(interval);
        }
    }, [isLoading]);

    useEffect(() => {
        // Start loading
        setIsLoading(true);
        setProgress(0);
        setLoadingMessage("Cargando página..."); // Initial message

        // Complete loading
        const timeout = setTimeout(() => {
            setProgress(100);
            setLoadingMessage("Carga completa!"); // Final message
            setTimeout(() => {
                setIsLoading(false);
            }, 300);
        }, 500);

        return () => clearTimeout(timeout);
    }, [pathname, searchParams]);

    return { isLoading, progress, loadingMessage };
}
