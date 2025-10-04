
'use client';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ServiceOrder } from '@/types';
import { Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AlquilerLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <div>
            {children}
        </div>
    )
}
