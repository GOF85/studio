
'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import NProgress from 'nprogress';

function NProgressComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  
   useEffect(() => {
    // Intercept anchor clicks
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor) {
        const href = anchor.getAttribute('href');
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href!, window.location.href);

        // Start progress if it's an internal navigation but not to the same page
        if (targetUrl.origin === currentUrl.origin && targetUrl.pathname !== currentUrl.pathname) {
          NProgress.start();
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <NProgressComponent />
      </Suspense>
      {children}
    </>
  );
}
