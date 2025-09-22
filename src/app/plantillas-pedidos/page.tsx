'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, FilePlus2 } from 'lucide-react';
import type { PedidoPlantilla } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';

export default function PlantillasPedidosPage() {
  const [plantillas, setPlantillas] = useState<PedidoPlantilla[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Cargar plantillas desde localStorage
    const storedData = localStorage.getItem('pedidoPlantillas');
    if (storedData) {
      setPlantillas(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Plantillas de Pedidos..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus2 />Plantillas de Pedidos</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/plantillas-pedidos/nuevo">
                <PlusCircle className="mr-2" />
                Nueva Plantilla
              </Link>
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Plantilla</TableHead>
                <TableHead>Tipo de Pedido</TableHead>
                <TableHead>Nº de Artículos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.length > 0 ? (
                plantillas.map(item => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/plantillas-pedidos/${item.id}`)}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell><Badge variant="outline">{item.tipo}</Badge></TableCell>
                    <TableCell>{item.items.length}</TableCell>
                    <TableCell className="text-right">
                      {/* Acciones como Editar/Eliminar irán aquí */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No has creado ninguna plantilla de pedido todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
