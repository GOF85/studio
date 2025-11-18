
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useDataStore } from '@/hooks/use-data-store';

export default function PrevisionServiciosPage() {
  const { data, isLoaded, loadKeys } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    // Carga solo los datos que esta página necesita
    loadKeys(['serviceOrders']);
  }, [loadKeys]);

  if (!isLoaded['serviceOrders']) {
    return <LoadingSkeleton title="Cargando Previsión de Servicios..." />;
  }

  // Una vez que los datos están cargados (incluso si están vacíos), 
  // mostramos un mensaje simple en lugar de la tabla compleja para la prueba.
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
          <ClipboardList />
          Previsión de Servicios
        </h1>
        <Button asChild>
          <Link href="/os/nuevo/info">
            <PlusCircle className="mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

      <div>
        <p>Prueba de rendimiento: Los datos de 'serviceOrders' han sido cargados.</p>
        <p>Total de órdenes en memoria: {data.serviceOrders.length}</p>
        <p>Si esta página se muestra rápidamente, el problema está en los componentes de renderizado de la tabla y no en la carga de datos.</p>
      </div>
    </main>
  );
}

    