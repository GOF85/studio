
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Building, Phone } from 'lucide-react';
import type { Entrega, PedidoEntrega, EntregaHito } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format } from 'date-fns';

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [hitosConServicio, setHitosConServicio] = useState<EntregaHito[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const loadData = useCallback(() => {
    try {
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(os => os.id === osId);
        setEntrega(currentEntrega || null);

        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        
        const hitosRelevantes = currentPedido?.hitos.filter(h => h.horasCamarero && h.horasCamarero > 0) || [];
        setHitosConServicio(hitosRelevantes);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del pedido.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  if (!isMounted || !entrega) {
    return <LoadingSkeleton title="Cargando Asignación de Personal..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')}>
                    <ArrowLeft className="mr-2" />
                    Volver al listado
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Asignación de Personal</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                    <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                </div>
            </div>
        </div>

        {hitosConServicio.length > 0 ? (
          <div className="space-y-4">
            {hitosConServicio.map((hito, index) => (
              <Card key={hito.id} className="bg-amber-50 border-amber-200">
                  <CardHeader>
                      <CardTitle>Entrega #{index + 1}: {hito.lugarEntrega}</CardTitle>
                      <CardDescription>
                          {format(new Date(hito.fecha), 'dd/MM/yyyy')} a las {hito.hora}
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="font-semibold">Horas de Camarero Solicitadas: {hito.horasCamarero}</p>
                      {hito.observaciones && (
                          <blockquote className="mt-4 border-l-2 pl-4 italic text-amber-800">
                              <strong>Observaciones del comercial:</strong> "{hito.observaciones}"
                          </blockquote>
                      )}
                  </CardContent>
              </Card>
            ))}
          </div>
        ) : (
            <Card>
                <CardContent className="py-12 text-center">
                    <h3 className="text-lg font-semibold">Sin servicio de personal</h3>
                    <p className="text-muted-foreground">Este pedido no tiene ninguna entrega que requiera personal de servicio.</p>
                </CardContent>
            </Card>
        )}
      </main>
    </>
  );
}
