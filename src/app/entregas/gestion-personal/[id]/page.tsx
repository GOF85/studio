
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Phone, Building } from 'lucide-react';
import type { Entrega, PedidoEntrega, EntregaHito } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format } from 'date-fns';

export default function GestionPersonalEntregaPage() {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [hito, setHito] = useState<EntregaHito | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [expedicionNumero, setExpedicionNumero] = useState('');

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
        
        // For now, let's assume we manage personal for the FIRST hito that needs it.
        // This will be expanded later.
        const firstHitoWithPersonal = currentPedido?.hitos.find(h => h.horasCamarero && h.horasCamarero > 0);
        
        if (firstHitoWithPersonal && currentEntrega) {
            setHito(firstHitoWithPersonal);
            const hitoIndex = currentPedido?.hitos.findIndex(h => h.id === firstHitoWithPersonal.id) ?? -1;
            if (hitoIndex !== -1) {
                setExpedicionNumero(`${currentEntrega.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`);
            }
        } else {
            // If no hito with personal, we can't manage anything yet.
            // For now, we'll just show the main info.
        }

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
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
                <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/gestion-personal')} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver al listado
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Asignación de Personal</h1>
                <div className="text-muted-foreground mt-2 space-y-1">
                    <p>Pedido: {entrega.serviceNumber} - {entrega.client}</p>
                </div>
            </div>
        </div>

        {hito ? (
            <Card className="mb-6 bg-amber-50 border-amber-200">
                <CardHeader>
                    <CardTitle>Entrega con Servicio de Personal</CardTitle>
                    <CardDescription>
                        {format(new Date(hito.fecha), 'dd/MM/yyyy')} a las {hito.hora} en {hito.lugarEntrega}
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
