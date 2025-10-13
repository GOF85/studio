
'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ServiceOrder } from '@/types';
import { Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PersonalMiceLayout({
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

