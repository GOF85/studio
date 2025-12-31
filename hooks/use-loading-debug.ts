import { useCallback } from 'react';

/**
 * useLoadingDebug
 * Simple debug hook for SplashScreen. Logs loading phases and messages to the console.
 * Replace with more advanced logic if needed.
 */
export function useLoadingDebug() {
  // Log a message to the console
  const log = useCallback((msg: string) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[SplashScreen][DEBUG]', msg);
    }
  }, []);

  // Log a phase change
  const logPhase = useCallback((phase: string) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[SplashScreen][PHASE] ${phase}`);
    }
  }, []);

  return { log, logPhase };
}
