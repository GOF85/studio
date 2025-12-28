
'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

function PruebaMenuPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const osId = searchParams.get('osId');

  useEffect(() => {
    if (osId) {
      router.replace(`/os/${osId}/prueba-menu`);
    } else {
      router.replace('/os');
    }
  }, [osId, router]);

  return <LoadingSkeleton title="Redirigiendo..." />;
}

export default function PruebaMenuPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando ..." />}>
            <PruebaMenuPageInner />
        </Suspense>
    );
}
