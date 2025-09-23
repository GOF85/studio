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
    }
    previousPath.current = currentPath;
  }, [pathname, searchParams]);

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isLoading]);

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
