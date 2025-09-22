'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Factory } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function PlanificacionCprPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Planificación CPR..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Factory />
            Planificación CPR
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agregación de Necesidades de Producción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-16">
              <p className="mb-2">Próximamente: Aquí se mostrará un listado agregado de todas las elaboraciones necesarias para las próximas Órdenes de Servicio.</p>
              <p>Desde aquí podrás generar las Órdenes de Fabricación para la cocina.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
