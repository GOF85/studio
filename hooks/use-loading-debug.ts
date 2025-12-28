'use client';

import { useCallback } from 'react';

/**
 * Hook para logging verbose del sistema de carga
 * Deshabilitado por defecto. Habilitar con variable de entorno:
 * NEXT_PUBLIC_LOADING_DEBUG_ENABLED=true
 */
export function useLoadingDebug() {
  // Solo habilitado si el usuario lo activa explícitamente en variable de entorno
  const isDebugEnabled =
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_LOADING_DEBUG_ENABLED === 'true';

  const log = useCallback((component: string, message: string, data?: any) => {
    if (!isDebugEnabled) return;

    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const prefix = `[${timestamp}] 📊 ${component}`;
    
    if (data !== undefined) {
      console.log(`${prefix}: ${message}`, data);
    } else {
      console.log(`${prefix}: ${message}`);
    }
  }, [isDebugEnabled]);

  const logError = useCallback((component: string, message: string, error?: any) => {
    if (!isDebugEnabled) return;

    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const prefix = `[${timestamp}] 🚨 ${component}`;
    
    if (error !== undefined) {
      console.error(`${prefix}: ${message}`, error);
    } else {
      console.error(`${prefix}: ${message}`);
    }
  }, [isDebugEnabled]);

  const logPhase = useCallback((component: string, phase: string, progress: number) => {
    if (!isDebugEnabled) return;

    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const progressBar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
    console.log(
      `[${timestamp}] ⏳ ${component}: ${phase} |${progressBar}| ${progress}%`
    );
  }, [isDebugEnabled]);

  return {
    log,
    logError,
    logPhase,
    isEnabled: isDebugEnabled
  };
}
