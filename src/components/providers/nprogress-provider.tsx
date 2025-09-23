'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';
import NProgress from 'nprogress';
import { useLoadingStore } from '@/hooks/use-loading-store';

function NProgressComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading } = useLoadingStore();
  const previousPath = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    if (previousPath.current !== currentPath) {
      NProgress.start();
    } else if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
    
    previousPath.current = currentPath;

    return () => {
        NProgress.done();
    }
  }, [pathname, searchParams, isLoading]);

  return null;
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
