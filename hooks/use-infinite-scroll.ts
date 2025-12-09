/**
 * Hook para implementar infinite scroll usando IntersectionObserver
 * Compatible con useInfiniteQuery de TanStack Query
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseInfiniteScrollOptions {
  /**
   * Función a ejecutar cuando el elemento centinela es visible
   */
  fetchNextPage: () => void;
  /**
   * Indica si hay más páginas disponibles
   */
  hasNextPage?: boolean;
  /**
   * Indica si se está cargando la siguiente página
   */
  isFetchingNextPage?: boolean;
  /**
   * Threshold para el IntersectionObserver (0-1)
   * @default 0.1
   */
  threshold?: number;
  /**
   * Root margin para el IntersectionObserver
   * @default "100px"
   */
  rootMargin?: string;
  /**
   * Habilitar/deshabilitar el observer
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook para infinite scroll
 * Retorna una ref que debe ser asignada al elemento centinela
 */
export function useInfiniteScroll({
  fetchNextPage,
  hasNextPage = true,
  isFetchingNextPage = false,
  threshold = 0.1,
  rootMargin = '100px',
  enabled = true,
}: UseInfiniteScrollOptions): RefObject<HTMLDivElement> {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold, rootMargin, enabled]);

  return observerTarget;
}

