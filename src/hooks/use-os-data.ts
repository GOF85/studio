
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ServiceOrder, ComercialBriefing, Espacio } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useOsData(osId: string | null) {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const loadData = useCallback(() => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
      return;
    }

    try {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      if (currentOS?.space) {
        const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
        const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
        setSpaceAddress(currentSpace?.identificacion.calle || '');
      }

      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      setBriefing(currentBriefing || { osId, items: [] });
      
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error de carga', description: 'No se pudieron cargar los datos de la OS.'})
    } finally {
        setIsLoading(false);
    }
  }, [osId, router, toast]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
    // Optional: Add a listener to reload data if underlying data changes, e.g. from another tab.
    // window.addEventListener('storage', loadData);
    // return () => window.removeEventListener('storage', loadData);
  }, [loadData]);


  return { serviceOrder, briefing, spaceAddress, isLoading: !isMounted || isLoading, isMounted };
}
