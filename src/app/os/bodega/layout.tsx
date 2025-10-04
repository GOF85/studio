
'use client';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ServiceOrder } from '@/types';
import { Wine, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BodegaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const params = useParams();
    const router = useRouter();
    const osId = params.id as string;
  
    useEffect(() => {
      if (osId) {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);
      }
    }, [osId]);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                     <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}`)} className="mb-2">
                        <ArrowLeft className="mr-2" />
                        Volver a la OS
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Wine />Módulo de Bodega</h1>
                    {serviceOrder && <p className="text-muted-foreground mt-2">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>}
                </div>
            </div>
            {children}
        </div>
    )
}
