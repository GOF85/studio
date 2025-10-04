
'use client';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ServiceOrder } from '@/types';
import { Snowflake, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HieloLayout({
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
