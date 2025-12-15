'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoadingDebug } from './use-loading-debug';

const COMPONENT_NAME = 'usePageLoading';
const PROGRESS_TIMEOUT = 500; // ms para completar a 100%
const LOADING_COMPLETE_DELAY = 300; // ms para ocultar loading
const FALLBACK_TIMEOUT = 10000; // 10 segundos - fallback si algo falla

export function usePageLoading() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { log, logError, logPhase } = useLoadingDebug();
    const loadingStartTimeRef = useRef<number | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Simulador de progreso mientras está cargando
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    const newProgress = prev + Math.floor(Math.random() * 15) + 5;
                    logPhase(COMPONENT_NAME, 'Cargando...', Math.min(newProgress, 90));
                    return Math.min(newProgress, 90);
                });
            }, 200);
            return () => clearInterval(interval);
        }
    }, [isLoading, logPhase]);

    useEffect(() => {
        // Registrar inicio de carga
        loadingStartTimeRef.current = Date.now();
        log(COMPONENT_NAME, 'Carga iniciada', { pathname, searchParams: (searchParams ?? new URLSearchParams()).toString() });
        setIsLoading(true);
        setProgress(0);

        // Completar carga después del timeout
        const progressTimeout = setTimeout(() => {
            setProgress(100);
            logPhase(COMPONENT_NAME, 'Completado', 100);
            setTimeout(() => {
                const loadingDuration = Date.now() - (loadingStartTimeRef.current || Date.now());
                log(COMPONENT_NAME, 'Carga finalizada', { durationMs: loadingDuration });
                setIsLoading(false);
                loadingStartTimeRef.current = null;
                // Limpiar fallback timeout si existe
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }
            }, LOADING_COMPLETE_DELAY);
        }, PROGRESS_TIMEOUT);

        // Fallback: Si la carga tarda más de 10 segundos, forzar completación
        fallbackTimeoutRef.current = setTimeout(() => {
            logError(
                COMPONENT_NAME,
                '⚠️ TIMEOUT DE FALLBACK: La carga se completó por timeout (10s)',
                { pathname, actualProgress: progress }
            );
            setProgress(100);
            setTimeout(() => {
                setIsLoading(false);
                loadingStartTimeRef.current = null;
            }, LOADING_COMPLETE_DELAY);
        }, FALLBACK_TIMEOUT);

        return () => {
            clearTimeout(progressTimeout);
            if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current);
                fallbackTimeoutRef.current = null;
            }
        };
    }, [pathname, searchParams, log, logPhase, logError, progress]);

    return { isLoading, progress };
}
