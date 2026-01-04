import { useCallback } from 'react';

/**
 * useLoadingDebug
 * Simple debug hook for SplashScreen. Logs loading phases and messages to the console.
 * Replace with more advanced logic if needed.
 */
export function useLoadingDebug() {
  // Log a message to the console (accept multiple args)
  const log = useCallback((...args: any[]) => {
    // logging disabled in production build; no-op in any env to avoid noisy output
    return;
  }, []);

  // Log a phase change (accept multiple args)
  const logPhase = useCallback((...args: any[]) => {
    // no-op
    return;
  }, []);

  // Log an error
  const logError = useCallback((...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[SplashScreen][ERROR]', ...args);
    }
  }, []);

  return { log, logPhase, logError };
}
