'use client';

import React, { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingDebug } from '@/hooks/use-loading-debug';

const COMPONENT_NAME = 'SplashScreen';

type SplashPhase = 'showing' | 'fading' | 'hidden';
type LoadingState = 'initializing' | 'authenticating' | 'loading-dashboard' | 'ready';

const LOADING_STATES: Record<LoadingState, string> = {
  initializing: 'Inicializando aplicación...',
  authenticating: 'Verificando autenticación...',
  'loading-dashboard': 'Cargando dashboard...',
  ready: 'Listo'
};

export default function SplashScreen() {
  const [splashPhase, setSplashPhase] = useState<SplashPhase>('showing');
  const [opacity, setOpacity] = useState(100);
  const [loadingState, setLoadingState] = useState<LoadingState>('initializing');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const { log, logPhase } = useLoadingDebug();

  const hasSplashShown = typeof window !== 'undefined' 
    ? sessionStorage.getItem('splash-shown') 
    : null;

  useEffect(() => {
    // Protección contra SSR
    if (!hasSplashShown) {
      log(COMPONENT_NAME, 'Splash screen iniciado - primera carga');
      logPhase(COMPONENT_NAME, LOADING_STATES.initializing, 10);
    } else {
      log(COMPONENT_NAME, 'Splash screen ya fue mostrado - ocultando');
      setSplashPhase('hidden');
    }
  }, [hasSplashShown, log, logPhase]);

  // Secuencia de estados de carga
  useEffect(() => {
    if (hasSplashShown) return;

    const stateSequence: { state: LoadingState; delay: number; progressPercent: number }[] = [
      { state: 'initializing', delay: 500, progressPercent: 15 },
      { state: 'authenticating', delay: 1000, progressPercent: 40 },
      { state: 'loading-dashboard', delay: 1500, progressPercent: 75 },
      { state: 'ready', delay: 1900, progressPercent: 100 }
    ];

    const timeouts = stateSequence.map(({ state, delay, progressPercent }) =>
      setTimeout(() => {
        log(COMPONENT_NAME, `Estado de carga cambió: ${state}`);
        logPhase(COMPONENT_NAME, LOADING_STATES[state], progressPercent);
        setLoadingState(state);
        setCurrentMessageIndex(stateSequence.findIndex(s => s.state === state));
      }, delay)
    );

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [hasSplashShown, log, logPhase]);

  // Fade out y ocultar splash screen
  useEffect(() => {
    if (hasSplashShown) return;

    const fadeTimer = setTimeout(() => {
      log(COMPONENT_NAME, 'Iniciando fade out');
      setSplashPhase('fading');
      setOpacity(0);

      const hideTimer = setTimeout(() => {
        log(COMPONENT_NAME, 'Splash screen oculto - marcando como mostrado en sessionStorage');
        setSplashPhase('hidden');
        try {
          sessionStorage.setItem('splash-shown', 'true');
        } catch (error) {
          // En caso de que sessionStorage no esté disponible (SSR)
          log(COMPONENT_NAME, '⚠️ No fue posible acceder a sessionStorage');
        }
      }, 500);

      return () => clearTimeout(hideTimer);
    }, 2000);

    return () => clearTimeout(fadeTimer);
  }, [hasSplashShown, log]);

  if (splashPhase === 'hidden') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out',
        opacity === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Logo y marca principal */}
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="p-4 bg-emerald-100 rounded-full mb-4 shadow-lg animate-bounce">
          <ChefHat className="w-16 h-16 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          MICE <span className="text-emerald-600">Catering</span>
        </h1>
      </div>

      {/* Estado de carga progresivo */}
      <div className="mt-12 flex flex-col items-center gap-4 animate-in fade-in duration-500 delay-300">
        {/* Barra de progreso simple */}
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out',
              loadingState === 'initializing' && 'w-1/4',
              loadingState === 'authenticating' && 'w-1/2',
              loadingState === 'loading-dashboard' && 'w-3/4',
              loadingState === 'ready' && 'w-full'
            )}
          />
        </div>

        {/* Mensaje de estado actual */}
        <div className="h-6 flex items-center justify-center">
          <p
            key={currentMessageIndex}
            className="text-sm text-muted-foreground animate-in fade-in duration-300"
          >
            {LOADING_STATES[loadingState]}
          </p>
        </div>

        {/* Puntos animados indicadores de actividad */}
        {loadingState !== 'ready' && (
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Checkmark cuando está listo */}
        {loadingState === 'ready' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="w-6 h-6 text-emerald-600 flex items-center justify-center">
              ✓
            </div>
          </div>
        )}
      </div>
    </div>
  );
}