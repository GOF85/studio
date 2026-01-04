
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import OsHeaderMobile from '@/components/os/OsHeaderMobile';

export default function OSRootLayout({ children }: { children: React.ReactNode }) {
  const params = useParams() as { numero_expediente?: string } | null;
  const osId = params?.numero_expediente || '';

  return (
    <>
      <OsHeaderMobile osId={osId} />
      {children}
    </>
  );
}
