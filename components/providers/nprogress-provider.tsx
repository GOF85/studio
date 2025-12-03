'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import NProgress from 'nprogress';

// Configuración de NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: 'ease',
  speed: 400
});

type LoadingPhase = 'navigating' | 'loading' | 'fetching' | 'rendering' | 'complete';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  navigating: 'Navegando...',
  loading: 'Cargando página...',
  fetching: 'Obteniendo datos...',
  rendering: 'Preparando contenido...',
  complete: 'Completado'
};

function NProgressComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentPhase, setCurrentPhase] = useState<LoadingPhase>('complete');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Cuando cambia la ruta, completamos la carga
    NProgress.done();
    setCurrentPhase('complete');
    setShowMessage(false);
  }, [pathname, searchParams]);

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
          // Fase 1: Navegando (0-20%)
          setCurrentPhase('navigating');
          setShowMessage(true);
          NProgress.start();

          // Fase 2: Cargando (20-50%)
          setTimeout(() => {
            setCurrentPhase('loading');
            NProgress.set(0.3);
          }, 150);

          // Fase 3: Obteniendo datos (50-70%)
          setTimeout(() => {
            setCurrentPhase('fetching');
            NProgress.set(0.6);
          }, 400);

          // Fase 4: Renderizando (70-90%)
          setTimeout(() => {
            setCurrentPhase('rendering');
            NProgress.set(0.8);
          }, 700);
        }
      }
    };

    // Interceptar clicks en botones que navegan
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');

      if (button && button.type === 'submit') {
        setCurrentPhase('navigating');
        setShowMessage(true);
        NProgress.start();
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('click', handleButtonClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('click', handleButtonClick, true);
    };
  }, []);

  return (
    <>
      {showMessage && currentPhase !== 'complete' && (
        <div
          className="fixed top-4 right-4 z-[1032] pointer-events-none"
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
              <div
                className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            </div>
            <span className="text-sm font-medium text-foreground">
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
