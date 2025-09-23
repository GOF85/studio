
'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import NProgress from 'nprogress';

function NProgressComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.start();
    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams]);

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
