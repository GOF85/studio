'use client';

/**
 * Hook para logging verbose del sistema de carga
 * Siempre activo en desarrollo, puede desactivarse en producción con localStorage
 */
export function useLoadingDebug() {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Verificar si el usuario ha habilitado debugging en producción
  const isDebugEnabled = 
    isDev || 
    (typeof window !== 'undefined' && localStorage.getItem('loading-debug-enabled') === 'true');

  const log = (component: string, message: string, data?: any) => {
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
  };

  const logError = (component: string, message: string, error?: any) => {
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
  };

  const logPhase = (component: string, phase: string, progress: number) => {
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
  };

  return {
    log,
    logError,
    logPhase,
    isEnabled: isDebugEnabled
  };
}
