'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState, useRef } from 'react';
import NProgress from 'nprogress';
import { useLoadingDebug } from '@/hooks/use-loading-debug';

const COMPONENT_NAME = 'NProgressProvider';

// Configuración de NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: 'ease',
  speed: 400
});

type LoadingPhase = 'navigating' | 'loading' | 'fetching' | 'rendering' | 'complete' | 'error';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  navigating: '🔄 Navegando...',
  loading: '📄 Cargando página...',
  fetching: '🔗 Obteniendo datos...',
  rendering: '🎨 Preparando contenido...',
  complete: '✅ Completado',
  error: '❌ Error en la navegación'
};

const PHASE_PROGRESS: Record<LoadingPhase, number> = {
  navigating: 0.2,
  loading: 0.4,
  fetching: 0.65,
  rendering: 0.85,
  complete: 1.0,
  error: 0.9
};

function NProgressComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentPhase, setCurrentPhase] = useState<LoadingPhase>('complete');
  const [showMessage, setShowMessage] = useState(false);
  const { log, logError, logPhase } = useLoadingDebug();
  const navigationStartTimeRef = useRef<number | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  // Limpiar timeouts
  const clearAllTimeouts = () => {
    phaseTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    phaseTimeoutRef.current = [];
  };

  useEffect(() => {
    // Cuando cambia la ruta, completamos la carga
    const navigationDuration = navigationStartTimeRef.current 
      ? Date.now() - navigationStartTimeRef.current 
      : 0;
    
    log(COMPONENT_NAME, 'Ruta cambió - completando carga', {
      newPathname: pathname,
      newSearchParams: (searchParams ?? new URLSearchParams()).toString(),
      navigationDurationMs: navigationDuration > 0 ? navigationDuration : 'N/A'
    });
    
    logPhase(COMPONENT_NAME, 'Completado', 100);
    NProgress.done();
    
    setCurrentPhase('complete');
    setShowMessage(false);
    clearAllTimeouts();
    navigationStartTimeRef.current = null;
  }, [pathname, searchParams, log, logPhase]);

  useEffect(() => {
    // Interceptar clicks en enlaces para empezar la carga inmediatamente
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);

        // Solo activar si es navegación interna y a una ruta diferente
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          navigationStartTimeRef.current = Date.now();
          
          log(COMPONENT_NAME, 'Click en enlace detectado', {
            href: link.href,
            newPathname: url.pathname,
            currentPathname: currentUrl.pathname
          });
          
          clearAllTimeouts();
          
          // Fase 1: Navegando (0-20%)
          log(COMPONENT_NAME, 'Iniciando fase: Navegando');
          setCurrentPhase('navigating');
          setShowMessage(true);
          NProgress.start();
          logPhase(COMPONENT_NAME, 'Navegando', 20);

          // Fase 2: Cargando (20-50%)
          const timeout1 = setTimeout(() => {
            log(COMPONENT_NAME, 'Transitando a fase: Cargando página');
            setCurrentPhase('loading');
            NProgress.set(0.3);
            logPhase(COMPONENT_NAME, 'Cargando página', 40);
          }, 150);
          phaseTimeoutRef.current.push(timeout1);

          // Fase 3: Obteniendo datos (50-70%)
          const timeout2 = setTimeout(() => {
            log(COMPONENT_NAME, 'Transitando a fase: Obteniendo datos');
            setCurrentPhase('fetching');
            NProgress.set(0.6);
            logPhase(COMPONENT_NAME, 'Obteniendo datos', 65);
          }, 400);
          phaseTimeoutRef.current.push(timeout2);

          // Fase 4: Renderizando (70-90%)
          const timeout3 = setTimeout(() => {
            log(COMPONENT_NAME, 'Transitando a fase: Preparando contenido');
            setCurrentPhase('rendering');
            NProgress.set(0.8);
            logPhase(COMPONENT_NAME, 'Preparando contenido', 85);
          }, 700);
          phaseTimeoutRef.current.push(timeout3);

          // Timeout de seguridad: Si después de 8 segundos no se completó, marcar error
          const safetyTimeout = setTimeout(() => {
            logError(
              COMPONENT_NAME,
              '⚠️ TIMEOUT DE SEGURIDAD: Navegación tardó más de 8 segundos',
              { lastPhase: currentPhase, pathname }
            );
            setCurrentPhase('error');
            NProgress.done();
          }, 8000);
          phaseTimeoutRef.current.push(safetyTimeout);
        }
      }
    };

    // Interceptar clicks en botones que navegan (form submissions, etc)
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');

      if (button && button.type === 'submit') {
        navigationStartTimeRef.current = Date.now();
        
        log(COMPONENT_NAME, 'Click en botón de submit detectado', {
          buttonId: button.id,
          buttonClass: button.className
        });
        
        clearAllTimeouts();
        setCurrentPhase('navigating');
        setShowMessage(true);
        NProgress.start();
        logPhase(COMPONENT_NAME, 'Navegando (submit)', 20);
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('click', handleButtonClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('click', handleButtonClick, true);
      clearAllTimeouts();
    };
  }, [log, logError, logPhase, currentPhase]);

  return (
    <>
      {showMessage && currentPhase !== 'complete' && (
        <div
          className="fixed top-4 right-4 z-[1032] pointer-events-none"
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className={`
            backdrop-blur-sm border rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3
            transition-colors duration-300
            ${currentPhase === 'error' 
              ? 'bg-destructive/10 border-destructive/30' 
              : 'bg-background/95 border-border'
            }
          `}>
            <div className="relative w-4 h-4">
              {currentPhase === 'error' ? (
                <span className="text-destructive">✕</span>
              ) : (
                <>
                  <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
                  <div
                    className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"
                  ></div>
                </>
              )}
            </div>
            <span className={`text-sm font-medium ${
              currentPhase === 'error' ? 'text-destructive' : 'text-foreground'
            }`}>
              {PHASE_MESSAGES[currentPhase]}
            </span>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NProgressComponent />
      </Suspense>
      {children}
    </>
  );
}
